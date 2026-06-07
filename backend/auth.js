// ============================================================
//  auth.js  —  System admin middleware & route handlers
//  FIX: School admin reset now returns temp password ONCE
//  FIX: Same-password prevention on change-password
// ============================================================

const express  = require('express');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcrypt');
const crypto   = require('crypto');
const pool     = require('./db');
const router   = express.Router();

const SCHOOL_JWT_SECRET = process.env.JWT_SECRET        || 'change_me_school';
const SYSTEM_JWT_SECRET = process.env.SYSTEM_JWT_SECRET || 'change_me_system';
const TOKEN_EXPIRY      = '8h';
const SYSTEM_EXPIRY     = '4h';

// ── Generate temp password ────────────────────────────────────────────────────
function genTempPassword() {
  return crypto.randomBytes(4).toString('hex'); // 8 hex chars
}

// ─────────────────────────────────────────────────────────────
//  MIDDLEWARE: protect school admin routes
// ─────────────────────────────────────────────────────────────
const requireSchoolAdmin = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided' });
  try {
    const payload = jwt.verify(header.split(' ')[1], SCHOOL_JWT_SECRET);
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ─────────────────────────────────────────────────────────────
//  MIDDLEWARE: protect system admin routes
// ─────────────────────────────────────────────────────────────
const requireSystemAdmin = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided' });
  try {
    const payload = jwt.verify(header.split(' ')[1], SYSTEM_JWT_SECRET);
    req.sysAdmin = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ─────────────────────────────────────────────────────────────
//  ROUTE: POST /api/system/login
// ─────────────────────────────────────────────────────────────
router.post('/api/system/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });
  try {
    const result = await pool.query(
      'SELECT id, username, password_hash FROM system_admin WHERE username = $1',
      [username]
    );
    const sys = result.rows[0];
    if (!sys) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, sys.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    await pool.query('UPDATE system_admin SET last_login = NOW() WHERE id = $1', [sys.id]);
    await logAudit(pool, { actor: sys.username, actorRole: 'system_admin', action: 'SYSTEM_LOGIN', target: null, school: null });
    const token = jwt.sign({ id: sys.id, username: sys.username }, SYSTEM_JWT_SECRET, { expiresIn: SYSTEM_EXPIRY });
    return res.json({ token, username: sys.username });
  } catch (err) {
    console.error('System login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────
//  SYSTEM ADMIN ROUTES
// ─────────────────────────────────────────────────────────────

// GET /api/system/admins
router.get('/api/system/admins', requireSystemAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sa.id, sa.name, sa.username, sa.is_active, sa.temp_password_flag,
              sa.created_at, sa.last_login, s.name AS school, s.id AS school_id
       FROM school_admins sa
       JOIN schools s ON s.id = sa.school_id
       ORDER BY s.name, sa.username`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/system/admins
router.post('/api/system/admins', requireSystemAdmin, async (req, res) => {
  const { name, username, password, schoolId } = req.body;
  if (!name || !username || !password || !schoolId)
    return res.status(400).json({ error: 'name, username, password and schoolId are required' });
  try {
    const hash   = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO school_admins (name, username, password_hash, school_id, temp_password_flag)
       VALUES ($1,$2,$3,$4,true) RETURNING id, name, username, school_id, is_active, created_at`,
      [name, username, hash, schoolId]
    );
    const school = await pool.query('SELECT name FROM schools WHERE id=$1', [schoolId]);
    await logAudit(pool, { actor: req.sysAdmin.username, actorRole: 'system_admin', action: 'CREATE_ADMIN', target: username, school: school.rows[0]?.name || schoolId });
    return res.status(201).json({ success: true, admin: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already exists' });
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/system/admins/:id/reset-password
// FIX: Now generates a temp password and returns it ONCE
// Admin writes it down and gives it to the school admin
router.patch('/api/system/admins/:id/reset-password', requireSystemAdmin, async (req, res) => {
  try {
    // Generate temp password — shown ONCE in response, never stored plain
    const tempPass = genTempPassword();
    const hash     = await bcrypt.hash(tempPass, 10);

    const result = await pool.query(
      `UPDATE school_admins
       SET password_hash = $1, temp_password_flag = true
       WHERE id = $2
       RETURNING username, school_id`,
      [hash, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Admin not found' });

    const school = await pool.query('SELECT name FROM schools WHERE id=$1', [result.rows[0].school_id]);
    await logAudit(pool, {
      actor:     req.sysAdmin.username,
      actorRole: 'system_admin',
      action:    'RESET_ADMIN_PASSWORD',
      target:    result.rows[0].username,
      school:    school.rows[0]?.name,
    });

    return res.json({
      success:      true,
      username:     result.rows[0].username,
      tempPassword: tempPass,
      message:      'Password reset. Show this password to the admin — it will not be shown again.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ── NEW: School admin can reset their OWN teacher/student passwords ──────────
// PATCH /api/management/admins/reset-password (school admin resets own account)
// This route is mounted separately in server.js on requireSchoolAdmin
const schoolAdminSelfReset = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8)
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  if (/\s/.test(newPassword))
    return res.status(400).json({ error: 'Password cannot contain spaces' });

  try {
    const { rows } = await pool.query(
      'SELECT password_hash FROM school_admins WHERE id = $1',
      [req.admin.id]
    );
    const currentHash = rows[0]?.password_hash;

    // Verify current
    if (currentHash) {
      const valid = await bcrypt.compare(currentPassword || '', currentHash);
      if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // FIX: Prevent reusing the same password
    if (currentHash) {
      const isSame = await bcrypt.compare(newPassword, currentHash);
      if (isSame)
        return res.status(400).json({
          error: 'New password cannot be the same as your current password.',
        });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE school_admins SET password_hash = $1, temp_password_flag = false WHERE id = $2',
      [newHash, req.admin.id]
    );

    await logAudit(pool, {
      actor:     req.admin.username,
      actorRole: 'school_admin',
      action:    'CHANGE_PASSWORD',
      target:    req.admin.username,
      school:    req.admin.school,
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('[school admin change password]', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// PATCH /api/system/admins/:id/toggle-active
router.patch('/api/system/admins/:id/toggle-active', requireSystemAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE school_admins SET is_active = NOT is_active WHERE id = $1
       RETURNING id, username, is_active, school_id`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Admin not found' });
    const { username, is_active, school_id } = result.rows[0];
    const school = await pool.query('SELECT name FROM schools WHERE id=$1', [school_id]);
    await logAudit(pool, { actor: req.sysAdmin.username, actorRole: 'system_admin', action: is_active ? 'REACTIVATE_ADMIN' : 'SUSPEND_ADMIN', target: username, school: school.rows[0]?.name });
    return res.json({ success: true, isActive: is_active });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/system/admins/:id
router.delete('/api/system/admins/:id', requireSystemAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM school_admins WHERE id=$1 RETURNING username, school_id', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Admin not found' });
    const school = await pool.query('SELECT name FROM schools WHERE id=$1', [result.rows[0].school_id]);
    await logAudit(pool, { actor: req.sysAdmin.username, actorRole: 'system_admin', action: 'DELETE_ADMIN', target: result.rows[0].username, school: school.rows[0]?.name });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// NOTE: School endpoints (GET, POST, PATCH) now handled by systemRoutes.js
// These were removed to avoid routing conflicts and use proper image_id + school_images table
// The new endpoints in systemRoutes.js handle:
// - GET /api/system/schools with admin_count
// - POST /api/system/schools with imageBase64 → school_images table
// - PATCH /api/system/schools/:schoolId with image updates

// GET /api/system/overview
router.get('/api/system/overview', requireSystemAdmin, async (req, res) => {
  try {
    const [appStats, schoolStats, recentLogs] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status='pending') AS pending, COUNT(*) FILTER (WHERE status='approved') AS approved, COUNT(*) FILTER (WHERE status='rejected') AS rejected, COUNT(*) FILTER (WHERE status='accepted') AS accepted, COUNT(*) FILTER (WHERE submitted_at > NOW() - INTERVAL '24 hours') AS today FROM applications`),
      pool.query(`SELECT s.name, s.is_active, COUNT(a.id) AS applications, COUNT(a.id) FILTER (WHERE a.status='pending') AS pending FROM schools s LEFT JOIN applications a ON a.school = s.name GROUP BY s.id ORDER BY s.name`),
      pool.query(`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20`),
    ]);
    return res.json({ applications: appStats.rows[0], schools: schoolStats.rows, recentActivity: recentLogs.rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/system/logs
router.get('/api/system/logs', requireSystemAdmin, async (req, res) => {
  const { school, from, to, limit = 100 } = req.query;
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (school) { params.push(school); where += ` AND school = $${params.length}`; }
    if (from)   { params.push(from);   where += ` AND created_at >= $${params.length}`; }
    if (to)     { params.push(to);     where += ` AND created_at <= $${params.length}`; }
    params.push(Math.min(Number(limit), 500));
    const result = await pool.query(`SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${params.length}`, params);
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────
//  HELPER: write an audit log entry
// ─────────────────────────────────────────────────────────────
async function logAudit(db, { actor, actorRole, action, target, school, detail }) {
  try {
    await db.query(
      `INSERT INTO audit_logs (actor, actor_role, action, target, school, detail)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [actor, actorRole, action, target || null, school || null, detail || null]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

module.exports = { router, requireSchoolAdmin, requireSystemAdmin, logAudit, schoolAdminSelfReset };