const express    = require('express');
const cors       = require('cors');
const multer     = require('multer');
const fs         = require('fs');
const path       = require('path');
const crypto     = require('crypto');
const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcrypt');
const rateLimit  = require('express-rate-limit');
require('dotenv').config();

const pool = require('./db');

const { router: authRouter, requireSchoolAdmin, requireSystemAdmin, logAudit, schoolAdminSelfReset } = require('./auth');
const { router: teacherRouter, requireTeacher, login: teacherLogin, setTeacherCredentials } = require('./routes/teacherRoutes');
const { setStudentCredentials, resetStudentPassword, bulkGenerate, studentLogin, studentChangePassword, requireStudent } = require('./routes/studentAuth');
const { requireParent, resetParentCredentials, parentLogin, parentChangePassword } = require('./routes/parentAuth');
const { schoolAdminTicketsRouter, systemAdminTicketsRouter } = require('./routes/supportRoutes');
const { router: systemRouter, requireSystemAdmin: requireSystemAdminFromSystem } = require('./routes/systemRoutes');
const managementRoutes = require('./routes/managementRoutes');
const phase2Routes     = require('./routes/phase2Routes');
const phase3Routes     = require('./routes/phase3Routes');
const eventsRoutes     = require('./routes/eventsRoutes');
const { teacherQuizRouter, studentQuizRouter } = require('./routes/quizRoutes');
const chatRoutes       = require('./routes/chatRoutes');

const app  = express();
const PORT = process.env.PORT || 8080;

