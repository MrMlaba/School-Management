// ============================================================
//  auth.js  —  System admin middleware & route handlers
//  Imported by server.js — do not run this file directly
// ============================================================

const express  = require('express');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcrypt');
const pool     = require('./db');   // same db connection as server.js
const router   = express.Router();

// ── Env vars (add these to your .env) ───────────────────────
//   JWT_SECRET=some_long_random_string_for_school_admins
//   SYSTEM_JWT_SECRET=different_long_random_string_for_system
// ────────────────────────────────────────────────────────────
const SCHOOL_JWT_SECRET = process.env.JWT_SECRET         || 'change_me_school';
const SYSTEM_JWT_SECRET = process.env.SYSTEM_JWT_SECRET  || 'change_me_system';
const TOKEN_EXPIRY      = '8h';   // school admin sessions
const SYSTEM_EXPIRY     = '4h';   // system admin sessions (shorter = more secure)

// ─────────────────────────────────────────────────────────────
//  MIDDLEWARE: protect school admin routes
//  Usage:  router.get('/api/applications', requireSchoolAdmin, handler)
// ─────────────────────────────────────────────────────────────
const requireSchoolAdmin = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const payload = jwt.verify(header.split(' ')[1], SCHOOL_JWT_SECRET);
    req.admin = payload;   // { id, username, school, schoolId }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ─────────────────────────────────────────────────────────────
//  MIDDLEWARE: protect system admin routes
//  Usage:  router.get('/system/admins', requireSystemAdmin, handler)
// ─────────────────────────────────────────────────────────────
const requireSystemAdmin = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const payload = jwt.verify(header.split(' ')[1], SYSTEM_JWT_SECRET);
    req.sysAdmin = payload;   // { id, username }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ─────────────────────────────────────────────────────────────
