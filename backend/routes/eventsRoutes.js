// routes/eventsRoutes.js
// ─────────────────────────────────────────────────────────────
//  Events, Announcements & Reports
//  Mount in server.js:
//    const eventsRoutes = require('./routes/eventsRoutes');
//    app.use('/api/management', requireSchoolAdmin, eventsRoutes);
// ─────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// ═════════════════════════════════════════════════════════════
//  EVENTS
// ═════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
//  GET /api/management/events/upcoming
//  Dashboard widget — ALL future events (no upper cap).
//  FIX: removed the 60-day cap that was hiding events the user
//  created beyond that window.
//  MUST be defined BEFORE /events/:id to avoid Express matching
//  "upcoming" as an :id param.
// ─────────────────────────────────────────────────────────────
router.get('/events/upcoming', async (req, res) => {
  const schoolId = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      `SELECT id, title, description,
              event_date AS "eventDate",
              event_time AS "eventTime",
              location, type,
              created_at AS "createdAt"
       FROM   events
       WHERE  school_id  = $1
         AND  event_date >= CURRENT_DATE
       ORDER  BY event_date ASC, event_time ASC NULLS LAST
       LIMIT  10`,
      [schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[events/upcoming]', err);
    res.status(500).json({ message: 'Failed to fetch upcoming events' });
  }
});

