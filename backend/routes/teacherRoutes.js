// routes/teacherRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
//  Phase 4 — Teacher Portal Routes
//
//  Mount in server.js:
//    const { teacherRouter, requireTeacher } = require('./routes/teacherRoutes');
//    app.post('/api/teacher-login', teacherRouter.login);
//    app.use('/api/teacher', requireTeacher, teacherRouter.router);
//
//  Also adds one school-admin route to set teacher credentials:
//    POST /api/management/teachers/:id/set-credentials
//    (mount this on the existing requireSchoolAdmin middleware)
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcrypt');
const pool    = require('../db');
const multer  = require('multer');
const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');

const TEACHER_JWT_SECRET = process.env.TEACHER_JWT_SECRET || 'change_me_teacher';
const TOKEN_EXPIRY       = '8h';

// ─────────────────────────────────────────────────────────────────────────────
//  requireTeacher middleware
// ─────────────────────────────────────────────────────────────────────────────
const requireTeacher = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ message: 'No token provided' });

  try {
    req.teacher = jwt.verify(auth.slice(7), TEACHER_JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Teacher router
// ─────────────────────────────────────────────────────────────────────────────
const router = express.Router();

// --- Ensure upload directories exist and configure multer for assignments/submissions
const uploadsRoot = path.join(__dirname, '..', 'uploads');
const assignmentsDir = path.join(uploadsRoot, 'assignments');
const submissionsDir = path.join(uploadsRoot, 'submissions');
if (!fs.existsSync(assignmentsDir)) fs.mkdirSync(assignmentsDir, { recursive: true });
if (!fs.existsSync(submissionsDir)) fs.mkdirSync(submissionsDir, { recursive: true });

const diskStorage = (destDir) => multer.diskStorage({
  destination: (req, file, cb) => cb(null, destDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomBytes(16).toString('hex')}${ext}`);
  }
});

const uploadAssignmentFile = multer({ storage: diskStorage(assignmentsDir), limits: { fileSize: 10 * 1024 * 1024 } });
const uploadSubmissionFile = multer({ storage: diskStorage(submissionsDir), limits: { fileSize: 10 * 1024 * 1024 } });
const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// Helper: create support tables if they don't exist
async function ensureSupportTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assignment_files (
      id SERIAL PRIMARY KEY,
      assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
      filename TEXT,
      originalname TEXT,
      mimetype TEXT,
      uploaded_at TIMESTAMP DEFAULT NOW(),
      uploader_id INTEGER
    )
  `);

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
}

// ── Login (public — no middleware) ───────────────────────────────────────────
const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Username and password required' });

  try {
    const { rows } = await pool.query(
      `SELECT t.*, s.name AS school_name, s.id AS school_id
       FROM teachers t
       JOIN schools  s ON s.id = t.school_id
       WHERE t.username = $1 AND t.is_active = true`,
      [username]
    );

    const teacher = rows[0];
    if (!teacher)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    if (!teacher.password_hash)
      return res.status(401).json({ success: false, message: 'Account not activated yet. Contact your school admin.' });

    const valid = await bcrypt.compare(password, teacher.password_hash);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Invalid credentials' });

    await pool.query('UPDATE teachers SET last_login = NOW() WHERE id = $1', [teacher.id]);

    const token = jwt.sign(
      {
        id:         teacher.id,
        firstName:  teacher.first_name,
        lastName:   teacher.last_name,
        schoolId:   teacher.school_id,
        schoolName: teacher.school_name,
        username:   teacher.username,
      },
      TEACHER_JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    res.json({
      success: true,
      token,
      teacher: {
        id:              teacher.id,
        firstName:       teacher.first_name,
        lastName:        teacher.last_name,
        school:          teacher.school_name,
        tempPasswordFlag: teacher.temp_password_flag,
      },
    });
  } catch (err) {
    console.error('[teacher-login]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Change own password ──────────────────────────────────────────────────────
router.post('/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8)
    return res.status(400).json({ message: 'New password must be at least 8 characters' });

  try {
    const { rows } = await pool.query(
      'SELECT password_hash FROM teachers WHERE id = $1',
      [req.teacher.id]
    );
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid)
      return res.status(401).json({ message: 'Current password is incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE teachers SET password_hash = $1, temp_password_flag = false WHERE id = $2',
      [hash, req.teacher.id]
    );
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    console.error('[teacher change-password]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Dashboard ────────────────────────────────────────────────────────────────
// GET /api/teacher/dashboard
router.get('/dashboard', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  const today     = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  const dayName   = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  try {
    // Today's timetable slots
    const { rows: todaySlots } = await pool.query(
      `SELECT ts.id, ts.day_of_week AS "dayOfWeek", ts.period_id AS "periodId",
              ss.name AS "subjectName",
              c.name  AS "className", c.grade, c.stream,
              sp.name AS "periodName",
              sp.time_start AS "timeStart", sp.time_end AS "timeEnd",
              sp.period_number AS "periodNumber"
       FROM timetable_slots ts
       JOIN school_subjects ss ON ss.id = ts.subject_id
       JOIN classes          c  ON c.id  = ts.class_id
       JOIN school_periods   sp ON sp.id = ts.period_id
       WHERE ts.teacher_id  = $1
         AND ts.day_of_week = $2
         AND ts.school_id   = $3
       ORDER BY sp.period_number`,
      [teacherId, dayName, schoolId]
    );

    // Pending attendance — today's slots where attendance not yet marked
    const { rows: pendingAttendance } = await pool.query(
      `SELECT ts.id AS "slotId", ss.name AS "subjectName",
              c.name AS "className", sp.name AS "periodName",
              sp.time_start AS "timeStart"
       FROM timetable_slots ts
       JOIN school_subjects ss ON ss.id = ts.subject_id
       JOIN classes          c  ON c.id  = ts.class_id
       JOIN school_periods   sp ON sp.id = ts.period_id
       WHERE ts.teacher_id = $1
         AND ts.day_of_week = $2
         AND ts.school_id   = $3
         AND ts.id NOT IN (
           SELECT DISTINCT timetable_slot_id
           FROM attendance
           WHERE date = $4
             AND marked_by = $1
         )
       ORDER BY sp.period_number`,
      [teacherId, dayName, schoolId, today]
    );

    // My classes (distinct)
    const { rows: myClasses } = await pool.query(
      `SELECT DISTINCT c.id, c.name, c.grade, c.stream,
              COUNT(DISTINCT ts2.id) AS "slotCount"
       FROM timetable_slots ts
       JOIN classes c ON c.id = ts.class_id
       JOIN timetable_slots ts2 ON ts2.class_id = c.id AND ts2.teacher_id = $1
       WHERE ts.teacher_id = $1 AND ts.school_id = $2
       GROUP BY c.id, c.name, c.grade, c.stream
       ORDER BY c.grade, c.name`,
      [teacherId, schoolId]
    );

    // Upcoming assignments (due in next 7 days)
    const { rows: upcomingAssignments } = await pool.query(
      `SELECT a.id, a.title, a.due_date AS "dueDate",
              c.name AS "className", ss.name AS "subjectName"
       FROM assignments a
       JOIN classes        c  ON c.id  = a.class_id
       JOIN school_subjects ss ON ss.id = a.subject_id
       WHERE a.teacher_id = $1
         AND a.due_date   BETWEEN $2 AND $2::date + INTERVAL '7 days'
       ORDER BY a.due_date ASC
       LIMIT 5`,
      [teacherId, today]
    );

    // Exams needing results captured
    const { rows: pendingResults } = await pool.query(
      `SELECT e.id, e.title, e.exam_date AS "examDate",
              c.name AS "className", ss.name AS "subjectName",
              (SELECT COUNT(*) FROM enrolled_students es
               WHERE es.school_id = $2
                AND NULLIF(regexp_replace(es.grade,'[^0-9]','','g'),'')::INTEGER = c.grade
                AND es.is_active = true) AS "totalStudents",
              (SELECT COUNT(*) FROM results r WHERE r.exam_id = e.id) AS "captured"
       FROM exams e
       JOIN classes        c  ON c.id  = e.class_id
       JOIN school_subjects ss ON ss.id = e.subject_id
       WHERE e.teacher_id = $1
         AND e.exam_date  <= $3
       ORDER BY e.exam_date DESC
       LIMIT 5`,
      [teacherId, schoolId, today]
    );

    res.json({
      today:              dayName,
      date:               today,
      todaySlots,
      pendingAttendance,
      myClasses,
      upcomingAssignments,
      pendingResults,
    });
  } catch (err) {
    console.error('[teacher dashboard]', err);
    res.status(500).json({ message: 'Failed to load dashboard' });
  }
});

// ── Full timetable ───────────────────────────────────────────────────────────
// GET /api/teacher/timetable
router.get('/timetable', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  try {
    const { rows: slots } = await pool.query(
      `SELECT ts.id, ts.day_of_week AS "dayOfWeek",
              ts.class_id   AS "classId",
              ts.subject_id AS "subjectId",
              ss.name AS "subjectName",
              c.name  AS "className", c.grade, c.stream,
              sp.name AS "periodName", sp.period_number AS "periodNumber",
              sp.time_start AS "timeStart", sp.time_end AS "timeEnd"
      FROM timetable_slots ts
      JOIN school_subjects ss ON ss.id = ts.subject_id
      JOIN classes          c  ON c.id  = ts.class_id
      JOIN school_periods   sp ON sp.id = ts.period_id
      WHERE ts.teacher_id = $1 AND ts.school_id = $2
      ORDER BY sp.period_number`,
      [teacherId, schoolId]
    );

    const { rows: periods } = await pool.query(
      `SELECT id, period_number AS "periodNumber", name,
              time_start AS "timeStart", time_end AS "timeEnd", is_break AS "isBreak"
       FROM school_periods WHERE school_id = $1 ORDER BY period_number`,
      [schoolId]
    );

    res.json({ slots, periods });
  } catch (err) {
    console.error('[teacher timetable]', err);
    res.status(500).json({ message: 'Failed to load timetable' });
  }
});

// ── Class students ───────────────────────────────────────────────────────────
// GET /api/teacher/classes/:classId/students
router.get('/classes/:classId/students', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  const { classId } = req.params;

  try {
    // Verify teacher teaches this class
    const { rows: check } = await pool.query(
      'SELECT id FROM timetable_slots WHERE teacher_id = $1 AND class_id = $2 AND school_id = $3 LIMIT 1',
      [teacherId, classId, schoolId]
    );
    if (!check.length)
      return res.status(403).json({ message: 'You do not teach this class' });

    const { rows: cls } = await pool.query(
      'SELECT id, name, grade, stream FROM classes WHERE id = $1',
      [classId]
    );

    const { rows: students } = await pool.query(
      `SELECT es.id, es.student_number AS "studentNumber",
              es.first_name AS "firstName", es.last_name AS "lastName",
              es.gender, es.email, es.phone
       FROM enrolled_students es
       WHERE es.school_id = $1
        AND NULLIF(regexp_replace(es.grade,'[^0-9]','','g'),'')::INTEGER = $2
        AND es.is_active = true
       ORDER BY es.last_name, es.first_name`,
      [schoolId, cls[0]?.grade]
    );

    res.json({ class: cls[0], students });
  } catch (err) {
    console.error('[teacher class students]', err);
    res.status(500).json({ message: 'Failed to load students' });
  }
});

// ── Attendance ───────────────────────────────────────────────────────────────
// GET /api/teacher/attendance?slotId=5&date=2026-02-03
router.get('/attendance', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  const { slotId, date } = req.query;

  if (!slotId || !date)
    return res.status(400).json({ message: 'slotId and date are required' });

  try {
    // Get slot info + class grade
    const { rows: slot } = await pool.query(
      `SELECT ts.*, c.grade, c.name AS "className", ss.name AS "subjectName"
       FROM timetable_slots ts
       JOIN classes c ON c.id = ts.class_id
       JOIN school_subjects ss ON ss.id = ts.subject_id
       WHERE ts.id = $1 AND ts.teacher_id = $2`,
      [slotId, teacherId]
    );
    if (!slot.length)
      return res.status(403).json({ message: 'Slot not found or not yours' });

    // Students in this class's grade
    const { rows: students } = await pool.query(
      `SELECT es.id, es.student_number AS "studentNumber",
              es.first_name AS "firstName", es.last_name AS "lastName"
       FROM enrolled_students es
       WHERE es.school_id = $1
        AND NULLIF(regexp_replace(es.grade,'[^0-9]','','g'),'')::INTEGER = $2
        AND es.is_active = true
       ORDER BY es.last_name, es.first_name`,
      [schoolId, slot[0].grade]
    );

    // Existing attendance for this date
    const { rows: existing } = await pool.query(
      `SELECT student_id AS "studentId", status, note
       FROM attendance
       WHERE timetable_slot_id = $1 AND date = $2`,
      [slotId, date]
    );

    const attMap = {};
    existing.forEach(a => { attMap[a.studentId] = { status: a.status, note: a.note }; });

    res.json({
      slot: slot[0],
      date,
      students: students.map(s => ({
        ...s,
        status: attMap[s.id]?.status || 'present',
        note:   attMap[s.id]?.note   || '',
      })),
      alreadyMarked: existing.length > 0,
    });
  } catch (err) {
    console.error('[teacher attendance GET]', err);
    res.status(500).json({ message: 'Failed to load attendance' });
  }
});

// POST /api/teacher/attendance
// Body: { slotId, date, records: [{ studentId, status, note }] }
router.post('/attendance', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  const { slotId, date, records } = req.body;

  if (!slotId || !date || !Array.isArray(records) || !records.length)
    return res.status(400).json({ message: 'slotId, date and records are required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const r of records) {
      await client.query(
        `INSERT INTO attendance
           (school_id, timetable_slot_id, student_id, date, status, marked_by, note)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (timetable_slot_id, student_id, date)
         DO UPDATE SET status = $5, note = $7, marked_at = NOW()`,
        [schoolId, slotId, r.studentId, date, r.status || 'present', teacherId, r.note || null]
      );
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `Attendance marked for ${records.length} students` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[teacher attendance POST]', err);
    res.status(500).json({ message: 'Failed to save attendance' });
  } finally {
    client.release();
  }
});

// ── Assignments ──────────────────────────────────────────────────────────────
// GET /api/teacher/assignments
router.get('/assignments', async (req, res) => {
  const teacherId = req.teacher.id;
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.title, a.description, a.due_date AS "dueDate",
              a.total_marks AS "totalMarks", a.created_at AS "createdAt",
              a.term_id AS "termId",
              c.name AS "className", ss.name AS "subjectName"
       FROM assignments a
       JOIN classes c ON c.id = a.class_id
       JOIN school_subjects ss ON ss.id = a.subject_id
       WHERE a.teacher_id = $1
       ORDER BY a.due_date DESC`,
      [teacherId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[teacher assignments GET]', err);
    res.status(500).json({ message: 'Failed to load assignments' });
  }
});

// GET /api/teacher/terms
// Returns terms for the teacher's school (optionally filtered by academicYearId)
router.get('/terms', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  const { academicYearId } = req.query;
  try {
    const params = [schoolId];
    let q = `SELECT id, academic_year_id AS "academicYearId", term_number AS "termNumber", start_date AS "startDate", end_date AS "endDate", is_current AS "isCurrent"
             FROM terms WHERE school_id = $1`;
    if (academicYearId) { params.push(academicYearId); q += ` AND academic_year_id = $${params.length}`; }
    q += ' ORDER BY term_number ASC';
    const { rows } = await pool.query(q, params);
    res.json(rows);
  } catch (err) {
    console.error('[teacher terms GET]', err);
    res.status(500).json({ message: 'Failed to load terms' });
  }
});

// GET /api/teacher/marks-table?classId=123[&termId=1]
router.get('/marks-table', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  const { classId, termId } = req.query;
  if (!classId) return res.status(400).json({ message: 'classId is required' });
  try {
    // Verify class exists in this school
    const { rows: cls } = await pool.query('SELECT id, name, grade, stream, academic_year_id FROM classes WHERE id = $1 AND school_id = $2', [classId, schoolId]);
    if (!cls.length) return res.status(404).json({ message: 'Class not found' });
    const classRow = cls[0];

    // Fetch assignments for this class (optional term filter)
    const aParams = [classId];
    let aQ = `SELECT id, title, total_marks AS "totalMarks", due_date AS "dueDate", term_id AS "termId" FROM assignments WHERE class_id = $1`;
    if (termId) { aParams.push(termId); aQ += ` AND term_id = $${aParams.length}`; }
    aQ += ' ORDER BY due_date DESC';
    const { rows: assignments } = await pool.query(aQ, aParams);

    // Fetch students for this class (match by grade + stream within school)
    const { rows: students } = await pool.query(
      `SELECT es.id, es.student_number AS "studentNumber", es.first_name AS "firstName", es.last_name AS "lastName"
       FROM enrolled_students es
       WHERE es.school_id = $1
         AND NULLIF(regexp_replace(es.grade,'[^0-9]','','g'),'')::INTEGER = $2
         AND es.is_active = true
       ORDER BY es.last_name, es.first_name`,
      [schoolId, classRow.grade]
    );

    // Gather submissions for the found assignments
    let submissions = [];
    if (assignments.length > 0) {
      const ids = assignments.map(a => a.id);
      const { rows: subs } = await pool.query(
        `SELECT assignment_id, student_id, marks_obtained AS "marksObtained", percentage, graded_at
         FROM assignment_submissions
         WHERE assignment_id = ANY($1)`,
        [ids]
      );
      submissions = subs;
    }

    // Map submissions for quick lookup
    const subMap = {};
    submissions.forEach(s => {
      subMap[`${s.student_id || s.studentId}-${s.assignment_id || s.assignmentId}`] = s;
    });

    // Build student objects with marks map
    const studentsWithMarks = students.map(s => ({
      id: s.id,
      studentNumber: s.studentNumber,
      firstName: s.firstName,
      lastName: s.lastName,
      marks: assignments.reduce((acc, a) => {
        const key = `${s.id}-${a.id}`;
        const sub = subMap[key];
        if (sub) acc[String(a.id)] = { marksObtained: sub.marksObtained, percentage: sub.percentage, graded: !!sub.graded_at };
        return acc;
      }, {}),
    }));

    // Terms (if class linked to academic year)
    let terms = [];
    if (classRow.academic_year_id) {
      const { rows: trows } = await pool.query('SELECT id, term_number AS "termNumber", start_date AS "startDate", end_date AS "endDate", is_current AS "isCurrent" FROM terms WHERE academic_year_id = $1 ORDER BY term_number', [classRow.academic_year_id]);
      terms = trows;
    }

    res.json({ class: classRow, terms, assignments, students: studentsWithMarks });
  } catch (err) {
    console.error('[teacher marks-table GET]', err);
    res.status(500).json({ message: 'Failed to load marks table' });
  }
});

// POST /api/teacher/assignments
// Body: JSON or multipart/form-data (with optional 'file')
router.post('/assignments', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;

  // If the request is multipart, run multer to populate req.file and req.body
  try {
    const ct = req.headers['content-type'] || '';
    if (ct.startsWith('multipart/form-data')) {
      await new Promise((resolve, reject) => {
        uploadAssignmentFile.single('file')(req, res, (err) => err ? reject(err) : resolve());
      });
    }
  } catch (err) {
    console.error('[assignment upload parse]', err);
    return res.status(400).json({ message: 'Failed to parse uploaded file' });
  }

  const body = req.body || {};
  const { classId, subjectId, title, description, dueDate, totalMarks, termId } = body;

  if (!classId || !subjectId || !title || !dueDate)
    return res.status(400).json({ message: 'classId, subjectId, title and dueDate are required' });

  try {
    // Get academic year
    const { rows: cls } = await pool.query(
      'SELECT academic_year_id FROM classes WHERE id = $1', [classId]
    );

     const { rows } = await pool.query(
      `INSERT INTO assignments
        (school_id, class_id, subject_id, teacher_id, title,
         description, due_date, total_marks, academic_year_id, term_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, title, due_date AS "dueDate", total_marks AS "totalMarks", term_id AS "termId"`,
      [schoolId, classId, subjectId, teacherId, title,
       description || null, dueDate, totalMarks || null,
       cls[0]?.academic_year_id, termId || null]
     );
    const assignment = rows[0];

    // If a file was uploaded, persist metadata in support table
    if (req.file) {
      await ensureSupportTables();
      try {
        await pool.query(
          `INSERT INTO assignment_files (assignment_id, filename, originalname, mimetype, uploader_id)
           VALUES ($1,$2,$3,$4,$5)`,
          [assignment.id, req.file.filename, req.file.originalname, req.file.mimetype, teacherId]
        );
      } catch (e) {
        console.error('[assignment file insert]', e);
      }
    }

    res.status(201).json(assignment);
  } catch (err) {
    console.error('[teacher assignments POST]', err);
    res.status(500).json({ message: 'Failed to create assignment' });
  }
});

// GET /api/teacher/assignments/:id/submissions
router.get('/assignments/:id/submissions', async (req, res) => {
  const teacherId = req.teacher.id;
  const { id: assignmentId } = req.params;
  try {
    // verify teacher owns assignment
    const { rows: asg } = await pool.query('SELECT id, class_id FROM assignments WHERE id = $1 AND teacher_id = $2', [assignmentId, teacherId]);
    if (!asg.length) return res.status(403).json({ message: 'Assignment not found or not yours' });

    await ensureSupportTables();
    const { rows } = await pool.query(
      `SELECT s.id, s.student_id AS "studentId", s.filename, s.originalname, s.mimetype, s.marks_obtained AS "marksObtained", s.percentage, s.submitted_at AS "submittedAt",
              es.first_name AS "firstName", es.last_name AS "lastName", es.student_number AS "studentNumber"
       FROM assignment_submissions s
       LEFT JOIN enrolled_students es ON es.id = s.student_id
       WHERE s.assignment_id = $1
       ORDER BY s.submitted_at DESC`,
      [assignmentId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[get assignment submissions]', err);
    res.status(500).json({ message: 'Failed to load submissions' });
  }
});

// POST /api/teacher/assignments/:assignmentId/submissions/:submissionId/grade
router.post('/assignments/:assignmentId/submissions/:submissionId/grade', async (req, res) => {
  const teacherId = req.teacher.id;
  const { assignmentId, submissionId } = req.params;
  const { marksObtained } = req.body;
  if (marksObtained === undefined || marksObtained === null) return res.status(400).json({ message: 'marksObtained is required' });
  try {
    // verify teacher owns assignment
    const { rows: asg } = await pool.query('SELECT id, total_marks FROM assignments WHERE id = $1 AND teacher_id = $2', [assignmentId, teacherId]);
    if (!asg.length) return res.status(403).json({ message: 'Assignment not found or not yours' });
    const total = parseFloat(asg[0].total_marks) || 100;
    const marks = parseFloat(marksObtained);
    const pct = ((marks / total) * 100).toFixed(2);

    await ensureSupportTables();
    const { rowCount } = await pool.query(
      `UPDATE assignment_submissions
       SET marks_obtained = $1, percentage = $2, graded_at = NOW(), graded_by = $3
       WHERE id = $4 AND assignment_id = $5`,
      [marks, pct, teacherId, submissionId, assignmentId]
    );
    if (!rowCount) return res.status(404).json({ message: 'Submission not found' });
    res.json({ success: true, marksObtained: marks, percentage: pct });
  } catch (err) {
    console.error('[grade submission]', err);
    res.status(500).json({ message: 'Failed to grade submission' });
  }
});

// POST /api/teacher/assignments/:assignmentId/submissions/create
// Create a submission record for a student (useful when no file was uploaded)
router.post('/assignments/:assignmentId/submissions/create', async (req, res) => {
  const teacherId = req.teacher.id;
  const { assignmentId } = req.params;
  const { studentId, marksObtained } = req.body;
  if (!studentId) return res.status(400).json({ message: 'studentId is required' });

  try {
    await ensureSupportTables();
    // Verify teacher owns assignment
    const { rows: asg } = await pool.query('SELECT id, total_marks FROM assignments WHERE id = $1 AND teacher_id = $2', [assignmentId, teacherId]);
    if (!asg.length) return res.status(403).json({ message: 'Assignment not found or not yours' });
    const total = parseFloat(asg[0].total_marks) || 100;

    // Check existing
    const { rows: existing } = await pool.query('SELECT id FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2', [assignmentId, studentId]);
    if (existing.length) {
      // Update
      const marks = marksObtained === undefined || marksObtained === null ? null : parseFloat(marksObtained);
      const pct = marks !== null ? ((marks / total) * 100).toFixed(2) : null;
      await pool.query('UPDATE assignment_submissions SET marks_obtained = $1, percentage = $2, graded_at = NOW(), graded_by = $3 WHERE id = $4', [marks, pct, teacherId, existing[0].id]);
      return res.json({ success: true, updated: existing[0].id });
    }

    // Insert new submission record (no file)
    const marks = marksObtained === undefined || marksObtained === null ? null : parseFloat(marksObtained);
    const pct = marks !== null ? ((marks / total) * 100).toFixed(2) : null;
    const { rows } = await pool.query(
      `INSERT INTO assignment_submissions (assignment_id, student_id, filename, originalname, mimetype, marks_obtained, percentage, submitted_at, graded_at, graded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW(),$8) RETURNING id`,
      [assignmentId, studentId, null, null, null, marks, pct, teacherId]
    );
    res.status(201).json({ success: true, submissionId: rows[0].id });
  } catch (err) {
    console.error('[create submission]', err);
    res.status(500).json({ message: 'Failed to create submission' });
  }
});

// GET /api/teacher/assignments/:id/export  -> CSV export of submissions (student info + marks)
router.get('/assignments/:id/export', async (req, res) => {
  const teacherId = req.teacher.id;
  const { id: assignmentId } = req.params;
  try {
    // verify teacher owns assignment
    const { rows: asg } = await pool.query('SELECT id, class_id FROM assignments WHERE id = $1 AND teacher_id = $2', [assignmentId, teacherId]);
    if (!asg.length) return res.status(403).json({ message: 'Assignment not found or not yours' });
    const classId = asg[0].class_id;

    const { rows: students } = await pool.query(
      `SELECT es.id, es.student_number AS "studentNumber", es.first_name AS "firstName", es.last_name AS "lastName"
       FROM enrolled_students es
       WHERE es.school_id = (SELECT school_id FROM classes WHERE id = $1) AND NULLIF(regexp_replace(es.grade,'[^0-9]','','g'),'')::INTEGER = (SELECT grade FROM classes WHERE id = $1)
       ORDER BY es.last_name, es.first_name`,
      [classId]
    );

    const { rows: subs } = await pool.query('SELECT id, student_id, marks_obtained AS "marksObtained", percentage FROM assignment_submissions WHERE assignment_id = $1', [assignmentId]);
    const subMap = {};
    subs.forEach(s => { subMap[s.student_id] = s; });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="assignment_${assignmentId}_marks.csv"`);
    res.write('studentId,studentNumber,firstName,lastName,marksObtained,percentage\n');
    for (const st of students) {
      const sub = subMap[st.id];
      res.write(`${st.id},${st.studentNumber},${st.firstName},${st.lastName},${sub?.marksObtained ?? ''},${sub?.percentage ?? ''}\n`);
    }
    res.end();
  } catch (err) {
    console.error('[assignment export]', err);
    res.status(500).json({ message: 'Failed to export CSV' });
  }
});

// POST /api/teacher/assignments/:id/import  -> CSV import of marks (expects headers studentId or studentNumber and marksObtained)
router.post('/assignments/:id/import', memoryUpload.single('file'), async (req, res) => {
  const teacherId = req.teacher.id;
  const { id: assignmentId } = req.params;
  if (!req.file) return res.status(400).json({ message: 'CSV file is required' });
  try {
    // verify teacher owns assignment
    const { rows: asg } = await pool.query('SELECT id, class_id, total_marks FROM assignments WHERE id = $1 AND teacher_id = $2', [assignmentId, teacherId]);
    if (!asg.length) return res.status(403).json({ message: 'Assignment not found or not yours' });
    const total = parseFloat(asg[0].total_marks) || 100;

    const text = req.file.buffer.toString('utf8');
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return res.status(400).json({ message: 'CSV is empty' });
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const studentIdIdx = header.indexOf('studentid');
    const studentNumberIdx = header.indexOf('studentnumber');
    const marksIdx = header.indexOf('marksobtained') >= 0 ? header.indexOf('marksobtained') : header.indexOf('marks');
    if (marksIdx < 0 || (studentIdIdx < 0 && studentNumberIdx < 0)) return res.status(400).json({ message: 'CSV must contain studentId or studentNumber and marks (marksObtained)' });

    let processed = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      let studentId = null;
      if (studentIdIdx >= 0) studentId = parseInt(cols[studentIdIdx], 10);
      if (!studentId && studentNumberIdx >= 0) {
        const sn = cols[studentNumberIdx];
        const { rows: srows } = await pool.query('SELECT id FROM enrolled_students WHERE student_number = $1 LIMIT 1', [sn]);
        if (srows.length) studentId = srows[0].id;
      }
      if (!studentId) continue;
      const marks = cols[marksIdx] ? parseFloat(cols[marksIdx]) : null;
      const pct = marks !== null ? ((marks / total) * 100).toFixed(2) : null;

      const { rows: existing } = await pool.query('SELECT id FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2', [assignmentId, studentId]);
      if (existing.length) {
        await pool.query('UPDATE assignment_submissions SET marks_obtained = $1, percentage = $2, graded_at = NOW(), graded_by = $3 WHERE id = $4', [marks, pct, teacherId, existing[0].id]);
      } else {
        await pool.query('INSERT INTO assignment_submissions (assignment_id, student_id, marks_obtained, percentage, submitted_at, graded_at, graded_by) VALUES ($1,$2,$3,$4,NOW(),NOW(),$5)', [assignmentId, studentId, marks, pct, teacherId]);
      }
      processed++;
    }

    res.json({ success: true, processed });
  } catch (err) {
    console.error('[assignment import]', err);
    res.status(500).json({ message: 'Failed to import CSV' });
  }
});

// POST /api/assignments/:id/submit  (public - students will use later)
router.post('/assignments/:id/submit', uploadSubmissionFile.single('file'), async (req, res) => {
  const { id: assignmentId } = req.params;
  const { studentId } = req.body;
  if (!req.file)
    return res.status(400).json({ message: 'File is required' });
  try {
    await ensureSupportTables();
    const { rows } = await pool.query(
      `INSERT INTO assignment_submissions (assignment_id, student_id, filename, originalname, mimetype)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [assignmentId, studentId || null, req.file.filename, req.file.originalname, req.file.mimetype]
    );
    res.status(201).json({ success: true, submissionId: rows[0].id, url: '/api/documents/' + req.file.filename });
  } catch (err) {
    console.error('[submit assignment]', err);
    res.status(500).json({ message: 'Failed to submit' });
  }
});

// GET /api/teacher/assignments/:id/files  -> list files attached to assignment
router.get('/assignments/:id/files', async (req, res) => {
  const teacherId = req.teacher.id;
  const { id: assignmentId } = req.params;
  try {
    const { rows: asg } = await pool.query('SELECT id FROM assignments WHERE id = $1 AND teacher_id = $2', [assignmentId, teacherId]);
    if (!asg.length) return res.status(403).json({ message: 'Assignment not found or not yours' });
    await ensureSupportTables();
    const { rows } = await pool.query('SELECT id, filename, originalname, mimetype, uploaded_at AS "uploadedAt" FROM assignment_files WHERE assignment_id = $1 ORDER BY uploaded_at DESC', [assignmentId]);
    res.json(rows);
  } catch (err) {
    console.error('[assignment files list]', err);
    res.status(500).json({ message: 'Failed to load files' });
  }
});

// DELETE /api/teacher/assignments/:id
router.delete('/assignments/:id', async (req, res) => {
  const teacherId = req.teacher.id;
  try {
    const { rows } = await pool.query(
      'DELETE FROM assignments WHERE id = $1 AND teacher_id = $2 RETURNING id',
      [req.params.id, teacherId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Assignment not found' });
    res.json({ message: 'Assignment deleted' });
  } catch (err) {
    console.error('[teacher assignments DELETE]', err);
    res.status(500).json({ message: 'Failed to delete' });
  }
});

// ── Exams ────────────────────────────────────────────────────────────────────
// GET /api/teacher/exams
router.get('/exams', async (req, res) => {
  const teacherId = req.teacher.id;
  try {
    const { rows } = await pool.query(
      `SELECT e.id, e.title, e.type, e.exam_date AS "examDate",
              e.total_marks AS "totalMarks", e.created_at AS "createdAt",
              c.name AS "className", ss.name AS "subjectName",
              (SELECT COUNT(*) FROM results r WHERE r.exam_id = e.id) AS "resultsCaptured"
       FROM exams e
       JOIN classes        c  ON c.id  = e.class_id
       JOIN school_subjects ss ON ss.id = e.subject_id
       WHERE e.teacher_id = $1
       ORDER BY e.exam_date DESC`,
      [teacherId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[teacher exams GET]', err);
    res.status(500).json({ message: 'Failed to load exams' });
  }
});

// POST /api/teacher/exams
router.post('/exams', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  const { classId, subjectId, title, examDate, totalMarks, type } = req.body;

  if (!classId || !subjectId || !title || !examDate)
    return res.status(400).json({ message: 'classId, subjectId, title and examDate are required' });

  try {
    const { rows: cls } = await pool.query(
      'SELECT academic_year_id FROM classes WHERE id = $1', [classId]
    );
    const { rows } = await pool.query(
      `INSERT INTO exams
         (school_id, class_id, subject_id, teacher_id,
          title, exam_date, total_marks, type, academic_year_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, title, exam_date AS "examDate", total_marks AS "totalMarks", type`,
      [schoolId, classId, subjectId, teacherId,
       title, examDate, totalMarks || 100, type || 'test',
       cls[0]?.academic_year_id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[teacher exams POST]', err);
    res.status(500).json({ message: 'Failed to create exam' });
  }
});

// ── Results ──────────────────────────────────────────────────────────────────
// GET /api/teacher/exams/:examId/results
router.get('/exams/:examId/results', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  const { examId } = req.params;

  try {
    const { rows: exam } = await pool.query(
      `SELECT e.*, c.grade, c.name AS "className", ss.name AS "subjectName"
       FROM exams e JOIN classes c ON c.id = e.class_id
       JOIN school_subjects ss ON ss.id = e.subject_id
       WHERE e.id = $1 AND e.teacher_id = $2`,
      [examId, teacherId]
    );
    if (!exam.length) return res.status(403).json({ message: 'Exam not found or not yours' });

    const { rows: students } = await pool.query(
      `SELECT es.id, es.student_number AS "studentNumber",
              es.first_name AS "firstName", es.last_name AS "lastName"
       FROM enrolled_students es
       WHERE es.school_id = $1
        AND NULLIF(regexp_replace(es.grade,'[^0-9]','','g'),'')::INTEGER = $2
        AND es.is_active = true
       ORDER BY es.last_name, es.first_name`,
      [schoolId, exam[0].grade]
    );

    const { rows: existing } = await pool.query(
      `SELECT student_id AS "studentId", marks_obtained AS "marksObtained", percentage
       FROM results WHERE exam_id = $1`,
      [examId]
    );

    const resultMap = {};
    existing.forEach(r => { resultMap[r.studentId] = r; });

    res.json({
      exam: exam[0],
      students: students.map(s => ({
        ...s,
        marksObtained: resultMap[s.id]?.marksObtained ?? '',
        percentage:    resultMap[s.id]?.percentage    ?? '',
      })),
    });
  } catch (err) {
    console.error('[teacher results GET]', err);
    res.status(500).json({ message: 'Failed to load results' });
  }
});

// POST /api/teacher/exams/:examId/results
// Body: { results: [{ studentId, marksObtained }] }
router.post('/exams/:examId/results', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  const { examId } = req.params;
  const { results } = req.body;

  if (!Array.isArray(results) || !results.length)
    return res.status(400).json({ message: 'results array is required' });

  try {
    const { rows: exam } = await pool.query(
      'SELECT total_marks FROM exams WHERE id = $1 AND teacher_id = $2',
      [examId, teacherId]
    );
    if (!exam.length) return res.status(403).json({ message: 'Exam not found or not yours' });

    const totalMarks = exam[0].total_marks || 100;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      for (const r of results) {
        if (r.marksObtained === '' || r.marksObtained === null) continue;
        const marks = parseFloat(r.marksObtained);
        const pct   = ((marks / totalMarks) * 100).toFixed(2);
        await client.query(
          `INSERT INTO results
             (school_id, student_id, exam_id, marks_obtained, percentage, captured_by)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (student_id, exam_id)
           DO UPDATE SET marks_obtained = $4, percentage = $5, captured_at = NOW()`,
          [schoolId, r.studentId, examId, marks, pct, teacherId]
        );
      }
      await client.query('COMMIT');
      res.json({ success: true, message: `Results saved for ${results.length} students` });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[teacher results POST]', err);
    res.status(500).json({ message: 'Failed to save results' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  SCHOOL ADMIN: set teacher credentials
//  POST /api/management/teachers/:id/set-credentials
//  Body: { username, password }
//  Mount on requireSchoolAdmin in server.js
// ─────────────────────────────────────────────────────────────────────────────
const setTeacherCredentials = async (req, res) => {
  const schoolId = req.admin.schoolId;
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ message: 'Username and password are required' });
  if (password.length < 8)
    return res.status(400).json({ message: 'Password must be at least 8 characters' });

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `UPDATE teachers
         SET username = $1, password_hash = $2, temp_password_flag = true, updated_at = NOW()
       WHERE id = $3 AND school_id = $4
       RETURNING id, first_name AS "firstName", last_name AS "lastName", username`,
      [username, hash, req.params.id, schoolId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Teacher not found' });
    res.json({ success: true, teacher: rows[0] });
  } catch (err) {
    console.error('[set-credentials]', err);
    if (err.code === '23505')
      return res.status(409).json({ message: 'Username already taken' });
    res.status(500).json({ message: 'Failed to set credentials' });
  }
};

// ── Announcements (teacher-facing) ───────────────────────────────────────────
// GET /api/teacher/announcements
// Returns announcements where audience = 'all' OR audience = 'teachers'
router.get('/announcements', async (req, res) => {
  const schoolId = req.teacher.schoolId;
  try {
    const { rows } = await pool.query(
      `SELECT id, title, body, audience, is_pinned AS "isPinned", created_at AS "createdAt"
       FROM announcements
       WHERE school_id = $1
         AND audience IN ('all', 'teachers')
       ORDER BY is_pinned DESC, created_at DESC
       LIMIT 10`,
      [schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[teacher announcements]', err);
    res.status(500).json({ message: 'Failed to load announcements' });
  }
});

// ── Upcoming Events (teacher-facing) ─────────────────────────────────────────
// GET /api/teacher/events
// Returns events from today forward (next 30 days)
router.get('/events', async (req, res) => {
  const schoolId = req.teacher.schoolId;
  try {
    const { rows } = await pool.query(
      `SELECT id, title, description, event_date AS "eventDate",
              event_time AS "eventTime", location, type
       FROM events
       WHERE school_id = $1
         AND event_date >= CURRENT_DATE
         AND event_date <= CURRENT_DATE + INTERVAL '30 days'
       ORDER BY event_date ASC
       LIMIT 10`,
      [schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[teacher events]', err);
    res.status(500).json({ message: 'Failed to load events' });
  }
});

module.exports = { router, requireTeacher, login, setTeacherCredentials };