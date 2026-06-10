// routes/managementRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
//  Includes all existing enrollment routes PLUS:
//  NEW: GET /api/management/reports/classes
//  NEW: GET /api/management/reports/attendance?classId=X&startDate=Y&endDate=Z
//  NEW: GET /api/management/reports/results?classId=X&termId=Y
//  NEW: GET /api/management/reports/student/:studentId/pdf  (individual report card)
//  NEW: GET /api/management/reports/class/:classId/pdf      (full class PDF)
//
//  UPDATED: Report cards now show the school logo in the header when the school
//  has one (optional — falls back to the 🏫 emoji when no logo is set).
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// ── Stream derivation (exact match) ──────────────────────────────────────────
const deriveStream = (grade, subject) => {
  const gr = parseInt(grade, 10);
  if (gr < 10 || !subject) return null;
  const val = subject.trim().toLowerCase();
  const exactStreams = { 'science':'Science','commerce':'Commerce','humanities':'Humanities','general':'General' };
  if (exactStreams[val]) return exactStreams[val];
  const subjectStreamMap = {
    'physical sciences':'Science','life sciences':'Science',
    'engineering graphics and design':'Science','agricultural sciences':'Science',
    'accounting':'Commerce','business studies':'Commerce','economics':'Commerce',
    'hospitality studies':'Commerce','consumer studies':'Commerce','tourism':'Commerce',
    'history':'Humanities','visual arts':'Humanities','dramatic arts':'Humanities',
    'music':'Humanities','religion studies':'Humanities',
  };
  return subjectStreamMap[val] || 'General';
};

