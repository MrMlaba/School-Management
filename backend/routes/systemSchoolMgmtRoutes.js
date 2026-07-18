// routes/systemSchoolMgmtRoutes.js
// System-admin managed school setup + teacher + timetable routes.
// All routes are prefixed with /api/system/schools/:schoolId/...
// requireSystemAdmin middleware is applied in server.js before this router.

const express = require('express');
const router  = express.Router({ mergeParams: true });
const pool    = require('../db');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Convenience: school id from URL param
const sid = req => req.params.schoolId;

// ═══════════════════════════════════════════════════════════════════════════════
//  ACADEMIC YEARS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/setup/academic-years', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, year, is_current, created_at FROM academic_years WHERE school_id = $1 ORDER BY year DESC',
      [sid(req)]
    );
    res.json(rows);
  } catch (err) {
    console.error('[sys academic-years GET]', err);
    res.status(500).json({ message: 'Failed to fetch academic years' });
  }
});

router.post('/setup/academic-years', async (req, res) => {
  const { year } = req.body;
  if (!year || isNaN(year))
    return res.status(400).json({ message: 'Valid year is required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE academic_years SET is_current = false WHERE school_id = $1', [sid(req)]);
    const { rows } = await client.query(
      `INSERT INTO academic_years (school_id, year, is_current)
       VALUES ($1, $2, true)
       ON CONFLICT (school_id, year) DO UPDATE SET is_current = true
       RETURNING *`,
      [sid(req), parseInt(year)]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[sys academic-years POST]', err);
    res.status(500).json({ message: 'Failed to create academic year' });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TERMS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/setup/terms', async (req, res) => {
  const { academicYearId } = req.query;
  try {
    let query = `
      SELECT t.*,
        (SELECT COUNT(*) FROM enrolled_students es WHERE es.school_id = t.school_id AND es.is_active = true) AS total_students,
        (SELECT COUNT(DISTINCT r.student_id) FROM results r JOIN exams e ON e.id = r.exam_id WHERE e.term_id = t.id) AS graded_students
      FROM terms t WHERE t.school_id = $1`;
    const params = [sid(req)];
    if (academicYearId) { params.push(academicYearId); query += ` AND t.academic_year_id = $${params.length}`; }
    query += ' ORDER BY t.term_number ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[sys terms GET]', err);
    res.status(500).json({ message: 'Failed to fetch terms' });
  }
});

router.post('/setup/terms', async (req, res) => {
  const { academicYearId, termNumber, startDate, endDate } = req.body;
  if (!academicYearId || !termNumber || !startDate || !endDate)
    return res.status(400).json({ message: 'academicYearId, termNumber, startDate and endDate are required' });
  if (new Date(endDate) <= new Date(startDate))
    return res.status(400).json({ message: 'End date must be after start date' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO terms (school_id, academic_year_id, term_number, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (school_id, academic_year_id, term_number)
       DO UPDATE SET start_date = $4, end_date = $5
       RETURNING *`,
      [sid(req), academicYearId, termNumber, startDate, endDate]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[sys terms POST]', err);
    res.status(500).json({ message: 'Failed to save term' });
  }
});

router.patch('/setup/terms/:id/set-current', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE terms SET is_current = false WHERE school_id = $1', [sid(req)]);
    const { rows } = await client.query(
      'UPDATE terms SET is_current = true WHERE id = $1 AND school_id = $2 RETURNING *',
      [req.params.id, sid(req)]
    );
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Term not found' }); }
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[sys terms set-current]', err);
    res.status(500).json({ message: 'Failed to update current term' });
  } finally {
    client.release();
  }
});

router.patch('/setup/terms/:id/release-reports', async (req, res) => {
  const released = !!req.body.released;
  try {
    const { rows } = await pool.query(
      `UPDATE terms
       SET reports_released = $1,
           released_at = CASE WHEN $1 THEN NOW() ELSE NULL END,
           released_by = CASE WHEN $1 THEN $2 ELSE NULL END
       WHERE id = $3 AND school_id = $4
       RETURNING *`,
      [released, req.sysAdmin?.username || 'system', req.params.id, sid(req)]
    );
    if (!rows.length) return res.status(404).json({ message: 'Term not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[sys release-reports]', err);
    res.status(500).json({ message: 'Failed to update release status' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SCHOOL PERIODS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/setup/periods', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM school_periods WHERE school_id = $1 ORDER BY period_number ASC',
      [sid(req)]
    );
    res.json(rows);
  } catch (err) {
    console.error('[sys periods GET]', err);
    res.status(500).json({ message: 'Failed to fetch periods' });
  }
});

router.put('/setup/periods', async (req, res) => {
  const { periods } = req.body;
  if (!Array.isArray(periods)) return res.status(400).json({ message: 'periods array required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const p of periods) {
      await client.query(
        `INSERT INTO school_periods (school_id, period_number, name, time_start, time_end, is_break)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (school_id, period_number)
         DO UPDATE SET name = EXCLUDED.name, time_start = EXCLUDED.time_start,
                       time_end = EXCLUDED.time_end, is_break = EXCLUDED.is_break`,
        [sid(req), p.periodNumber, p.name, p.timeStart || null, p.timeEnd || null, p.isBreak || false]
      );
    }
    const incomingNumbers = periods.map(p => p.periodNumber);
    await client.query(
      `DELETE FROM school_periods WHERE school_id = $1 AND period_number != ALL($2::int[])
       AND id NOT IN (SELECT DISTINCT period_id FROM timetable_slots WHERE school_id = $1)`,
      [sid(req), incomingNumbers]
    );
    await client.query('COMMIT');
    const { rows } = await pool.query(
      'SELECT * FROM school_periods WHERE school_id = $1 ORDER BY period_number',
      [sid(req)]
    );
    res.json(rows);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[sys periods PUT]', err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

router.delete('/setup/periods', async (req, res) => {
  try {
    await pool.query('DELETE FROM school_periods WHERE school_id = $1', [sid(req)]);
    res.json({ message: 'All periods cleared' });
  } catch (err) {
    console.error('[sys periods DELETE]', err);
    res.status(500).json({ message: 'Failed to clear periods' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  NATIONAL SUBJECTS (no school filter — same for everyone)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/setup/national-subjects', async (req, res) => {
  const { grade, stream } = req.query;
  try {
    let query = 'SELECT * FROM national_subjects WHERE 1=1';
    const params = [];
    if (grade) {
      params.push(parseInt(grade));
      query += ` AND grade_min <= $${params.length} AND grade_max >= $${params.length}`;
    }
    if (stream) {
      params.push(stream);
      query += ` AND (stream = $${params.length} OR stream IS NULL)`;
    }
    query += ' ORDER BY stream NULLS FIRST, name ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[sys national-subjects GET]', err);
    res.status(500).json({ message: 'Failed to fetch national subjects' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SCHOOL SUBJECTS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/setup/subjects', async (req, res) => {
  const { academicYearId, grade, stream } = req.query;
  try {
    let query = `SELECT ss.*, ns.code AS national_code
                 FROM school_subjects ss
                 LEFT JOIN national_subjects ns ON ns.id = ss.national_subject_id
                 WHERE ss.school_id = $1 AND ss.is_active = true`;
    const params = [sid(req)];
    if (academicYearId) { params.push(academicYearId); query += ` AND ss.academic_year_id = $${params.length}`; }
    if (grade)          { params.push(parseInt(grade)); query += ` AND ss.grade = $${params.length}`; }
    if (stream)         { params.push(stream);          query += ` AND ss.stream = $${params.length}`; }
    query += ' ORDER BY ss.grade, ss.stream NULLS FIRST, ss.name ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[sys subjects GET]', err);
    res.status(500).json({ message: 'Failed to fetch subjects' });
  }
});

router.post('/setup/subjects', async (req, res) => {
  const payload = Array.isArray(req.body) ? req.body : [req.body];
  if (!payload.length) return res.status(400).json({ message: 'At least one subject is required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = [];
    for (const item of payload) {
      const { academicYearId, nationalSubjectId, grade, stream } = item;
      if (!academicYearId || !nationalSubjectId || !grade)
        return res.status(400).json({ message: 'academicYearId, nationalSubjectId and grade are required' });
      const { rows: ns } = await client.query(
        'SELECT name, code FROM national_subjects WHERE id = $1', [nationalSubjectId]
      );
      if (!ns.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: `National subject ${nationalSubjectId} not found` });
      }
      const { rows } = await client.query(
        `INSERT INTO school_subjects
           (school_id, academic_year_id, national_subject_id, name, code, grade, stream)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (school_id, academic_year_id, national_subject_id, grade, COALESCE(stream, 'ALL'))
         DO UPDATE SET is_active = true
         RETURNING *`,
        [sid(req), academicYearId, nationalSubjectId, ns[0].name, ns[0].code, parseInt(grade), stream || null]
      );
      inserted.push(rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json(inserted);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[sys subjects POST]', err);
    res.status(500).json({ message: 'Failed to add subject(s)' });
  } finally {
    client.release();
  }
});

router.delete('/setup/subjects/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE school_subjects SET is_active = false WHERE id = $1 AND school_id = $2 RETURNING id',
      [req.params.id, sid(req)]
    );
    if (!rows.length) return res.status(404).json({ message: 'Subject not found' });
    res.json({ message: 'Subject removed' });
  } catch (err) {
    console.error('[sys subjects DELETE]', err);
    res.status(500).json({ message: 'Failed to remove subject' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  CLASSES
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/setup/classes', async (req, res) => {
  const { academicYearId, grade } = req.query;
  try {
    let query = `
      SELECT c.*,
        (SELECT COUNT(*) FROM enrolled_students es
         WHERE es.school_id = c.school_id
           AND NULLIF(regexp_replace(es.grade, '[^0-9]', '', 'g'), '')::INTEGER = c.grade
           AND es.is_active = true) AS enrolled_count
      FROM classes c WHERE c.school_id = $1 AND c.is_active = true`;
    const params = [sid(req)];
    if (academicYearId) { params.push(academicYearId); query += ` AND c.academic_year_id = $${params.length}`; }
    if (grade)          { params.push(parseInt(grade)); query += ` AND c.grade = $${params.length}`; }
    query += ' ORDER BY c.grade ASC, c.letter ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[sys classes GET]', err);
    res.status(500).json({ message: 'Failed to fetch classes' });
  }
});

router.post('/setup/classes', async (req, res) => {
  const payload = Array.isArray(req.body) ? req.body : [req.body];
  const client  = await pool.connect();
  try {
    await client.query('BEGIN');
    const created = [];
    for (const item of payload) {
      const { academicYearId, grade, letter, stream, capacity } = item;
      if (!academicYearId || !grade || !letter)
        return res.status(400).json({ message: 'academicYearId, grade and letter are required' });
      const gr = parseInt(grade);
      if (gr >= 10 && !stream)
        return res.status(400).json({ message: `Grade ${gr} requires a stream (Science/Commerce/Humanities)` });
      if (gr < 10 && stream)
        return res.status(400).json({ message: `Grade ${gr} does not use streams` });
      const className = `${gr}${letter.toUpperCase()}`;
      const { rows } = await client.query(
        `INSERT INTO classes (school_id, academic_year_id, grade, stream, letter, name, capacity)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (school_id, academic_year_id, grade, letter)
         DO UPDATE SET stream = $4, capacity = $7, is_active = true
         RETURNING *`,
        [sid(req), academicYearId, gr, stream || null, letter.toUpperCase(), className, capacity || 40]
      );
      created.push(rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json(created);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[sys classes POST]', err);
    res.status(500).json({ message: 'Failed to create class(es)' });
  } finally {
    client.release();
  }
});

router.delete('/setup/classes/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE classes SET is_active = false WHERE id = $1 AND school_id = $2 RETURNING id',
      [req.params.id, sid(req)]
    );
    if (!rows.length) return res.status(404).json({ message: 'Class not found' });
    res.json({ message: 'Class removed' });
  } catch (err) {
    console.error('[sys classes DELETE]', err);
    res.status(500).json({ message: 'Failed to remove class' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SETUP SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/setup/summary', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM academic_years  WHERE school_id = $1)               AS "academicYears",
         (SELECT COUNT(*) FROM academic_years  WHERE school_id = $1 AND is_current) AS "hasCurrentYear",
         (SELECT id       FROM academic_years  WHERE school_id = $1 AND is_current LIMIT 1) AS "currentYearId",
         (SELECT year     FROM academic_years  WHERE school_id = $1 AND is_current LIMIT 1) AS "currentYear",
         (SELECT COUNT(*) FROM terms           WHERE school_id = $1)               AS "terms",
         (SELECT COUNT(*) FROM school_periods  WHERE school_id = $1)               AS "periods",
         (SELECT COUNT(*) FROM school_subjects WHERE school_id = $1 AND is_active) AS "subjects",
         (SELECT COUNT(*) FROM classes         WHERE school_id = $1 AND is_active) AS "classes"`,
      [sid(req)]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[sys summary GET]', err);
    res.status(500).json({ message: 'Failed to fetch setup summary' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TEACHERS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/teachers', async (req, res) => {
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
                json_agg(json_build_object('id', ts2.national_subject_id, 'name', ns.name))
                FILTER (WHERE ts2.id IS NOT NULL),
                '[]'
              ) AS subjects
       FROM teachers t
       LEFT JOIN teacher_subjects ts2 ON ts2.teacher_id = t.id
       LEFT JOIN national_subjects ns  ON ns.id = ts2.national_subject_id
       WHERE t.school_id = $1
       GROUP BY t.id
       ORDER BY t.last_name, t.first_name`,
      [sid(req)]
    );
    res.json(rows);
  } catch (err) {
    console.error('[sys teachers GET]', err);
    res.status(500).json({ message: 'Failed to fetch teachers' });
  }
});

router.post('/teachers', async (req, res) => {
  const { firstName, lastName, email, phone, employeeNumber, gender } = req.body;
  if (!firstName?.trim() || !lastName?.trim())
    return res.status(400).json({ message: 'First name and last name are required' });
  if (email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    return res.status(400).json({ message: 'Invalid email address format' });
  if (!phone?.trim())
    return res.status(400).json({ message: 'Phone number is required' });
  if (employeeNumber?.trim() && !/^[A-Za-z0-9]{2,20}$/.test(employeeNumber.trim()))
    return res.status(400).json({ message: 'Employee number must be 2–20 alphanumeric characters' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO teachers (school_id, first_name, last_name, email, phone, employee_number, gender)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, first_name AS "firstName", last_name AS "lastName",
                 email, phone, employee_number AS "employeeNumber", gender, is_active AS "isActive"`,
      [sid(req), firstName, lastName, email || null, phone, employeeNumber || null, gender || null]
    );
    res.status(201).json({ ...rows[0], subjects: [] });
  } catch (err) {
    console.error('[sys teachers POST]', err);
    if (err.code === '23505') return res.status(409).json({ message: 'Employee number already exists' });
    res.status(500).json({ message: 'Failed to create teacher' });
  }
});

router.patch('/teachers/:id', async (req, res) => {
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
       isActive !== undefined ? isActive : null, req.params.id, sid(req)]
    );
    if (!rows.length) return res.status(404).json({ message: 'Teacher not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[sys teachers PATCH]', err);
    res.status(500).json({ message: 'Failed to update teacher' });
  }
});

router.delete('/teachers/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'UPDATE teachers SET is_active = false, updated_at = NOW() WHERE id = $1 AND school_id = $2 RETURNING id',
      [req.params.id, sid(req)]
    );
    if (!rows.length) return res.status(404).json({ message: 'Teacher not found' });
    res.json({ message: 'Teacher deactivated' });
  } catch (err) {
    console.error('[sys teachers DELETE]', err);
    res.status(500).json({ message: 'Failed to deactivate teacher' });
  }
});