// ─────────────────────────────────────────────────────────────
//  GET /api/management/events?month=2026-04
//  Used by the Events management page (full month view).
// ─────────────────────────────────────────────────────────────
router.get('/events', async (req, res) => {
  const schoolId = req.admin.schoolId;
  const { month } = req.query; // format: YYYY-MM

  try {
    let query = `
      SELECT id, title, description,
             event_date  AS "eventDate",
             event_time  AS "eventTime",
             location, type,
             created_at  AS "createdAt"
      FROM   events
      WHERE  school_id = $1`;
    const params = [schoolId];

    if (month) {
      params.push(month);
      query += ` AND TO_CHAR(event_date, 'YYYY-MM') = $${params.length}`;
    }

    query += ' ORDER BY event_date ASC, event_time ASC NULLS LAST';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[events GET]', err);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

// POST /api/management/events
router.post('/events', async (req, res) => {
  const schoolId = req.admin.schoolId;
  const { title, description, eventDate, eventTime, location, type } = req.body;

  if (!title || !eventDate)
    return res.status(400).json({ message: 'Title and event date are required' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO events
         (school_id, title, description, event_date, event_time, location, type, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, title, description,
                 event_date AS "eventDate", event_time AS "eventTime",
                 location, type, created_at AS "createdAt"`,
      [schoolId, title, description || null, eventDate, eventTime || null,
       location || null, type || 'general', req.admin.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[events POST]', err);
    res.status(500).json({ message: 'Failed to create event' });
  }
});

// PATCH /api/management/events/:id
router.patch('/events/:id', async (req, res) => {
  const schoolId = req.admin.schoolId;
  const { title, description, eventDate, eventTime, location, type } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE events SET
         title       = COALESCE($1, title),
         description = COALESCE($2, description),
         event_date  = COALESCE($3, event_date),
         event_time  = COALESCE($4, event_time),
         location    = COALESCE($5, location),
         type        = COALESCE($6, type),
         updated_at  = NOW()
       WHERE id = $7 AND school_id = $8
       RETURNING id, title, description,
                 event_date AS "eventDate", event_time AS "eventTime",
                 location, type`,
      [title, description, eventDate, eventTime, location, type,
       req.params.id, schoolId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Event not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[events PATCH]', err);
    res.status(500).json({ message: 'Failed to update event' });
  }
});

// DELETE /api/management/events/:id
router.delete('/events/:id', async (req, res) => {
  const schoolId = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      'DELETE FROM events WHERE id = $1 AND school_id = $2 RETURNING id',
      [req.params.id, schoolId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error('[events DELETE]', err);
    res.status(500).json({ message: 'Failed to delete event' });
  }
});

// ═════════════════════════════════════════════════════════════
//  ANNOUNCEMENTS
// ═════════════════════════════════════════════════════════════

router.get('/announcements', async (req, res) => {
  const schoolId = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      `SELECT id, title, body, audience, is_pinned AS "isPinned",
              is_active AS "isActive", created_at AS "createdAt"
       FROM   announcements
       WHERE  school_id = $1
       ORDER  BY is_pinned DESC, created_at DESC`,
      [schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[announcements GET]', err);
    res.status(500).json({ message: 'Failed to fetch announcements' });
  }
});

router.post('/announcements', async (req, res) => {
  const schoolId = req.admin.schoolId;
  const { title, body, audience, isPinned } = req.body;

  if (!title || !body)
    return res.status(400).json({ message: 'Title and body are required' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO announcements
         (school_id, title, body, audience, is_pinned, created_by)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, title, body, audience,
                 is_pinned AS "isPinned", is_active AS "isActive",
                 created_at AS "createdAt"`,
      [schoolId, title, body, audience || 'all', isPinned || false, req.admin.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[announcements POST]', err);
    res.status(500).json({ message: 'Failed to create announcement' });
  }
});

router.patch('/announcements/:id', async (req, res) => {
  const schoolId = req.admin.schoolId;
  const { title, body, audience, isPinned, isActive } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE announcements SET
         title      = COALESCE($1, title),
         body       = COALESCE($2, body),
         audience   = COALESCE($3, audience),
         is_pinned  = COALESCE($4, is_pinned),
         is_active  = COALESCE($5, is_active),
         updated_at = NOW()
       WHERE id = $6 AND school_id = $7
       RETURNING id, title, body, audience,
                 is_pinned AS "isPinned", is_active AS "isActive"`,
      [title, body, audience,
       isPinned !== undefined ? isPinned : null,
       isActive !== undefined ? isActive : null,
       req.params.id, schoolId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Announcement not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[announcements PATCH]', err);
    res.status(500).json({ message: 'Failed to update announcement' });
  }
});

router.delete('/announcements/:id', async (req, res) => {
  const schoolId = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      'DELETE FROM announcements WHERE id = $1 AND school_id = $2 RETURNING id',
      [req.params.id, schoolId]
    );
    if (!rows.length) return res.status(404).json({ message: 'Announcement not found' });
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    console.error('[announcements DELETE]', err);
    res.status(500).json({ message: 'Failed to delete announcement' });
  }
});

// ═════════════════════════════════════════════════════════════
//  REPORTS
// ═════════════════════════════════════════════════════════════

router.get('/reports/attendance', async (req, res) => {
  const schoolId = req.admin.schoolId;
  const { classId, startDate, endDate } = req.query;

  if (!classId) return res.status(400).json({ message: 'classId is required' });

  try {
    const { rows: cls } = await pool.query(
      'SELECT name, grade FROM classes WHERE id = $1 AND school_id = $2',
      [classId, schoolId]
    );
    if (!cls.length) return res.status(404).json({ message: 'Class not found' });

    const gradeNum = cls[0].grade;
    const { rows: students } = await pool.query(
      `SELECT es.id, es.student_number AS "studentNumber",
              es.first_name AS "firstName", es.last_name AS "lastName"
       FROM   enrolled_students es
       WHERE  es.school_id = $1
         AND  NULLIF(regexp_replace(es.grade,'[^0-9]','','g'),'')::INTEGER = $2
         AND  es.is_active = true
       ORDER  BY es.last_name, es.first_name`,
      [schoolId, gradeNum]
    );

    if (!students.length)
      return res.json({ class: cls[0], students: [], dateRange: { startDate, endDate } });

    let dateFilter = '';
    const params = [schoolId];
    if (startDate) { params.push(startDate); dateFilter += ` AND a.date >= $${params.length}`; }
    if (endDate)   { params.push(endDate);   dateFilter += ` AND a.date <= $${params.length}`; }

    const studentIds = students.map(s => s.id);
    const { rows: attRows } = await pool.query(
      `SELECT a.student_id AS "studentId",
              COUNT(*) FILTER (WHERE a.status = 'present') AS present,
              COUNT(*) FILTER (WHERE a.status = 'absent')  AS absent,
              COUNT(*) FILTER (WHERE a.status = 'late')    AS late,
              COUNT(*) AS total
       FROM   attendance a
       WHERE  a.school_id = $1
         AND  a.student_id = ANY($2::int[])
         ${dateFilter}
       GROUP  BY a.student_id`,
      [schoolId, studentIds, ...params.slice(1)]
    );

    const attMap = {};
    attRows.forEach(r => { attMap[r.studentId] = r; });

    const result = students.map(s => {
      const att     = attMap[s.id] || { present: 0, absent: 0, late: 0, total: 0 };
      const total   = parseInt(att.total)   || 0;
      const present = parseInt(att.present) || 0;
      return {
        ...s,
        present,
        absent:     parseInt(att.absent) || 0,
        late:       parseInt(att.late)   || 0,
        total,
        percentage: total > 0 ? Math.round((present / total) * 100) : null,
      };
    });

    res.json({ class: cls[0], students: result, dateRange: { startDate, endDate } });
  } catch (err) {
    console.error('[reports/attendance]', err);
    res.status(500).json({ message: 'Failed to generate attendance report' });
  }
});

router.get('/reports/results', async (req, res) => {
  const schoolId = req.admin.schoolId;
  const { classId, termId } = req.query;

  if (!classId) return res.status(400).json({ message: 'classId is required' });

  try {
    const { rows: cls } = await pool.query(
      'SELECT name, grade, stream FROM classes WHERE id = $1 AND school_id = $2',
      [classId, schoolId]
    );
    if (!cls.length) return res.status(404).json({ message: 'Class not found' });

    const gradeNum = cls[0].grade;
    const { rows: students } = await pool.query(
      `SELECT es.id, es.student_number AS "studentNumber",
              es.first_name AS "firstName", es.last_name AS "lastName"
       FROM   enrolled_students es
       WHERE  es.school_id = $1
         AND  NULLIF(regexp_replace(es.grade,'[^0-9]','','g'),'')::INTEGER = $2
         AND  es.is_active = true
       ORDER  BY es.last_name, es.first_name`,
      [schoolId, gradeNum]
    );

    if (!students.length)
      return res.json({ class: cls[0], students: [], subjects: [] });

    const { rows: subjects } = await pool.query(
      `SELECT id, name FROM school_subjects
       WHERE  school_id = $1 AND grade = $2
         AND  (stream = $3 OR stream IS NULL) AND is_active = true
       ORDER  BY name`,
      [schoolId, gradeNum, cls[0].stream || null]
    );

    let resultQuery = `
      SELECT r.student_id AS "studentId", e.subject_id AS "subjectId",
             r.marks_obtained AS score,
             e.total_marks    AS "maxScore"
      FROM   results r
      JOIN   exams e ON e.id = r.exam_id
      WHERE  r.school_id = $1
        AND  r.student_id = ANY($2::int[])`;
    const params = [schoolId, students.map(s => s.id)];

    if (termId) { params.push(termId); resultQuery += ` AND e.term_id = $${params.length}`; }

    const { rows: resultRows } = await pool.query(resultQuery, params);

    const resultMap = {};
    resultRows.forEach(r => {
      if (!resultMap[r.studentId]) resultMap[r.studentId] = {};
      const existing = resultMap[r.studentId][r.subjectId];
      const pct = r.maxScore > 0 ? Math.round((r.score / r.maxScore) * 100) : null;
      if (!existing || pct > existing.percentage) {
        resultMap[r.studentId][r.subjectId] = {
          score:      parseFloat(r.score),
          maxScore:   parseFloat(r.maxScore),
          percentage: pct,
        };
      }
    });

    const studentsWithResults = students.map(s => {
      const subjectResults = {};
      let totalScore = 0, totalMax = 0, subjectCount = 0;

      subjects.forEach(sub => {
        const r = resultMap[s.id]?.[sub.id];
        if (r) {
          subjectResults[sub.id] = r;
          totalScore += r.score;
          totalMax   += r.maxScore;
          subjectCount++;
        } else {
          subjectResults[sub.id] = null;
        }
      });

      return {
        ...s,
        results: subjectResults,
        average: subjectCount > 0 && totalMax > 0
          ? Math.round((totalScore / totalMax) * 100)
          : null,
      };
    });

    res.json({ class: cls[0], students: studentsWithResults, subjects });
  } catch (err) {
    console.error('[reports/results]', err);
    res.status(500).json({ message: 'Failed to generate results report' });
  }
});

router.get('/reports/classes', async (req, res) => {
  const schoolId = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.grade, c.stream,
              (SELECT COUNT(*) FROM enrolled_students es
               WHERE  es.school_id = c.school_id
                 AND  NULLIF(regexp_replace(es.grade,'[^0-9]','','g'),'')::INTEGER = c.grade
                 AND  es.is_active = true) AS "studentCount"
       FROM   classes c
       WHERE  c.school_id = $1 AND c.is_active = true
       ORDER  BY c.grade, c.letter`,
      [schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[reports/classes]', err);
    res.status(500).json({ message: 'Failed to fetch classes' });
  }
});

module.exports = router;