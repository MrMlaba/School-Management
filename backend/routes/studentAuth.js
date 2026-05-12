const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');

const STUDENT_JWT_SECRET = process.env.STUDENT_JWT_SECRET || 'change_me_student';
const TOKEN_EXPIRY = '8h';

const router = express.Router();

// requireStudent middleware
const requireStudent = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ message: 'No token provided' });
  try {
    req.student = jwt.verify(auth.slice(7), STUDENT_JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Helper to generate temp password
function genTempPassword() {
  return crypto.randomBytes(4).toString('hex'); // 8 chars
}

// Admin: set single student credentials
// POST /api/management/students/:id/set-credentials
const setStudentCredentials = async (req, res) => {
  const admin = req.admin; // requireSchoolAdmin middleware must set this
  const studentId = req.params.id;
  const { password } = req.body;
  try {
    const { rows } = await pool.query('SELECT id, student_number, school_id FROM enrolled_students WHERE id = $1', [studentId]);
    if (!rows.length) return res.status(404).json({ message: 'Student not found' });
    const student = rows[0];
    const temp = password || genTempPassword();
    const hash = await bcrypt.hash(temp, 10);
    await pool.query(
      `UPDATE enrolled_students SET password_hash = $1, temp_password_flag = true, updated_at = NOW() WHERE id = $2`,
      [hash, studentId]
    );
    res.json({ success: true, studentNumber: student.student_number, tempPassword: temp });
  } catch (err) {
    console.error('[set student credentials]', err);
    res.status(500).json({ message: 'Failed to set credentials' });
  }
};

// Admin: bulk generate credentials for students without password
// POST /api/management/students/generate-credentials
const bulkGenerate = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id, student_number FROM enrolled_students WHERE password_hash IS NULL OR password_hash = ''");
    const out = [];
    for (const s of rows) {
      const temp = genTempPassword();
      const hash = await bcrypt.hash(temp, 10);
      await pool.query('UPDATE enrolled_students SET password_hash = $1, temp_password_flag = true WHERE id = $2', [hash, s.id]);
      out.push({ id: s.id, studentNumber: s.student_number, tempPassword: temp });
    }
    res.json({ success: true, generated: out.length, details: out });
  } catch (err) {
    console.error('[bulk generate student credentials]', err);
    res.status(500).json({ message: 'Failed to generate credentials' });
  }
};

// Student login
// POST /api/student-login
const studentLogin = async (req, res) => {
  const { studentNumber, password } = req.body || {};
  if (!studentNumber || !password) return res.status(400).json({ message: 'studentNumber and password required' });
  try {
    const { rows } = await pool.query('SELECT id, student_number, password_hash, first_name, last_name, school_id, temp_password_flag FROM enrolled_students WHERE student_number = $1 AND is_active = true', [studentNumber]);
    const student = rows[0];
    if (!student) return res.status(401).json({ message: 'Invalid credentials' });
    if (!student.password_hash) return res.status(401).json({ message: 'No password set — contact admin' });
    const valid = await bcrypt.compare(password, student.password_hash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    await pool.query('UPDATE enrolled_students SET last_login = NOW() WHERE id = $1', [student.id]);
    const token = jwt.sign({ id: student.id, studentNumber: student.student_number, schoolId: student.school_id, firstName: student.first_name, lastName: student.last_name }, STUDENT_JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    res.json({ success: true, token, tempPasswordFlag: student.temp_password_flag });
  } catch (err) {
    console.error('[student login]', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Student change password
// POST /api/student/change-password
const studentChangePassword = async (req, res) => {
  const studentId = req.student?.id;
  const { currentPassword, newPassword } = req.body || {};
  if (!studentId) return res.status(401).json({ message: 'Not authenticated' });
  if (!newPassword || newPassword.length < 6) return res.status(400).json({ message: 'New password must be at least 6 characters' });
  try {
    const { rows } = await pool.query('SELECT password_hash FROM enrolled_students WHERE id = $1', [studentId]);
    const hash = rows[0]?.password_hash;
    if (hash) {
      const valid = await bcrypt.compare(currentPassword || '', hash);
      if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });
    }
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE enrolled_students SET password_hash = $1, temp_password_flag = false WHERE id = $2', [newHash, studentId]);
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    console.error('[student change password]', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { router, requireStudent, setStudentCredentials, bulkGenerate, studentLogin, studentChangePassword };
