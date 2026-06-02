// routes/managementRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
//  NOTE on school identification:
//    applications table  → uses  `school`    (VARCHAR name, e.g. "Green Valley")
//    enrolled_students   → uses  `school_id` (INTEGER FK to schools table)
//  Both values come from the JWT via requireSchoolAdmin middleware:
//    req.admin.school   = school name string
//    req.admin.schoolId = school integer id
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// ─────────────────────────────────────────────────────────────────────────────
//  FIX 9 — Exact stream derivation (was fuzzy keyword matching before)
//  Old code matched 'science' inside any subject name which caused
//  "Social Science" → Science, "Science of Cooking" → Science, etc.
//  New code uses an exact lookup map of official SA subject names.
// ─────────────────────────────────────────────────────────────────────────────
const deriveStream = (grade, subject) => {
  const gr = parseInt(grade, 10);
  if (gr < 10 || !subject) return null;

  const val = subject.trim().toLowerCase();

  // Direct stream name passed in (e.g. from application form dropdown)
  const exactStreams = {
    'science':    'Science',
    'commerce':   'Commerce',
    'humanities': 'Humanities',
    'general':    'General',
  };
  if (exactStreams[val]) return exactStreams[val];

  // Exact subject name → stream mapping
  // Based on official SA national_subjects list — no partial matching
  const subjectStreamMap = {
    // ── Science stream ───────────────────────────────────────────────────────
    'physical sciences':                  'Science',
    'life sciences':                      'Science',
    'engineering graphics and design':    'Science',
    'agricultural sciences':              'Science',
    // ── Commerce stream ──────────────────────────────────────────────────────
    'accounting':                         'Commerce',
    'business studies':                   'Commerce',
    'economics':                          'Commerce',
    'hospitality studies':                'Commerce',
    'consumer studies':                   'Commerce',
    'tourism':                            'Commerce',
    // ── Humanities stream ─────────────────────────────────────────────────────
    'history':                            'Humanities',
    'visual arts':                        'Humanities',
    'dramatic arts':                      'Humanities',
    'music':                              'Humanities',
    'religion studies':                   'Humanities',
    // ── Shared subjects (appear in multiple streams — skip for derivation) ───
    // 'mathematics', 'mathematical literacy', 'geography', 'cat'
    // These alone cannot determine a stream so we return 'General'
  };

  if (subjectStreamMap[val]) return subjectStreamMap[val];

  // Could not determine stream from subject alone
  return 'General';
};

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/management/pending-enrollment
//  Accepted applicants for this school NOT yet in enrolled_students.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/pending-enrollment', async (req, res) => {
  const schoolName = req.admin.school;
  const schoolId   = req.admin.schoolId;

  try {
    const { rows } = await pool.query(
      `SELECT
         a.id,
         a.national_id    AS "nationalId",
         a.first_name     AS "firstName",
         a.last_name      AS "lastName",
         a.email,
         a.phone,
         a.date_of_birth  AS "dateOfBirth",
         a.gender,
         a.grade,
         a.subject,
         a.address,
         a.city,
         a.parent_name    AS "parentName",
         a.parent_phone   AS "parentPhone",
         a.parent_email   AS "parentEmail",
         a.relationship,
         a.updated_at     AS "updatedAt"
       FROM applications a
       WHERE a.school  = $1
         AND a.status  = 'accepted'
         AND NOT EXISTS (
           SELECT 1
           FROM enrolled_students es
           WHERE es.application_id = a.id
             AND es.school_id      = $2
         )
       ORDER BY a.updated_at DESC`,
      [schoolName, schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[pending-enrollment]', err);
    res.status(500).json({ message: 'Failed to fetch pending enrollments' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/management/enrolled-students
// ─────────────────────────────────────────────────────────────────────────────
router.get('/enrolled-students', async (req, res) => {
  const schoolId        = req.admin.schoolId;
  const { grade, recent } = req.query;

  try {
    let query = `
      SELECT
        es.id,
        es.student_number  AS "studentNumber",
        es.first_name      AS "firstName",
        es.last_name       AS "lastName",
        es.national_id     AS "nationalId",
        es.email,
        es.phone,
        es.date_of_birth   AS "dateOfBirth",
        es.gender,
        es.grade,
        es.stream,
        es.enrollment_date AS "enrollmentDate",
        es.notes,
        es.created_at      AS "createdAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id',           p.id,
              'firstName',    p.first_name,
              'lastName',     p.last_name,
              'phone',        p.phone,
              'email',        p.email,
              'relationship', p.relationship,
              'isEmergency',  p.is_emergency_contact
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) AS parents
      FROM enrolled_students es
      LEFT JOIN student_parents sp ON sp.student_id = es.id
      LEFT JOIN parents          p  ON p.id = sp.parent_id
      WHERE es.school_id = $1
        AND es.is_active  = true
    `;

    const params = [schoolId];
    if (grade)        { params.push(grade); query += ` AND es.grade = $${params.length}`; }
    if (recent === '1') query += ` AND es.enrollment_date >= NOW() - INTERVAL '7 days'`;
    query += ` GROUP BY es.id ORDER BY es.grade, es.last_name, es.first_name`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[enrolled-students]', err);
    res.status(500).json({ message: 'Failed to fetch enrolled students' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  POST /api/management/enroll
// ─────────────────────────────────────────────────────────────────────────────
router.post('/enroll', async (req, res) => {
  const schoolName = req.admin.school;
  const schoolId   = req.admin.schoolId;
  const adminId    = req.admin.id;
  const { applicationId, notes } = req.body;

  if (!applicationId)
    return res.status(400).json({ message: 'applicationId is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: apps } = await client.query(
      `SELECT * FROM applications
       WHERE id = $1 AND school = $2 AND status = 'accepted'`,
      [applicationId, schoolName]
    );
    if (!apps.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Application not found, does not belong to this school, or is not in accepted status.' });
    }
    const app = apps[0];

    const { rows: existing } = await client.query(
      `SELECT id FROM enrolled_students WHERE application_id = $1 AND school_id = $2`,
      [applicationId, schoolId]
    );
    if (existing.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'This applicant is already enrolled.' });
    }

    const { rows: numRows } = await client.query(
      `SELECT generate_student_number($1) AS num`, [schoolId]
    );
    const studentNumber = numRows[0].num;

    // FIX 9: Uses new exact deriveStream function
    const stream = deriveStream(app.grade, app.subject);

    const { rows: inserted } = await client.query(
      `INSERT INTO enrolled_students
         (school_id, application_id, student_number,
          first_name, last_name, national_id,
          email, phone, date_of_birth, gender,
          grade, stream, enrolled_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        schoolId, applicationId, studentNumber,
        app.first_name, app.last_name, app.national_id || null,
        app.email || null, app.phone || null,
        app.date_of_birth || null, app.gender || null,
        app.grade, stream, adminId || null, notes || null,
      ]
    );
    const enrolledStudent = inserted[0];

    if (app.parent_phone || app.parent_email) {
      let parentId = null;
      if (app.parent_phone) {
        const { rows: pRows } = await client.query(
          `SELECT id FROM parents WHERE school_id = $1 AND phone = $2`,
          [schoolId, app.parent_phone]
        );
        if (pRows.length) parentId = pRows[0].id;
      }
      if (!parentId) {
        const nameParts   = (app.parent_name || '').trim().split(/\s+/);
        const parentFirst = nameParts.slice(0, -1).join(' ') || nameParts[0] || '';
        const parentLast  = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        const { rows: newParent } = await client.query(
          `INSERT INTO parents (school_id, first_name, last_name, phone, email, relationship, is_emergency_contact)
           VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING id`,
          [schoolId, parentFirst, parentLast, app.parent_phone || null, app.parent_email || null, app.relationship || 'Guardian']
        );
        parentId = newParent[0].id;
      }
      await client.query(
        `INSERT INTO student_parents (student_id, parent_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [enrolledStudent.id, parentId]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Student enrolled successfully',
      studentNumber,
      student: {
        id: enrolledStudent.id, studentNumber,
        firstName: enrolledStudent.first_name, lastName: enrolledStudent.last_name,
        grade: enrolledStudent.grade, stream: enrolledStudent.stream,
        enrollmentDate: enrolledStudent.enrollment_date,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[enroll]', err);
    res.status(500).json({ message: 'Enrollment failed. Please try again.' });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/management/enrollment-stats
// ─────────────────────────────────────────────────────────────────────────────
router.get('/enrollment-stats', async (req, res) => {
  const schoolName = req.admin.school;
  const schoolId   = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM enrolled_students WHERE school_id = $2 AND is_active = true) AS "totalEnrolled",
         (SELECT COUNT(*) FROM applications a WHERE a.school = $1 AND a.status = 'accepted'
            AND NOT EXISTS (SELECT 1 FROM enrolled_students es WHERE es.application_id = a.id AND es.school_id = $2)) AS "pendingEnrollment",
         (SELECT COUNT(*) FROM parents WHERE school_id = $2) AS "totalParents"`,
      [schoolName, schoolId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[enrollment-stats]', err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/management/attendance/weekly
// ─────────────────────────────────────────────────────────────────────────────
router.get('/attendance/weekly', async (req, res) => {
  const schoolId = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      `SELECT
         a.date,
         TO_CHAR(a.date, 'Dy') AS "dayName",
         COUNT(*) FILTER (WHERE a.status IN ('present','late')) AS "present",
         COUNT(*) FILTER (WHERE a.status = 'absent')           AS "absent"
       FROM attendance a
       WHERE a.school_id = $1
         AND a.date >= DATE_TRUNC('week', CURRENT_DATE)
         AND a.date <  DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '5 days'
       GROUP BY a.date
       ORDER BY a.date ASC`,
      [schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[attendance weekly]', err);
    res.status(500).json({ message: 'Failed to fetch attendance' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  GET /api/management/upcoming-events
// ─────────────────────────────────────────────────────────────────────────────
router.get('/upcoming-events', async (req, res) => {
  const schoolId = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      `SELECT id, title, description,
              event_date AS "eventDate", event_time AS "eventTime",
              location, type
       FROM events
       WHERE school_id = $1
         AND event_date >= CURRENT_DATE
         AND event_date <= CURRENT_DATE + INTERVAL '60 days'
       ORDER BY event_date ASC
       LIMIT 5`,
      [schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[upcoming-events]', err);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

module.exports = router;