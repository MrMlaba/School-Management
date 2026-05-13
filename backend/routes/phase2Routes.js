// routes/phase2Routes.js
const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// ═════════════════════════════════════════════════════════════════════════════
//  ACADEMIC YEARS
// ═════════════════════════════════════════════════════════════════════════════

router.get('/academic-years', async (req, res) => {
  const schoolId = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      `SELECT id, year, is_current, created_at
       FROM academic_years WHERE school_id = $1 ORDER BY year DESC`,
      [schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[academic-years GET]', err);
    res.status(500).json({ message: 'Failed to fetch academic years' });
  }
});

router.post('/academic-years', async (req, res) => {
  const schoolId = req.admin.schoolId;
  const { year } = req.body;
  if (!year || isNaN(year))
    return res.status(400).json({ message: 'Valid year is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE academic_years SET is_current = false WHERE school_id = $1', [schoolId]);
    const { rows } = await client.query(
      `INSERT INTO academic_years (school_id, year, is_current)
       VALUES ($1, $2, true)
       ON CONFLICT (school_id, year) DO UPDATE SET is_current = true
       RETURNING *`,
      [schoolId, parseInt(year)]
    );
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[academic-years POST]', err);
    res.status(500).json({ message: 'Failed to create academic year' });
  } finally {
    client.release();
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  TERMS
// ═════════════════════════════════════════════════════════════════════════════

router.get('/terms', async (req, res) => {
  const schoolId = req.admin.schoolId;
  const { academicYearId } = req.query;
  try {
    let query = `SELECT * FROM terms WHERE school_id = $1`;
    const params = [schoolId];
    if (academicYearId) { params.push(academicYearId); query += ` AND academic_year_id = $${params.length}`; }
    query += ' ORDER BY term_number ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[terms GET]', err);
    res.status(500).json({ message: 'Failed to fetch terms' });
  }
});

router.post('/terms', async (req, res) => {
  const schoolId = req.admin.schoolId;
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
      [schoolId, academicYearId, termNumber, startDate, endDate]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[terms POST]', err);
    res.status(500).json({ message: 'Failed to save term' });
  }
});

router.patch('/terms/:id/set-current', async (req, res) => {
  const schoolId = req.admin.schoolId;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE terms SET is_current = false WHERE school_id = $1', [schoolId]);
    const { rows } = await client.query(
      'UPDATE terms SET is_current = true WHERE id = $1 AND school_id = $2 RETURNING *',
      [req.params.id, schoolId]
    );
    if (!rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Term not found' }); }
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[terms set-current]', err);
    res.status(500).json({ message: 'Failed to update current term' });
  } finally {
    client.release();
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  SCHOOL PERIODS
// ═════════════════════════════════════════════════════════════════════════════

router.get('/periods', async (req, res) => {
  const schoolId = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      'SELECT * FROM school_periods WHERE school_id = $1 ORDER BY period_number ASC',
      [schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[periods GET]', err);
    res.status(500).json({ message: 'Failed to fetch periods' });
  }
});

router.put('/periods', async (req, res) => {
  const schoolId = req.admin.schoolId;
  const { periods } = req.body;
  if (!Array.isArray(periods)) return res.status(400).json({ message: 'periods array required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Upsert each period
    for (const p of periods) {
      await client.query(
        `INSERT INTO school_periods
           (school_id, period_number, name, time_start, time_end, is_break)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (school_id, period_number)
         DO UPDATE SET
           name       = EXCLUDED.name,
           time_start = EXCLUDED.time_start,
           time_end   = EXCLUDED.time_end,
           is_break   = EXCLUDED.is_break`,
        [schoolId, p.periodNumber, p.name,
         p.timeStart||null, p.timeEnd||null, p.isBreak||false]
      );
    }S

    // Delete periods that were removed in UI BUT only if not used in timetable
    const incomingNumbers = periods.map(p => p.periodNumber);
    await client.query(
      `DELETE FROM school_periods
       WHERE school_id = $1
         AND period_number != ALL($2::int[])
         AND id NOT IN (
           SELECT DISTINCT period_id FROM timetable_slots WHERE school_id = $1
         )`,
      [schoolId, incomingNumbers]
    );

    await client.query('COMMIT');
    const { rows } = await pool.query(
      'SELECT * FROM school_periods WHERE school_id = $1 ORDER BY period_number',
      [schoolId]
    );
    res.json(rows);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[periods PUT]', err);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

router.delete('/periods', async (req, res) => {
  const schoolId = req.admin.schoolId;
  try {
    await pool.query('DELETE FROM school_periods WHERE school_id = $1', [schoolId]);
    res.json({ message: 'All periods cleared' });
  } catch (err) {
    console.error('[periods DELETE]', err);
    res.status(500).json({ message: 'Failed to clear periods' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  NATIONAL SUBJECTS
// ═════════════════════════════════════════════════════════════════════════════

router.get('/national-subjects', async (req, res) => {
  const { grade, stream } = req.query;
  try {
    let query = `SELECT * FROM national_subjects WHERE 1=1`;
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
    console.error('[national-subjects GET]', err);
    res.status(500).json({ message: 'Failed to fetch national subjects' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  SCHOOL SUBJECTS
// ═════════════════════════════════════════════════════════════════════════════

router.get('/subjects', async (req, res) => {
  const schoolId = req.admin.schoolId;
  const { academicYearId, grade, stream } = req.query;
  try {
    let query = `SELECT ss.*, ns.code AS national_code
                 FROM school_subjects ss
                 LEFT JOIN national_subjects ns ON ns.id = ss.national_subject_id
                 WHERE ss.school_id = $1 AND ss.is_active = true`;
    const params = [schoolId];
    if (academicYearId) { params.push(academicYearId); query += ` AND ss.academic_year_id = $${params.length}`; }
    if (grade)          { params.push(parseInt(grade)); query += ` AND ss.grade = $${params.length}`; }
    if (stream)         { params.push(stream);          query += ` AND ss.stream = $${params.length}`; }
    query += ' ORDER BY ss.grade, ss.stream NULLS FIRST, ss.name ASC';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[subjects GET]', err);
    res.status(500).json({ message: 'Failed to fetch subjects' });
  }
});

router.post('/subjects', async (req, res) => {
  const schoolId = req.admin.schoolId;
  const payload  = Array.isArray(req.body) ? req.body : [req.body];
  if (!payload.length)
    return res.status(400).json({ message: 'At least one subject is required' });

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
        [schoolId, academicYearId, nationalSubjectId, ns[0].name, ns[0].code, parseInt(grade), stream || null]
      );
      inserted.push(rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json(inserted);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[subjects POST]', err);
    res.status(500).json({ message: 'Failed to add subject(s)' });
  } finally {
    client.release();
  }
});

router.delete('/subjects/:id', async (req, res) => {
  const schoolId = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      'UPDATE school_subjects SET is_active = false WHERE id = $1 AND school_id = $2 RETURNING id',
      [req.params.id, schoolId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Subject not found' });
    res.json({ message: 'Subject removed' });
  } catch (err) {
    console.error('[subjects DELETE]', err);
    res.status(500).json({ message: 'Failed to remove subject' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  CLASSES
//
//  ⚠  FIX: enrolled_students.grade stores "Grade 8" (string copied from
//     the application form). classes.grade stores 8 (integer).
//     The old  es.grade::INTEGER  cast crashed on "Grade 8".
//     Solution: strip non-numeric characters first with regexp_replace,
//     then cast — NULLIF handles the edge case of an empty result.
// ═════════════════════════════════════════════════════════════════════════════

router.get('/classes', async (req, res) => {
  const schoolId = req.admin.schoolId;
  const { academicYearId, grade } = req.query;
  try {
    let query = `
      SELECT c.*,
        (SELECT COUNT(*)
         FROM   enrolled_students es
         WHERE  es.school_id = c.school_id
           AND  NULLIF(regexp_replace(es.grade, '[^0-9]', '', 'g'), '')::INTEGER = c.grade
           AND  es.is_active = true
        ) AS enrolled_count
      FROM classes c
      WHERE c.school_id = $1 AND c.is_active = true`;

    const params = [schoolId];
    if (academicYearId) { params.push(academicYearId); query += ` AND c.academic_year_id = $${params.length}`; }
    if (grade)          { params.push(parseInt(grade)); query += ` AND c.grade = $${params.length}`; }
    query += ' ORDER BY c.grade ASC, c.letter ASC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[classes GET]', err);
    res.status(500).json({ message: 'Failed to fetch classes' });
  }
});

router.post('/classes', async (req, res) => {
  const schoolId = req.admin.schoolId;
  const payload  = Array.isArray(req.body) ? req.body : [req.body];

  const client = await pool.connect();
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
        [schoolId, academicYearId, gr, stream || null, letter.toUpperCase(), className, capacity || 40]
      );
      created.push(rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json(created);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[classes POST]', err);
    res.status(500).json({ message: 'Failed to create class(es)' });
  } finally {
    client.release();
  }
});

router.delete('/classes/:id', async (req, res) => {
  const schoolId = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      'UPDATE classes SET is_active = false WHERE id = $1 AND school_id = $2 RETURNING id',
      [req.params.id, schoolId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Class not found' });
    res.json({ message: 'Class removed' });
  } catch (err) {
    console.error('[classes DELETE]', err);
    res.status(500).json({ message: 'Failed to remove class' });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  SETUP SUMMARY
// ═════════════════════════════════════════════════════════════════════════════

router.get('/summary', async (req, res) => {
  const schoolId = req.admin.schoolId;
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
      [schoolId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[summary GET]', err);
    res.status(500).json({ message: 'Failed to fetch setup summary' });
  }
});

module.exports = router;