// ── Grade where clause helper ─────────────────────────────────────────────────
function gradeWhere(paramIndex) {
  return `(es.grade::TEXT = $${paramIndex}::TEXT OR es.grade::TEXT = 'Grade ' || $${paramIndex} OR REGEXP_REPLACE(es.grade::TEXT,'[^0-9]','','g') = $${paramIndex}::TEXT)`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXISTING ROUTES (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/pending-enrollment', async (req, res) => {
  const schoolName = req.admin.school;
  const schoolId   = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.national_id AS "nationalId", a.first_name AS "firstName",
              a.last_name AS "lastName", a.email, a.phone,
              a.date_of_birth AS "dateOfBirth", a.gender, a.grade, a.subject,
              a.address, a.city, a.parent_name AS "parentName",
              a.parent_phone AS "parentPhone", a.parent_email AS "parentEmail",
              a.relationship, a.updated_at AS "updatedAt"
       FROM applications a
       WHERE a.school = $1 AND a.status = 'accepted'
         AND NOT EXISTS (SELECT 1 FROM enrolled_students es WHERE es.application_id = a.id AND es.school_id = $2)
       ORDER BY a.updated_at DESC`,
      [schoolName, schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[pending-enrollment]', err);
    res.status(500).json({ message: 'Failed to fetch pending enrollments' });
  }
});

router.get('/enrolled-students', async (req, res) => {
  const schoolId        = req.admin.schoolId;
  const { grade, recent } = req.query;
  try {
    let query = `
      SELECT es.id, es.student_number AS "studentNumber", es.first_name AS "firstName",
             es.last_name AS "lastName", es.national_id AS "nationalId", es.email, es.phone,
             es.date_of_birth AS "dateOfBirth", es.gender, es.grade, es.stream,
             es.enrollment_date AS "enrollmentDate", es.notes, es.created_at AS "createdAt",
             COALESCE(json_agg(json_build_object('id',p.id,'firstName',p.first_name,'lastName',p.last_name,'phone',p.phone,'email',p.email,'relationship',p.relationship,'isEmergency',p.is_emergency_contact)) FILTER (WHERE p.id IS NOT NULL),'[]') AS parents
      FROM enrolled_students es
      LEFT JOIN student_parents sp ON sp.student_id = es.id
      LEFT JOIN parents p ON p.id = sp.parent_id
      WHERE es.school_id = $1 AND es.is_active = true`;
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

router.post('/enroll', async (req, res) => {
  const schoolName = req.admin.school;
  const schoolId   = req.admin.schoolId;
  const adminId    = req.admin.id;
  const { applicationId, notes } = req.body;
  if (!applicationId) return res.status(400).json({ message: 'applicationId is required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: apps } = await client.query(`SELECT * FROM applications WHERE id = $1 AND school = $2 AND status = 'accepted'`, [applicationId, schoolName]);
    if (!apps.length) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Application not found or not accepted.' }); }
    const app = apps[0];
    const { rows: existing } = await client.query(`SELECT id FROM enrolled_students WHERE application_id = $1 AND school_id = $2`, [applicationId, schoolId]);
    if (existing.length) { await client.query('ROLLBACK'); return res.status(409).json({ message: 'Already enrolled.' }); }
    const { rows: numRows } = await client.query(`SELECT generate_student_number($1) AS num`, [schoolId]);
    const studentNumber = numRows[0].num;
    const stream = deriveStream(app.grade, app.subject);
    const { rows: inserted } = await client.query(
      `INSERT INTO enrolled_students (school_id,application_id,student_number,first_name,last_name,national_id,email,phone,date_of_birth,gender,grade,stream,enrolled_by,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [schoolId,applicationId,studentNumber,app.first_name,app.last_name,app.national_id||null,app.email||null,app.phone||null,app.date_of_birth||null,app.gender||null,app.grade,stream,adminId||null,notes||null]
    );
    const enrolledStudent = inserted[0];
    if (app.parent_phone || app.parent_email) {
      let parentId = null;
      if (app.parent_phone) { const { rows: pRows } = await client.query(`SELECT id FROM parents WHERE school_id = $1 AND phone = $2`, [schoolId, app.parent_phone]); if (pRows.length) parentId = pRows[0].id; }
      if (!parentId) {
        const nameParts = (app.parent_name || '').trim().split(/\s+/);
        const { rows: newParent } = await client.query(`INSERT INTO parents (school_id,first_name,last_name,phone,email,relationship,is_emergency_contact) VALUES ($1,$2,$3,$4,$5,$6,true) RETURNING id`, [schoolId, nameParts.slice(0,-1).join(' ')||nameParts[0]||'', nameParts.length>1?nameParts[nameParts.length-1]:'', app.parent_phone||null, app.parent_email||null, app.relationship||'Guardian']);
        parentId = newParent[0].id;
      }
      await client.query(`INSERT INTO student_parents (student_id,parent_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [enrolledStudent.id, parentId]);
    }
    await client.query('COMMIT');
    res.status(201).json({ message: 'Student enrolled successfully', studentNumber, student: { id: enrolledStudent.id, studentNumber, firstName: enrolledStudent.first_name, lastName: enrolledStudent.last_name, grade: enrolledStudent.grade, stream: enrolledStudent.stream, enrollmentDate: enrolledStudent.enrollment_date } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[enroll]', err);
    res.status(500).json({ message: 'Enrollment failed.' });
  } finally {
    client.release();
  }
});

router.get('/enrollment-stats', async (req, res) => {
  const schoolName = req.admin.school;
  const schoolId   = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      `SELECT (SELECT COUNT(*) FROM enrolled_students WHERE school_id=$2 AND is_active=true) AS "totalEnrolled",
              (SELECT COUNT(*) FROM applications a WHERE a.school=$1 AND a.status='accepted' AND NOT EXISTS (SELECT 1 FROM enrolled_students es WHERE es.application_id=a.id AND es.school_id=$2)) AS "pendingEnrollment",
              (SELECT COUNT(*) FROM parents WHERE school_id=$2) AS "totalParents"`,
      [schoolName, schoolId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('[enrollment-stats]', err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

router.get('/attendance/weekly', async (req, res) => {
  const schoolId = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      `SELECT a.date, TO_CHAR(a.date,'Dy') AS "dayName",
              COUNT(*) FILTER (WHERE a.status IN ('present','late')) AS "present",
              COUNT(*) FILTER (WHERE a.status='absent') AS "absent"
       FROM attendance a
       WHERE a.school_id=$1 AND a.date>=DATE_TRUNC('week',CURRENT_DATE) AND a.date<DATE_TRUNC('week',CURRENT_DATE)+INTERVAL '5 days'
       GROUP BY a.date ORDER BY a.date ASC`,
      [schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[attendance weekly]', err);
    res.status(500).json({ message: 'Failed to fetch attendance' });
  }
});

router.get('/upcoming-events', async (req, res) => {
  const schoolId = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      `SELECT id, title, description, event_date AS "eventDate", event_time AS "eventTime", location, type
       FROM events WHERE school_id=$1 AND event_date>=CURRENT_DATE AND event_date<=CURRENT_DATE+INTERVAL '60 days'
       ORDER BY event_date ASC LIMIT 5`,
      [schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[upcoming-events]', err);
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  NEW REPORT ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/management/reports/classes
// Returns all classes with student counts — used to populate the class dropdown
router.get('/reports/classes', async (req, res) => {
  const schoolId = req.admin.schoolId;
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.grade, c.stream,
              COUNT(DISTINCT es.id) AS "studentCount"
       FROM classes c
       LEFT JOIN enrolled_students es
         ON es.school_id = c.school_id
         AND REGEXP_REPLACE(es.grade::TEXT,'[^0-9]','','g') = c.grade::TEXT
         AND es.is_active = true
       WHERE c.school_id = $1 AND c.is_active = true
       GROUP BY c.id, c.name, c.grade, c.stream
       ORDER BY c.grade, c.name`,
      [schoolId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[reports/classes]', err);
    res.status(500).json({ message: 'Failed to fetch classes' });
  }
});

// GET /api/management/reports/attendance?classId=X&startDate=Y&endDate=Z
router.get('/reports/attendance', async (req, res) => {
  const schoolId              = req.admin.schoolId;
  const { classId, startDate, endDate } = req.query;
  if (!classId) return res.status(400).json({ message: 'classId is required' });

  try {
    // Get class info
    const { rows: clsRows } = await pool.query(
      'SELECT id, name, grade, stream FROM classes WHERE id=$1 AND school_id=$2',
      [classId, schoolId]
    );
    if (!clsRows.length) return res.status(404).json({ message: 'Class not found' });
    const cls = clsRows[0];

    // Get students in this class
    const { rows: students } = await pool.query(
      `SELECT es.id, es.student_number AS "studentNumber",
              es.first_name AS "firstName", es.last_name AS "lastName"
       FROM enrolled_students es
       WHERE es.school_id=$1 AND ${gradeWhere(2)} AND es.is_active=true
       ORDER BY es.last_name, es.first_name`,
      [schoolId, String(cls.grade)]
    );

    if (!students.length) return res.json({ class: cls, students: [], dateRange: { startDate, endDate } });

    const studentIds = students.map(s => s.id);

    // Build date filter
    let dateFilter = '';
    const params   = [schoolId, studentIds];
    if (startDate) { params.push(startDate); dateFilter += ` AND a.date >= $${params.length}`; }
    if (endDate)   { params.push(endDate);   dateFilter += ` AND a.date <= $${params.length}`; }

    // Aggregate attendance per student
    const { rows: attRows } = await pool.query(
      `SELECT a.student_id,
              COUNT(*) FILTER (WHERE a.status = 'present') AS present,
              COUNT(*) FILTER (WHERE a.status = 'absent')  AS absent,
              COUNT(*) FILTER (WHERE a.status = 'late')    AS late,
              COUNT(*) FILTER (WHERE a.status = 'excused') AS excused,
              COUNT(*)                                      AS total
       FROM attendance a
       WHERE a.school_id = $1 AND a.student_id = ANY($2::int[]) ${dateFilter}
       GROUP BY a.student_id`,
      params
    );

    const attMap = {};
    attRows.forEach(r => { attMap[r.student_id] = r; });

    const studentsWithAtt = students.map(s => {
      const a   = attMap[s.id] || { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
      const pct = a.total > 0 ? Math.round(((parseInt(a.present) + parseInt(a.late)) / parseInt(a.total)) * 100) : null;
      return {
        ...s,
        present:    parseInt(a.present)  || 0,
        absent:     parseInt(a.absent)   || 0,
        late:       parseInt(a.late)     || 0,
        excused:    parseInt(a.excused)  || 0,
        total:      parseInt(a.total)    || 0,
        percentage: pct,
      };
    });

    res.json({
      class:     cls,
      students:  studentsWithAtt,
      dateRange: { startDate: startDate || null, endDate: endDate || null },
    });
  } catch (err) {
    console.error('[reports/attendance]', err);
    res.status(500).json({ message: 'Failed to generate attendance report' });
  }
});

// GET /api/management/reports/results?classId=X&termId=Y
router.get('/reports/results', async (req, res) => {
  const schoolId          = req.admin.schoolId;
  const { classId, termId } = req.query;
  if (!classId) return res.status(400).json({ message: 'classId is required' });

  try {
    const { rows: clsRows } = await pool.query(
      'SELECT id, name, grade, stream, academic_year_id FROM classes WHERE id=$1 AND school_id=$2',
      [classId, schoolId]
    );
    if (!clsRows.length) return res.status(404).json({ message: 'Class not found' });
    const cls = clsRows[0];

    // Students
    const { rows: students } = await pool.query(
      `SELECT es.id, es.student_number AS "studentNumber",
              es.first_name AS "firstName", es.last_name AS "lastName"
       FROM enrolled_students es
       WHERE es.school_id=$1 AND ${gradeWhere(2)} AND es.is_active=true
       ORDER BY es.last_name, es.first_name`,
      [schoolId, String(cls.grade)]
    );

    // Subjects for this class
    const { rows: subjects } = await pool.query(
      `SELECT DISTINCT ss.id, ss.name, ss.code
       FROM school_subjects ss
       WHERE ss.school_id=$1 AND ss.grade=$2
         AND (ss.stream IS NULL OR ss.stream=$3 OR $3 IS NULL)
         AND ss.is_active=true
       ORDER BY ss.name`,
      [schoolId, cls.grade, cls.stream || null]
    );

    if (!students.length || !subjects.length)
      return res.json({ class: cls, students: [], subjects: [] });

    const studentIds = students.map(s => s.id);
    const subjectIds = subjects.map(s => s.id);

    // Assignment marks
    const aParams = [studentIds, subjectIds, classId];
    let aTermFilter = '';
    if (termId) { aParams.push(termId); aTermFilter = ` AND a.term_id = $${aParams.length}`; }

    const { rows: assignmentMarks } = await pool.query(
      `SELECT sub.student_id, sub.assignment_id,
              sub.marks_obtained AS score, a.total_marks AS "maxScore",
              a.subject_id AS "subjectId", a.title
       FROM assignment_submissions sub
       JOIN assignments a ON a.id = sub.assignment_id
       WHERE sub.student_id = ANY($1::int[])
         AND a.subject_id   = ANY($2::int[])
         AND a.class_id     = $3
         ${aTermFilter}
         AND sub.graded_at IS NOT NULL`,
      aParams
    );

    // Exam results
    const eParams2 = [studentIds, subjectIds, schoolId];
  let eTermFilter2 = '';
  if (termId) { eParams2.push(termId); eTermFilter2 = ` AND e.term_id = $${eParams2.length}`; }
 
  const { rows: examResults2 } = await pool.query(
    `SELECT r.student_id, r.exam_id,
            r.marks_obtained AS score, e.total_marks AS "maxScore",
            e.subject_id AS "subjectId", e.title, e.type
     FROM results r
     JOIN exams e ON e.id = r.exam_id
     WHERE r.student_id = ANY($1::int[])
       AND e.subject_id = ANY($2::int[])
       AND r.school_id  = $3
       ${eTermFilter2}`,
    eParams2
  );

    // Assignment/exam weight split per subject for this class+term (defaults to 50/50 when a term is set)
    const weightsMap = await getTermWeightsMap(classId, termId);

    // Build per-student per-subject aggregates
    const studentsWithResults = students.map(s => {
      const subjectResults = {};
      const percentages = [];

      subjects.forEach(sub => {
        const aMarks = assignmentMarks.filter(m => m.student_id === s.id && m.subjectId === sub.id);
        const eMarks = examResults2.filter(m => m.student_id === s.id && m.subjectId === sub.id);

        if (!aMarks.length && !eMarks.length) { subjectResults[sub.id] = null; return; }

        const weights  = weightsMap[sub.id] || (termId ? { assignmentWeight: 50, examWeight: 50 } : null);
        const combined = combineSubjectMarks(aMarks, eMarks, weights);
        if (combined.percentage !== null) percentages.push(combined.percentage);
        subjectResults[sub.id] = combined;
      });

      const average = percentages.length > 0
        ? Math.round(percentages.reduce((sum, p) => sum + p, 0) / percentages.length)
        : null;
      return { ...s, results: subjectResults, average };
    });

    res.json({ class: cls, subjects, students: studentsWithResults });
  } catch (err) {
    console.error('[reports/results]', err);
    res.status(500).json({ message: 'Failed to generate results report' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  PDF GENERATION
//  GET /api/management/reports/student/:studentId/pdf   — individual report card
//  GET /api/management/reports/class/:classId/pdf       — full class PDF
//
//  Uses pure HTML → PDF via a simple HTML string sent as a downloadable file.
//  No external PDF library needed — the browser prints/saves it as PDF.
//  The endpoint returns an HTML page styled for A4 printing.
// ─────────────────────────────────────────────────────────────────────────────

// ── Term weights helper ───────────────────────────────────────────────────────
// Returns a map of subjectId -> { assignmentWeight, examWeight } for a class+term.
// Subjects without a saved split fall back to 50/50 once a termId is given.
async function getTermWeightsMap(classId, termId) {
  const map = {};
  if (!classId || !termId) return map;
  const { rows } = await pool.query(
    `SELECT subject_id AS "subjectId", assignment_weight AS "assignmentWeight", exam_weight AS "examWeight"
     FROM term_weights WHERE class_id = $1 AND term_id = $2`,
    [classId, termId]
  );
  rows.forEach(w => { map[w.subjectId] = { assignmentWeight: Number(w.assignmentWeight), examWeight: Number(w.examWeight) }; });
  return map;
}

// ── Subject mark combiner ───────────────────────────────────────────────────────
// Combines a subject's assignment marks and exam marks into a final percentage.
// When weights are supplied (i.e. a term is selected), the final percentage is the
// weighted average of the assignment % and exam %. Otherwise (no term selected,
// or only one type of mark exists) it falls back to a simple combined percentage.
function combineSubjectMarks(aMarks, eMarks, weights) {
  const aScore = aMarks.reduce((s, m) => s + (parseFloat(m.score) || 0), 0);
  const aMax   = aMarks.reduce((s, m) => s + (parseFloat(m.maxScore) || 0), 0);
  const eScore = eMarks.reduce((s, m) => s + (parseFloat(m.score) || 0), 0);
  const eMax   = eMarks.reduce((s, m) => s + (parseFloat(m.maxScore) || 0), 0);

  const aPct = aMax > 0 ? (aScore / aMax) * 100 : null;
  const ePct = eMax > 0 ? (eScore / eMax) * 100 : null;

  let percentage = null;
  if (aPct !== null && ePct !== null) {
    if (weights) {
      percentage = (aPct * (weights.assignmentWeight / 100)) + (ePct * (weights.examWeight / 100));
    } else {
      percentage = ((aScore + eScore) / (aMax + eMax)) * 100;
    }
  } else if (aPct !== null) {
    percentage = aPct;
  } else if (ePct !== null) {
    percentage = ePct;
  }

  return {
    score:    Math.round((aScore + eScore) * 10) / 10,
    maxScore: aMax + eMax,
    assignmentScore:      aMax > 0 ? Math.round(aScore * 10) / 10 : null,
    assignmentMax:        aMax > 0 ? aMax : null,
    assignmentPercentage: aPct !== null ? Math.round(aPct) : null,
    examScore:      eMax > 0 ? Math.round(eScore * 10) / 10 : null,
    examMax:        eMax > 0 ? eMax : null,
    examPercentage: ePct !== null ? Math.round(ePct) : null,
    percentage: percentage !== null ? Math.round(percentage) : null,
    assessments: aMarks.length + eMarks.length,
    weights: weights || null,
  };
}

// Helper: build a single student's full data for the report card
async function getStudentReportData(schoolId, studentId, termId) {
  // Student info
  const { rows: stuRows } = await pool.query(
    `SELECT es.id, es.student_number AS "studentNumber", es.first_name AS "firstName",
            es.last_name AS "lastName", es.grade, es.stream, es.gender,
            es.date_of_birth AS "dateOfBirth", es.enrollment_date AS "enrollmentDate",
            s.name AS "schoolName"
     FROM enrolled_students es
     JOIN schools s ON s.id = es.school_id
     WHERE es.id=$1 AND es.school_id=$2`,
    [studentId, schoolId]
  );
  if (!stuRows.length) return null;
  const student = stuRows[0];

  // Parents
  const { rows: parents } = await pool.query(
    `SELECT p.first_name AS "firstName", p.last_name AS "lastName",
            p.phone, p.email, p.relationship
     FROM parents p
     JOIN student_parents sp ON sp.parent_id = p.id
     WHERE sp.student_id=$1`,
    [studentId]
  );

  // Find class for this student
  const { rows: clsRows } = await pool.query(
    `SELECT c.id, c.name, c.grade, c.stream, c.academic_year_id
     FROM classes c
     WHERE c.school_id=$1 AND c.grade::TEXT=REGEXP_REPLACE($2::TEXT,'[^0-9]','','g') AND c.is_active=true
     LIMIT 1`,
    [schoolId, student.grade]
  );
  const cls = clsRows[0] || null;

  // Subjects
  const { rows: subjects } = await pool.query(
    `SELECT ss.id, ss.name, ss.code
     FROM school_subjects ss
     WHERE ss.school_id=$1 AND ss.grade=REGEXP_REPLACE($2::TEXT,'[^0-9]','','g')::INTEGER
       AND (ss.stream IS NULL OR ss.stream=$3 OR $3 IS NULL) AND ss.is_active=true
     ORDER BY ss.name`,
    [schoolId, student.grade, student.stream || null]
  );

  // Assignment marks
  let aParams = [studentId];
  let aWhere  = cls ? ` AND a.class_id=$${aParams.push(cls.id)}` : '';
  if (termId) aWhere += ` AND a.term_id=$${aParams.push(termId)}`;

  const { rows: assignmentMarks } = await pool.query(
    `SELECT sub.marks_obtained AS score, a.total_marks AS "maxScore",
            a.subject_id AS "subjectId", a.title, 'assignment' AS type
     FROM assignment_submissions sub
     JOIN assignments a ON a.id = sub.assignment_id
     WHERE sub.student_id=$1 AND sub.graded_at IS NOT NULL ${aWhere}`,
    aParams
  );

  // Exam results
  let eParams = [studentId, schoolId];
  let eWhere  = cls ? ` AND e.class_id=$${eParams.push(cls.id)}` : '';
  if (termId) eWhere += ` AND e.term_id=$${eParams.push(termId)}`;

  const { rows: examResults } = await pool.query(
    `SELECT r.marks_obtained AS score, e.total_marks AS "maxScore",
            e.subject_id AS "subjectId", e.title, e.type
     FROM results r
     JOIN exams e ON e.id = r.exam_id
     WHERE r.student_id = $1
       AND r.school_id  = $2
       ${eWhere}`,
    eParams
  );

  // Assignment/exam weight split per subject for this class+term (defaults to 50/50 when a term is set)
  const weightsMap = await getTermWeightsMap(cls?.id, termId);

  // Attendance
  let attParams = [schoolId, studentId];
  if (termId) {
    const { rows: termRows } = await pool.query('SELECT start_date, end_date FROM terms WHERE id=$1', [termId]);
    if (termRows.length) {
      attParams.push(termRows[0].start_date);
      attParams.push(termRows[0].end_date);
    }
  }
  const attFilter = attParams.length > 2 ? ` AND a.date BETWEEN $3 AND $4` : '';

  const { rows: attRows } = await pool.query(
    `SELECT COUNT(*) FILTER (WHERE a.status='present') AS present,
            COUNT(*) FILTER (WHERE a.status='absent')  AS absent,
            COUNT(*) FILTER (WHERE a.status='late')    AS late,
            COUNT(*) FILTER (WHERE a.status='excused') AS excused,
            COUNT(*)                                    AS total
     FROM attendance a
     WHERE a.school_id=$1 AND a.student_id=$2 ${attFilter}`,
    attParams
  );
  const att = attRows[0] || { present:0, absent:0, late:0, excused:0, total:0 };
  const attPct = att.total > 0 ? Math.round(((parseInt(att.present)+parseInt(att.late))/parseInt(att.total))*100) : null;

  // Build subject results — combine assignment + exam marks using the term's weight split
  const subjectResults = subjects.map(sub => {
    const aMarks = assignmentMarks.filter(m => m.subjectId === sub.id);
    const eMarks = examResults.filter(m => m.subjectId === sub.id);
    if (!aMarks.length && !eMarks.length)
      return { ...sub, score: null, maxScore: null, percentage: null, symbol: '—', assessments: 0 };

    const weights  = weightsMap[sub.id] || (termId ? { assignmentWeight: 50, examWeight: 50 } : null);
    const combined = combineSubjectMarks(aMarks, eMarks, weights);
    return { ...sub, ...combined, symbol: getSymbol(combined.percentage) };
  });

  const scoredSubjects = subjectResults.filter(s => s.percentage !== null);
  const average = scoredSubjects.length > 0
    ? Math.round(scoredSubjects.reduce((s, sub) => s + sub.percentage, 0) / scoredSubjects.length)
    : null;

  return { student, parents, cls, subjectResults, average, attendance: { ...att, percentage: attPct } };
}

// Symbol (SA grading)
function getSymbol(pct) {
  if (pct === null) return '—';
  if (pct >= 80) return '7';
  if (pct >= 70) return '6';
  if (pct >= 60) return '5';
  if (pct >= 50) return '4';
  if (pct >= 40) return '3';
  if (pct >= 30) return '2';
  return '1';
}

function getSymbolLabel(sym) {
  const map = {'7':'Outstanding','6':'Meritorious','5':'Substantial','4':'Adequate','3':'Moderate','2':'Elementary','1':'Not Achieved','—':'—'};
  return map[sym] || '—';
}

function getBarColor(pct) {
  if (pct === null) return '#E2E8F0';
  if (pct >= 70) return '#16A34A';
  if (pct >= 50) return '#D97706';
  return '#C62828';
}

// ── NEW: school logo lookup ───────────────────────────────────────────────────
// Returns the public URL of a school's LOGO (from the school_logos table — NOT the
// home-page picture in school_images), or null if the school has none.
// The logo is optional — when null, the report header falls back to an emoji.
// We return a URL (not embedded base64) because the logo endpoint is public and
// sends cache + ETag headers, so the browser fetches the logo once and reuses it
// across every page of a class report instead of duplicating the image per student.
async function getSchoolLogoUrl(req, schoolId) {
  try {
    const { rows } = await pool.query(
      'SELECT 1 FROM school_logos WHERE school_id = $1 LIMIT 1',
      [schoolId]
    );
    if (!rows.length) return null;
    const base = process.env.API_BASE || `${req.protocol}://${req.get('host')}`;
    return `${base}/api/system/schools/${schoolId}/logo`;
  } catch (err) {
    console.error('[getSchoolLogoUrl]', err);
    return null; // never block a report because of a logo
  }
}

// Build HTML report card for one student
function buildReportCardHTML(data, schoolLogoUrl) {
  const { student, parents, subjectResults, average, attendance } = data;
  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-ZA', { day:'2-digit', month:'long', year:'numeric' });

  const subjectRows = subjectResults.map(sub => {
    const barWidth = sub.percentage !== null ? sub.percentage : 0;
    const color    = getBarColor(sub.percentage);
    const aLabel   = sub.assignmentPercentage !== null
      ? `${sub.assignmentPercentage}%${sub.weights ? ` <span class="muted" style="font-size:9px;">(${sub.weights.assignmentWeight}%)</span>` : ''}`
      : '—';
    const eLabel   = sub.examPercentage !== null
      ? `${sub.examPercentage}%${sub.weights ? ` <span class="muted" style="font-size:9px;">(${sub.weights.examWeight}%)</span>` : ''}`
      : '—';
    return `
    <tr>
      <td class="subject-name">${sub.name}</td>
      <td class="center">${sub.score !== null ? sub.score : '—'}</td>
      <td class="center">${sub.maxScore !== null ? sub.maxScore : '—'}</td>
      <td class="center">${aLabel}</td>
      <td class="center">${eLabel}</td>
      <td class="center bold" style="color:${color}">${sub.percentage !== null ? sub.percentage + '%' : '—'}</td>
      <td class="center">
        <div class="bar-bg"><div class="bar-fill" style="width:${barWidth}%;background:${color}"></div></div>
      </td>
      <td class="center symbol" style="color:${color}">${sub.symbol}</td>
      <td class="center muted">${getSymbolLabel(sub.symbol)}</td>
    </tr>`;
  }).join('');

  const parentRows = parents.map(p =>
    `<tr><td>${p.firstName} ${p.lastName}</td><td>${p.relationship || '—'}</td><td>${p.phone || '—'}</td><td>${p.email || '—'}</td></tr>`
  ).join('') || '<tr><td colspan="4" class="muted">No parent/guardian records</td></tr>';

  const attColor  = getBarColor(attendance.percentage);
  const attBarW   = attendance.percentage !== null ? attendance.percentage : 0;

  const avgColor  = getBarColor(average);
  const avgSym    = getSymbol(average);

  // NEW: school logo (optional). Falls back to the 🏫 emoji when no logo is set.
  const headerLogo = schoolLogoUrl
    ? `<img src="${schoolLogoUrl}" alt="School logo" style="width:100%;height:100%;object-fit:contain;border-radius:8px;background:#fff;padding:4px;" />`
    : '🏫';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Report Card — ${student.firstName} ${student.lastName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Inter',sans-serif;font-size:13px;color:#1A2332;background:#F0F4F8;padding:20px;}
  .page{background:#fff;max-width:800px;margin:0 auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);}

  /* Header */
  .header{background:#1A3557;color:#fff;padding:28px 36px;display:flex;align-items:center;gap:20px;}
  .header-logo{width:64px;height:64px;background:rgba(255,255,255,0.15);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;overflow:hidden;}
  .header-school{font-size:18px;font-weight:800;letter-spacing:0.02em;}
  .header-sub{font-size:12px;color:rgba(255,255,255,0.65);margin-top:3px;}
  .header-right{margin-left:auto;text-align:right;}
  .report-title{font-size:22px;font-weight:800;letter-spacing:0.04em;}
  .report-date{font-size:11px;color:rgba(255,255,255,0.6);margin-top:4px;}

  /* Student info band */
  .info-band{background:#F7F9FC;border-bottom:2px solid #1A3557;padding:18px 36px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
  .info-item label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6B7C93;}
  .info-item value{display:block;font-size:14px;font-weight:700;color:#1A2332;margin-top:2px;}

  /* Summary bar */
  .summary-bar{background:#1A3557;color:#fff;padding:14px 36px;display:flex;gap:36px;align-items:center;}
  .sum-item{text-align:center;}
  .sum-label{font-size:10px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.06em;}
  .sum-value{font-size:24px;font-weight:800;margin-top:2px;}
  .sum-sub{font-size:10px;color:rgba(255,255,255,0.5);margin-top:1px;}

  /* Sections */
  .section{padding:24px 36px;border-bottom:1px solid #E2E8F0;}
  .section-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#1A3557;margin-bottom:14px;display:flex;align-items:center;gap:8px;}
  .section-title::after{content:'';flex:1;height:1px;background:#E2E8F0;}

  /* Tables */
  table{width:100%;border-collapse:collapse;}
  th{background:#F0F4F8;color:#1A3557;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;padding:8px 10px;border-bottom:2px solid #1A3557;text-align:left;}
  td{padding:9px 10px;border-bottom:1px solid #E2E8F0;font-size:12px;}
  tr:last-child td{border-bottom:none;}
  tr:nth-child(even) td{background:#FAFBFC;}
  .center{text-align:center;}
  .bold{font-weight:700;}
  .muted{color:#6B7C93;}
  .subject-name{font-weight:600;color:#1A2332;}
  .symbol{font-size:16px;font-weight:800;}

  /* Progress bars */
  .bar-bg{background:#E2E8F0;border-radius:4px;height:8px;width:80px;overflow:hidden;}
  .bar-fill{height:100%;border-radius:4px;transition:width 0.3s;}

  /* Attendance cards */
  .att-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:16px;}
  .att-card{background:#F7F9FC;border-radius:8px;padding:12px;text-align:center;border:1px solid #E2E8F0;}
  .att-card .num{font-size:24px;font-weight:800;color:#1A3557;}
  .att-card .lbl{font-size:10px;color:#6B7C93;text-transform:uppercase;letter-spacing:0.06em;margin-top:2px;}
  .att-bar-wrap{background:#E2E8F0;border-radius:6px;height:12px;overflow:hidden;margin-top:8px;}
  .att-bar{height:100%;border-radius:6px;}

  /* Grade legend */
  .legend{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;}
  .legend-item{background:#F0F4F8;border-radius:4px;padding:4px 10px;font-size:10px;color:#6B7C93;display:flex;gap:6px;}
  .legend-sym{font-weight:800;color:#1A3557;}

  /* Signature area */
  .sig-area{display:flex;justify-content:space-between;padding:24px 36px;gap:24px;}
  .sig-box{flex:1;border-top:1.5px solid #1A2332;padding-top:8px;font-size:11px;color:#6B7C93;text-align:center;}
  .sig-label{font-weight:700;color:#1A2332;}

  /* Footer */
  .footer{background:#F7F9FC;padding:14px 36px;border-top:1px solid #E2E8F0;display:flex;justify-content:space-between;font-size:10px;color:#6B7C93;}

  @media print{
    body{background:#fff;padding:0;}
    .page{box-shadow:none;border-radius:0;max-width:100%;}
    .no-print{display:none!important;}
  }
</style>
</head>
<body>

<div class="no-print" style="text-align:center;margin-bottom:16px;">
  <button onclick="window.print()" style="background:#1A3557;color:#fff;border:none;padding:10px 28px;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">
    🖨 Print / Save as PDF
  </button>
  <span style="margin-left:12px;font-size:12px;color:#6B7C93;">Use your browser's Print dialog → Save as PDF</span>
</div>

<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-logo">${headerLogo}</div>
    <div>
      <div class="header-school">${student.schoolName}</div>
      <div class="header-sub">Official Student Report Card</div>
    </div>
    <div class="header-right">
      <div class="report-title">REPORT CARD</div>
      <div class="report-date">Issued: ${dateStr}</div>
    </div>
  </div>

  <!-- Student info band -->
  <div class="info-band">
    <div class="info-item"><label>Student Name</label><value>${student.firstName} ${student.lastName}</value></div>
    <div class="info-item"><label>Student Number</label><value>${student.studentNumber}</value></div>
    <div class="info-item"><label>Grade</label><value>${student.grade}${student.stream ? ' — ' + student.stream : ''}</value></div>
    <div class="info-item"><label>Gender</label><value>${student.gender || '—'}</value></div>
    <div class="info-item"><label>Date of Birth</label><value>${student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-ZA') : '—'}</value></div>
    <div class="info-item"><label>Enrollment Date</label><value>${student.enrollmentDate ? new Date(student.enrollmentDate).toLocaleDateString('en-ZA') : '—'}</value></div>
  </div>

  <!-- Summary bar -->
  <div class="summary-bar">
    <div class="sum-item">
      <div class="sum-label">Overall Average</div>
      <div class="sum-value" style="color:${avgColor}">${average !== null ? average + '%' : '—'}</div>
      <div class="sum-sub">Symbol ${avgSym} — ${getSymbolLabel(avgSym)}</div>
    </div>
    <div class="sum-item">
      <div class="sum-label">Attendance</div>
      <div class="sum-value" style="color:${attColor}">${attendance.percentage !== null ? attendance.percentage + '%' : '—'}</div>
      <div class="sum-sub">${attendance.present} present / ${attendance.total} days</div>
    </div>
    <div class="sum-item">
      <div class="sum-label">Subjects</div>
      <div class="sum-value">${subjectResults.filter(s=>s.percentage!==null).length}</div>
      <div class="sum-sub">of ${subjectResults.length} assessed</div>
    </div>
    <div class="sum-item">
      <div class="sum-label">Absences</div>
      <div class="sum-value" style="color:${parseInt(attendance.absent)>5?'#C62828':'#fff'}">${attendance.absent}</div>
      <div class="sum-sub">days absent</div>
    </div>
  </div>

  <!-- Academic Results -->
  <div class="section">
    <div class="section-title">Academic Results</div>
    <table>
      <thead>
        <tr>
          <th>Subject</th>
          <th class="center">Score</th>
          <th class="center">Max</th>
          <th class="center">Assignment %</th>
          <th class="center">Exam %</th>
          <th class="center">Final %</th>
          <th class="center">Progress</th>
          <th class="center">Symbol</th>
          <th class="center">Achievement</th>
        </tr>
      </thead>
      <tbody>
        ${subjectRows}
      </tbody>
    </table>

    <!-- Grade legend -->
    <div class="legend">
      ${[['7','80–100','Outstanding'],['6','70–79','Meritorious'],['5','60–69','Substantial'],['4','50–59','Adequate'],['3','40–49','Moderate'],['2','30–39','Elementary'],['1','0–29','Not Achieved']].map(([sym,range,label])=>`<div class="legend-item"><span class="legend-sym">${sym}</span>${range}% — ${label}</div>`).join('')}
    </div>
  </div>

  <!-- Attendance -->
  <div class="section">
    <div class="section-title">Attendance Summary</div>
    <div class="att-grid">
      <div class="att-card"><div class="num" style="color:#16A34A">${attendance.present}</div><div class="lbl">Present</div></div>
      <div class="att-card"><div class="num" style="color:#C62828">${attendance.absent}</div><div class="lbl">Absent</div></div>
      <div class="att-card"><div class="num" style="color:#D97706">${attendance.late}</div><div class="lbl">Late</div></div>
      <div class="att-card"><div class="num" style="color:#6B7C93">${attendance.excused}</div><div class="lbl">Excused</div></div>
      <div class="att-card"><div class="num">${attendance.total}</div><div class="lbl">Total Days</div></div>
    </div>
    <div class="att-bar-wrap">
      <div class="att-bar" style="width:${attBarW}%;background:${attColor}"></div>
    </div>
    <div style="text-align:right;font-size:11px;color:#6B7C93;margin-top:4px;">Attendance rate: <strong style="color:${attColor}">${attendance.percentage !== null ? attendance.percentage + '%' : '—'}</strong></div>
  </div>

  <!-- Parent/Guardian -->
  <div class="section">
    <div class="section-title">Parent / Guardian</div>
    <table>
      <thead><tr><th>Name</th><th>Relationship</th><th>Phone</th><th>Email</th></tr></thead>
      <tbody>${parentRows}</tbody>
    </table>
  </div>

  <!-- Signatures -->
  <div class="sig-area">
    <div class="sig-box"><div class="sig-label">Class Teacher</div><br><br>_______________________</div>
    <div class="sig-box"><div class="sig-label">Principal</div><br><br>_______________________</div>
    <div class="sig-box"><div class="sig-label">Parent / Guardian</div><br><br>_______________________</div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>${student.schoolName} — Official Report Card</span>
    <span>Student No: ${student.studentNumber}</span>
    <span>Generated: ${dateStr}</span>
  </div>

</div>
</body>
</html>`;
}

// GET /api/management/reports/student/:studentId/pdf
router.get('/reports/student/:studentId/pdf', async (req, res) => {
  const schoolId  = req.admin.schoolId;
  const studentId = req.params.studentId;
  const { termId } = req.query;

  try {
    const data = await getStudentReportData(schoolId, studentId, termId || null);
    if (!data) return res.status(404).json({ message: 'Student not found' });

    const logo = await getSchoolLogoUrl(req, schoolId);
    const html = buildReportCardHTML(data, logo);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="report_${data.student.studentNumber}.html"`);
    res.send(html);
  } catch (err) {
    console.error('[reports/student/pdf]', err);
    res.status(500).json({ message: 'Failed to generate report card' });
  }
});

// GET /api/management/reports/class/:classId/pdf
// Generates one HTML page with ALL students in the class — browser prints each as a page
router.get('/reports/class/:classId/pdf', async (req, res) => {
  const schoolId = req.admin.schoolId;
  const classId  = req.params.classId;
  const { termId } = req.query;

  try {
    const { rows: clsRows } = await pool.query(
      'SELECT id, name, grade, stream FROM classes WHERE id=$1 AND school_id=$2',
      [classId, schoolId]
    );
    if (!clsRows.length) return res.status(404).json({ message: 'Class not found' });
    const cls = clsRows[0];

    // Get all students in this class
    const { rows: students } = await pool.query(
      `SELECT es.id FROM enrolled_students es
       WHERE es.school_id=$1 AND REGEXP_REPLACE(es.grade::TEXT,'[^0-9]','','g')=$2::TEXT AND es.is_active=true
       ORDER BY es.last_name, es.first_name`,
      [schoolId, String(cls.grade)]
    );

    if (!students.length)
      return res.status(404).json({ message: 'No students found in this class' });

    // Build report for each student
    const allData = await Promise.all(
      students.map(s => getStudentReportData(schoolId, s.id, termId || null))
    );

    const validData = allData.filter(Boolean);
    if (!validData.length)
      return res.status(404).json({ message: 'No report data found' });

    // Fetch the school logo once and reuse it for every student's report card
    const logo = await getSchoolLogoUrl(req, schoolId);

    // Combine all into one HTML document — each student is a page break
    const pages = validData.map((data, idx) => {
      const html = buildReportCardHTML(data, logo);
      // Extract just the body content (between <body> and </body>)
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const bodyContent = bodyMatch ? bodyMatch[1] : '';
      // Remove the print button from all but first
      const cleaned = idx > 0 ? bodyContent.replace(/<div class="no-print"[\s\S]*?<\/div>/i, '') : bodyContent;
      return `<div style="page-break-after:always">${cleaned}</div>`;
    });

    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Class Report — ${cls.name}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Inter',sans-serif;font-size:13px;color:#1A2332;background:#F0F4F8;padding:20px;}
  .page{background:#fff;max-width:800px;margin:0 auto 32px;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);}
  .header{background:#1A3557;color:#fff;padding:28px 36px;display:flex;align-items:center;gap:20px;}
  .header-logo{width:64px;height:64px;background:rgba(255,255,255,0.15);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;overflow:hidden;}
  .header-school{font-size:18px;font-weight:800;letter-spacing:0.02em;}
  .header-sub{font-size:12px;color:rgba(255,255,255,0.65);margin-top:3px;}
  .header-right{margin-left:auto;text-align:right;}
  .report-title{font-size:22px;font-weight:800;letter-spacing:0.04em;}
  .report-date{font-size:11px;color:rgba(255,255,255,0.6);margin-top:4px;}
  .info-band{background:#F7F9FC;border-bottom:2px solid #1A3557;padding:18px 36px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;}
  .info-item label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6B7C93;}
  .info-item value{display:block;font-size:14px;font-weight:700;color:#1A2332;margin-top:2px;}
  .summary-bar{background:#1A3557;color:#fff;padding:14px 36px;display:flex;gap:36px;align-items:center;}
  .sum-item{text-align:center;}
  .sum-label{font-size:10px;color:rgba(255,255,255,0.6);text-transform:uppercase;letter-spacing:0.06em;}
  .sum-value{font-size:24px;font-weight:800;margin-top:2px;}
  .sum-sub{font-size:10px;color:rgba(255,255,255,0.5);margin-top:1px;}
  .section{padding:24px 36px;border-bottom:1px solid #E2E8F0;}
  .section-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#1A3557;margin-bottom:14px;display:flex;align-items:center;gap:8px;}
  .section-title::after{content:'';flex:1;height:1px;background:#E2E8F0;}
  table{width:100%;border-collapse:collapse;}
  th{background:#F0F4F8;color:#1A3557;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;padding:8px 10px;border-bottom:2px solid #1A3557;text-align:left;}
  td{padding:9px 10px;border-bottom:1px solid #E2E8F0;font-size:12px;}
  tr:last-child td{border-bottom:none;}
  tr:nth-child(even) td{background:#FAFBFC;}
  .center{text-align:center;}
  .bold{font-weight:700;}
  .muted{color:#6B7C93;}
  .subject-name{font-weight:600;color:#1A2332;}
  .symbol{font-size:16px;font-weight:800;}
  .bar-bg{background:#E2E8F0;border-radius:4px;height:8px;width:80px;overflow:hidden;}
  .bar-fill{height:100%;border-radius:4px;}
  .att-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:16px;}
  .att-card{background:#F7F9FC;border-radius:8px;padding:12px;text-align:center;border:1px solid #E2E8F0;}
  .att-card .num{font-size:24px;font-weight:800;color:#1A3557;}
  .att-card .lbl{font-size:10px;color:#6B7C93;text-transform:uppercase;letter-spacing:0.06em;margin-top:2px;}
  .att-bar-wrap{background:#E2E8F0;border-radius:6px;height:12px;overflow:hidden;margin-top:8px;}
  .att-bar{height:100%;border-radius:6px;}
  .legend{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px;}
  .legend-item{background:#F0F4F8;border-radius:4px;padding:4px 10px;font-size:10px;color:#6B7C93;display:flex;gap:6px;}
  .legend-sym{font-weight:800;color:#1A3557;}
  .sig-area{display:flex;justify-content:space-between;padding:24px 36px;gap:24px;}
  .sig-box{flex:1;border-top:1.5px solid #1A2332;padding-top:8px;font-size:11px;color:#6B7C93;text-align:center;}
  .sig-label{font-weight:700;color:#1A2332;}
  .footer{background:#F7F9FC;padding:14px 36px;border-top:1px solid #E2E8F0;display:flex;justify-content:space-between;font-size:10px;color:#6B7C93;}
  @media print{
    body{background:#fff;padding:0;}
    .page{box-shadow:none;border-radius:0;max-width:100%;margin:0;}
    .no-print{display:none!important;}
    div[style*="page-break-after"]{page-break-after:always;}
  }
</style>
</head>
<body>
<div class="no-print" style="text-align:center;margin-bottom:20px;padding:16px;background:#fff;border-radius:8px;border:1px solid #E2E8F0;">
  <strong style="font-size:15px;color:#1A3557;">Class ${cls.name} — ${validData.length} Report Cards</strong><br><br>
  <button onclick="window.print()" style="background:#1A3557;color:#fff;border:none;padding:10px 28px;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;">
    🖨 Print All / Save as PDF
  </button>
  <span style="margin-left:12px;font-size:12px;color:#6B7C93;">Each student will print on a separate page</span>
</div>
${pages.join('\n')}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="class_report_${cls.name}.html"`);
    res.send(fullHTML);
  } catch (err) {
    console.error('[reports/class/pdf]', err);
    res.status(500).json({ message: 'Failed to generate class report' });
  }
});

module.exports = router;