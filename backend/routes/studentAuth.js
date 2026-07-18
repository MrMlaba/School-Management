const express = require('express');
const bcrypt        = require('bcrypt');
const jwt           = require('jsonwebtoken');
const crypto        = require('crypto');
const pool          = require('../db');
const { logAudit }  = require('../auth');

const STUDENT_JWT_SECRET = process.env.STUDENT_JWT_SECRET;
if (!STUDENT_JWT_SECRET) throw new Error('STUDENT_JWT_SECRET environment variable is required');
const TOKEN_EXPIRY       = '8h';
const router             = express.Router();

// ── requireStudent middleware ─────────────────────────────────────────────────
const requireStudent = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'No token provided' });
  try {
    req.student = jwt.verify(auth.slice(7), STUDENT_JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// ── Generate temp password ────────────────────────────────────────────────────
function genTempPassword() {
  return crypto.randomBytes(4).toString('hex'); // 8 hex chars
}

// ── Admin: set single student credentials ────────────────────────────────────
// POST /api/management/students/:id/set-credentials
const setStudentCredentials = async (req, res) => {
  const admin     = req.admin;
  const studentId = req.params.id;
  const { password } = req.body;

  try {
    const { rows } = await pool.query(
      'SELECT id, student_number, school_id FROM enrolled_students WHERE id = $1 AND school_id = $2',
      [studentId, admin.schoolId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Student not found' });

    const student = rows[0];
    const temp    = password || genTempPassword();
    const hash    = await bcrypt.hash(temp, 10);

    await pool.query(
      `UPDATE enrolled_students
       SET password_hash = $1, temp_password_flag = true, updated_at = NOW()
       WHERE id = $2`,
      [hash, studentId]
    );

    // Temp password shown ONCE here — admin must write it down
    res.json({ success: true, studentNumber: student.student_number, tempPassword: temp });
  } catch (err) {
    console.error('[set student credentials]', err);
    res.status(500).json({ message: 'Failed to set credentials' });
  }
};

// ── Admin: reset student password ────────────────────────────────────────────
// POST /api/management/students/:id/reset-password
// Generates a new temp password and returns it ONCE — shown to admin, never stored plain
const resetStudentPassword = async (req, res) => {
  const admin     = req.admin;
  const studentId = req.params.id;

  try {
    const { rows } = await pool.query(
      `SELECT id, student_number, first_name, last_name, school_id
       FROM enrolled_students WHERE id = $1 AND school_id = $2`,
      [studentId, admin.schoolId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Student not found' });

    const student  = rows[0];
    const tempPass = genTempPassword();
    const hash     = await bcrypt.hash(tempPass, 10);

    await pool.query(
      `UPDATE enrolled_students
       SET password_hash = $1, temp_password_flag = true, updated_at = NOW()
       WHERE id = $2`,
      [hash, studentId]
    );

    // Audit log
    try {
      await pool.query(
        `INSERT INTO audit_logs (school_id, admin_id, actor, actor_role, action, target_type, target_id, target, created_at)
         VALUES ($1,$2,$3,'school_admin','RESET_STUDENT_PASSWORD','student',$4,$5,NOW())`,
        [admin.schoolId, admin.id, admin.username, studentId, `${student.first_name} ${student.last_name}`]
      );
    } catch {}

    // Temp password shown ONCE — admin writes it down and gives to student
    res.json({
      success:        true,
      studentNumber:  student.student_number,
      firstName:      student.first_name,
      lastName:       student.last_name,
      tempPassword:   tempPass,
      message:        'Password reset. Show this password to the student — it will not be shown again.',
    });
  } catch (err) {
    console.error('[reset student password]', err);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

// ── Admin: bulk generate credentials ─────────────────────────────────────────
// POST /api/management/students/generate-credentials
const bulkGenerate = async (req, res) => {
  const schoolId = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      `SELECT id, student_number
       FROM enrolled_students
       WHERE (password_hash IS NULL OR password_hash = '') AND school_id = $1`,
      [schoolId]
    );
    const out = [];
    for (const s of rows) {
      const temp = genTempPassword();
      const hash = await bcrypt.hash(temp, 10);
      await pool.query(
        'UPDATE enrolled_students SET password_hash = $1, temp_password_flag = true WHERE id = $2',
        [hash, s.id]
      );
      out.push({ id: s.id, studentNumber: s.student_number, tempPassword: temp });
    }
    res.json({ success: true, generated: out.length, details: out });
  } catch (err) {
    console.error('[bulk generate student credentials]', err);
    res.status(500).json({ message: 'Failed to generate credentials' });
  }
};

// ── Student login ─────────────────────────────────────────────────────────────
// POST /api/student-login
const studentLogin = async (req, res) => {
  const { studentNumber, password } = req.body || {};
  if (!studentNumber || !password)
    return res.status(400).json({ message: 'studentNumber and password required' });

  try {
    const { rows } = await pool.query(
      `SELECT id, student_number, password_hash, first_name, last_name,
              school_id, temp_password_flag
       FROM enrolled_students
       WHERE student_number = $1 AND is_active = true`,
      [studentNumber]
    );
    const student = rows[0];
    if (!student)                 return res.status(401).json({ message: 'Invalid credentials' });
    if (!student.password_hash)   return res.status(401).json({ message: 'No password set — contact admin' });

    const valid = await bcrypt.compare(password, student.password_hash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    await pool.query('UPDATE enrolled_students SET last_login = NOW() WHERE id = $1', [student.id]);
    await logAudit(pool, { actor: student.student_number, actorRole: 'student', action: 'LOGIN', target: null, schoolId: student.school_id });

    const token = jwt.sign(
      { id: student.id, studentNumber: student.student_number, schoolId: student.school_id, firstName: student.first_name, lastName: student.last_name },
      STUDENT_JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    res.json({ success: true, token, tempPasswordFlag: student.temp_password_flag });
  } catch (err) {
    console.error('[student login]', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Student change password ───────────────────────────────────────────────────
// POST /api/student/change-password
// FIX: Prevents student from setting the same password as the current one
const studentChangePassword = async (req, res) => {
  const studentId = req.student?.id;
  const { currentPassword, newPassword } = req.body || {};

  if (!studentId) return res.status(401).json({ message: 'Not authenticated' });

  // Minimum length
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ message: 'New password must be at least 6 characters' });

  // No spaces allowed
  if (/\s/.test(newPassword))
    return res.status(400).json({ message: 'Password cannot contain spaces' });

  try {
    const { rows } = await pool.query(
      'SELECT password_hash, temp_password_flag FROM enrolled_students WHERE id = $1',
      [studentId]
    );
    const row = rows[0];
    if (!row) return res.status(404).json({ message: 'Student not found' });

    const currentHash = row.password_hash;

    // Verify current password
    if (currentHash) {
      const valid = await bcrypt.compare(currentPassword || '', currentHash);
      if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // FIX: Prevent reusing the same password (especially temp password)
    if (currentHash) {
      const isSame = await bcrypt.compare(newPassword, currentHash);
      if (isSame)
        return res.status(400).json({
          message: 'New password cannot be the same as your current password. Please choose a different password.',
        });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE enrolled_students SET password_hash = $1, temp_password_flag = false WHERE id = $2',
      [newHash, studentId]
    );

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('[student change password]', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  router,
  requireStudent,
  setStudentCredentials,
  resetStudentPassword,
  bulkGenerate,
  studentLogin,
  studentChangePassword,
};