router.put('/teachers/:id/subjects', async (req, res) => {
  const { subjectIds } = req.body;
  if (!Array.isArray(subjectIds))
    return res.status(400).json({ message: 'subjectIds array is required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'DELETE FROM teacher_subjects WHERE teacher_id = $1 AND school_id = $2',
      [req.params.id, sid(req)]
    );
    for (const nsId of subjectIds) {
      await client.query(
        `INSERT INTO teacher_subjects (teacher_id, school_id, national_subject_id)
         VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [req.params.id, sid(req), nsId]
      );
    }
    await client.query('COMMIT');
    const { rows } = await pool.query(
      `SELECT ts.national_subject_id AS id, ns.name
       FROM teacher_subjects ts
       JOIN national_subjects ns ON ns.id = ts.national_subject_id
       WHERE ts.teacher_id = $1 ORDER BY ns.name`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[sys teacher subjects PUT]', err);
    res.status(500).json({ message: 'Failed to update subjects' });
  } finally {
    client.release();
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TIMETABLE — specific routes BEFORE parameterised ones
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/timetable/teacher-availability', async (req, res) => {
  const { teacherId } = req.query;
  if (!teacherId) return res.status(400).json({ message: 'teacherId required' });
  try {
    const { rows } = await pool.query(
      `SELECT ts.day_of_week AS "dayOfWeek", ts.period_id AS "periodId",
              ss.name AS "subjectName", c.name AS "className"
       FROM timetable_slots ts
       JOIN school_subjects ss ON ss.id = ts.subject_id
       JOIN classes c ON c.id = ts.class_id
       WHERE ts.teacher_id = $1 AND ts.school_id = $2`,
      [teacherId, sid(req)]
    );
    res.json(rows);
  } catch (err) {
    console.error('[sys teacher-availability]', err);
    res.status(500).json({ message: 'Failed to check availability' });
  }
});

router.delete('/timetable/class/:classId/clear', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM timetable_slots WHERE class_id = $1 AND school_id = $2',
      [req.params.classId, sid(req)]
    );
    res.json({ message: `Cleared ${rowCount} slot(s)` });
  } catch (err) {
    console.error('[sys timetable clear]', err);
    res.status(500).json({ message: 'Failed to clear timetable' });
  }
});

router.get('/timetable/:classId', async (req, res) => {
  const { classId } = req.params;
  try {
    const { rows: cls } = await pool.query(
      `SELECT c.*, ay.year FROM classes c
       JOIN academic_years ay ON ay.id = c.academic_year_id
       WHERE c.id = $1 AND c.school_id = $2`,
      [classId, sid(req)]
    );
    if (!cls.length) return res.status(404).json({ message: 'Class not found' });

    const { rows: slots } = await pool.query(
      `SELECT ts.id, ts.day_of_week AS "dayOfWeek", ts.period_id AS "periodId",
              ts.subject_id AS "subjectId", ts.teacher_id AS "teacherId",
              ss.name AS "subjectName", t.first_name AS "teacherFirstName", t.last_name AS "teacherLastName"
       FROM timetable_slots ts
       JOIN school_subjects ss ON ss.id = ts.subject_id
       JOIN teachers t ON t.id = ts.teacher_id
       WHERE ts.class_id = $1 AND ts.school_id = $2
       ORDER BY ts.day_of_week, ts.period_id`,
      [classId, sid(req)]
    );

    const { rows: periods } = await pool.query(
      `SELECT id, period_number AS "periodNumber", name,
              time_start AS "timeStart", time_end AS "timeEnd", is_break AS "isBreak"
       FROM school_periods WHERE school_id = $1 ORDER BY period_number`,
      [sid(req)]
    );

    const { rows: teachers } = await pool.query(
      `SELECT t.id, t.first_name AS "firstName", t.last_name AS "lastName",
              t.employee_number AS "employeeNumber",
              COALESCE(array_agg(ts2.national_subject_id) FILTER (WHERE ts2.id IS NOT NULL), '{}') AS "subjectIds"
       FROM teachers t
       LEFT JOIN teacher_subjects ts2 ON ts2.teacher_id = t.id
       WHERE t.school_id = $1 AND t.is_active = true
       GROUP BY t.id ORDER BY t.last_name, t.first_name`,
      [sid(req)]
    );

    const { rows: subjects } = await pool.query(
      `SELECT id, name, code, grade, stream, national_subject_id AS "nationalSubjectId"
       FROM school_subjects
       WHERE school_id = $1 AND academic_year_id = $2 AND grade = $3
         AND (stream = $4 OR stream IS NULL) AND is_active = true
       ORDER BY name`,
      [sid(req), cls[0].academic_year_id, cls[0].grade, cls[0].stream || null]
    );

    res.json({ class: cls[0], slots, periods, teachers, subjects, days: DAYS });
  } catch (err) {
    console.error('[sys timetable GET]', err);
    res.status(500).json({ message: 'Failed to fetch timetable' });
  }
});

router.post('/timetable', async (req, res) => {
  const { classId, subjectId, teacherId, periodId, dayOfWeek } = req.body;
  if (!classId || !subjectId || !teacherId || !periodId || !dayOfWeek)
    return res.status(400).json({ message: 'All fields are required' });
  if (!DAYS.includes(dayOfWeek))
    return res.status(400).json({ message: 'Invalid day' });

  try {
    const { rows: cls } = await pool.query(
      'SELECT academic_year_id FROM classes WHERE id = $1 AND school_id = $2',
      [classId, sid(req)]
    );
    if (!cls.length) return res.status(404).json({ message: 'Class not found' });

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

    const { rows: teacherClash } = await pool.query(
      `SELECT ss.name AS subject, c.name AS class, t.first_name, t.last_name
       FROM timetable_slots ts
       JOIN school_subjects ss ON ss.id = ts.subject_id
       JOIN classes c ON c.id = ts.class_id
       JOIN teachers t ON t.id = ts.teacher_id
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
      [sid(req), cls[0].academic_year_id, classId, subjectId, teacherId, periodId, dayOfWeek]
    );

    const { rows: full } = await pool.query(
      `SELECT ts.id, ts.day_of_week AS "dayOfWeek", ts.period_id AS "periodId",
              ts.subject_id AS "subjectId", ts.teacher_id AS "teacherId",
              ss.name AS "subjectName", t.first_name AS "teacherFirstName", t.last_name AS "teacherLastName"
       FROM timetable_slots ts
       JOIN school_subjects ss ON ss.id = ts.subject_id
       JOIN teachers t ON t.id = ts.teacher_id
       WHERE ts.id = $1`,
      [rows[0].id]
    );
    res.status(201).json(full[0]);
  } catch (err) {
    console.error('[sys timetable POST]', err);
    if (err.code === '23505')
      return res.status(409).json({ message: 'This slot is already assigned.' });
    res.status(500).json({ message: 'Failed to assign slot' });
  }
});

router.delete('/timetable/:slotId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM timetable_slots WHERE id = $1 AND school_id = $2 RETURNING id',
      [req.params.slotId, sid(req)]
    );
    if (!rows.length) return res.status(404).json({ message: 'Slot not found' });
    res.json({ message: 'Slot removed' });
  } catch (err) {
    console.error('[sys timetable DELETE]', err);
    res.status(500).json({ message: 'Failed to remove slot' });
  }
});

module.exports = router;
