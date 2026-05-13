const express    = require('express');
const cors       = require('cors');
const multer     = require('multer');
const fs         = require('fs');
const path       = require('path');
const crypto     = require('crypto');
const jwt        = require('jsonwebtoken');   // ← NEW
const bcrypt     = require('bcrypt');          // ← NEW
require('dotenv').config();
const nodemailer = require('nodemailer');
const pool       = require('./db');

// ── Import system-admin routes & middleware from auth.js ──────────────────────
const {
  router:             authRouter,       // system admin CRUD routes
  requireSchoolAdmin,                   // JWT middleware for school admin routes
  requireSystemAdmin,                   // JWT middleware for system admin routes
  logAudit,                             // audit log helper
} = require('./auth');
const { router: teacherRouter, requireTeacher, login: teacherLogin, setTeacherCredentials } = require('./routes/teacherRoutes');
const { setStudentCredentials, bulkGenerate, studentLogin, studentChangePassword, requireStudent } = require('./routes/studentAuth');

// ── Import management routes (Phase 1 — enrollment) ──────────────────────────
const managementRoutes = require('./routes/managementRoutes');  // ← LINE 1 ADDED
const phase2Routes = require('./routes/phase2Routes');
const phase3Routes = require('./routes/phase3Routes');
const eventsRoutes = require('./routes/eventsRoutes');
const { teacherQuizRouter, studentQuizRouter } = require('./routes/quizRoutes');
const chatRoutes = require('./routes/chatRoutes');



const app  = express();
const PORT = 5005;

// ── JWT secrets — add both to your .env file ──────────────────────────────────
//   JWT_SECRET=some_long_random_string
//   SYSTEM_JWT_SECRET=different_long_random_string
const SCHOOL_JWT_SECRET = process.env.JWT_SECRET        || 'change_me_school';
const TOKEN_EXPIRY      = '8h';

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin:       ['http://localhost:3000', 'https://school-application.vercel.app'],
  methods:      ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Wire in the auth.js system-admin router ───────────────────────────────────
// Adds:  POST /api/system/login
//        GET/POST/PATCH/DELETE /api/system/admins
//        GET/POST/PATCH        /api/system/schools
//        GET                   /api/system/overview
//        GET                   /api/system/logs
// ─── Parse JSON bodies globally (must be before authRouter) ──────────────────
app.use(express.json());

app.use(authRouter);

// ── Mount management routes (school admin protected) ─────────────────────────
app.use('/api/management', requireSchoolAdmin, managementRoutes);  
app.use('/api/setup', requireSchoolAdmin, phase2Routes);
app.use('/api/management', requireSchoolAdmin, phase3Routes);
app.post('/api/teacher-login', teacherLogin);
app.use('/api/teacher', requireTeacher, teacherRouter);
app.post('/api/management/teachers/:id/set-credentials', requireSchoolAdmin, setTeacherCredentials);
// Student auth endpoints
app.post('/api/student-login', studentLogin);
app.post('/api/student/change-password', requireStudent, studentChangePassword);
app.post('/api/management/students/:id/set-credentials', requireSchoolAdmin, setStudentCredentials);
app.post('/api/management/students/generate-credentials', requireSchoolAdmin, bulkGenerate);
app.use('/api/management', requireSchoolAdmin, eventsRoutes);
app.use('/api/teacher', requireTeacher, teacherQuizRouter);
app.use('/api/student', requireStudent, studentQuizRouter);
app.use('/api/student', requireStudent, chatRoutes);

