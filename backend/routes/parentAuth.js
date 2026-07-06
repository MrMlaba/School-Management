const bcrypt  = require('bcrypt');
const jwt     = require('jsonwebtoken');
const crypto  = require('crypto');
const pool    = require('../db');

const PARENT_JWT_SECRET = process.env.PARENT_JWT_SECRET;
if (!PARENT_JWT_SECRET) throw new Error('PARENT_JWT_SECRET environment variable is required');
const TOKEN_EXPIRY = '8h';

// ── requireParent middleware ──────────────────────────────────────────────────
const requireParent = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'No token provided' });
  try {
    req.parent = jwt.verify(auth.slice(7), PARENT_JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

function genTempPassword() {
  return crypto.randomBytes(4).toString('hex'); // 8 hex chars
}

// ── Admin: generate/reset a parent's login credentials ───────────────────────
// POST /api/management/parents/:id/reset-password
const resetParentCredentials = async (req, res) => {
  const admin    = req.admin;
  const parentId = req.params.id;
  try {
    const { rows } = await pool.query(
      'SELECT id, first_name, last_name, username FROM parents WHERE id = $1 AND school_id = $2',
      [parentId, admin.schoolId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Parent not found' });

    const parent   = rows[0];
    const username  = parent.username || `parent${parent.id}`;
    const tempPass  = genTempPassword();
    const hash      = await bcrypt.hash(tempPass, 10);

    await pool.query(
      `UPDATE parents SET username = $1, password_hash = $2, temp_password_flag = true WHERE id = $3`,
      [username, hash, parentId]
    );

    // Temp password shown ONCE here — admin must write it down and give it to the parent
    res.json({
      success:      true,
      username,
      tempPassword: tempPass,
      firstName:    parent.first_name,
      lastName:     parent.last_name,
      message:      'Password reset. Show this username and password to the parent — the password will not be shown again.',
    });
  } catch (err) {
    console.error('[reset parent credentials]', err);
    if (err.code === '23505') return res.status(409).json({ message: 'Username already taken' });
    res.status(500).json({ message: 'Failed to reset credentials' });
  }
};

// ── Parent login ──────────────────────────────────────────────────────────────
// POST /api/parent-login
const parentLogin = async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ message: 'username and password required' });

  try {
    const { rows } = await pool.query(
      `SELECT id, username, password_hash, first_name, last_name, school_id, temp_password_flag
       FROM parents WHERE username = $1`,
      [username]
    );
    const parent = rows[0];
    if (!parent)                 return res.status(401).json({ message: 'Invalid credentials' });
    if (!parent.password_hash)   return res.status(401).json({ message: 'No password set — contact the school' });

    const valid = await bcrypt.compare(password, parent.password_hash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    await pool.query('UPDATE parents SET last_login = NOW() WHERE id = $1', [parent.id]);

    const token = jwt.sign(
      { id: parent.id, schoolId: parent.school_id, firstName: parent.first_name, lastName: parent.last_name },
      PARENT_JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    res.json({
      success: true, token, tempPasswordFlag: parent.temp_password_flag,
      parent: { id: parent.id, firstName: parent.first_name, lastName: parent.last_name },
    });
  } catch (err) {
    console.error('[parent login]', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Parent change password ────────────────────────────────────────────────────
// POST /api/parent/change-password
const parentChangePassword = async (req, res) => {
  const parentId = req.parent?.id;
  const { currentPassword, newPassword } = req.body || {};

  if (!parentId) return res.status(401).json({ message: 'Not authenticated' });
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  if (/\s/.test(newPassword))
    return res.status(400).json({ message: 'Password cannot contain spaces' });

  try {
    const { rows } = await pool.query('SELECT password_hash FROM parents WHERE id = $1', [parentId]);
    const row = rows[0];
    if (!row) return res.status(404).json({ message: 'Parent not found' });

    if (row.password_hash) {
      const valid = await bcrypt.compare(currentPassword || '', row.password_hash);
      if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });

      const isSame = await bcrypt.compare(newPassword, row.password_hash);
      if (isSame)
        return res.status(400).json({ message: 'New password cannot be the same as your current password. Please choose a different password.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE parents SET password_hash = $1, temp_password_flag = false WHERE id = $2', [newHash, parentId]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('[parent change password]', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  requireParent,
  resetParentCredentials,
  parentLogin,
  parentChangePassword,
};