//  ROUTE: POST /api/system/login  (system admin)
//  School admin login is handled in server.js → POST /api/admin-login
// ─────────────────────────────────────────────────────────────
router.post('/api/system/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, username, password_hash FROM system_admin WHERE username = $1',
      [username]
    );

    const sys = result.rows[0];
    if (!sys) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, sys.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last_login
    await pool.query(
      'UPDATE system_admin SET last_login = NOW() WHERE id = $1',
      [sys.id]
    );

    // Audit log
    await logAudit(pool, {
      actor:     sys.username,
      actorRole: 'system_admin',
      action:    'SYSTEM_LOGIN',
      target:    null,
      school:    null,
    });

    const token = jwt.sign(
      { id: sys.id, username: sys.username },
      SYSTEM_JWT_SECRET,
      { expiresIn: SYSTEM_EXPIRY }
    );

    return res.json({ token, username: sys.username });
  } catch (err) {
    console.error('System login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────
//  SYSTEM ADMIN ROUTES
// ─────────────────────────────────────────────────────────────

// GET /api/system/admins — list all school admins
router.get('/api/system/admins', requireSystemAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sa.id, sa.name, sa.username, sa.is_active,
              sa.temp_password_flag, sa.created_at, sa.last_login,
              s.name AS school, s.id AS school_id
       FROM   school_admins sa
       JOIN   schools s ON s.id = sa.school_id
       ORDER  BY s.name, sa.username`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/system/admins — create a new school admin
router.post('/api/system/admins', requireSystemAdmin, async (req, res) => {
  const { name, username, password, schoolId } = req.body;
  if (!name || !username || !password || !schoolId) {
    return res.status(400).json({ error: 'name, username, password and schoolId are required' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO school_admins (name, username, password_hash, school_id, temp_password_flag)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, name, username, school_id, is_active, created_at`,
      [name, username, hash, schoolId]
    );

    // Get school name for audit
    const school = await pool.query('SELECT name FROM schools WHERE id=$1', [schoolId]);

    await logAudit(pool, {
      actor:     req.sysAdmin.username,
      actorRole: 'system_admin',
      action:    'CREATE_ADMIN',
      target:    username,
      school:    school.rows[0]?.name || schoolId,
    });

    return res.status(201).json({ success: true, admin: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already exists' });
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/system/admins/:id/reset-password — manual password reset
router.patch('/api/system/admins/:id/reset-password', requireSystemAdmin, async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  try {
    const hash = await bcrypt.hash(newPassword, 10);
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
      action:    'RESET_PASSWORD',
      target:    result.rows[0].username,
      school:    school.rows[0]?.name,
    });

    return res.json({ success: true, message: 'Password reset. Admin must change it on next login.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/system/admins/:id/toggle-active — suspend or reactivate
router.patch('/api/system/admins/:id/toggle-active', requireSystemAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE school_admins
       SET is_active = NOT is_active
       WHERE id = $1
       RETURNING id, username, is_active, school_id`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Admin not found' });

    const { username, is_active, school_id } = result.rows[0];
    const school = await pool.query('SELECT name FROM schools WHERE id=$1', [school_id]);

    await logAudit(pool, {
      actor:     req.sysAdmin.username,
      actorRole: 'system_admin',
      action:    is_active ? 'REACTIVATE_ADMIN' : 'SUSPEND_ADMIN',
      target:    username,
      school:    school.rows[0]?.name,
    });

    return res.json({ success: true, isActive: is_active });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/system/admins/:id — delete a school admin
router.delete('/api/system/admins/:id', requireSystemAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM school_admins WHERE id=$1 RETURNING username, school_id',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Admin not found' });

    const school = await pool.query('SELECT name FROM schools WHERE id=$1', [result.rows[0].school_id]);

    await logAudit(pool, {
      actor:     req.sysAdmin.username,
      actorRole: 'system_admin',
      action:    'DELETE_ADMIN',
      target:    result.rows[0].username,
      school:    school.rows[0]?.name,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/system/schools — list all schools with admin count
router.get('/api/system/schools', requireSystemAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*,
              COUNT(sa.id)                                    AS admin_count,
              COUNT(a.id)                                     AS application_count
       FROM   schools s
       LEFT   JOIN school_admins sa ON sa.school_id = s.id AND sa.is_active = true
       LEFT   JOIN applications  a  ON a.school = s.name
       GROUP  BY s.id
       ORDER  BY s.name`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/system/schools — create a new school
router.post('/api/system/schools', requireSystemAdmin, async (req, res) => {
  const { name, location, image, grades, streams, phone, email, principal } = req.body;
  if (!name || !location) {
    return res.status(400).json({ error: 'name and location are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO schools (name, location, image, grades, streams, phone, email, principal)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        name, location, image || null,
        JSON.stringify(grades  || ['Grade 8','Grade 9','Grade 10','Grade 11','Grade 12']),
        JSON.stringify(streams || ['Physics','Commerce','Humanities']),
        phone || null, email || null, principal || null,
      ]
    );

    await logAudit(pool, {
      actor:     req.sysAdmin.username,
      actorRole: 'system_admin',
      action:    'CREATE_SCHOOL',
      target:    name,
      school:    name,
    });

    return res.status(201).json({ success: true, school: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'School name already exists' });
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/system/schools/:id — edit a school
router.patch('/api/system/schools/:id', requireSystemAdmin, async (req, res) => {
  const { name, location, image, grades, streams, phone, email, principal, isActive } = req.body;
  try {
    const result = await pool.query(
      `UPDATE schools
       SET  name      = COALESCE($1, name),
            location  = COALESCE($2, location),
            image     = COALESCE($3, image),
            grades    = COALESCE($4::jsonb, grades),
            streams   = COALESCE($5::jsonb, streams),
            phone     = COALESCE($6, phone),
            email     = COALESCE($7, email),
            principal = COALESCE($8, principal),
            is_active = COALESCE($9, is_active)
       WHERE id = $10
       RETURNING *`,
      [
        name || null, location || null, image || null,
        grades  ? JSON.stringify(grades)  : null,
        streams ? JSON.stringify(streams) : null,
        phone || null, email || null, principal || null,
        isActive !== undefined ? isActive : null,
        req.params.id,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'School not found' });

    await logAudit(pool, {
      actor:     req.sysAdmin.username,
      actorRole: 'system_admin',
      action:    'UPDATE_SCHOOL',
      target:    result.rows[0].name,
      school:    result.rows[0].name,
    });

    return res.json({ success: true, school: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/system/overview — dashboard stats
router.get('/api/system/overview', requireSystemAdmin, async (req, res) => {
  try {
    const [appStats, schoolStats, recentLogs] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)                                              AS total,
          COUNT(*) FILTER (WHERE status = 'pending')           AS pending,
          COUNT(*) FILTER (WHERE status = 'approved')          AS approved,
          COUNT(*) FILTER (WHERE status = 'rejected')          AS rejected,
          COUNT(*) FILTER (WHERE status = 'accepted')          AS accepted,
          COUNT(*) FILTER (WHERE submitted_at > NOW() - INTERVAL '24 hours') AS today
        FROM applications
      `),
      pool.query(`
        SELECT s.name, s.is_active,
               COUNT(a.id) AS applications,
               COUNT(a.id) FILTER (WHERE a.status='pending') AS pending
        FROM   schools s
        LEFT   JOIN applications a ON a.school = s.name
        GROUP  BY s.id
        ORDER  BY s.name
      `),
      pool.query(`
        SELECT * FROM audit_log
        ORDER BY created_at DESC
        LIMIT 20
      `),
    ]);

    return res.json({
      applications: appStats.rows[0],
      schools:      schoolStats.rows,
      recentActivity: recentLogs.rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/system/logs — full audit log with optional filters
router.get('/api/system/logs', requireSystemAdmin, async (req, res) => {
  const { school, from, to, limit = 100 } = req.query;
  try {
    let where = 'WHERE 1=1';
    const params = [];
    if (school) { params.push(school);    where += ` AND school = $${params.length}`; }
    if (from)   { params.push(from);      where += ` AND created_at >= $${params.length}`; }
    if (to)     { params.push(to);        where += ` AND created_at <= $${params.length}`; }
    params.push(Math.min(Number(limit), 500));

    const result = await pool.query(
      `SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
      params
    );
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
      `INSERT INTO audit_log (actor, actor_role, action, target, school, detail)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [actor, actorRole, action, target || null, school || null, detail || null]
    );
  } catch (err) {
    // Never let a logging failure break the main request
    console.error('Audit log error:', err.message);
  }
}

module.exports = { router, requireSchoolAdmin, requireSystemAdmin, logAudit };