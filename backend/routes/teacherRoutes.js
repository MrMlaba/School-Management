// routes/teacherRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
//  Phase 4 — Teacher Portal Routes
//  FIX 6:  Grade filtering now handles both integer and 'Grade X' string formats
//  FIX 10: Attendance cannot be marked for future dates or >30 days in the past
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

const router = express.Router();

// All uploads go to PostgreSQL BYTEA via document_files — no disk writes for assignments/submissions
const uploadAssignmentFile = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const uploadSubmissionFile = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const memoryUpload         = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

async function saveFileToDb(file) {
  const ext      = path.extname(file.originalname).toLowerCase();
  const filename = crypto.randomBytes(16).toString('hex') + ext;
  await pool.query(
    'INSERT INTO document_files (filename, original_name, mimetype, file_size, data) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (filename) DO NOTHING',
    [filename, file.originalname, file.mimetype, file.size, file.buffer]
  );
  return filename;
}

async function ensureSupportTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assignment_files (
      id SERIAL PRIMARY KEY,
      assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
      filename TEXT, originalname TEXT, mimetype TEXT,
      uploaded_at TIMESTAMP DEFAULT NOW(), uploader_id INTEGER
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id SERIAL PRIMARY KEY,
      assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
      student_id INTEGER, filename TEXT, originalname TEXT, mimetype TEXT,
      marks_obtained NUMERIC, percentage NUMERIC,
      submitted_at TIMESTAMP DEFAULT NOW(), graded_at TIMESTAMP, graded_by INTEGER
    )
  `);
  // Add term_id to exams table
  try {
    await pool.query(`ALTER TABLE exams ADD COLUMN term_id INTEGER REFERENCES terms(id) ON DELETE SET NULL`);
  } catch (err) {
    if (!err.message.includes('already exists')) console.warn('[ensureSupportTables] exams.term_id:', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  FIX 6 HELPER — safe grade filter SQL fragment
//  enrolled_students.grade can be stored as:
//    - integer string:  "10"
//    - prefixed string: "Grade 10"
//    - integer column:  10
//  This helper builds a WHERE clause that handles ALL three formats.
// ─────────────────────────────────────────────────────────────────────────────
function gradeWhereClause(paramIndex) {
  return `(
    es.grade::TEXT = $${paramIndex}::TEXT
    OR es.grade::TEXT = 'Grade ' || $${paramIndex}
    OR REGEXP_REPLACE(es.grade::TEXT, '[^0-9]', '', 'g') = $${paramIndex}::TEXT
  )`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  FIX 10 HELPER — validate attendance date
//  Returns error string if invalid, null if OK.
// ─────────────────────────────────────────────────────────────────────────────
function validateAttendanceDate(dateStr) {
  if (!dateStr) return 'date is required';

  const attendanceDate = new Date(dateStr);
  if (isNaN(attendanceDate.getTime())) return 'Invalid date format';

  // Cannot mark attendance for future dates
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  if (attendanceDate > todayEnd)
    return 'Cannot mark attendance for a future date';

  // Cannot mark attendance more than 30 days in the past
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  if (attendanceDate < thirtyDaysAgo)
    return 'Cannot mark attendance more than 30 days in the past';

  return null;
}

// ── Login ────────────────────────────────────────────────────────────────────
const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Username and password required' });
  try {
    const { rows } = await pool.query(
      `SELECT t.*, s.name AS school_name, s.id AS school_id
       FROM teachers t JOIN schools s ON s.id = t.school_id
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
      { id: teacher.id, firstName: teacher.first_name, lastName: teacher.last_name,
        schoolId: teacher.school_id, schoolName: teacher.school_name, username: teacher.username },
      TEACHER_JWT_SECRET, { expiresIn: TOKEN_EXPIRY }
    );
    res.json({ success: true, token, teacher: {
      id: teacher.id, firstName: teacher.first_name, lastName: teacher.last_name,
      school: teacher.school_name, tempPasswordFlag: teacher.temp_password_flag,
    }});
  } catch (err) {
    console.error('[teacher-login]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ── Change password ──────────────────────────────────────────────────────────
router.post('/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8)
    return res.status(400).json({ message: 'New password must be at least 8 characters' });
  try {
    const { rows } = await pool.query('SELECT password_hash FROM teachers WHERE id = $1', [req.teacher.id]);
    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect' });
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE teachers SET password_hash = $1, temp_password_flag = false WHERE id = $2', [hash, req.teacher.id]);
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    console.error('[teacher change-password]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Dashboard ────────────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  const today     = new Date().toLocaleDateString('en-CA');
  const dayName   = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  try {
    const { rows: todaySlots } = await pool.query(
      `SELECT ts.id, ts.day_of_week AS "dayOfWeek", ts.period_id AS "periodId",
              ss.name AS "subjectName", c.name AS "className", c.grade, c.stream,
              sp.name AS "periodName", sp.time_start AS "timeStart", sp.time_end AS "timeEnd",
              sp.period_number AS "periodNumber"
       FROM timetable_slots ts
       JOIN school_subjects ss ON ss.id = ts.subject_id
       JOIN classes c ON c.id = ts.class_id
       JOIN school_periods sp ON sp.id = ts.period_id
       WHERE ts.teacher_id = $1 AND ts.day_of_week = $2 AND ts.school_id = $3
       ORDER BY sp.period_number`,
      [teacherId, dayName, schoolId]
    );

    const { rows: pendingAttendance } = await pool.query(
      `SELECT ts.id AS "slotId", ss.name AS "subjectName",
              c.name AS "className", sp.name AS "periodName", sp.time_start AS "timeStart"
       FROM timetable_slots ts
       JOIN school_subjects ss ON ss.id = ts.subject_id
       JOIN classes c ON c.id = ts.class_id
       JOIN school_periods sp ON sp.id = ts.period_id
       WHERE ts.teacher_id = $1 AND ts.day_of_week = $2 AND ts.school_id = $3
         AND ts.id NOT IN (
           SELECT DISTINCT timetable_slot_id FROM attendance
           WHERE date = $4 AND marked_by = $1
         )
       ORDER BY sp.period_number`,
      [teacherId, dayName, schoolId, today]
    );

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

    const { rows: upcomingAssignments } = await pool.query(
      `SELECT a.id, a.title, a.due_date AS "dueDate", c.name AS "className", ss.name AS "subjectName"
       FROM assignments a
       JOIN classes c ON c.id = a.class_id
       JOIN school_subjects ss ON ss.id = a.subject_id
       WHERE a.teacher_id = $1 AND a.due_date BETWEEN $2 AND $2::date + INTERVAL '7 days'
       ORDER BY a.due_date ASC LIMIT 5`,
      [teacherId, today]
    );

    const { rows: pendingResults } = await pool.query(
      `SELECT e.id, e.title, e.exam_date AS "examDate", c.name AS "className", ss.name AS "subjectName",
              (SELECT COUNT(*) FROM enrolled_students es WHERE es.school_id = $2
                AND REGEXP_REPLACE(es.grade::TEXT,'[^0-9]','','g') = c.grade::TEXT
                AND es.is_active = true) AS "totalStudents",
              (SELECT COUNT(*) FROM results r WHERE r.exam_id = e.id) AS "captured"
       FROM exams e
       JOIN classes c ON c.id = e.class_id
       JOIN school_subjects ss ON ss.id = e.subject_id
       WHERE e.teacher_id = $1 AND e.exam_date <= $3
       ORDER BY e.exam_date DESC LIMIT 5`,
      [teacherId, schoolId, today]
    );

    res.json({ today: dayName, date: today, todaySlots, pendingAttendance, myClasses, upcomingAssignments, pendingResults });
  } catch (err) {
    console.error('[teacher dashboard]', err);
    res.status(500).json({ message: 'Failed to load dashboard' });
  }
});

// ── Full timetable ───────────────────────────────────────────────────────────
router.get('/timetable', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  try {
    const { rows: slots } = await pool.query(
      `SELECT ts.id, ts.day_of_week AS "dayOfWeek", ts.class_id AS "classId", ts.subject_id AS "subjectId",
              ss.name AS "subjectName", c.name AS "className", c.grade, c.stream,
              sp.name AS "periodName", sp.period_number AS "periodNumber",
              sp.time_start AS "timeStart", sp.time_end AS "timeEnd"
       FROM timetable_slots ts
       JOIN school_subjects ss ON ss.id = ts.subject_id
       JOIN classes c ON c.id = ts.class_id
       JOIN school_periods sp ON sp.id = ts.period_id
       WHERE ts.teacher_id = $1 AND ts.school_id = $2
       ORDER BY sp.period_number`,
      [teacherId, schoolId]
    );
    const { rows: periods } = await pool.query(
      `SELECT id, period_number AS "periodNumber", name, time_start AS "timeStart",
              time_end AS "timeEnd", is_break AS "isBreak"
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
// FIX 6: Uses gradeWhereClause() to handle all grade storage formats
router.get('/classes/:classId/students', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  const { classId } = req.params;
  try {
    const { rows: check } = await pool.query(
      'SELECT id FROM timetable_slots WHERE teacher_id = $1 AND class_id = $2 AND school_id = $3 LIMIT 1',
      [teacherId, classId, schoolId]
    );
    if (!check.length) return res.status(403).json({ message: 'You do not teach this class' });

    const { rows: cls } = await pool.query(
      'SELECT id, name, grade, stream FROM classes WHERE id = $1', [classId]
    );
    if (!cls.length) return res.status(404).json({ message: 'Class not found' });

    // FIX 6: gradeWhereClause handles 'Grade 10', '10', and integer 10
    const { rows: students } = await pool.query(
      `SELECT es.id, es.student_number AS "studentNumber",
              es.first_name AS "firstName", es.last_name AS "lastName",
              es.gender, es.email, es.phone
       FROM enrolled_students es
       WHERE es.school_id = $1
         AND ${gradeWhereClause(2)}
         AND es.is_active = true
       ORDER BY es.last_name, es.first_name`,
      [schoolId, String(cls[0].grade)]
    );
    res.json({ class: cls[0], students });
  } catch (err) {
    console.error('[teacher class students]', err);
    res.status(500).json({ message: 'Failed to load students' });
  }
});

// ── Attendance GET ───────────────────────────────────────────────────────────
// FIX 6: Uses gradeWhereClause() for consistent student lookup
router.get('/attendance', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  const { slotId, date } = req.query;
  if (!slotId || !date)
    return res.status(400).json({ message: 'slotId and date are required' });
  try {
    const { rows: slot } = await pool.query(
      `SELECT ts.*, c.grade, c.name AS "className", ss.name AS "subjectName"
       FROM timetable_slots ts
       JOIN classes c ON c.id = ts.class_id
       JOIN school_subjects ss ON ss.id = ts.subject_id
       WHERE ts.id = $1 AND ts.teacher_id = $2`,
      [slotId, teacherId]
    );
    if (!slot.length) return res.status(403).json({ message: 'Slot not found or not yours' });

    // FIX 6: handles all grade formats
    const { rows: students } = await pool.query(
      `SELECT es.id, es.student_number AS "studentNumber",
              es.first_name AS "firstName", es.last_name AS "lastName"
       FROM enrolled_students es
       WHERE es.school_id = $1
         AND ${gradeWhereClause(2)}
         AND es.is_active = true
       ORDER BY es.last_name, es.first_name`,
      [schoolId, String(slot[0].grade)]
    );

    const { rows: existing } = await pool.query(
      `SELECT student_id AS "studentId", status, note
       FROM attendance WHERE timetable_slot_id = $1 AND date = $2`,
      [slotId, date]
    );
    const attMap = {};
    existing.forEach(a => { attMap[a.studentId] = { status: a.status, note: a.note }; });

    res.json({
      slot: slot[0], date,
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

// ── Attendance POST ──────────────────────────────────────────────────────────
// FIX 10: Validates date is not in the future or >30 days in the past
router.post('/attendance', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  const { slotId, date, records } = req.body;

  if (!slotId || !Array.isArray(records) || !records.length)
    return res.status(400).json({ message: 'slotId, date and records are required' });

  // FIX 10: Reject future dates and dates too far in the past
  const dateError = validateAttendanceDate(date);
  if (dateError) return res.status(400).json({ message: dateError });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const r of records) {
      await client.query(
        `INSERT INTO attendance (school_id, timetable_slot_id, student_id, date, status, marked_by, note)
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

// ── Assignments GET ──────────────────────────────────────────────────────────
router.get('/assignments', async (req, res) => {
  const teacherId = req.teacher.id;
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.title, a.description, a.due_date AS "dueDate",
              a.total_marks AS "totalMarks", a.created_at AS "createdAt", a.term_id AS "termId",
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

// ── Terms GET ────────────────────────────────────────────────────────────────
router.get('/terms', async (req, res) => {
  const schoolId        = req.teacher.schoolId;
  const { academicYearId } = req.query;
  try {
    const params = [schoolId];
    let q = `SELECT id, academic_year_id AS "academicYearId", term_number AS "termNumber",
                    start_date AS "startDate", end_date AS "endDate", is_current AS "isCurrent"
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

// ── Marks table GET ──────────────────────────────────────────────────────────
// FIX 6: Uses gradeWhereClause() for student lookup
router.get('/marks-table', async (req, res) => {
  const schoolId        = req.teacher.schoolId;
  const { classId, termId } = req.query;
  if (!classId) return res.status(400).json({ message: 'classId is required' });
  try {
    const { rows: cls } = await pool.query(
      'SELECT id, name, grade, stream, academic_year_id FROM classes WHERE id = $1 AND school_id = $2',
      [classId, schoolId]
    );
    if (!cls.length) return res.status(404).json({ message: 'Class not found' });
    const classRow = cls[0];

    const aParams = [classId];
    let aQ = `SELECT id, title, total_marks AS "totalMarks", due_date AS "dueDate", term_id AS "termId"
              FROM assignments WHERE class_id = $1`;
    if (termId) { aParams.push(termId); aQ += ` AND term_id = $${aParams.length}`; }
    aQ += ' ORDER BY due_date DESC';
    const { rows: assignments } = await pool.query(aQ, aParams);

    // FIX 6: handles all grade formats
    const { rows: students } = await pool.query(
      `SELECT es.id, es.student_number AS "studentNumber",
              es.first_name AS "firstName", es.last_name AS "lastName"
       FROM enrolled_students es
       WHERE es.school_id = $1
         AND ${gradeWhereClause(2)}
         AND es.is_active = true
       ORDER BY es.last_name, es.first_name`,
      [schoolId, String(classRow.grade)]
    );

    let submissions = [];
    if (assignments.length > 0) {
      const ids = assignments.map(a => a.id);
      const { rows: subs } = await pool.query(
        `SELECT assignment_id, student_id, marks_obtained AS "marksObtained", percentage, graded_at
         FROM assignment_submissions WHERE assignment_id = ANY($1)`,
        [ids]
      );
      submissions = subs;
    }

    const subMap = {};
    submissions.forEach(s => { subMap[`${s.student_id}-${s.assignment_id}`] = s; });

    const studentsWithMarks = students.map(s => ({
      id: s.id, studentNumber: s.studentNumber,
      firstName: s.firstName, lastName: s.lastName,
      marks: assignments.reduce((acc, a) => {
        const sub = subMap[`${s.id}-${a.id}`];
        if (sub) acc[String(a.id)] = { marksObtained: sub.marksObtained, percentage: sub.percentage, graded: !!sub.graded_at };
        return acc;
      }, {}),
    }));

    let terms = [];
    if (classRow.academic_year_id) {
      const { rows: trows } = await pool.query(
        'SELECT id, term_number AS "termNumber", start_date AS "startDate", end_date AS "endDate", is_current AS "isCurrent" FROM terms WHERE academic_year_id = $1 ORDER BY term_number',
        [classRow.academic_year_id]
      );
      terms = trows;
    }

    res.json({ class: classRow, terms, assignments, students: studentsWithMarks });
  } catch (err) {
    console.error('[teacher marks-table GET]', err);
    res.status(500).json({ message: 'Failed to load marks table' });
  }
});

// ── Assignments POST ─────────────────────────────────────────────────────────
router.post('/assignments', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  try {
    const ct = req.headers['content-type'] || '';
    if (ct.startsWith('multipart/form-data')) {
      await new Promise((resolve, reject) => {
        uploadAssignmentFile.single('file')(req, res, (err) => err ? reject(err) : resolve());
      });
    }
  } catch (err) {
    return res.status(400).json({ message: 'Failed to parse uploaded file' });
  }

  const body = req.body || {};
  const { classId, subjectId, title, description, dueDate, totalMarks, termId } = body;
  if (!classId || !subjectId || !title || !dueDate)
    return res.status(400).json({ message: 'classId, subjectId, title and dueDate are required' });

  try {
    const { rows: cls } = await pool.query('SELECT academic_year_id FROM classes WHERE id = $1', [classId]);
    const { rows } = await pool.query(
      `INSERT INTO assignments (school_id, class_id, subject_id, teacher_id, title, description, due_date, total_marks, academic_year_id, term_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, title, due_date AS "dueDate", total_marks AS "totalMarks", term_id AS "termId"`,
      [schoolId, classId, subjectId, teacherId, title, description || null, dueDate, totalMarks || null, cls[0]?.academic_year_id, termId || null]
    );
    const assignment = rows[0];
    if (req.file) {
      await ensureSupportTables();
      try {
        const savedFilename = await saveFileToDb(req.file);
        await pool.query(
          `INSERT INTO assignment_files (assignment_id, filename, originalname, mimetype, uploader_id)
           VALUES ($1,$2,$3,$4,$5)`,
          [assignment.id, savedFilename, req.file.originalname, req.file.mimetype, teacherId]
        );
      } catch (e) { console.error('[assignment file insert]', e); }
    }
    res.status(201).json(assignment);
  } catch (err) {
    console.error('[teacher assignments POST]', err);
    res.status(500).json({ message: 'Failed to create assignment' });
  }
});

// ── Assignment submissions ───────────────────────────────────────────────────
router.get('/assignments/:id/submissions', async (req, res) => {
  const teacherId    = req.teacher.id;
  const { id: assignmentId } = req.params;
  try {
    const { rows: asg } = await pool.query('SELECT id, class_id FROM assignments WHERE id = $1 AND teacher_id = $2', [assignmentId, teacherId]);
    if (!asg.length) return res.status(403).json({ message: 'Assignment not found or not yours' });
    await ensureSupportTables();
    const { rows } = await pool.query(
      `SELECT s.id, s.student_id AS "studentId", s.filename, s.originalname, s.mimetype,
              s.marks_obtained AS "marksObtained", s.percentage,
              s.submitted_at AS "submittedAt",
              es.first_name AS "firstName", es.last_name AS "lastName",
              es.student_number AS "studentNumber"
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

router.post('/assignments/:assignmentId/submissions/:submissionId/grade', async (req, res) => {
  const teacherId = req.teacher.id;
  const { assignmentId, submissionId } = req.params;
  const { marksObtained } = req.body;
  if (marksObtained === undefined || marksObtained === null)
    return res.status(400).json({ message: 'marksObtained is required' });
  try {
    const { rows: asg } = await pool.query('SELECT id, total_marks FROM assignments WHERE id = $1 AND teacher_id = $2', [assignmentId, teacherId]);
    if (!asg.length) return res.status(403).json({ message: 'Assignment not found or not yours' });
    const total = parseFloat(asg[0].total_marks) || 100;
    const marks = parseFloat(marksObtained);
    const pct   = ((marks / total) * 100).toFixed(2);
    await ensureSupportTables();
    const { rowCount } = await pool.query(
      `UPDATE assignment_submissions SET marks_obtained = $1, percentage = $2, graded_at = NOW(), graded_by = $3
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

router.post('/assignments/:assignmentId/submissions/create', async (req, res) => {
  const teacherId    = req.teacher.id;
  const { assignmentId } = req.params;
  const { studentId, marksObtained } = req.body;
  if (!studentId) return res.status(400).json({ message: 'studentId is required' });
  try {
    await ensureSupportTables();
    const { rows: asg } = await pool.query('SELECT id, total_marks FROM assignments WHERE id = $1 AND teacher_id = $2', [assignmentId, teacherId]);
    if (!asg.length) return res.status(403).json({ message: 'Assignment not found or not yours' });
    const total = parseFloat(asg[0].total_marks) || 100;
    const { rows: existing } = await pool.query('SELECT id FROM assignment_submissions WHERE assignment_id = $1 AND student_id = $2', [assignmentId, studentId]);
    const marks = (marksObtained === undefined || marksObtained === null) ? null : parseFloat(marksObtained);
    const pct   = marks !== null ? ((marks / total) * 100).toFixed(2) : null;
    if (existing.length) {
      await pool.query('UPDATE assignment_submissions SET marks_obtained = $1, percentage = $2, graded_at = NOW(), graded_by = $3 WHERE id = $4', [marks, pct, teacherId, existing[0].id]);
      return res.json({ success: true, updated: existing[0].id });
    }
    const { rows } = await pool.query(
      `INSERT INTO assignment_submissions (assignment_id, student_id, filename, originalname, mimetype, marks_obtained, percentage, submitted_at, graded_at, graded_by)
       VALUES ($1,$2,null,null,null,$3,$4,NOW(),NOW(),$5) RETURNING id`,
      [assignmentId, studentId, marks, pct, teacherId]
    );
    res.status(201).json({ success: true, submissionId: rows[0].id });
  } catch (err) {
    console.error('[create submission]', err);
    res.status(500).json({ message: 'Failed to create submission' });
  }
});

// ── Assignment export/import CSV ─────────────────────────────────────────────
router.get('/assignments/:id/export', async (req, res) => {
  const teacherId    = req.teacher.id;
  const { id: assignmentId } = req.params;
  try {
    const { rows: asg } = await pool.query('SELECT id, class_id FROM assignments WHERE id = $1 AND teacher_id = $2', [assignmentId, teacherId]);
    if (!asg.length) return res.status(403).json({ message: 'Assignment not found or not yours' });
    const classId = asg[0].class_id;
    const { rows: clsRows } = await pool.query('SELECT grade FROM classes WHERE id = $1', [classId]);
    if (!clsRows.length) return res.status(404).json({ message: 'Class not found' });

    // FIX 6: consistent grade matching
    const { rows: students } = await pool.query(
      `SELECT es.id, es.student_number AS "studentNumber", es.first_name AS "firstName", es.last_name AS "lastName"
       FROM enrolled_students es
       WHERE es.school_id = (SELECT school_id FROM classes WHERE id = $1)
         AND ${gradeWhereClause(2)}
       ORDER BY es.last_name, es.first_name`,
      [classId, String(clsRows[0].grade)]
    );
    const { rows: subs } = await pool.query(
      'SELECT student_id, marks_obtained AS "marksObtained", percentage FROM assignment_submissions WHERE assignment_id = $1',
      [assignmentId]
    );
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

router.post('/assignments/:id/import', memoryUpload.single('file'), async (req, res) => {
  const teacherId    = req.teacher.id;
  const { id: assignmentId } = req.params;
  if (!req.file) return res.status(400).json({ message: 'CSV file is required' });
  try {
    const { rows: asg } = await pool.query('SELECT id, class_id, total_marks FROM assignments WHERE id = $1 AND teacher_id = $2', [assignmentId, teacherId]);
    if (!asg.length) return res.status(403).json({ message: 'Assignment not found or not yours' });
    const total  = parseFloat(asg[0].total_marks) || 100;
    const text   = req.file.buffer.toString('utf8');
    const lines  = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return res.status(400).json({ message: 'CSV is empty' });
    const header          = lines[0].split(',').map(h => h.trim().toLowerCase());
    const studentIdIdx    = header.indexOf('studentid');
    const studentNumberIdx = header.indexOf('studentnumber');
    const marksIdx        = header.indexOf('marksobtained') >= 0 ? header.indexOf('marksobtained') : header.indexOf('marks');
    if (marksIdx < 0 || (studentIdIdx < 0 && studentNumberIdx < 0))
      return res.status(400).json({ message: 'CSV must contain studentId or studentNumber and marks' });
    let processed = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      let studentId = null;
      if (studentIdIdx >= 0) studentId = parseInt(cols[studentIdIdx], 10);
      if (!studentId && studentNumberIdx >= 0) {
        const { rows: srows } = await pool.query('SELECT id FROM enrolled_students WHERE student_number = $1 LIMIT 1', [cols[studentNumberIdx]]);
        if (srows.length) studentId = srows[0].id;
      }
      if (!studentId) continue;
      const marks = cols[marksIdx] ? parseFloat(cols[marksIdx]) : null;
      const pct   = marks !== null ? ((marks / total) * 100).toFixed(2) : null;
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

router.post('/assignments/:id/submit', uploadSubmissionFile.single('file'), async (req, res) => {
  const { id: assignmentId } = req.params;
  const { studentId } = req.body;
  if (!req.file) return res.status(400).json({ message: 'File is required' });
  try {
    await ensureSupportTables();
    const filename = await saveFileToDb(req.file);
    const { rows } = await pool.query(
      `INSERT INTO assignment_submissions (assignment_id, student_id, filename, originalname, mimetype)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [assignmentId, studentId || null, filename, req.file.originalname, req.file.mimetype]
    );
    res.status(201).json({ success: true, submissionId: rows[0].id, url: '/api/documents/' + filename });
  } catch (err) {
    console.error('[submit assignment]', err);
    res.status(500).json({ message: 'Failed to submit' });
  }
});

router.get('/assignments/:id/files', async (req, res) => {
  const teacherId    = req.teacher.id;
  const { id: assignmentId } = req.params;
  try {
    const { rows: asg } = await pool.query('SELECT id FROM assignments WHERE id = $1 AND teacher_id = $2', [assignmentId, teacherId]);
    if (!asg.length) return res.status(403).json({ message: 'Assignment not found or not yours' });
    await ensureSupportTables();
    const { rows } = await pool.query(
      'SELECT id, filename, originalname, mimetype, uploaded_at AS "uploadedAt" FROM assignment_files WHERE assignment_id = $1 ORDER BY uploaded_at DESC',
      [assignmentId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[assignment files list]', err);
    res.status(500).json({ message: 'Failed to load files' });
  }
});

router.delete('/assignments/:id', async (req, res) => {
  const teacherId = req.teacher.id;
  try {
    const { rows } = await pool.query('DELETE FROM assignments WHERE id = $1 AND teacher_id = $2 RETURNING id', [req.params.id, teacherId]);
    if (!rows.length) return res.status(404).json({ message: 'Assignment not found' });
    res.json({ message: 'Assignment deleted' });
  } catch (err) {
    console.error('[teacher assignments DELETE]', err);
    res.status(500).json({ message: 'Failed to delete' });
  }
});

// ── Exams ────────────────────────────────────────────────────────────────────
router.get('/exams', async (req, res) => {
  const teacherId = req.teacher.id;
  try {
    const { rows } = await pool.query(
      `SELECT e.id, e.title, e.type, e.exam_date AS "examDate", e.total_marks AS "totalMarks",
              e.term_id AS "termId", e.created_at AS "createdAt",
              c.name AS "className", ss.name AS "subjectName",
              (SELECT COUNT(*) FROM results r WHERE r.exam_id = e.id) AS "resultsCaptured"
       FROM exams e
       JOIN classes c ON c.id = e.class_id
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

router.post('/exams', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  const { classId, subjectId, title, examDate, totalMarks, type, termId } = req.body;
  if (!classId || !subjectId || !title || !examDate)
    return res.status(400).json({ message: 'classId, subjectId, title and examDate are required' });
  try {
    await ensureSupportTables();
    const { rows: cls } = await pool.query('SELECT academic_year_id FROM classes WHERE id = $1', [classId]);
    const { rows } = await pool.query(
      `INSERT INTO exams (school_id, class_id, subject_id, teacher_id, title, exam_date, total_marks, type, academic_year_id, term_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, title, exam_date AS "examDate", total_marks AS "totalMarks", type, term_id AS "termId"`,
      [schoolId, classId, subjectId, teacherId, title, examDate, totalMarks || 100, type || 'test', cls[0]?.academic_year_id, termId || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[teacher exams POST]', err);
    res.status(500).json({ message: 'Failed to create exam' });
  }
});

// ── Exam marks table — must come BEFORE /:examId routes ──────────────────────
router.get('/exams/marks-table', async (req, res) => {
  const schoolId = req.teacher.schoolId;
  const { classId, termId } = req.query;
  if (!classId) return res.status(400).json({ message: 'classId is required' });
  try {
    const { rows: cls } = await pool.query(
      'SELECT id, name, grade, stream, academic_year_id FROM classes WHERE id = $1 AND school_id = $2',
      [classId, schoolId]
    );
    if (!cls.length) return res.status(404).json({ message: 'Class not found' });
    const classRow = cls[0];

    const eParams = [classId];
    let eQ = `SELECT id, title, total_marks AS "totalMarks", exam_date AS "examDate", term_id AS "termId"
              FROM exams WHERE class_id = $1`;
    if (termId) { eParams.push(termId); eQ += ` AND term_id = $${eParams.length}`; }
    eQ += ' ORDER BY exam_date DESC';
    const { rows: exams } = await pool.query(eQ, eParams);

    const { rows: students } = await pool.query(
      `SELECT es.id, es.student_number AS "studentNumber",
              es.first_name AS "firstName", es.last_name AS "lastName"
       FROM enrolled_students es
       WHERE es.school_id = $1 AND ${gradeWhereClause(2)} AND es.is_active = true
       ORDER BY es.last_name, es.first_name`,
      [schoolId, String(classRow.grade)]
    );

    let examResults = [];
    if (exams.length > 0) {
      const ids = exams.map(e => e.id);
      const { rows: rr } = await pool.query(
        `SELECT exam_id AS "examId", student_id AS "studentId", marks_obtained AS "marksObtained", percentage
         FROM results WHERE exam_id = ANY($1)`,
        [ids]
      );
      examResults = rr;
    }

    const resMap = {};
    examResults.forEach(r => { resMap[`${r.studentId}-${r.examId}`] = r; });

    const studentsWithMarks = students.map(s => ({
      id: s.id, studentNumber: s.studentNumber, firstName: s.firstName, lastName: s.lastName,
      marks: exams.reduce((acc, e) => {
        const r = resMap[`${s.id}-${e.id}`];
        if (r) acc[String(e.id)] = { marksObtained: r.marksObtained, percentage: r.percentage, graded: true };
        return acc;
      }, {}),
    }));

    let terms = [];
    if (classRow.academic_year_id) {
      const { rows: trows } = await pool.query(
        'SELECT id, term_number AS "termNumber" FROM terms WHERE academic_year_id = $1 ORDER BY term_number',
        [classRow.academic_year_id]
      );
      terms = trows;
    }

    res.json({ class: classRow, terms, exams, students: studentsWithMarks });
  } catch (err) {
    console.error('[teacher exams marks-table GET]', err);
    res.status(500).json({ message: 'Failed to load exam marks' });
  }
});

// ── Results ──────────────────────────────────────────────────────────────────
// FIX 6: Uses gradeWhereClause() for student lookup
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

    // FIX 6: handles all grade formats
    const { rows: students } = await pool.query(
      `SELECT es.id, es.student_number AS "studentNumber",
              es.first_name AS "firstName", es.last_name AS "lastName"
       FROM enrolled_students es
       WHERE es.school_id = $1
         AND ${gradeWhereClause(2)}
         AND es.is_active = true
       ORDER BY es.last_name, es.first_name`,
      [schoolId, String(exam[0].grade)]
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

router.post('/exams/:examId/results', async (req, res) => {
  const teacherId = req.teacher.id;
  const schoolId  = req.teacher.schoolId;
  const { examId }  = req.params;
  const { results } = req.body;
  if (!Array.isArray(results) || !results.length)
    return res.status(400).json({ message: 'results array is required' });
  try {
    const { rows: exam } = await pool.query('SELECT total_marks FROM exams WHERE id = $1 AND teacher_id = $2', [examId, teacherId]);
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
          `INSERT INTO results (school_id, student_id, exam_id, marks_obtained, percentage, captured_by)
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

// ── Set teacher credentials (school admin) ───────────────────────────────────
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
      `UPDATE teachers SET username = $1, password_hash = $2, temp_password_flag = true, updated_at = NOW()
       WHERE id = $3 AND school_id = $4
       RETURNING id, first_name AS "firstName", last_name AS "lastName", username`,
      [username, hash, req.params.id, schoolId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Teacher not found' });
    res.json({ success: true, teacher: rows[0] });
  } catch (err) {
    console.error('[set-credentials]', err);
    if (err.code === '23505') return res.status(409).json({ message: 'Username already taken' });
    res.status(500).json({ message: 'Failed to set credentials' });
  }
};

// ── Announcements ────────────────────────────────────────────────────────────
router.get('/announcements', async (req, res) => {
  const schoolId = req.teacher.schoolId;
  try {
    const { rows } = await pool.query(
      `SELECT id, title, body, audience, is_pinned AS "isPinned", created_at AS "createdAt"
       FROM announcements
       WHERE school_id = $1 AND audience IN ('all', 'teachers')
       ORDER BY is_pinned DESC, created_at DESC LIMIT 10`,
      [schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[teacher announcements]', err);
    res.status(500).json({ message: 'Failed to load announcements' });
  }
});

// ── Events ───────────────────────────────────────────────────────────────────
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
       ORDER BY event_date ASC LIMIT 10`,
      [schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[teacher events]', err);
    res.status(500).json({ message: 'Failed to load events' });
  }
});

module.exports = { router, requireTeacher, login, setTeacherCredentials };