const SCHOOL_JWT_SECRET = process.env.JWT_SECRET;
if (!SCHOOL_JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
const TOKEN_EXPIRY      = '8h';

// ─── FIX 1: Trust proxy — Railway sits behind a load balancer ────────────────
// Without this, express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
// and BLOCKS requests. This was silently preventing writes from reaching the DB.
app.set('trust proxy', 1);

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Explicit origins (comma-separated) win first; ALLOWED_ORIGINS should list the
// production Vercel domain and any custom domain. Beyond that, only THIS
// project's own Vercel preview deployments are trusted — not "any *.vercel.app",
// which would let any other Vercel-hosted site make credentialed requests here.
const explicitAllowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://school-application.vercel.app')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);
const VERCEL_PREVIEW_PREFIX = process.env.VERCEL_PROJECT_SLUG || 'school-application';

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (
      explicitAllowedOrigins.includes(origin) ||
      (/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin) && origin.startsWith(`https://${VERCEL_PREVIEW_PREFIX}-`)) ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// ─── Rate limiters ────────────────────────────────────────────────────────────
const studentLoginLimiter     = rateLimit({ windowMs: 15*60*1000, max: 15, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' } });
const teacherLoginLimiter     = rateLimit({ windowMs: 15*60*1000, max: 10, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' } });
const schoolAdminLoginLimiter = rateLimit({ windowMs: 30*60*1000, max:  8, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many login attempts. Try again in 30 minutes.' } });
const systemAdminLoginLimiter = rateLimit({ windowMs: 60*60*1000, max:  5, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many login attempts. Try again in 60 minutes.' } });
const applicantLookupLimiter  = rateLimit({ windowMs: 15*60*1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many lookup attempts. Try again in 15 minutes.' } });
const parentLoginLimiter      = rateLimit({ windowMs: 15*60*1000, max: 10, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' } });

app.use('/api/system/login', systemAdminLoginLimiter);
app.use('/api/applicant-applications', applicantLookupLimiter);
app.use(authRouter);

// ─── System Admin Routes ──────────────────────────────────────────────────────
app.use('/api/system', systemRouter);
app.use('/api/system', requireSystemAdmin, systemAdminTicketsRouter);

// GET /api/system/health — real infrastructure status, not app-level stats.
// Pings the database directly rather than trusting the pool's last-known state,
// so a genuinely down DB shows up even if no query has been attempted recently.
app.get('/api/system/health', requireSystemAdmin, async (req, res) => {
  const start = Date.now();
  let dbConnected = false;
  let dbLatencyMs = null;
  try {
    await pool.query('SELECT 1');
    dbConnected = true;
    dbLatencyMs = Date.now() - start;
  } catch {}

  let errors24h = null;
  if (dbConnected) {
    try {
      const { rows } = await pool.query(
        `SELECT COUNT(*) AS count FROM system_errors WHERE created_at > NOW() - INTERVAL '24 hours'`
      );
      errors24h = Number(rows[0].count);
    } catch {}
  }

  res.json({
    status: dbConnected ? 'operational' : 'degraded',
    database: { connected: dbConnected, latencyMs: dbLatencyMs },
    server: {
      uptimeSeconds: Math.round(process.uptime()),
      nodeVersion:   process.version,
      memoryMb:      Math.round(process.memoryUsage().rss / 1024 / 1024),
    },
    errors24h,
    checkedAt: new Date().toISOString(),
  });
});

// GET /api/system/errors — recent unhandled server errors, for the health panel.
// Only unhandled/crash-level errors land here (see the global error handler near
// the bottom of this file) — routes that already return their own 4xx/5xx via
// try/catch are working as designed and aren't "errors" in this sense.
app.get('/api/system/errors', requireSystemAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, method, path, message, created_at AS "createdAt"
       FROM system_errors ORDER BY created_at DESC LIMIT 50`
    );
    res.json(rows);
  } catch (err) {
    console.error('[system errors list]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/management', requireSchoolAdmin, managementRoutes);
app.use('/api/setup',      requireSchoolAdmin, phase2Routes);
app.use('/api/management', requireSchoolAdmin, phase3Routes);
app.use('/api/management', requireSchoolAdmin, schoolAdminTicketsRouter);

app.post('/api/admin-login', schoolAdminLoginLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Username and password required' });
  try {
    const { rows } = await pool.query(
      `SELECT sa.id, sa.username, sa.name, sa.password_hash, sa.is_active, sa.temp_password_flag,
              s.name AS school, s.id AS school_id
       FROM school_admins sa JOIN schools s ON s.id = sa.school_id
       WHERE sa.username = $1`,
      [username]
    );
    const admin = rows[0];
    if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!admin.is_active) return res.status(403).json({ success: false, message: 'Account suspended.' });
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });
    await pool.query('UPDATE school_admins SET last_login = NOW() WHERE id = $1', [admin.id]);
    await logAudit(pool, { actor: admin.username, actorRole: 'school_admin', action: 'LOGIN', target: null, school: admin.school });
    const token = jwt.sign(
      { id: admin.id, username: admin.username, name: admin.name, school: admin.school, schoolId: admin.school_id },
      SCHOOL_JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    return res.json({ success: true, token, school: admin.school, name: admin.name, tempPasswordFlag: admin.temp_password_flag });
  } catch (err) {
    console.error('admin-login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.post('/api/teacher-login', teacherLoginLimiter, teacherLogin);
app.post('/api/student-login', studentLoginLimiter, studentLogin);
app.post('/api/parent-login',  parentLoginLimiter,  parentLogin);

app.use('/api/teacher', requireTeacher, teacherRouter);
app.post('/api/management/teachers/:id/set-credentials', requireSchoolAdmin, setTeacherCredentials);
app.post('/api/student/change-password',                 requireStudent,      studentChangePassword);
app.post('/api/management/students/:id/set-credentials', requireSchoolAdmin, setStudentCredentials);
app.post('/api/management/students/generate-credentials',requireSchoolAdmin, bulkGenerate);
app.post('/api/management/students/:id/reset-password',  requireSchoolAdmin, resetStudentPassword);
app.post('/api/admin/change-password',                   requireSchoolAdmin, schoolAdminSelfReset);
app.post('/api/parent/change-password',                  requireParent,      parentChangePassword);
app.post('/api/management/parents/:id/reset-password',   requireSchoolAdmin, resetParentCredentials);

app.post('/api/management/teachers/:id/reset-password', requireSchoolAdmin, async (req, res) => {
  const schoolId  = req.admin.schoolId;
  const teacherId = req.params.id;
  try {
    const { rows } = await pool.query(
      'SELECT id, first_name, last_name, username FROM teachers WHERE id = $1 AND school_id = $2',
      [teacherId, schoolId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Teacher not found' });
    const teacher  = rows[0];
    const tempPass = crypto.randomBytes(4).toString('hex');
    const hash     = await bcrypt.hash(tempPass, 10);
    await pool.query(
      'UPDATE teachers SET password_hash = $1, temp_password_flag = true, updated_at = NOW() WHERE id = $2',
      [hash, teacherId]
    );
    try {
      await pool.query(
        `INSERT INTO audit_logs (school_id, admin_id, actor, actor_role, action, target_type, target_id, target, created_at)
         VALUES ($1,$2,$3,'school_admin','RESET_TEACHER_PASSWORD','teacher',$4,$5,NOW())`,
        [schoolId, req.admin.id, req.admin.username, teacherId, `${teacher.first_name} ${teacher.last_name}`]
      );
    } catch {}
    res.json({
      success: true, username: teacher.username,
      firstName: teacher.first_name, lastName: teacher.last_name,
      tempPassword: tempPass,
      message: 'Password reset. Show this password to the teacher — it will not be shown again.',
    });
  } catch (err) {
    console.error('[reset teacher password]', err);
    res.status(500).json({ message: 'Failed to reset teacher password' });
  }
});

app.use('/api/management', requireSchoolAdmin, eventsRoutes);
app.use('/api/teacher',    requireTeacher,     teacherQuizRouter);
app.use('/api/student',    requireStudent,     studentQuizRouter);
app.use('/api/student',    requireStudent,     chatRoutes);

// ─── File Uploads — stored in PostgreSQL, not on disk ────────────────────────
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const allowedFileTypes = {
  id:          ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  parentId:    ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  removal:     ['application/pdf'],
  gradeResult: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  gradeReport: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  additional:  ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  schoolForm:  ['application/pdf'],
};
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function validateFile(file, expectedType) {
  if (file.size > MAX_FILE_SIZE)
    return { valid: false, error: 'File size exceeds 5 MB limit' };
  const typeKey = expectedType?.startsWith('schoolForm_') ? 'schoolForm' : expectedType;
  const allowed = allowedFileTypes[typeKey] || allowedFileTypes.additional;
  if (!allowed.includes(file.mimetype))
    return { valid: false, error: `Invalid file type. Allowed: ${allowed.join(', ')}` };
  return { valid: true };
}

// ─── School logo upload ───────────────────────────────────────────────────────
const schoolImgDir = path.join(__dirname, 'uploads', 'schools');
if (!fs.existsSync(schoolImgDir)) fs.mkdirSync(schoolImgDir, { recursive: true });

// ─── School application form template upload — stored in PostgreSQL ───────────
const uploadSchoolForm = multer({
  storage:    multer.memoryStorage(),
  limits:     { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => { cb(null, file.mimetype === 'application/pdf'); },
});

const schoolImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, schoolImgDir),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'school_' + crypto.randomBytes(12).toString('hex') + ext);
  },
});
const uploadSchoolImage = multer({
  storage:    schoolImageStorage,
  limits:     { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

app.post('/api/system/upload-image', requireSystemAdmin, uploadSchoolImage.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image file provided' });
  res.json({ success: true, url: '/api/school-images/' + req.file.filename });
});

app.get('/api/school-images/:filename', (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!filename || !/^[a-zA-Z0-9_.-]+$/.test(filename))
    return res.status(400).json({ success: false, message: 'Invalid filename' });
  const filePath = path.resolve(schoolImgDir, filename);
  if (!filePath.startsWith(schoolImgDir + path.sep))
    return res.status(400).json({ success: false, message: 'Invalid filename' });
  if (!fs.existsSync(filePath))
    return res.status(404).json({ success: false, message: 'Image not found' });
  res.sendFile(filePath);
});

// ─── Accept any valid token (school admin / student / teacher / system) ──────
const requireAnyAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ message: 'No token provided' });
  const token = header.slice(7);
  // These env vars are guaranteed set — the modules that own them
  // (auth.js, studentAuth.js, teacherRoutes.js, systemRoutes.js, parentAuth.js)
  // throw at require()-time, which happens before this handler can ever run.
  const secrets = [
    process.env.JWT_SECRET,
    process.env.STUDENT_JWT_SECRET,
    process.env.TEACHER_JWT_SECRET,
    process.env.SYSTEM_JWT_SECRET,
    process.env.PARENT_JWT_SECRET,
  ];
  for (const secret of secrets) {
    try { jwt.verify(token, secret); return next(); } catch {}
  }
  return res.status(401).json({ message: 'Invalid or expired token' });
};

// ─── Serve uploaded documents ─────────────────────────────────────────────────
app.get('/api/documents/:filename', requireAnyAuth, async (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!filename || !/^[a-zA-Z0-9_.-]+$/.test(filename))
    return res.status(400).json({ success: false, message: 'Invalid filename' });
  try {
    // Primary: read from PostgreSQL (application documents & school forms)
    const { rows } = await pool.query(
      'SELECT data, mimetype, original_name FROM document_files WHERE filename = $1',
      [filename]
    );
    if (rows.length) {
      res.setHeader('Content-Type', rows[0].mimetype || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${rows[0].original_name || filename}"`);
      return res.send(rows[0].data);
    }
    // Fallback: disk (legacy assignment/submission files)
    const uploadRoot = path.resolve(__dirname, 'uploads');
    const candidates = [
      path.join(uploadRoot, filename),
      path.join(uploadRoot, 'assignments', filename),
      path.join(uploadRoot, 'submissions', filename),
    ];
    const found = candidates.find(p => path.resolve(p).startsWith(uploadRoot + path.sep) && fs.existsSync(p));
    if (found) return res.sendFile(path.resolve(found));
    res.status(404).json({ success: false, message: 'File not found' });
  } catch (err) {
    console.error('GET /api/documents error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Student endpoints ────────────────────────────────────────────────────────
app.get('/api/student/me', requireStudent, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, student_number AS "studentNumber", first_name AS "firstName", last_name AS "lastName",
              email, phone, grade, stream, school_id AS "schoolId", enrollment_date AS "enrollmentDate"
       FROM enrolled_students WHERE id = $1`,
      [req.student.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Student not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[student me]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/student/assignments', requireStudent, async (req, res) => {
  try {
    const { rows: srows } = await pool.query(
      'SELECT grade, stream, school_id FROM enrolled_students WHERE id = $1',
      [req.student.id]
    );
    if (!srows.length) return res.status(404).json({ message: 'Student not found' });
    const { grade, stream, school_id } = srows[0];
    const numericGrade = parseInt((grade || '').replace(/[^0-9]/g, ''), 10) || null;
    const params = [school_id];
    let gradeFilter = '';
    if (numericGrade) { params.push(numericGrade); gradeFilter = `AND c.grade = $${params.length}`; }
    let streamFilter = '';
    if (stream) { params.push(stream); streamFilter = `AND (c.stream IS NULL OR c.stream = $${params.length})`; }
    const { rows } = await pool.query(
      `SELECT a.id, a.title, a.description, a.due_date AS "dueDate", a.total_marks AS "totalMarks",
              c.name AS "className", ss.name AS "subjectName"
       FROM assignments a
       JOIN classes c ON c.id = a.class_id
       JOIN school_subjects ss ON ss.id = a.subject_id
       WHERE c.school_id = $1 ${gradeFilter} ${streamFilter}
       ORDER BY a.due_date DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    console.error('[student assignments]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/student/exams
app.get('/api/student/exams', requireStudent, async (req, res) => {
  try {
    const studentId = req.student.id;
    const schoolId  = req.student.schoolId;
    const { rows: stuRows } = await pool.query(
      'SELECT grade, stream FROM enrolled_students WHERE id = $1', [studentId]
    );
    if (!stuRows.length) return res.status(404).json({ message: 'Student not found' });
    const { grade, stream } = stuRows[0];
    const numericGrade = parseInt((grade || '').replace(/[^0-9]/g, ''), 10);
    if (!numericGrade) return res.json([]);

    const { rows: clsRows } = await pool.query(
      `SELECT id FROM classes
       WHERE school_id = $1 AND grade = $2
         AND (($3::TEXT IS NULL AND stream IS NULL) OR stream = $3)
         AND is_active = true
       LIMIT 1`,
      [schoolId, numericGrade, stream || null]
    );

    let exams;
    if (clsRows.length) {
      const classId = clsRows[0].id;
      const { rows } = await pool.query(
        `SELECT e.id, e.title, e.exam_date AS "examDate", e.total_marks AS "totalMarks",
                e.type, ss.name AS "subjectName",
                r.marks_obtained AS "marksObtained", r.percentage, r.captured_at AS "capturedAt"
         FROM exams e
         JOIN school_subjects ss ON ss.id = e.subject_id
         LEFT JOIN results r ON r.exam_id = e.id AND r.student_id = $1
         WHERE e.class_id = $2 AND e.school_id = $3
         ORDER BY e.exam_date DESC`,
        [studentId, classId, schoolId]
      );
      exams = rows;
    } else {
      const { rows } = await pool.query(
        `SELECT e.id, e.title, e.exam_date AS "examDate", e.total_marks AS "totalMarks",
                e.type, ss.name AS "subjectName",
                r.marks_obtained AS "marksObtained", r.percentage, r.captured_at AS "capturedAt"
         FROM exams e
         JOIN classes c ON c.id = e.class_id
         JOIN school_subjects ss ON ss.id = e.subject_id
         LEFT JOIN results r ON r.exam_id = e.id AND r.student_id = $1
         WHERE e.school_id = $2 AND c.grade = $3
         ORDER BY e.exam_date DESC`,
        [studentId, schoolId, numericGrade]
      );
      exams = rows;
    }
    res.json(exams);
  } catch (err) {
    console.error('[student exams]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/student/results
app.get('/api/student/results', requireStudent, async (req, res) => {
  try {
    const studentId = req.student.id;
    const schoolId  = req.student.schoolId;
    const { rows } = await pool.query(
      `SELECT r.id, r.marks_obtained AS "marksObtained", r.percentage,
              r.captured_at AS "capturedAt",
              e.id AS "examId", e.title AS "examTitle",
              e.exam_date AS "examDate", e.total_marks AS "totalMarks", e.type,
              ss.name AS "subjectName"
       FROM results r
       JOIN exams e ON e.id = r.exam_id
       JOIN school_subjects ss ON ss.id = e.subject_id
       WHERE r.student_id = $1 AND r.school_id = $2
       ORDER BY r.captured_at DESC`,
      [studentId, schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[student results]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/student/submissions', requireStudent, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (s.assignment_id)
         s.assignment_id AS "assignmentId", s.id AS "submissionId",
         s.marks_obtained AS "marksObtained", s.percentage,
         s.submitted_at AS "submittedAt", s.graded_at AS "gradedAt",
         s.originalname, s.filename, a.total_marks AS "totalMarks"
       FROM assignment_submissions s
       JOIN assignments a ON a.id = s.assignment_id
       WHERE s.student_id = $1
       ORDER BY s.assignment_id, s.submitted_at DESC`,
      [req.student.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[student submissions bulk]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/student/assignments/:id/submission', requireStudent, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.id, s.assignment_id AS "assignmentId", s.filename, s.originalname, s.mimetype,
              s.marks_obtained AS "marksObtained", s.percentage,
              s.submitted_at AS "submittedAt", s.graded_at AS "gradedAt",
              a.total_marks AS "totalMarks"
       FROM assignment_submissions s
       JOIN assignments a ON a.id = s.assignment_id
       WHERE s.assignment_id = $1 AND s.student_id = $2
       ORDER BY s.submitted_at DESC LIMIT 1`,
      [req.params.id, req.student.id]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error('[student submission GET]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/student/assignments/:id/submission', requireStudent, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM assignment_submissions
       WHERE assignment_id = $1 AND student_id = $2 AND graded_at IS NULL
       RETURNING id`,
      [req.params.id, req.student.id]
    );
    if (!rows.length)
      return res.status(400).json({ message: 'Nothing to delete, or submission already graded.' });
    res.json({ success: true, deleted: rows.length });
  } catch (err) {
    console.error('[student submission DELETE]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/student/timetable', requireStudent, async (req, res) => {
  try {
    const schoolId = req.student.schoolId;
    const { rows: stuRows } = await pool.query(
      'SELECT grade, stream FROM enrolled_students WHERE id = $1', [req.student.id]
    );
    if (!stuRows.length) return res.status(404).json({ message: 'Student not found' });
    const { grade, stream } = stuRows[0];
    const numericGrade = parseInt((grade || '').replace(/[^0-9]/g, ''), 10);
    if (!numericGrade) return res.json({ class: null, slots: [], periods: [] });
    const { rows: classRows } = await pool.query(
      `SELECT c.id, c.name, c.grade, c.stream FROM classes c
       WHERE c.school_id = $1 AND c.grade = $2
         AND (($3::TEXT IS NULL AND c.stream IS NULL) OR c.stream = $3)
         AND c.is_active = true
       ORDER BY c.letter LIMIT 1`,
      [schoolId, numericGrade, stream || null]
    );
    if (!classRows.length) return res.json({ class: null, slots: [], periods: [] });
    const cls = classRows[0];
    const [slotsRes, periodsRes] = await Promise.all([
      pool.query(
        `SELECT ts.day_of_week AS "dayOfWeek", ss.name AS "subjectName",
                t.first_name AS "teacherFirstName", t.last_name AS "teacherLastName",
                sp.period_number AS "periodNumber"
         FROM timetable_slots ts
         JOIN school_subjects ss ON ss.id = ts.subject_id
         JOIN teachers t ON t.id = ts.teacher_id
         JOIN school_periods sp ON sp.id = ts.period_id
         WHERE ts.class_id = $1 AND ts.school_id = $2
         ORDER BY sp.period_number`,
        [cls.id, schoolId]
      ),
      pool.query(
        `SELECT period_number AS "periodNumber", name, time_start AS "timeStart",
                time_end AS "timeEnd", is_break AS "isBreak"
         FROM school_periods WHERE school_id = $1 ORDER BY period_number`,
        [schoolId]
      ),
    ]);
    res.json({ class: cls, slots: slotsRes.rows, periods: periodsRes.rows });
  } catch (err) {
    console.error('[student timetable]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/assignments/:id/submit', requireStudent, upload.single('file'), async (req, res) => {
  const assignmentId = req.params.id;
  const studentId    = req.student.id;
  if (!req.file) return res.status(400).json({ success: false, message: 'File required' });
  const v = validateFile(req.file, 'additional');
  if (!v.valid) return res.status(400).json({ success: false, message: v.error });
  try {
    const { rows } = await pool.query(
      `INSERT INTO assignment_submissions (assignment_id, student_id, filename, originalname, mimetype)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [assignmentId, studentId, req.file.filename, req.file.originalname, req.file.mimetype]
    );
    res.status(201).json({ success: true, submissionId: rows[0].id, url: '/api/documents/' + req.file.filename });
  } catch (err) {
    console.error('[submit assignment]', err);
    res.status(500).json({ success: false, message: 'Failed to submit' });
  }
});

// ─── Parent endpoints ─────────────────────────────────────────────────────────
app.get('/api/parent/children', requireParent, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT es.id, es.student_number AS "studentNumber", es.first_name AS "firstName",
              es.last_name AS "lastName", es.grade, es.stream
       FROM student_parents sp
       JOIN enrolled_students es ON es.id = sp.student_id
       WHERE sp.parent_id = $1 AND es.school_id = $2 AND es.is_active = true
       ORDER BY es.first_name`,
      [req.parent.id, req.parent.schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[parent children]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Confirms the requesting parent is actually linked to this student before
// returning anything for them — otherwise a parent could read any student's
// records just by changing the studentId in the URL.
async function assertParentChild(parentId, studentId) {
  const { rows } = await pool.query(
    'SELECT 1 FROM student_parents WHERE parent_id = $1 AND student_id = $2',
    [parentId, studentId]
  );
  return rows.length > 0;
}

app.get('/api/parent/children/:studentId/attendance', requireParent, async (req, res) => {
  const { studentId } = req.params;
  try {
    if (!(await assertParentChild(req.parent.id, studentId)))
      return res.status(403).json({ message: 'Not linked to this student' });
    const { rows } = await pool.query(
      `SELECT date, status, note
       FROM attendance
       WHERE student_id = $1 AND school_id = $2
       ORDER BY date DESC LIMIT 90`,
      [studentId, req.parent.schoolId]
    );
    const total   = rows.length;
    const present = rows.filter(r => ['present', 'late'].includes(r.status)).length;
    res.json({
      records: rows,
      summary: { total, present, percentage: total ? Math.round((present / total) * 100) : null },
    });
  } catch (err) {
    console.error('[parent child attendance]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/parent/children/:studentId/results', requireParent, async (req, res) => {
  const { studentId } = req.params;
  try {
    if (!(await assertParentChild(req.parent.id, studentId)))
      return res.status(403).json({ message: 'Not linked to this student' });
    const { rows } = await pool.query(
      `SELECT r.id, r.marks_obtained AS "marksObtained", r.percentage, r.captured_at AS "capturedAt",
              e.id AS "examId", e.title AS "examTitle", e.exam_date AS "examDate",
              e.total_marks AS "totalMarks", e.type, ss.name AS "subjectName"
       FROM results r
       JOIN exams e ON e.id = r.exam_id
       JOIN school_subjects ss ON ss.id = e.subject_id
       WHERE r.student_id = $1 AND r.school_id = $2
       ORDER BY r.captured_at DESC`,
      [studentId, req.parent.schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[parent child results]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Gradebook endpoints ──────────────────────────────────────────────────────
app.post('/api/assessments', requireTeacher, async (req, res) => {
  try {
    const schoolId = req.teacher.schoolId || req.teacher.school_id || req.teacher.school;
    const { title, type, date, maxScore, weight, term, classId, subjectId } = req.body;
    if (!title) return res.status(400).json({ message: 'title required' });
    const { rows } = await pool.query(
      `INSERT INTO assessments (school_id, class_id, subject_id, title, type, date, max_score, weight, term, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [schoolId, classId || null, subjectId || null, title, type || null, date || null, maxScore || 100, weight || 1, term || null, req.teacher.id || null]
    );
    await logAudit(pool, { actor: req.teacher.username || req.teacher.id, actorRole: 'teacher', action: 'CREATE_ASSESSMENT', target: rows[0].id, school: req.teacher.school || null, detail: JSON.stringify({ title }) });
    res.json(rows[0]);
  } catch (err) {
    console.error('[POST /api/assessments]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/marks', requireTeacher, async (req, res) => {
  try {
    const marks  = Array.isArray(req.body.marks) ? req.body.marks : [req.body];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const m of marks) {
        const assessmentId = m.assessmentId || m.assessment_id;
        const studentId    = m.studentId    || m.student_id;
        if (!assessmentId || !studentId) throw new Error('assessmentId and studentId required');
        const existing = await client.query(
          'SELECT score FROM marks WHERE assessment_id = $1 AND student_id = $2',
          [assessmentId, studentId]
        );
        const oldScore = existing.rows[0]?.score ?? null;
        await client.query(
          `INSERT INTO marks (assessment_id, student_id, score, max_score, source, entered_by)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (assessment_id, student_id)
           DO UPDATE SET score = EXCLUDED.score, max_score = EXCLUDED.max_score,
             source = EXCLUDED.source, entered_by = EXCLUDED.entered_by, entered_at = NOW()`,
          [assessmentId, studentId, m.score, m.maxScore || m.max_score || null, m.source || 'manual', req.teacher.id || null]
        );
        if (oldScore !== null && oldScore !== m.score) {
          await client.query(
            `INSERT INTO grade_audit_log (school_id, student_id, assessment_id, old_score, new_score, changed_by)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [req.teacher.schoolId || req.teacher.school || null, studentId, assessmentId, oldScore, m.score, req.teacher.id]
          );
        }
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    await logAudit(pool, { actor: req.teacher.username || req.teacher.id, actorRole: 'teacher', action: 'UPLOAD_MARKS', target: null, school: req.teacher.school || null, detail: `marks_count=${marks.length}` });
    res.json({ success: true, uploaded: marks.length });
  } catch (err) {
    console.error('[POST /api/marks]', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// ─── FIX 3: /api/exams/upload — was crashing because it tried to insert into
// exam_submissions with an assessment_id that doesn't exist in assessments.
// Fixed: verify the assessment exists first, return clear error if not found.
app.post('/api/exams/upload', requireTeacher, upload.single('file'), async (req, res) => {
  try {
    const { assessmentId, studentId } = req.body;
    if (!req.file)    return res.status(400).json({ message: 'No file uploaded' });
    const v = validateFile(req.file, 'gradeResult');
    if (!v.valid)     return res.status(400).json({ message: v.error });
    if (!assessmentId || !studentId) return res.status(400).json({ message: 'assessmentId and studentId required' });

    // FIX: Verify assessment exists before inserting — prevents FK constraint crash
    const { rows: aRows } = await pool.query(
      'SELECT id FROM assessments WHERE id = $1', [assessmentId]
    );
    if (!aRows.length) {
      return res.status(404).json({ message: `Assessment ${assessmentId} not found. Create it first via POST /api/assessments.` });
    }

    const ext      = path.extname(req.file.originalname).toLowerCase();
    const filename = crypto.randomBytes(16).toString('hex') + ext;
    await pool.query(
      'INSERT INTO document_files (filename, original_name, mimetype, file_size, data) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (filename) DO NOTHING',
      [filename, req.file.originalname, req.file.mimetype, req.file.size, req.file.buffer]
    );
    const { rows } = await pool.query(
      `INSERT INTO exam_submissions (assessment_id, student_id, filename, filepath, status)
       VALUES ($1,$2,$3,$4,'uploaded') RETURNING *`,
      [assessmentId, studentId, filename, '/api/documents/' + filename]
    );
    await logAudit(pool, { actor: req.teacher.username || req.teacher.id, actorRole: 'teacher', action: 'UPLOAD_EXAM_SCAN', target: rows[0].id, school: req.teacher.school || null, detail: JSON.stringify({ filename: req.file.originalname }) });
    res.json({ success: true, submission: rows[0] });
  } catch (err) {
    console.error('[POST /api/exams/upload]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Email helper ─────────────────────────────────────────────────────────────
const { Resend } = require('resend');
const resend     = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@yourschoolapp.co.za';

async function sendStatusEmail(to, applicantName, school, status) {
  if (!to) return;
  const isApproved = status === 'approved';
  const isAccepted = status === 'accepted';
  const isRejected = status === 'rejected';
  const subject    = isApproved ? `Application Approved – ${school}` : isAccepted ? `Offer Accepted – ${school}` : isRejected ? `Application Outcome – ${school}` : `Application Status Update – ${school}`;
  const portalLink = process.env.FRONTEND_URL || 'https://school-application.vercel.app';
  const message    = isApproved
    ? `We are pleased to inform you that your application to <strong>${school}</strong> has been <strong>approved</strong>.<br><br><a href="${portalLink}/check-status" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#1a73e8;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Accept Your Offer</a>`
    : isAccepted
    ? `Thank you for accepting your offer to join <strong>${school}</strong>. Our admissions team will be in touch shortly.<br><br><a href="${portalLink}/check-status" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#1a73e8;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">View Application Status</a>`
    : isRejected
    ? `Thank you for your interest in <strong>${school}</strong>. After careful consideration, we regret that your application was unsuccessful.<br><br><a href="${portalLink}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#1a73e8;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Explore Other Schools</a>`
    : `Your application to <strong>${school}</strong> has been updated.<br><br><a href="${portalLink}/check-status" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#1a73e8;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold;">Check Status</a>`;
  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f8;padding:40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;"><tr><td style="background:#1a73e8;padding:32px 40px;text-align:center;"><h1 style="margin:0;color:#fff;font-size:22px;">School Application System</h1><p style="margin:6px 0 0;color:#d0e8ff;font-size:14px;">${school}</p></td></tr><tr><td style="padding:40px;"><p style="margin:0 0 16px;font-size:16px;color:#333;">Dear <strong>${applicantName || 'Applicant'}</strong>,</p><div style="font-size:15px;color:#444;line-height:1.7;">${message}</div><hr style="border:none;border-top:1px solid #eee;margin:32px 0;"><p style="margin:0;font-size:13px;color:#888;">This is an automated message — please do not reply.</p></td></tr></table></td></tr></table></body></html>`;
  try {
    await resend.emails.send({ from: FROM_EMAIL, to, subject, html });
  } catch (err) {
    console.error('Error sending email:', err);
  }
}

// ─── DB row → camelCase mapper ────────────────────────────────────────────────
function toApp(row) {
  return {
    id: row.id, referenceCode: row.reference_code,
    nationalId: row.national_id, firstName: row.first_name, lastName: row.last_name,
    dateOfBirth: row.date_of_birth, gender: row.gender, email: row.email, phone: row.phone,
    address: row.address, city: row.city, parentName: row.parent_name, parentPhone: row.parent_phone,
    parentEmail: row.parent_email, parentOccupation: row.parent_occupation, relationship: row.relationship,
    school: row.school, grade: row.grade, subject: row.subject, previousSchool: row.previous_school,
    achievements: row.achievements, whyAttend: row.why_attend, emergencyContact: row.emergency_contact,
    emergencyPhone: row.emergency_phone, documents: row.documents, documentCount: row.document_count,
    requiredDocuments: row.required_documents, status: row.status, comment: row.comment,
    submittedAt: row.submitted_at, updatedAt: row.updated_at,
  };
}

// Public-facing lookup key for /api/applicant-applications. Deliberately NOT the
// sequential primary key — that would let anyone enumerate every application in
// the system by counting 1, 2, 3... This is random enough that guessing one is
// infeasible, so it's safe to hand out without pairing it with a national ID.
function generateReferenceCode() {
  return crypto.randomBytes(6).toString('hex').toUpperCase();
}

// ─── School Admin Login ───────────────────────────────────────────────────────
async function handleSchoolAdminLogin(req, res) {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Username and password required' });
  try {
    const { rows } = await pool.query(
      `SELECT sa.id, sa.username, sa.name, sa.password_hash, sa.is_active, sa.temp_password_flag,
              s.name AS school, s.id AS school_id
       FROM school_admins sa JOIN schools s ON s.id = sa.school_id
       WHERE sa.username = $1`,
      [username]
    );
    const admin = rows[0];
    if (!admin)            return res.status(401).json({ success: false, message: 'Invalid credentials' });
    if (!admin.is_active)  return res.status(403).json({ success: false, message: 'Account suspended. Contact system admin.' });
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid)            return res.status(401).json({ success: false, message: 'Invalid credentials' });
    await pool.query('UPDATE school_admins SET last_login = NOW() WHERE id = $1', [admin.id]);
    await logAudit(pool, { actor: admin.username, actorRole: 'school_admin', action: 'LOGIN', target: null, school: admin.school });
    const token = jwt.sign(
      { id: admin.id, username: admin.username, name: admin.name, school: admin.school, schoolId: admin.school_id },
      SCHOOL_JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );
    return res.json({ success: true, token, school: admin.school, name: admin.name, tempPasswordFlag: admin.temp_password_flag });
  } catch (err) {
    console.error('admin-login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// ─── School Admin: Change Password ───────────────────────────────────────────
app.post('/api/admin/change-password', requireSchoolAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8)
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });
  try {
    const { rows } = await pool.query('SELECT password_hash FROM school_admins WHERE id = $1', [req.admin.id]);
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE school_admins SET password_hash = $1, temp_password_flag = false WHERE id = $2', [newHash, req.admin.id]);
    await logAudit(pool, { actor: req.admin.username, actorRole: 'school_admin', action: 'CHANGE_PASSWORD', target: req.admin.username, school: req.admin.school });
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('change-password error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Schools (public) ─────────────────────────────────────────────────────────
app.get('/api/schools', async (req, res) => {
  try {
    const baseUrl = process.env.API_BASE || `${req.protocol}://${req.get('host')}`;
    const { rows } = await pool.query(
      `SELECT
        id, name, location, phone, email, principal, grades, streams, is_active, created_at, image_id,
        application_form_required, application_form_originalname,
        CASE
          WHEN image_id IS NOT NULL THEN $1 || '/api/system/schools/' || id || '/image?v=' || image_id
          ELSE NULL
        END as image,
        CASE
          WHEN application_form_filename IS NOT NULL THEN $1 || '/api/schools/application-form/' || id
          ELSE NULL
        END as application_form_url
       FROM schools
       WHERE is_active = true
       ORDER BY id ASC`,
      [baseUrl]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/schools error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── School admin: manage application form ────────────────────────────────────
app.patch('/api/admin/schools/application-form', requireSchoolAdmin, uploadSchoolForm.single('formTemplate'), async (req, res) => {
  try {
    const schoolId = req.admin.schoolId;
    const enabled  = req.body.enabled === 'true' || req.body.enabled === true;

    if (req.file) {
      const ext      = path.extname(req.file.originalname).toLowerCase();
      const filename = crypto.randomBytes(16).toString('hex') + ext;
      await pool.query(
        'INSERT INTO document_files (filename, original_name, mimetype, file_size, data) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (filename) DO NOTHING',
        [filename, req.file.originalname, req.file.mimetype, req.file.size, req.file.buffer]
      );
      await pool.query(
        `UPDATE schools SET application_form_required=$1, application_form_filename=$2, application_form_originalname=$3 WHERE id=$4`,
        [enabled, filename, req.file.originalname, schoolId]
      );
    } else {
      await pool.query(
        `UPDATE schools SET application_form_required=$1 WHERE id=$2`,
        [enabled, schoolId]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/admin/schools/application-form error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Public: download school application form template ────────────────────────
app.get('/api/schools/application-form/:schoolId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT application_form_filename, application_form_originalname FROM schools WHERE id = $1 AND is_active = true',
      [req.params.schoolId]
    );
    if (!rows[0]?.application_form_filename)
      return res.status(404).json({ message: 'No application form available' });
    const { rows: fileRows } = await pool.query(
      'SELECT data, mimetype, original_name FROM document_files WHERE filename = $1',
      [rows[0].application_form_filename]
    );
    if (!fileRows.length)
      return res.status(404).json({ message: 'Form file not found' });
    res.setHeader('Content-Disposition', `attachment; filename="${rows[0].application_form_originalname || fileRows[0].original_name}"`);
    res.setHeader('Content-Type', fileRows[0].mimetype || 'application/pdf');
    res.send(fileRows[0].data);
  } catch (err) {
    console.error('GET /api/schools/application-form error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── Submit Application ───────────────────────────────────────────────────────
app.post('/api/applications', upload.array('documents', 10), async (req, res) => {
  const { nationalId, firstName, lastName, dateOfBirth, gender, email, phone, address, city, parentName, parentPhone, parentEmail, parentOccupation, relationship, grade, subject, previousSchool, achievements, whyAttend, emergencyContact, emergencyPhone } = req.body;
  let schools = req.body.schools;
  if (!nationalId) return res.status(400).json({ success: false, message: 'National ID is required' });
  if (['Grade 10', 'Grade 11', 'Grade 12'].includes(grade) && !subject)
    return res.status(400).json({ success: false, message: 'Subject stream is required for Grade 10–12' });
  if (typeof schools === 'string') {
    try { const p = JSON.parse(schools); schools = Array.isArray(p) ? p : [p]; } catch { schools = schools.split(',').map(s => s.trim()); }
  }
  if (!Array.isArray(schools) || schools.length === 0)
    return res.status(400).json({ success: false, message: 'At least one school must be selected' });
  const documents     = req.files || [];
  const documentTypes = req.body.documentTypes ? JSON.parse(req.body.documentTypes) : [];
  for (let i = 0; i < documents.length; i++) {
    const v = validateFile(documents[i], documentTypes[i] || 'additional');
    if (!v.valid) return res.status(400).json({ success: false, message: `File validation failed: ${v.error}` });
  }
  const DOC_NAMES = { id: 'SA ID Copy', parentId: 'Parent/Guardian ID Copy', removal: 'School Removal Letter', gradeResult: 'Previous Grade Result', gradeReport: 'Grade Report' };
  const baseRequired  = grade === 'Grade 8' ? ['id', 'parentId', 'gradeResult', 'gradeReport'] : ['id', 'parentId', 'removal', 'gradeResult', 'gradeReport'];
  // Generate stable filenames and build uploadedTypes
  const uploadedTypes = documents.map((file, i) => {
    const ext = path.extname(file.originalname).toLowerCase();
    return { type: documentTypes[i] || 'additional', filename: crypto.randomBytes(16).toString('hex') + ext, originalname: file.originalname, mimetype: file.mimetype };
  });
  const missing = baseRequired.filter(r => !uploadedTypes.some(u => u.type === r));
  if (missing.length > 0) {
    const names = missing.map(t => DOC_NAMES[t] || t);
    return res.status(400).json({ success: false, message: `Missing required documents: ${names.join(', ')}` });
  }
  const requiredDocuments = baseRequired;
  try {
    // Save file buffers to PostgreSQL
    for (let i = 0; i < documents.length; i++) {
      await pool.query(
        'INSERT INTO document_files (filename, original_name, mimetype, file_size, data) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (filename) DO NOTHING',
        [uploadedTypes[i].filename, documents[i].originalname, documents[i].mimetype, documents[i].size, documents[i].buffer]
      );
    }
    const insertedApps = [];
    for (const school of schools) {
      const { rows } = await pool.query(
        `INSERT INTO applications (national_id,first_name,last_name,date_of_birth,gender,email,phone,address,city,parent_name,parent_phone,parent_email,parent_occupation,relationship,school,grade,subject,previous_school,achievements,why_attend,emergency_contact,emergency_phone,documents,document_count,required_documents,status,comment,submitted_at,reference_code)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,'pending','',$26,$27) RETURNING *`,
        [nationalId,firstName,lastName,dateOfBirth||null,gender,email,phone,address,city,parentName,parentPhone,parentEmail,parentOccupation,relationship,school,grade,subject||null,previousSchool,achievements,whyAttend,emergencyContact||null,emergencyPhone||null,JSON.stringify(uploadedTypes),documents.length,JSON.stringify(requiredDocuments),new Date().toISOString(),generateReferenceCode()]
      );
      insertedApps.push(toApp(rows[0]));
    }
    res.json({ success: true, applications: insertedApps });
  } catch (err) {
    console.error('POST /api/applications error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Get Applications ─────────────────────────────────────────────────────────
app.get('/api/applications', requireSchoolAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM applications WHERE school = $1 ORDER BY submitted_at DESC', [req.admin.school]);
    res.json(rows.map(toApp));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/applicant-applications', async (req, res) => {
  const { nationalId, applicationId } = req.query;
  try {
    if (nationalId) {
      const { rows } = await pool.query('SELECT * FROM applications WHERE national_id = $1 ORDER BY submitted_at DESC', [nationalId]);
      return res.json(rows.map(toApp));
    }
    if (applicationId) {
      // Looked up by the opaque reference_code, NOT the sequential id — the id
      // is trivially enumerable (1, 2, 3...) and would otherwise let anyone
      // pull any applicant's full record (address, parent contact, documents).
      const { rows } = await pool.query('SELECT * FROM applications WHERE reference_code = $1', [applicationId]);
      return res.json(rows.map(toApp));
    }
    res.status(400).json({ success: false, message: 'nationalId or applicationId required' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.patch('/api/applications/:id', requireSchoolAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, comment } = req.body;
  if (!['approved', 'rejected', 'pending', 'accepted'].includes(status))
    return res.status(400).json({ success: false, message: 'Invalid status' });
  try {
    const { rows } = await pool.query(
      `UPDATE applications SET status=$1, comment=COALESCE($2,comment), updated_at=NOW()
       WHERE id=$3 AND school=$4 RETURNING *`,
      [status, comment ?? null, id, req.admin.school]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Application not found' });
    await logAudit(pool, { actor: req.admin.username, actorRole: 'school_admin', action: `${status.toUpperCase()}_APPLICATION`, target: `${rows[0].first_name} ${rows[0].last_name}`, school: req.admin.school });
    sendStatusEmail(rows[0].email, rows[0].first_name, rows[0].school, status);
    res.json({ success: true, application: toApp(rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.patch('/api/applications/:id/accept', async (req, res) => {
  const { id } = req.params;
  const { nationalId } = req.body;
  if (!nationalId) return res.status(400).json({ success: false, message: 'National ID is required' });
  try {
    const { rows } = await pool.query(
      `UPDATE applications SET status='accepted', comment='Offer accepted by applicant', updated_at=NOW()
       WHERE id=$1 AND national_id=$2 AND status='approved' RETURNING *`,
      [id, nationalId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Application not found, already accepted, or not approved yet' });
    sendStatusEmail(rows[0].email, rows[0].first_name, rows[0].school, 'accepted');
    res.json({ success: true, application: toApp(rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.put('/api/applications/:id', upload.array('documents', 10), async (req, res) => {
  const { id } = req.params;
  const { nationalId, firstName, lastName, dateOfBirth, gender, email, phone, address, city, parentName, parentPhone, parentEmail, parentOccupation, relationship, grade, subject, previousSchool, achievements, whyAttend, emergencyContact, emergencyPhone } = req.body;
  if (!nationalId || !firstName || !lastName || !email || !phone)
    return res.status(400).json({ success: false, message: 'Required fields are missing' });
  if (['Grade 10', 'Grade 11', 'Grade 12'].includes(grade) && !subject)
    return res.status(400).json({ success: false, message: 'Subject stream is required for Grade 10–12' });
  try {
    const existing = await pool.query('SELECT * FROM applications WHERE id = $1', [id]);
    if (!existing.rows.length) return res.status(404).json({ success: false, message: 'Application not found' });
    if (!['pending', 'rejected'].includes(existing.rows[0].status))
      return res.status(403).json({ success: false, message: 'Only pending or rejected applications can be edited' });
    const newFiles      = req.files || [];
    const documentTypes = req.body.documentTypes ? JSON.parse(req.body.documentTypes) : [];
    for (let i = 0; i < newFiles.length; i++) {
      const v = validateFile(newFiles[i], documentTypes[i] || 'additional');
      if (!v.valid) return res.status(400).json({ success: false, message: `File validation failed: ${v.error}` });
    }
    const DOC_NAMES_PUT    = { id: 'SA ID Copy', parentId: 'Parent/Guardian ID Copy', removal: 'School Removal Letter', gradeResult: 'Previous Grade Result', gradeReport: 'Grade Report' };
    const requiredDocuments = grade === 'Grade 8' ? ['id', 'parentId', 'gradeResult', 'gradeReport'] : ['id', 'parentId', 'removal', 'gradeResult', 'gradeReport'];
    const newUploaded = newFiles.map((file, i) => {
      const ext = path.extname(file.originalname).toLowerCase();
      return { type: documentTypes[i] || 'additional', filename: crypto.randomBytes(16).toString('hex') + ext, originalname: file.originalname, mimetype: file.mimetype };
    });
    // Save new file buffers to PostgreSQL
    for (let i = 0; i < newFiles.length; i++) {
      await pool.query(
        'INSERT INTO document_files (filename, original_name, mimetype, file_size, data) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (filename) DO NOTHING',
        [newUploaded[i].filename, newFiles[i].originalname, newFiles[i].mimetype, newFiles[i].size, newFiles[i].buffer]
      );
    }
    const existingDocs = Array.isArray(existing.rows[0].documents) ? existing.rows[0].documents : JSON.parse(existing.rows[0].documents || '[]');
    const allDocuments = [...existingDocs, ...newUploaded];
    const missing      = requiredDocuments.filter(r => !allDocuments.some(u => u.type === r));
    if (missing.length > 0) {
      const names = missing.map(t => DOC_NAMES_PUT[t] || t);
      return res.status(400).json({ success: false, message: `Missing required documents: ${names.join(', ')}` });
    }
    const { rows } = await pool.query(
      `UPDATE applications SET national_id=$1,first_name=$2,last_name=$3,date_of_birth=$4,gender=$5,email=$6,phone=$7,address=$8,city=$9,parent_name=$10,parent_phone=$11,parent_email=$12,parent_occupation=$13,relationship=$14,grade=$15,subject=$16,previous_school=$17,achievements=$18,why_attend=$19,emergency_contact=$20,emergency_phone=$21,documents=$22,document_count=$23,required_documents=$24,status='pending',comment='',updated_at=NOW() WHERE id=$25 RETURNING *`,
      [nationalId,firstName,lastName,dateOfBirth||null,gender,email,phone,address,city,parentName,parentPhone,parentEmail,parentOccupation,relationship,grade,subject||null,previousSchool,achievements,whyAttend,emergencyContact||null,emergencyPhone||null,JSON.stringify(allDocuments),allDocuments.length,JSON.stringify(requiredDocuments),id]
    );
    res.json({ success: true, application: toApp(rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Delete Applications ──────────────────────────────────────────────────────
app.delete('/api/applications', requireSchoolAdmin, async (req, res) => {
  const { ids } = req.body;
  try {
    let result;
    if (ids === 'all') {
      result = await pool.query('DELETE FROM applications WHERE school = $1', [req.admin.school]);
    } else if (Array.isArray(ids) && ids.length > 0) {
      result = await pool.query(
        'DELETE FROM applications WHERE id = ANY($1::int[]) AND school = $2',
        [ids, req.admin.school]
      );
    } else {
      return res.status(400).json({ success: false, message: 'No IDs provided' });
    }
    res.json({ success: true, deleted: result.rowCount });
  } catch (err) {
    console.error('DELETE /api/applications error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.delete('/api/applications/:id', requireSchoolAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM applications WHERE id = $1 AND school = $2',
      [req.params.id, req.admin.school]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Application not found' });
    await pool.query('DELETE FROM applications WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/applications/:id error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/document-stats', requireSchoolAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM applications WHERE school = $1', [req.admin.school]);
    const stats = { totalApplications: rows.length, applicationsWithDocuments: rows.filter(a => a.documents?.length > 0).length, averageDocumentsPerApp: 0, documentTypeBreakdown: { id: 0, removal: 0, gradeResult: 0, gradeReport: 0, additional: 0 }, gradeBreakdown: {} };
    let totalDocs = 0;
    rows.forEach(a => {
      const docs = Array.isArray(a.documents) ? a.documents : [];
      totalDocs += docs.length;
      docs.forEach(d => { if (d.type) stats.documentTypeBreakdown[d.type] = (stats.documentTypeBreakdown[d.type] || 0) + 1; });
      if (a.grade) stats.gradeBreakdown[a.grade] = (stats.gradeBreakdown[a.grade] || 0) + 1;
    });
    stats.averageDocumentsPerApp = rows.length > 0 ? (totalDocs / rows.length).toFixed(1) : 0;
    res.json(stats);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.get('/api/students', requireSchoolAdmin, async (req, res) => {
  try {
    let query    = 'SELECT * FROM applications WHERE school = $1 AND status = $2';
    const params = [req.admin.school, 'accepted'];
    if (req.query.recent) query += " AND submitted_at >= NOW() - INTERVAL '7 days'";
    query += ' ORDER BY submitted_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows.map(toApp));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── FIX 2: Create all required tables at startup ────────────────────────────
// audit_logs was missing — every login was failing with "relation does not exist"
async function ensureTables() {
  // assignment_submissions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id             SERIAL PRIMARY KEY,
      assignment_id  INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
      student_id     INTEGER,
      filename       TEXT,
      originalname   TEXT,
      mimetype       TEXT,
      marks_obtained NUMERIC,
      percentage     NUMERIC,
      submitted_at   TIMESTAMPTZ DEFAULT NOW(),
      graded_at      TIMESTAMPTZ,
      graded_by      INTEGER
    )
  `);

  // FIX 2: audit_logs — was missing, caused every login/action to throw an error
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id          SERIAL PRIMARY KEY,
      school_id   INTEGER,
      admin_id    INTEGER,
      actor       VARCHAR(200),
      actor_role  VARCHAR(50),
      action      VARCHAR(100) NOT NULL,
      target_type VARCHAR(50),
      target_id   INTEGER,
      target      TEXT,
      detail      TEXT,
      school      TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // assessments — needed by /api/exams/upload and /api/marks
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assessments (
      id          SERIAL PRIMARY KEY,
      school_id   INTEGER,
      class_id    INTEGER,
      subject_id  INTEGER,
      title       VARCHAR(200) NOT NULL,
      type        VARCHAR(50),
      date        DATE,
      max_score   NUMERIC DEFAULT 100,
      weight      NUMERIC DEFAULT 1,
      term        VARCHAR(20),
      created_by  INTEGER,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // marks
  await pool.query(`
    CREATE TABLE IF NOT EXISTS marks (
      id            SERIAL PRIMARY KEY,
      assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
      student_id    INTEGER NOT NULL,
      score         NUMERIC,
      max_score     NUMERIC,
      source        VARCHAR(50) DEFAULT 'manual',
      entered_by    INTEGER,
      entered_at    TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(assessment_id, student_id)
    )
  `);

  // exam_submissions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS exam_submissions (
      id            SERIAL PRIMARY KEY,
      assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
      student_id    INTEGER,
      filename      TEXT,
      filepath      TEXT,
      status        VARCHAR(50) DEFAULT 'uploaded',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // grade_audit_log
  await pool.query(`
    CREATE TABLE IF NOT EXISTS grade_audit_log (
      id            SERIAL PRIMARY KEY,
      school_id     INTEGER,
      student_id    INTEGER,
      assessment_id INTEGER,
      old_score     NUMERIC,
      new_score     NUMERIC,
      changed_by    INTEGER,
      changed_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // school_images — Image storage (BYTEA binary format)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS school_images (
      id          SERIAL PRIMARY KEY,
      school_id   INTEGER NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
      image_data  BYTEA NOT NULL,
      mime_type   VARCHAR(50) DEFAULT 'image/jpeg',
      file_size   INTEGER,
      uploaded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // system_admin — System-level administrators
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_admin (
      id              SERIAL PRIMARY KEY,
      username        VARCHAR(100) NOT NULL UNIQUE,
      name            VARCHAR(200),
      password_hash   VARCHAR(255) NOT NULL,
      is_active       BOOLEAN DEFAULT TRUE,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      last_login      TIMESTAMPTZ
    )
  `);

  // Add image_id column to schools if it doesn't exist
  try {
    await pool.query(`
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS image_id INTEGER REFERENCES school_images(id) ON DELETE SET NULL
    `);
  } catch (err) {
    console.warn('Note: image_id column ALTER failed:', err.message);
  }

  // document_files — persistent binary storage for uploaded documents (replaces ephemeral disk)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS document_files (
      id            SERIAL PRIMARY KEY,
      filename      VARCHAR(255) NOT NULL UNIQUE,
      original_name VARCHAR(255),
      mimetype      VARCHAR(100),
      file_size     INTEGER,
      data          BYTEA NOT NULL,
      uploaded_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Add application form columns to schools
  for (const col of [
    `ALTER TABLE schools ADD COLUMN IF NOT EXISTS application_form_required BOOLEAN DEFAULT false`,
    `ALTER TABLE schools ADD COLUMN IF NOT EXISTS application_form_filename TEXT`,
    `ALTER TABLE schools ADD COLUMN IF NOT EXISTS application_form_originalname TEXT`,
  ]) {
    try { await pool.query(col); } catch (err) {
      console.warn('Migration note:', err.message);
    }
  }

  // Multi-account system admin (IT support team) + created/modified tracking.
  // Only the LATEST modifier is kept per row (updated_by/updated_at) — full
  // history already lives in audit_logs for whoever needs to dig further.
  for (const col of [
    `ALTER TABLE system_admin  ADD COLUMN IF NOT EXISTS is_active  BOOLEAN DEFAULT true`,
    `ALTER TABLE system_admin  ADD COLUMN IF NOT EXISTS created_by VARCHAR(100)`,
    `ALTER TABLE system_admin  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`,
    `ALTER TABLE schools       ADD COLUMN IF NOT EXISTS created_by VARCHAR(100)`,
    `ALTER TABLE schools       ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100)`,
    `ALTER TABLE schools       ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`,
    `ALTER TABLE school_admins ADD COLUMN IF NOT EXISTS created_by VARCHAR(100)`,
    `ALTER TABLE school_admins ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100)`,
    `ALTER TABLE school_admins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`,
  ]) {
    try { await pool.query(col); } catch (err) {
      console.warn('Migration note (system admin / audit tracking):', err.message);
    }
  }

  // Parent portal login — parents rows are created during enrollment with only
  // contact info (see managementRoutes.js), so credentials are added on top here.
  for (const col of [
    `ALTER TABLE parents ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE`,
    `ALTER TABLE parents ADD COLUMN IF NOT EXISTS password_hash TEXT`,
    `ALTER TABLE parents ADD COLUMN IF NOT EXISTS temp_password_flag BOOLEAN DEFAULT true`,
    `ALTER TABLE parents ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ`,
  ]) {
    try { await pool.query(col); } catch (err) {
      console.warn('Migration note (parents auth):', err.message);
    }
  }

  // Opaque public reference code for applications — see generateReferenceCode().
  // Backfills any rows submitted before this column existed.
  try {
    await pool.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS reference_code VARCHAR(20)`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS applications_reference_code_idx ON applications(reference_code) WHERE reference_code IS NOT NULL`);
    const { rows: missingCodes } = await pool.query(`SELECT id FROM applications WHERE reference_code IS NULL`);
    for (const { id } of missingCodes) {
      await pool.query(`UPDATE applications SET reference_code = $1 WHERE id = $2`, [generateReferenceCode(), id]);
    }
  } catch (err) {
    console.warn('Migration note (reference_code):', err.message);
  }

  // support_tickets / support_ticket_replies — the school-admin ↔ system-admin
  // helpdesk. school_id ties a ticket to the reporting school; replies carry
  // author_role so the UI can tell provider responses from the school's own.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id                  SERIAL PRIMARY KEY,
      school_id           INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      created_by_admin_id INTEGER REFERENCES school_admins(id),
      subject             VARCHAR(200) NOT NULL,
      description         TEXT NOT NULL,
      priority            VARCHAR(20) NOT NULL DEFAULT 'normal',
      status              VARCHAR(20) NOT NULL DEFAULT 'open',
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      updated_at          TIMESTAMPTZ DEFAULT NOW(),
      resolved_at         TIMESTAMPTZ
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_ticket_replies (
      id          SERIAL PRIMARY KEY,
      ticket_id   INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      author      VARCHAR(200) NOT NULL,
      author_role VARCHAR(20)  NOT NULL,
      message     TEXT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // system_errors — populated by the global error handler; backs /api/system/health
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_errors (
      id         SERIAL PRIMARY KEY,
      method     VARCHAR(10),
      path       TEXT,
      message    TEXT,
      stack      TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // term_weights — per (class, subject, term) split between assignment marks and exam marks
  // used by the report-card calculator to compute each subject's final percentage
  await pool.query(`
    CREATE TABLE IF NOT EXISTS term_weights (
      id                SERIAL PRIMARY KEY,
      school_id         INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      class_id          INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      subject_id        INTEGER NOT NULL REFERENCES school_subjects(id) ON DELETE CASCADE,
      term_id           INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
      assignment_weight NUMERIC NOT NULL DEFAULT 50,
      exam_weight       NUMERIC NOT NULL DEFAULT 50,
      updated_at        TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(class_id, subject_id, term_id)
    )
  `);

  console.log('✅ All tables verified');
}

// ─── Global error handler — must be registered after all routes ─────────────
// Catches anything passed to next(err) or thrown in middleware and logs it to
// system_errors so /api/system/health has a real signal to report on. Routes
// that already catch their own errors and return a 4xx/5xx never reach this.
app.use((err, req, res, next) => {
  console.error('[unhandled error]', err);
  pool.query(
    'INSERT INTO system_errors (method, path, message, stack) VALUES ($1,$2,$3,$4)',
    [req.method, req.originalUrl, err.message, err.stack]
  ).catch(() => {});
  if (res.headersSent) return next(err);
  res.status(500).json({ message: 'Server error' });
});

// Listen immediately — Railway needs fast response
app.listen(PORT, '0.0.0.0', () => console.log(`Backend running on http://localhost:${PORT}`));

// Run table check after — non-blocking
ensureTables().catch(err => {
  console.error('Table check failed (non-fatal):', err.message);
});