// ── Student: profile and assignments ───────────────────────────────────────
// GET /api/student/me
app.get('/api/student/me', requireStudent, async (req, res) => {
  try {
    const studentId = req.student.id;
    const { rows } = await pool.query(
      `SELECT id, student_number AS "studentNumber", first_name AS "firstName", last_name AS "lastName",
              email, phone, grade, stream, school_id AS "schoolId", enrollment_date AS "enrollmentDate"
       FROM enrolled_students WHERE id = $1`,
      [studentId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Student not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[student me]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/student/assignments
app.get('/api/student/assignments', requireStudent, async (req, res) => {
  try {
    const studentId = req.student.id;
    const { rows: srows } = await pool.query('SELECT grade, stream, school_id FROM enrolled_students WHERE id = $1', [studentId]);
    if (!srows.length) return res.status(404).json({ message: 'Student not found' });
    const { grade, stream, school_id } = srows[0];
    // Extract numeric grade from stored string like 'Grade 10'
    const numericGrade = parseInt((grade || '').replace(/[^0-9]/g, ''), 10) || null;

    const params = [school_id];
    let gradeFilter = '';
    if (numericGrade) {
      params.push(numericGrade);
      gradeFilter = `AND c.grade = $${params.length}`;
    }
    let streamFilter = '';
    if (stream) { params.push(stream); streamFilter = `AND (c.stream IS NULL OR c.stream = $${params.length})`; }

    const q = `SELECT a.id, a.title, a.description, a.due_date AS "dueDate", a.total_marks AS "totalMarks", c.name AS "className", ss.name AS "subjectName"
               FROM assignments a
               JOIN classes c ON c.id = a.class_id
               JOIN school_subjects ss ON ss.id = a.subject_id
               WHERE c.school_id = $1
                 ${gradeFilter}
                 ${streamFilter}
               ORDER BY a.due_date DESC`;

    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error('[student assignments]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADD ALL THREE ROUTES to server.js, right after the existing
//   GET /api/student/assignments   route (around line 105).
// ─────────────────────────────────────────────────────────────────────────────

// ── 1. GET /api/student/submissions ─────────────────────────────────────────
// Returns the student's LATEST submission for every assignment they have
// submitted — all in one request.  Used by the dashboard to show submission
// status and result marks next to each assignment without making N calls.
app.get('/api/student/submissions', requireStudent, async (req, res) => {
  try {
    const studentId = req.student.id;

    // DISTINCT ON keeps only the most-recent row per assignment.
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (s.assignment_id)
         s.assignment_id  AS "assignmentId",
         s.id             AS "submissionId",
         s.marks_obtained AS "marksObtained",
         s.percentage,
         s.submitted_at   AS "submittedAt",
         s.graded_at      AS "gradedAt",
         s.originalname,
         s.filename,
         a.total_marks    AS "totalMarks"
       FROM assignment_submissions s
       JOIN assignments a ON a.id = s.assignment_id
       WHERE s.student_id = $1
       ORDER BY s.assignment_id, s.submitted_at DESC`,
      [studentId]
    );

    res.json(rows);
  } catch (err) {
    console.error('[student submissions bulk]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── 2. GET /api/student/assignments/:id/submission ───────────────────────────
// Returns the student's most-recent submission for ONE assignment.
// Used by the AssignmentDetail page.
app.get('/api/student/assignments/:id/submission', requireStudent, async (req, res) => {
  try {
    const studentId    = req.student.id;
    const assignmentId = req.params.id;

    const { rows } = await pool.query(
      `SELECT
         s.id,
         s.assignment_id   AS "assignmentId",
         s.filename,
         s.originalname,
         s.mimetype,
         s.marks_obtained  AS "marksObtained",
         s.percentage,
         s.submitted_at    AS "submittedAt",
         s.graded_at       AS "gradedAt",
         a.total_marks     AS "totalMarks"
       FROM assignment_submissions s
       JOIN assignments a ON a.id = s.assignment_id
       WHERE s.assignment_id = $1
         AND s.student_id   = $2
       ORDER BY s.submitted_at DESC
       LIMIT 1`,
      [assignmentId, studentId]
    );

    // Return null so the frontend can cleanly detect "no submission yet"
    res.json(rows[0] || null);
  } catch (err) {
    console.error('[student submission GET]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── 3. DELETE /api/student/assignments/:id/submission ────────────────────────
// Clears an ungraded submission so the student can resubmit.
// Blocked when the teacher has already graded (graded_at IS NOT NULL).
app.delete('/api/student/assignments/:id/submission', requireStudent, async (req, res) => {
  try {
    const studentId    = req.student.id;
    const assignmentId = req.params.id;

    const { rows } = await pool.query(
      `DELETE FROM assignment_submissions
       WHERE assignment_id = $1
         AND student_id   = $2
         AND graded_at    IS NULL
       RETURNING id`,
      [assignmentId, studentId]
    );

    if (!rows.length) {
      return res.status(400).json({
        message: 'Nothing to delete, or submission has already been graded.',
      });
    }
    res.json({ success: true, deleted: rows.length });
  } catch (err) {
    console.error('[student submission DELETE]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/student/timetable ───────────────────────────────────────────────
// Returns the weekly timetable for the student's class.
// The class is resolved from the student's grade + stream + school.
// Add this to server.js right after GET /api/student/submissions.
app.get('/api/student/timetable', requireStudent, async (req, res) => {
  try {
    const studentId = req.student.id;
    const schoolId  = req.student.schoolId;

    // 1. Get the student's grade and stream
    const { rows: stuRows } = await pool.query(
      `SELECT grade, stream FROM enrolled_students WHERE id = $1`,
      [studentId]
    );
    if (!stuRows.length) return res.status(404).json({ message: 'Student not found' });

    const { grade, stream } = stuRows[0];
    // Grade is stored as e.g. "Grade 10" — extract numeric part
    const numericGrade = parseInt((grade || '').replace(/[^0-9]/g, ''), 10);
    if (!numericGrade) return res.json({ class: null, slots: [], periods: [] });

    // 2. Find the student's class (grade + stream match within this school)
    const { rows: classRows } = await pool.query(
      `SELECT c.id, c.name, c.grade, c.stream
       FROM classes c
       WHERE c.school_id = $1
         AND c.grade     = $2
         AND (
               ($3::TEXT IS NULL AND c.stream IS NULL)
               OR c.stream = $3
             )
         AND c.is_active = true
       ORDER BY c.letter
       LIMIT 1`,
      [schoolId, numericGrade, stream || null]
    );

    if (!classRows.length) {
      // No class configured yet for this grade/stream
      return res.json({ class: null, slots: [], periods: [] });
    }

    const cls = classRows[0];

    // 3. Fetch timetable slots + all school periods in parallel
    const [slotsRes, periodsRes] = await Promise.all([
      pool.query(
        `SELECT
           ts.day_of_week         AS "dayOfWeek",
           ss.name                AS "subjectName",
           t.first_name           AS "teacherFirstName",
           t.last_name            AS "teacherLastName",
           sp.period_number       AS "periodNumber"
         FROM timetable_slots ts
         JOIN school_subjects ss ON ss.id = ts.subject_id
         JOIN teachers        t  ON t.id  = ts.teacher_id
         JOIN school_periods  sp ON sp.id = ts.period_id
         WHERE ts.class_id  = $1
           AND ts.school_id = $2
         ORDER BY sp.period_number`,
        [cls.id, schoolId]
      ),
      pool.query(
        `SELECT
           period_number AS "periodNumber",
           name,
           time_start    AS "timeStart",
           time_end      AS "timeEnd",
           is_break      AS "isBreak"
         FROM school_periods
         WHERE school_id = $1
         ORDER BY period_number`,
        [schoolId]
      ),
    ]);

    res.json({
      class:   cls,
      slots:   slotsRes.rows,
      periods: periodsRes.rows,
    });
  } catch (err) {
    console.error('[student timetable]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── File Uploads ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  },
});
const upload = multer({ storage });

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const allowedFileTypes = {
  id:          ['application/pdf'],
  removal:     ['application/pdf'],
  gradeResult: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  gradeReport: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
  additional:  ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
};
const maxFileSize = 5 * 1024 * 1024;

function validateFile(file, expectedType) {
  if (file.size > maxFileSize)
    return { valid: false, error: 'File size exceeds 5 MB limit' };
  const allowed = allowedFileTypes[expectedType] || allowedFileTypes.additional;
  if (!allowed.includes(file.mimetype))
    return { valid: false, error: `Invalid file type. Allowed: ${allowed.join(', ')}` };
  return { valid: true };
}

// ── Gradebook endpoints: assessments, marks, exam uploads ───────────────────
// POST /api/assessments — create a new assessment (teacher only)
app.post('/api/assessments', requireTeacher, async (req, res) => {
  try {
    const schoolId  = req.teacher.schoolId || req.teacher.school_id || req.teacher.school;
    const {
      title, type, date, maxScore, weight, term, classId, subjectId
    } = req.body;
    if (!title) return res.status(400).json({ message: 'title required' });

    const { rows } = await pool.query(
      `INSERT INTO assessments (school_id, class_id, subject_id, title, type, date, max_score, weight, term, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [schoolId, classId || null, subjectId || null, title, type || null, date || null, maxScore || 100, weight || 1, term || null, req.teacher.id || null]
    );

    await logAudit(pool, {
      actor: req.teacher.username || req.teacher.id,
      actorRole: 'teacher',
      action: 'CREATE_ASSESSMENT',
      target: rows[0].id,
      school: req.teacher.school || null,
      detail: JSON.stringify({ title })
    });

    res.json(rows[0]);
  } catch (err) {
    console.error('[POST /api/assessments]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/marks — accept single or bulk marks from teacher
app.post('/api/marks', requireTeacher, async (req, res) => {
  try {
    const marks = Array.isArray(req.body.marks) ? req.body.marks : [req.body];
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const m of marks) {
        const assessmentId = m.assessmentId || m.assessment_id;
        const studentId    = m.studentId || m.student_id;
        const score        = m.score;
        const maxScore     = m.maxScore || m.max_score || null;
        const source       = m.source || 'manual';
        if (!assessmentId || !studentId) throw new Error('assessmentId and studentId required');

        await client.query(
          `INSERT INTO marks (assessment_id, student_id, score, max_score, source, entered_by)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (assessment_id, student_id)
           DO UPDATE SET score = EXCLUDED.score, max_score = EXCLUDED.max_score, source = EXCLUDED.source, entered_by = EXCLUDED.entered_by, entered_at = NOW()`,
          [assessmentId, studentId, score, maxScore, source, req.teacher.id || null]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    await logAudit(pool, {
      actor: req.teacher.username || req.teacher.id,
      actorRole: 'teacher',
      action: 'UPLOAD_MARKS',
      target: null,
      school: req.teacher.school || null,
      detail: `marks_count=${marks.length}`
    });

    res.json({ success: true, uploaded: marks.length });
  } catch (err) {
    console.error('[POST /api/marks]', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// POST /api/exams/upload — upload a scanned handwritten exam for a student
app.post('/api/exams/upload', requireTeacher, upload.single('file'), async (req, res) => {
  try {
    const { assessmentId, studentId } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const v = validateFile(req.file, 'gradeResult');
    if (!v.valid) return res.status(400).json({ message: v.error });
    if (!assessmentId || !studentId) return res.status(400).json({ message: 'assessmentId and studentId required' });

    const filepath = path.join('uploads', req.file.filename);
    const { rows } = await pool.query(
      `INSERT INTO exam_submissions (assessment_id, student_id, filename, filepath, status)
       VALUES ($1,$2,$3,$4,'uploaded') RETURNING *`,
      [assessmentId, studentId, req.file.originalname, filepath]
    );

    await logAudit(pool, {
      actor: req.teacher.username || req.teacher.id,
      actorRole: 'teacher',
      action: 'UPLOAD_EXAM_SCAN',
      target: rows[0].id,
      school: req.teacher.school || null,
      detail: JSON.stringify({ filename: req.file.originalname })
    });

    res.json({ success: true, submission: rows[0] });
  } catch (err) {
    console.error('[POST /api/exams/upload]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── DB row → camelCase mapper ────────────────────────────────────────────────
function toApp(row) {
  return {
    id:                row.id,
    nationalId:        row.national_id,
    firstName:         row.first_name,
    lastName:          row.last_name,
    dateOfBirth:       row.date_of_birth,
    gender:            row.gender,
    email:             row.email,
    phone:             row.phone,
    address:           row.address,
    city:              row.city,
    parentName:        row.parent_name,
    parentPhone:       row.parent_phone,
    parentEmail:       row.parent_email,
    parentOccupation:  row.parent_occupation,
    relationship:      row.relationship,
    school:            row.school,
    grade:             row.grade,
    subject:           row.subject,
    previousSchool:    row.previous_school,
    achievements:      row.achievements,
    whyAttend:         row.why_attend,
    emergencyContact:  row.emergency_contact,
    emergencyPhone:    row.emergency_phone,
    documents:         row.documents,
    documentCount:     row.document_count,
    requiredDocuments: row.required_documents,
    status:            row.status,
    comment:           row.comment,
    submittedAt:       row.submitted_at,
    updatedAt:         row.updated_at,
  };
}

// ─── Email ────────────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
});

function sendStatusEmail(to, applicantName, school, status) {
  if (!to) return;
  const statusText = status.charAt(0).toUpperCase() + status.slice(1);
  transporter.sendMail({
    from:    process.env.GMAIL_USER,
    to,
    subject: `Your Application Status for ${school}`,
    text:    `Dear ${applicantName || 'Applicant'},\n\nYour application to ${school} has been ${statusText}.\n\nThank you for using our system.`,
  }, (err, info) => {
    if (err) console.error('Error sending email:', err);
    else     console.log('Status email sent:', info.response);
  });
}

// ─── REMOVED: adminTokens / schoolTokens in-memory stores ────────────────────
// These were lost on every server restart, logging everyone out.
// Replaced by JWT tokens that are self-contained and survive restarts.

// ─── REMOVED: getAdminSchoolFromToken / getSchoolFromToken ────────────────────
// Replaced by requireSchoolAdmin middleware from auth.js which:
//   1. Verifies the JWT signature
//   2. Attaches req.admin = { id, username, name, school, schoolId }
//   3. Returns 401 if token is missing, invalid, or expired

// ─── School Admin Login ───────────────────────────────────────────────────────
// CHANGED: was /api/admin-login querying admin_users with plain text password.
// Now queries school_admins (new table) with bcrypt password comparison.
// Returns JWT instead of a random hex token.
app.post('/api/admin-login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Username and password required' });

  try {
    // Join with schools so we get school name in one query
    const { rows } = await pool.query(
      `SELECT sa.id, sa.username, sa.name, sa.password_hash,
              sa.is_active, sa.temp_password_flag,
              s.name AS school, s.id AS school_id
       FROM   school_admins sa
       JOIN   schools s ON s.id = sa.school_id
       WHERE  sa.username = $1`,
      [username]
    );

    const admin = rows[0];

    // Same error message for both "not found" and "wrong password"
    // — never reveal which one failed (security best practice)
    if (!admin)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (!admin.is_active)
      return res.status(403).json({ success: false, message: 'Account suspended. Contact system admin.' });

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Update last_login timestamp
    await pool.query(
      'UPDATE school_admins SET last_login = NOW() WHERE id = $1',
      [admin.id]
    );

    // Write to audit log
    await logAudit(pool, {
      actor:     admin.username,
      actorRole: 'school_admin',
      action:    'LOGIN',
      target:    null,
      school:    admin.school,
    });

    // Sign a JWT — contains school and schoolId so middleware can enforce isolation
    const token = jwt.sign(
      {
        id:       admin.id,
        username: admin.username,
        name:     admin.name,
        school:   admin.school,
        schoolId: admin.school_id,
      },
      SCHOOL_JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    return res.json({
      success:          true,
      token,
      school:           admin.school,
      name:             admin.name,
      tempPasswordFlag: admin.temp_password_flag,  // frontend shows "change password" prompt
    });
  } catch (err) {
    console.error('admin-login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── REMOVED: /api/school-login ───────────────────────────────────────────────
// That route queried the old school_admins test table (Green Valley etc.)
// which has been dropped. The /api/admin-login above covers all school admins now.

// ─── School Admin: Change Password ───────────────────────────────────────────
// Called when tempPasswordFlag is true — admin must set their own password
app.post("/api/admin/change-password", requireSchoolAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8)
    return res.status(400).json({ success: false, message: 'New password must be at least 8 characters' });

  try {
    const { rows } = await pool.query(
      'SELECT password_hash FROM school_admins WHERE id = $1',
      [req.admin.id]
    );

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });

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
    console.error('change-password error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Schools (public — used by homepage and application form) ─────────────────
app.get('/api/schools', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM schools WHERE is_active = true ORDER BY id ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/schools error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Submit Application ───────────────────────────────────────────────────────

// ─── Upload School Image (system admin only) ──────────────────────────────────
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
  storage: schoolImageStorage,
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

app.post('/api/system/upload-image',
  requireSystemAdmin,
  uploadSchoolImage.single('image'),
  (req, res) => {
    if (!req.file)
      return res.status(400).json({ success: false, message: 'No image file provided' });
    res.json({ success: true, url: '/api/school-images/' + req.file.filename });
  }
);

app.get('/api/school-images/:filename', (req, res) => {
  const filePath = path.join(schoolImgDir, req.params.filename);
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else res.status(404).json({ success: false, message: 'Image not found' });
});

app.post('/api/applications', upload.array('documents', 10), async (req, res) => {
  const {
    nationalId, firstName, lastName, dateOfBirth, gender, email, phone, address, city,
    parentName, parentPhone, parentEmail, parentOccupation, relationship,
    grade, subject, previousSchool, achievements, whyAttend, emergencyContact, emergencyPhone,
  } = req.body;

  let schools = req.body.schools;

  if (!nationalId)
    return res.status(400).json({ success: false, message: 'National ID is required' });

  if (['Grade 10', 'Grade 11', 'Grade 12'].includes(grade) && !subject)
    return res.status(400).json({ success: false, message: 'Subject stream is required for Grade 10–12' });

  if (typeof schools === 'string') {
    try {
      const parsed = JSON.parse(schools);
      schools = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      schools = schools.split(',').map(s => s.trim());
    }
  }
  if (!Array.isArray(schools) || schools.length === 0)
    return res.status(400).json({ success: false, message: 'At least one school must be selected' });

  const documents     = req.files || [];
  const documentTypes = req.body.documentTypes ? JSON.parse(req.body.documentTypes) : [];

  for (let i = 0; i < documents.length; i++) {
    const v = validateFile(documents[i], documentTypes[i] || 'additional');
    if (!v.valid)
      return res.status(400).json({ success: false, message: `File validation failed: ${v.error}` });
  }

  const requiredDocuments = grade === 'Grade 8'
    ? ['id', 'gradeResult', 'gradeReport']
    : ['id', 'removal', 'gradeResult', 'gradeReport'];

  const uploadedTypes = documentTypes.map((type, i) => ({
    type,
    filename:     documents[i]?.filename     || null,
    originalname: documents[i]?.originalname || null,
    mimetype:     documents[i]?.mimetype     || null,
  }));
  const missing = requiredDocuments.filter(r => !uploadedTypes.some(u => u.type === r));

  if (missing.length > 0) {
    const names = missing.map(t =>
      t === 'id' ? 'SA ID Copy' : t === 'removal' ? 'School Removal Letter' :
      t === 'gradeResult' ? 'Previous Grade Result' : 'Grade Report'
    );
    return res.status(400).json({ success: false, message: `Missing required documents: ${names.join(', ')}` });
  }

  try {
    const insertedApps = [];
    for (const school of schools) {
      const id = Date.now() + Math.floor(Math.random() * 100000);
      const { rows } = await pool.query(
        `INSERT INTO applications (
          id, national_id, first_name, last_name, date_of_birth, gender,
          email, phone, address, city,
          parent_name, parent_phone, parent_email, parent_occupation, relationship,
          school, grade, subject, previous_school, achievements, why_attend,
          emergency_contact, emergency_phone,
          documents, document_count, required_documents,
          status, comment, submitted_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,
          $7,$8,$9,$10,
          $11,$12,$13,$14,$15,
          $16,$17,$18,$19,$20,$21,
          $22,$23,
          $24,$25,$26,
          'pending','',$27
        ) RETURNING *`,
        [
          id, nationalId, firstName, lastName, dateOfBirth || null, gender,
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
// CHANGED: requireSchoolAdmin middleware now enforces auth via JWT.
// School is read from req.admin.school (set by middleware) — not from
// an in-memory lookup. This means school isolation is enforced server-side.
app.get('/api/applications', requireSchoolAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM applications WHERE school = $1 ORDER BY submitted_at DESC',
      [req.admin.school]
    );
    res.json(rows.map(toApp));
  } catch (err) {
    console.error('GET /api/applications error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Get by nationalId or applicationId (applicant self-service) ──────────────
app.get('/api/applicant-applications', async (req, res) => {
  const { nationalId, applicationId } = req.query;
  try {
    if (nationalId) {
      const { rows } = await pool.query(
        'SELECT * FROM applications WHERE national_id = $1 ORDER BY submitted_at DESC',
        [nationalId]
      );
      return res.json(rows.map(toApp));
    }
    if (applicationId) {
      const { rows } = await pool.query(
        'SELECT * FROM applications WHERE id = $1',
        [applicationId]
      );
      return res.json(rows.map(toApp));
    }
    res.status(400).json({ success: false, message: 'nationalId or applicationId required' });
  } catch (err) {
    console.error('GET /api/applicant-applications error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Update Status (school admin PATCH) ──────────────────────────────────────
// CHANGED: now protected by requireSchoolAdmin and logs to audit trail
app.patch("/api/applications/:id", requireSchoolAdmin, async (req, res) => {
  const { id }              = req.params;
  const { status, comment } = req.body;

  if (!['approved', 'rejected', 'pending', 'accepted'].includes(status))
    return res.status(400).json({ success: false, message: 'Invalid status' });

  try {
    // Also verify this application belongs to the admin's school
    const { rows } = await pool.query(
      `UPDATE applications
         SET status = $1, comment = COALESCE($2, comment), updated_at = NOW()
       WHERE id = $3 AND school = $4
       RETURNING *`,
      [status, comment ?? null, id, req.admin.school]
    );

    if (rows.length === 0)
      return res.status(404).json({ success: false, message: 'Application not found' });

    // Audit log every status change
    await logAudit(pool, {
      actor:     req.admin.username,
      actorRole: 'school_admin',
      action:    `${status.toUpperCase()}_APPLICATION`,
      target:    `${rows[0].first_name} ${rows[0].last_name}`,
      school:    req.admin.school,
    });

    sendStatusEmail(rows[0].email, rows[0].first_name, rows[0].school, status);
    res.json({ success: true, application: toApp(rows[0]) });
  } catch (err) {
    console.error('PATCH /api/applications/:id error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Accept Offer (applicant self-service — no admin token required) ──────────
app.patch('/api/applications/:id/accept', async (req, res) => {
  const { id } = req.params;
  const { nationalId } = req.body;

  if (!nationalId)
    return res.status(400).json({ success: false, message: 'National ID is required' });

  try {
    // Verify the application belongs to this nationalId before allowing accept
    const { rows } = await pool.query(
      `UPDATE applications
         SET status = 'accepted', comment = 'Offer accepted by applicant', updated_at = NOW()
       WHERE id = $1
         AND national_id = $2
         AND status = 'approved'
       RETURNING *`,
      [id, nationalId]
    );

    if (rows.length === 0)
      return res.status(404).json({
        success: false,
        message: 'Application not found, already accepted, or not approved yet'
      });

    sendStatusEmail(rows[0].email, rows[0].first_name, rows[0].school, 'accepted');
    res.json({ success: true, application: toApp(rows[0]) });
  } catch (err) {
    console.error('PATCH /api/applications/:id/accept error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Update Application Details (applicant PUT) ───────────────────────────────
app.put('/api/applications/:id', upload.array('documents', 10), async (req, res) => {
  const { id } = req.params;
  const {
    nationalId, firstName, lastName, dateOfBirth, gender, email, phone, address, city,
    parentName, parentPhone, parentEmail, parentOccupation, relationship,
    grade, subject, previousSchool, achievements, whyAttend, emergencyContact, emergencyPhone,
  } = req.body;

  if (!nationalId || !firstName || !lastName || !email || !phone)
    return res.status(400).json({ success: false, message: 'Required fields are missing' });

  if (['Grade 10', 'Grade 11', 'Grade 12'].includes(grade) && !subject)
    return res.status(400).json({ success: false, message: 'Subject stream is required for Grade 10–12' });

  try {
    const existing = await pool.query('SELECT * FROM applications WHERE id = $1', [id]);
    if (existing.rows.length === 0)
      return res.status(404).json({ success: false, message: 'Application not found' });

    const existingApp = existing.rows[0];
    if (!['pending', 'rejected'].includes(existingApp.status))
      return res.status(403).json({ success: false, message: 'Only pending or rejected applications can be edited' });

    const newFiles      = req.files || [];
    const documentTypes = req.body.documentTypes ? JSON.parse(req.body.documentTypes) : [];

    for (let i = 0; i < newFiles.length; i++) {
      const v = validateFile(newFiles[i], documentTypes[i] || 'additional');
      if (!v.valid)
        return res.status(400).json({ success: false, message: `File validation failed: ${v.error}` });
    }

    const requiredDocuments = grade === 'Grade 8'
      ? ['id', 'gradeResult', 'gradeReport']
      : ['id', 'removal', 'gradeResult', 'gradeReport'];

    const newUploaded  = documentTypes.map((type, i) => ({
      type,
      filename:     newFiles[i]?.filename     || null,
      originalname: newFiles[i]?.originalname || null,
      mimetype:     newFiles[i]?.mimetype     || null,
    }));
    const existingDocs = Array.isArray(existingApp.documents)
      ? existingApp.documents
      : JSON.parse(existingApp.documents || '[]');
    const allDocuments = [...existingDocs, ...newUploaded];

    const missing = requiredDocuments.filter(r => !allDocuments.some(u => u.type === r));
    if (missing.length > 0) {
      const names = missing.map(t =>
        t === 'id' ? 'SA ID Copy' : t === 'removal' ? 'School Removal Letter' :
        t === 'gradeResult' ? 'Previous Grade Result' : 'Grade Report'
      );
      return res.status(400).json({ success: false, message: `Missing required documents: ${names.join(', ')}` });
    }

    const { rows } = await pool.query(
      `UPDATE applications SET
        national_id        = $1,  first_name      = $2,  last_name       = $3,
        date_of_birth      = $4,  gender          = $5,  email           = $6,
        phone              = $7,  address         = $8,  city            = $9,
        parent_name        = $10, parent_phone    = $11, parent_email    = $12,
        parent_occupation  = $13, relationship    = $14,
        grade              = $15, subject         = $16, previous_school = $17,
        achievements       = $18, why_attend      = $19,
        emergency_contact  = $20, emergency_phone = $21,
        documents          = $22, document_count  = $23, required_documents = $24,
        status             = 'pending', comment   = '',  updated_at      = NOW()
       WHERE id = $25
       RETURNING *`,
      [
        nationalId, firstName, lastName,
        dateOfBirth || null, gender, email,
        phone, address, city,
        parentName, parentPhone, parentEmail,
        parentOccupation, relationship,
        grade, subject || null, previousSchool,
        achievements, whyAttend,
        emergencyContact || null, emergencyPhone || null,
        JSON.stringify(allDocuments), allDocuments.length, JSON.stringify(requiredDocuments),
        id,
      ]
    );
    res.json({ success: true, application: toApp(rows[0]) });
  } catch (err) {
    console.error('PUT /api/applications/:id error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Document Stats (school admin) ───────────────────────────────────────────
app.get('/api/document-stats', requireSchoolAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM applications WHERE school = $1',
      [req.admin.school]
    );
    const stats = {
      totalApplications:          rows.length,
      applicationsWithDocuments:  rows.filter(a => a.documents?.length > 0).length,
      averageDocumentsPerApp:     0,
      documentTypeBreakdown:      { id: 0, removal: 0, gradeResult: 0, gradeReport: 0, additional: 0 },
      gradeBreakdown:             {},
    };
    let totalDocs = 0;
    rows.forEach(a => {
      const docs = Array.isArray(a.documents) ? a.documents : [];
      totalDocs += docs.length;
      docs.forEach(d => {
        if (d.type) stats.documentTypeBreakdown[d.type] = (stats.documentTypeBreakdown[d.type] || 0) + 1;
      });
      if (a.grade) stats.gradeBreakdown[a.grade] = (stats.gradeBreakdown[a.grade] || 0) + 1;
    });
    stats.averageDocumentsPerApp = rows.length > 0 ? (totalDocs / rows.length).toFixed(1) : 0;
    res.json(stats);
  } catch (err) {
    console.error('GET /api/document-stats error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Serve Uploaded Files ─────────────────────────────────────────────────────
app.get('/api/documents/:filename', (req, res) => {
  const filename = req.params.filename;
  const locations = [
    path.join(__dirname, 'uploads', filename),
    path.join(__dirname, 'uploads', 'assignments', filename),
    path.join(__dirname, 'uploads', 'submissions', filename),
  ];
  const found = locations.find(p => fs.existsSync(p));
  if (found) res.sendFile(found);
  else res.status(404).json({ success: false, message: 'File not found' });
});

// Public endpoint for students to submit assignment files (used by mobile/photo submissions)
app.post('/api/assignments/:id/submit', upload.single('file'), async (req, res) => {
  const assignmentId = req.params.id;
  const studentId = req.body.studentId || null;
  if (!req.file) return res.status(400).json({ success: false, message: 'File required' });
  try {
    // create submissions table if missing
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assignment_submissions (
        id SERIAL PRIMARY KEY,
        assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
        student_id INTEGER,
        filename TEXT,
        originalname TEXT,
        mimetype TEXT,
        marks_obtained NUMERIC,
        percentage NUMERIC,
        submitted_at TIMESTAMP DEFAULT NOW(),
        graded_at TIMESTAMP,
        graded_by INTEGER
      )
    `);

    const { rows } = await pool.query(
      `INSERT INTO assignment_submissions (assignment_id, student_id, filename, originalname, mimetype)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [assignmentId, studentId, req.file.filename, req.file.originalname, req.file.mimetype]
    );
    res.status(201).json({ success: true, submissionId: rows[0].id, url: '/api/documents/' + req.file.filename });
  } catch (err) {
    console.error('[public submit assignment]', err);
    res.status(500).json({ success: false, message: 'Failed to submit' });
  }
});

// ─── Accepted Students (school admin) ────────────────────────────────────────
app.get('/api/students', requireSchoolAdmin, async (req, res) => {
  try {
    let query    = 'SELECT * FROM applications WHERE school = $1 AND status = $2';
    const params = [req.admin.school, 'accepted'];
    if (req.query.recent) query += ' AND submitted_at >= NOW() - INTERVAL \'7 days\'';
    query += ' ORDER BY submitted_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows.map(toApp));
  } catch (err) {
    console.error('GET /api/students error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});