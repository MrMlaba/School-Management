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

const {
  router:             authRouter,
  requireSchoolAdmin,
  requireSystemAdmin,
  logAudit,
} = require('./auth');
const { router: teacherRouter, requireTeacher, login: teacherLogin, setTeacherCredentials } = require('./routes/teacherRoutes');
const { setStudentCredentials, bulkGenerate, studentLogin, studentChangePassword, requireStudent } = require('./routes/studentAuth');
const managementRoutes = require('./routes/managementRoutes');
const phase2Routes     = require('./routes/phase2Routes');
const phase3Routes     = require('./routes/phase3Routes');
const eventsRoutes     = require('./routes/eventsRoutes');
const { teacherQuizRouter, studentQuizRouter } = require('./routes/quizRoutes');
const chatRoutes       = require('./routes/chatRoutes');

const app  = express();
const PORT = process.env.PORT || 5005;

const SCHOOL_JWT_SECRET = process.env.JWT_SECRET || 'change_me_school';
const TOKEN_EXPIRY      = '8h';

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    // Allow any vercel.app subdomain + localhost
    if (
      origin.includes('vercel.app') ||
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

app.use(express.json());

// ─── Rate limiters ────────────────────────────────────────────────────────────
// FIX 3: Different limits per role — admins get stricter limits
const studentLoginLimiter     = rateLimit({ windowMs: 15*60*1000, max: 15, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' } });
const teacherLoginLimiter     = rateLimit({ windowMs: 15*60*1000, max: 10, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' } });
const schoolAdminLoginLimiter = rateLimit({ windowMs: 30*60*1000, max:  8, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many login attempts. Try again in 30 minutes.' } });
const systemAdminLoginLimiter = rateLimit({ windowMs: 60*60*1000, max:  5, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { success: false, message: 'Too many login attempts. Try again in 60 minutes.' } });

// Apply system admin limiter before authRouter so /api/system/login is covered
app.use('/api/system/login', systemAdminLoginLimiter);
app.use(authRouter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/management', requireSchoolAdmin, managementRoutes);
app.use('/api/setup',      requireSchoolAdmin, phase2Routes);
app.use('/api/management', requireSchoolAdmin, phase3Routes);

// FIX: /api/admin-login now has its own limiter (was missing before)
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
app.post('/api/teacher-login', teacherLoginLimiter,     teacherLogin);
app.post('/api/student-login', studentLoginLimiter,     studentLogin);

app.use('/api/teacher', requireTeacher, teacherRouter);
app.post('/api/management/teachers/:id/set-credentials', requireSchoolAdmin, setTeacherCredentials);
app.post('/api/student/change-password',                 requireStudent,      studentChangePassword);
app.post('/api/management/students/:id/set-credentials', requireSchoolAdmin, setStudentCredentials);
app.post('/api/management/students/generate-credentials',requireSchoolAdmin, bulkGenerate);
app.use('/api/management', requireSchoolAdmin, eventsRoutes);
app.use('/api/teacher',    requireTeacher,     teacherQuizRouter);
app.use('/api/student',    requireStudent,     studentQuizRouter);
app.use('/api/student',    requireStudent,     chatRoutes);

// ─── File Uploads ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const allowedFileTypes = {
  id:          ['application/pdf'],
  removal:     ['application/pdf'],
  gradeResult: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  gradeReport: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  additional:  ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
};
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function validateFile(file, expectedType) {
  if (file.size > MAX_FILE_SIZE)
    return { valid: false, error: 'File size exceeds 5 MB limit' };
  const allowed = allowedFileTypes[expectedType] || allowedFileTypes.additional;
  if (!allowed.includes(file.mimetype))
    return { valid: false, error: `Invalid file type. Allowed: ${allowed.join(', ')}` };
  return { valid: true };
}

// ─── School logo upload (system admin) ───────────────────────────────────────
const schoolImgDir = path.join(__dirname, 'uploads', 'schools');
if (!fs.existsSync(schoolImgDir)) fs.mkdirSync(schoolImgDir, { recursive: true });

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

// FIX 1b: school-images also sanitised (was raw before)
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

// ─── Serve uploaded documents ─────────────────────────────────────────────────
// FIX 1a: Full path traversal protection — basename + regex + startsWith
app.get('/api/documents/:filename', requireStudent, (req, res) => {
  const filename = path.basename(req.params.filename);
  if (!filename || !/^[a-zA-Z0-9_.-]+$/.test(filename))
    return res.status(400).json({ success: false, message: 'Invalid filename' });

  const uploadRoot = path.resolve(__dirname, 'uploads');
  const candidates = [
    path.join(uploadRoot, filename),
    path.join(uploadRoot, 'assignments',  filename),
    path.join(uploadRoot, 'submissions',  filename),
  ];
  const found = candidates.find(p => {
    const resolved = path.resolve(p);
    return resolved.startsWith(uploadRoot + path.sep) && fs.existsSync(resolved);
  });
  if (found) res.sendFile(path.resolve(found));
  else res.status(404).json({ success: false, message: 'File not found' });
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
      'SELECT grade, stream FROM enrolled_students WHERE id = $1',
      [req.student.id]
    );
    if (!stuRows.length) return res.status(404).json({ message: 'Student not found' });
    const { grade, stream } = stuRows[0];
    const numericGrade = parseInt((grade || '').replace(/[^0-9]/g, ''), 10);
    if (!numericGrade) return res.json({ class: null, slots: [], periods: [] });

    const { rows: classRows } = await pool.query(
      `SELECT c.id, c.name, c.grade, c.stream
       FROM classes c
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

// FIX: Assignment submit now requires student auth — was completely public before
// FIX: CREATE TABLE removed from here — table created at startup (see ensureTables below)
app.post('/api/assignments/:id/submit', requireStudent, upload.single('file'), async (req, res) => {
  const assignmentId = req.params.id;
  const studentId    = req.student.id;  // from JWT — not from body anymore
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

        // FIX 12: Log old score before overwriting — grade audit trail
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

        // Write audit row whenever score changes
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

app.post('/api/exams/upload', requireTeacher, upload.single('file'), async (req, res) => {
  try {
    const { assessmentId, studentId } = req.body;
    if (!req.file)    return res.status(400).json({ message: 'No file uploaded' });
    const v = validateFile(req.file, 'gradeResult');
    if (!v.valid)     return res.status(400).json({ message: v.error });
    if (!assessmentId || !studentId) return res.status(400).json({ message: 'assessmentId and studentId required' });
    const filepath = path.join('uploads', req.file.filename);
    const { rows } = await pool.query(
      `INSERT INTO exam_submissions (assessment_id, student_id, filename, filepath, status)
       VALUES ($1,$2,$3,$4,'uploaded') RETURNING *`,
      [assessmentId, studentId, req.file.originalname, filepath]
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
// FIX: use env var for from address — never hardcode a personal email
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
    id: row.id, nationalId: row.national_id, firstName: row.first_name, lastName: row.last_name,
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
    const { rows } = await pool.query('SELECT * FROM schools WHERE is_active = true ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Submit Application ───────────────────────────────────────────────────────
app.post('/api/applications', upload.array('documents', 10), async (req, res) => {
  const {
    nationalId, firstName, lastName, dateOfBirth, gender, email, phone, address, city,
    parentName, parentPhone, parentEmail, parentOccupation, relationship,
    grade, subject, previousSchool, achievements, whyAttend, emergencyContact, emergencyPhone,
  } = req.body;

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

  const requiredDocuments = grade === 'Grade 8' ? ['id', 'gradeResult', 'gradeReport'] : ['id', 'removal', 'gradeResult', 'gradeReport'];
  const uploadedTypes     = documentTypes.map((type, i) => ({ type, filename: documents[i]?.filename || null, originalname: documents[i]?.originalname || null, mimetype: documents[i]?.mimetype || null }));
  const missing           = requiredDocuments.filter(r => !uploadedTypes.some(u => u.type === r));
  if (missing.length > 0) {
    const names = missing.map(t => t === 'id' ? 'SA ID Copy' : t === 'removal' ? 'School Removal Letter' : t === 'gradeResult' ? 'Previous Grade Result' : 'Grade Report');
    return res.status(400).json({ success: false, message: `Missing required documents: ${names.join(', ')}` });
  }

  try {
    const insertedApps = [];
    for (const school of schools) {
      // FIX: removed manual id generation (Date.now + random) — use DB SERIAL
      const { rows } = await pool.query(
        `INSERT INTO applications (
          national_id, first_name, last_name, date_of_birth, gender,
          email, phone, address, city,
          parent_name, parent_phone, parent_email, parent_occupation, relationship,
          school, grade, subject, previous_school, achievements, why_attend,
          emergency_contact, emergency_phone,
          documents, document_count, required_documents,
          status, comment, submitted_at
        ) VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,
          $10,$11,$12,$13,$14,
          $15,$16,$17,$18,$19,$20,
          $21,$22,
          $23,$24,$25,
          'pending','',$26
        ) RETURNING *`,
        [
          nationalId, firstName, lastName, dateOfBirth || null, gender,
          email, phone, address, city,
          parentName, parentPhone, parentEmail, parentOccupation, relationship,
          school, grade, subject || null, previousSchool, achievements, whyAttend,
          emergencyContact || null, emergencyPhone || null,
          JSON.stringify(uploadedTypes), documents.length, JSON.stringify(requiredDocuments),
          new Date().toISOString(),
        ]
      );
      insertedApps.push(toApp(rows[0]));
    }
    res.json({ success: true, applications: insertedApps });
  } catch (err) {
    console.error('POST /api/applications error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Get Applications (school admin) ─────────────────────────────────────────
app.get('/api/applications', requireSchoolAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM applications WHERE school = $1 ORDER BY submitted_at DESC',
      [req.admin.school]
    );
    res.json(rows.map(toApp));
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Get by nationalId or applicationId (applicant self-service) ──────────────
app.get('/api/applicant-applications', async (req, res) => {
  const { nationalId, applicationId } = req.query;
  try {
    if (nationalId) {
      const { rows } = await pool.query('SELECT * FROM applications WHERE national_id = $1 ORDER BY submitted_at DESC', [nationalId]);
      return res.json(rows.map(toApp));
    }
    if (applicationId) {
      const { rows } = await pool.query('SELECT * FROM applications WHERE id = $1', [applicationId]);
      return res.json(rows.map(toApp));
    }
    res.status(400).json({ success: false, message: 'nationalId or applicationId required' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Update Status (school admin PATCH) ──────────────────────────────────────
app.patch('/api/applications/:id', requireSchoolAdmin, async (req, res) => {
  const { id }              = req.params;
  const { status, comment } = req.body;
  if (!['approved', 'rejected', 'pending', 'accepted'].includes(status))
    return res.status(400).json({ success: false, message: 'Invalid status' });
  try {
    const { rows } = await pool.query(
      `UPDATE applications SET status = $1, comment = COALESCE($2, comment), updated_at = NOW()
       WHERE id = $3 AND school = $4 RETURNING *`,
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

// ─── Accept Offer (applicant self-service) ────────────────────────────────────
app.patch('/api/applications/:id/accept', async (req, res) => {
  const { id } = req.params;
  const { nationalId } = req.body;
  if (!nationalId) return res.status(400).json({ success: false, message: 'National ID is required' });
  try {
    const { rows } = await pool.query(
      `UPDATE applications SET status = 'accepted', comment = 'Offer accepted by applicant', updated_at = NOW()
       WHERE id = $1 AND national_id = $2 AND status = 'approved' RETURNING *`,
      [id, nationalId]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Application not found, already accepted, or not approved yet' });
    sendStatusEmail(rows[0].email, rows[0].first_name, rows[0].school, 'accepted');
    res.json({ success: true, application: toApp(rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Update Application Details (applicant PUT) ───────────────────────────────
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
    const requiredDocuments = grade === 'Grade 8' ? ['id', 'gradeResult', 'gradeReport'] : ['id', 'removal', 'gradeResult', 'gradeReport'];
    const newUploaded  = documentTypes.map((type, i) => ({ type, filename: newFiles[i]?.filename || null, originalname: newFiles[i]?.originalname || null, mimetype: newFiles[i]?.mimetype || null }));
    const existingDocs = Array.isArray(existing.rows[0].documents) ? existing.rows[0].documents : JSON.parse(existing.rows[0].documents || '[]');
    const allDocuments = [...existingDocs, ...newUploaded];
    const missing      = requiredDocuments.filter(r => !allDocuments.some(u => u.type === r));
    if (missing.length > 0) {
      const names = missing.map(t => t === 'id' ? 'SA ID Copy' : t === 'removal' ? 'School Removal Letter' : t === 'gradeResult' ? 'Previous Grade Result' : 'Grade Report');
      return res.status(400).json({ success: false, message: `Missing required documents: ${names.join(', ')}` });
    }
    const { rows } = await pool.query(
      `UPDATE applications SET
        national_id=$1, first_name=$2, last_name=$3, date_of_birth=$4, gender=$5, email=$6,
        phone=$7, address=$8, city=$9, parent_name=$10, parent_phone=$11, parent_email=$12,
        parent_occupation=$13, relationship=$14, grade=$15, subject=$16, previous_school=$17,
        achievements=$18, why_attend=$19, emergency_contact=$20, emergency_phone=$21,
        documents=$22, document_count=$23, required_documents=$24,
        status='pending', comment='', updated_at=NOW()
       WHERE id=$25 RETURNING *`,
      [nationalId, firstName, lastName, dateOfBirth || null, gender, email, phone, address, city, parentName, parentPhone, parentEmail, parentOccupation, relationship, grade, subject || null, previousSchool, achievements, whyAttend, emergencyContact || null, emergencyPhone || null, JSON.stringify(allDocuments), allDocuments.length, JSON.stringify(requiredDocuments), id]
    );
    res.json({ success: true, application: toApp(rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Document Stats ───────────────────────────────────────────────────────────
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

// ─── Accepted Students ────────────────────────────────────────────────────────
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

// ─── Startup: ensure tables exist, then start server ─────────────────────────
// FIX: CREATE TABLE moved out of request handler — runs once at startup
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id            SERIAL   PRIMARY KEY,
      assignment_id INTEGER  REFERENCES assignments(id) ON DELETE CASCADE,
      student_id    INTEGER,
      filename      TEXT,
      originalname  TEXT,
      mimetype      TEXT,
      marks_obtained NUMERIC,
      percentage    NUMERIC,
      submitted_at  TIMESTAMPTZ DEFAULT NOW(),
      graded_at     TIMESTAMPTZ,
      graded_by     INTEGER
    )
  `);
}

// Listen immediately — Railway needs the server responding fast
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));

// Run table check after — non-blocking, won't crash server
ensureTables().catch(err => {
  console.error('Table check failed (non-fatal):', err.message);
});