// routes/phase3Routes.js
const express = require('express');
const router  = express.Router();
const pool    = require('../db');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// ═════════════════════════════════════════════════════════════════════════════
//  TEACHERS
// ═════════════════════════════════════════════════════════════════════════════

router.get('/teachers', async (req, res) => {
  const schoolId = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      `SELECT t.id,
              t.first_name       AS "firstName",
              t.last_name        AS "lastName",
              t.email, t.phone,
              t.employee_number  AS "employeeNumber",
              t.gender, t.username,
              t.is_active        AS "isActive",
              t.created_at       AS "createdAt",
              COALESCE(
                json_agg(
                  json_build_object('id', ts2.national_subject_id, 'name', ns.name)
                ) FILTER (WHERE ts2.id IS NOT NULL),
                '[]'
              ) AS subjects
       FROM teachers t
       LEFT JOIN teacher_subjects ts2 ON ts2.teacher_id = t.id
       LEFT JOIN national_subjects ns  ON ns.id = ts2.national_subject_id
       WHERE t.school_id = $1
       GROUP BY t.id
       ORDER BY t.last_name, t.first_name`,
      [schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[teachers GET]', err);
    res.status(500).json({ message: 'Failed to fetch teachers' });
  }
});

router.post('/teachers', async (req, res) => {
  const schoolId = req.admin.schoolId;
  const { firstName, lastName, email, phone, employeeNumber, gender } = req.body;
  if (!firstName || !lastName)
    return res.status(400).json({ message: 'First name and last name are required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO teachers (school_id, first_name, last_name, email, phone, employee_number, gender)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, first_name AS "firstName", last_name AS "lastName",
                 email, phone, employee_number AS "employeeNumber", gender, is_active AS "isActive"`,
      [schoolId, firstName, lastName, email||null, phone||null, employeeNumber||null, gender||null]
    );
    res.status(201).json({ ...rows[0], subjects: [] });
  } catch (err) {
    console.error('[teachers POST]', err);
    if (err.code === '23505') return res.status(409).json({ message: 'Employee number already exists' });
    res.status(500).json({ message: 'Failed to create teacher' });
  }
});

router.patch('/teachers/:id', async (req, res) => {
  const schoolId = req.admin.schoolId;
  const { firstName, lastName, email, phone, employeeNumber, gender, isActive } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE teachers SET
         first_name      = COALESCE($1, first_name),
         last_name       = COALESCE($2, last_name),
         email           = COALESCE($3, email),
         phone           = COALESCE($4, phone),
         employee_number = COALESCE($5, employee_number),
         gender          = COALESCE($6, gender),
         is_active       = COALESCE($7, is_active),
         updated_at      = NOW()
       WHERE id = $8 AND school_id = $9
       RETURNING id, first_name AS "firstName", last_name AS "lastName",
                 email, phone, employee_number AS "employeeNumber", gender, is_active AS "isActive"`,
      [firstName, lastName, email, phone, employeeNumber, gender,
       isActive !== undefined ? isActive : null, req.params.id, schoolId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Teacher not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[teachers PATCH]', err);
    res.status(500).json({ message: 'Failed to update teacher' });
  }
});

router.delete('/teachers/:id', async (req, res) => {
  const schoolId = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      'UPDATE teachers SET is_active = false, updated_at = NOW() WHERE id = $1 AND school_id = $2 RETURNING id',
      [req.params.id, schoolId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Teacher not found' });
    res.json({ message: 'Teacher deactivated' });
  } catch (err) {
    console.error('[teachers DELETE]', err);
    res.status(500).json({ message: 'Failed to deactivate teacher' });
  }
});

// ── Teacher subject assignments ───────────────────────────────────────────────

// PUT /api/management/teachers/:id/subjects
// Body: { subjectIds: [1,2,3] }  — replaces all assignments for this teacher
router.put('/teachers/:id/subjects', async (req, res) => {
  const schoolId  = req.admin.schoolId;
  const teacherId = req.params.id;
  const { subjectIds } = req.body;
  if (!Array.isArray(subjectIds))
    return res.status(400).json({ message: 'subjectIds array is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'DELETE FROM teacher_subjects WHERE teacher_id = $1 AND school_id = $2',
      [teacherId, schoolId]
    );
    for (const nsId of subjectIds) {
      await client.query(
        `INSERT INTO teacher_subjects (teacher_id, school_id, national_subject_id)
         VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [teacherId, schoolId, nsId]
      );
    }
    await client.query('COMMIT');
    const { rows } = await pool.query(
      `SELECT ts.national_subject_id AS id, ns.name
       FROM teacher_subjects ts
       JOIN national_subjects ns ON ns.id = ts.national_subject_id
       WHERE ts.teacher_id = $1 ORDER BY ns.name`,
      [teacherId]
    );
    res.json(rows);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[teacher subjects PUT]', err);
    res.status(500).json({ message: 'Failed to update subjects' });
  } finally {
    client.release();
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  TIMETABLE — specific routes BEFORE parameterised ones
// ═════════════════════════════════════════════════════════════════════════════

// 1. Teacher availability (BEFORE /timetable/:classId)
router.get('/timetable/teacher-availability', async (req, res) => {
  const schoolId  = req.admin.schoolId;
  const { teacherId } = req.query;
  if (!teacherId) return res.status(400).json({ message: 'teacherId required' });
  try {
    const { rows } = await pool.query(
      `SELECT ts.day_of_week AS "dayOfWeek", ts.period_id AS "periodId",
              ss.name AS "subjectName", c.name AS "className"
       FROM timetable_slots ts
       JOIN school_subjects ss ON ss.id = ts.subject_id
       JOIN classes          c  ON c.id  = ts.class_id
       WHERE ts.teacher_id = $1 AND ts.school_id = $2`,
      [teacherId, schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[teacher-availability]', err);
    res.status(500).json({ message: 'Failed to check availability' });
  }
});

// 2. Clear class timetable (BEFORE /timetable/:slotId)
router.delete('/timetable/class/:classId/clear', async (req, res) => {
  const schoolId = req.admin.schoolId;
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM timetable_slots WHERE class_id = $1 AND school_id = $2',
      [req.params.classId, schoolId]
    );
    res.json({ message: `Cleared ${rowCount} slot(s)` });
  } catch (err) {
    console.error('[timetable clear]', err);
    res.status(500).json({ message: 'Failed to clear timetable' });
  }
});

// 3. GET timetable for a class
//    Teachers returned WITH subjectIds so frontend can filter dropdown
router.get('/timetable/:classId', async (req, res) => {
  const schoolId  = req.admin.schoolId;
  const { classId } = req.params;
  try {
    const { rows: cls } = await pool.query(
      `SELECT c.*, ay.year FROM classes c
       JOIN academic_years ay ON ay.id = c.academic_year_id
       WHERE c.id = $1 AND c.school_id = $2`,
      [classId, schoolId]
    );
    if (!cls.length) return res.status(404).json({ message: 'Class not found' });

    const { rows: slots } = await pool.query(
      `SELECT ts.id,
              ts.day_of_week              AS "dayOfWeek",
              ts.period_id                AS "periodId",
              ts.subject_id               AS "subjectId",
              ts.teacher_id               AS "teacherId",
              ss.name                     AS "subjectName",
              ss.national_subject_id      AS "nationalSubjectId",
              t.first_name                AS "teacherFirstName",
              t.last_name                 AS "teacherLastName"
       FROM timetable_slots ts
       JOIN school_subjects ss ON ss.id = ts.subject_id
       JOIN teachers         t  ON t.id  = ts.teacher_id
       WHERE ts.class_id = $1 AND ts.school_id = $2
       ORDER BY ts.day_of_week, ts.period_id`,
      [classId, schoolId]
    );

    const { rows: periods } = await pool.query(
      `SELECT id, period_number AS "periodNumber", name,
              time_start AS "timeStart", time_end AS "timeEnd", is_break AS "isBreak"
       FROM school_periods WHERE school_id = $1 ORDER BY period_number`,
      [schoolId]
    );

    // Teachers WITH their teachable subject IDs (national_subject_id array)
    const { rows: teachers } = await pool.query(
      `SELECT t.id,
              t.first_name      AS "firstName",
              t.last_name       AS "lastName",
              t.employee_number AS "employeeNumber",
              COALESCE(
                array_agg(ts2.national_subject_id) FILTER (WHERE ts2.id IS NOT NULL),
                '{}'
              ) AS "subjectIds"
       FROM teachers t
       LEFT JOIN teacher_subjects ts2 ON ts2.teacher_id = t.id
       WHERE t.school_id = $1 AND t.is_active = true
       GROUP BY t.id
       ORDER BY t.last_name, t.first_name`,
      [schoolId]
    );

    // Subjects for this class — include nationalSubjectId for matching
    const { rows: subjects } = await pool.query(
      `SELECT id, name, code, grade, stream,
              national_subject_id AS "nationalSubjectId"
       FROM school_subjects
       WHERE school_id        = $1
         AND academic_year_id = $2
         AND grade            = $3
         AND (stream = $4 OR stream IS NULL)
         AND is_active        = true
       ORDER BY name`,
      [schoolId, cls[0].academic_year_id, cls[0].grade, cls[0].stream || null]
    );

    res.json({ class: cls[0], slots, periods, teachers, subjects, days: DAYS });
  } catch (err) {
    console.error('[timetable GET]', err);
    res.status(500).json({ message: 'Failed to fetch timetable' });
  }
});

// 4. Assign a slot
router.post('/timetable', async (req, res) => {
  const schoolId = req.admin.schoolId;
  const { classId, subjectId, teacherId, periodId, dayOfWeek } = req.body;

  if (!classId || !subjectId || !teacherId || !periodId || !dayOfWeek)
    return res.status(400).json({ message: 'All fields are required' });
  if (!DAYS.includes(dayOfWeek))
    return res.status(400).json({ message: 'Invalid day' });

  try {
    const { rows: cls } = await pool.query(
      'SELECT academic_year_id FROM classes WHERE id = $1 AND school_id = $2',
      [classId, schoolId]
    );
    if (!cls.length) return res.status(404).json({ message: 'Class not found' });

    // Clash A: class already has a subject at this slot
    const { rows: classClash } = await pool.query(
      `SELECT ss.name AS subject FROM timetable_slots ts
       JOIN school_subjects ss ON ss.id = ts.subject_id
       WHERE ts.class_id = $1 AND ts.period_id = $2 AND ts.day_of_week = $3`,
      [classId, periodId, dayOfWeek]
    );
    if (classClash.length)
      return res.status(409).json({
        message: `This class already has "${classClash[0].subject}" in this slot.`,
        type: 'CLASS_CLASH',
      });

    // Clash B: teacher already assigned anywhere at this slot (across ALL grades)
    const { rows: teacherClash } = await pool.query(
      `SELECT ss.name AS subject, c.name AS class, t.first_name, t.last_name
       FROM timetable_slots ts
       JOIN school_subjects ss ON ss.id = ts.subject_id
       JOIN classes          c  ON c.id  = ts.class_id
       JOIN teachers         t  ON t.id  = ts.teacher_id
       WHERE ts.teacher_id = $1 AND ts.period_id = $2 AND ts.day_of_week = $3`,
      [teacherId, periodId, dayOfWeek]
    );
    if (teacherClash.length) {
      const tc = teacherClash[0];
      return res.status(409).json({
        message: `${tc.first_name} ${tc.last_name} is already teaching "${tc.subject}" to ${tc.class} at this time.`,
        type: 'TEACHER_CLASH',
      });
    }

    const { rows } = await pool.query(
      `INSERT INTO timetable_slots
         (school_id, academic_year_id, class_id, subject_id, teacher_id, period_id, day_of_week)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [schoolId, cls[0].academic_year_id, classId, subjectId, teacherId, periodId, dayOfWeek]
    );

    const { rows: full } = await pool.query(
      `SELECT ts.id, ts.day_of_week AS "dayOfWeek", ts.period_id AS "periodId",
              ts.subject_id AS "subjectId", ts.teacher_id AS "teacherId",
              ss.name AS "subjectName", t.first_name AS "teacherFirstName", t.last_name AS "teacherLastName"
       FROM timetable_slots ts
       JOIN school_subjects ss ON ss.id = ts.subject_id
       JOIN teachers         t  ON t.id  = ts.teacher_id
       WHERE ts.id = $1`,
      [rows[0].id]
    );
    res.status(201).json(full[0]);
  } catch (err) {
    console.error('[timetable POST]', err);
    if (err.code === '23505')
      return res.status(409).json({ message: err.constraint === 'uq_slot_teacher' ? 'Teacher already assigned at this time.' : 'Class already has a subject at this time.' });
    res.status(500).json({ message: 'Failed to assign slot' });
  }
});

// 5. Remove a slot
router.delete('/timetable/:slotId', async (req, res) => {
  const schoolId = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      'DELETE FROM timetable_slots WHERE id = $1 AND school_id = $2 RETURNING id',
      [req.params.slotId, schoolId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Slot not found' });
    res.json({ message: 'Slot removed' });
  } catch (err) {
    console.error('[timetable DELETE]', err);
    res.status(500).json({ message: 'Failed to remove slot' });
  }
});

module.exports = router;