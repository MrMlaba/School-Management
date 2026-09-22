// The single definition of "is this student in this class?".
//
// Every list and check that groups students by class goes through here —
// teacher class lists, attendance, gradebooks, class reports, and what a student
// is allowed to see (assignments, exams, quizzes, materials). It used to be
// re-implemented at each site as "same grade", which is why a 9A student saw 9B's
// assignments and a 9A teacher saw 9B's students.
//
// A student with a class_id belongs to exactly that class.
//
// A student enrolled before classes were tracked has no class_id. Until an admin
// assigns one they stay in every class of their grade (and stream, when both the
// student and the class have one), so nobody silently vanishes from a teacher's
// list or loses their assignments during the transition.

const gradeInt = (es = 'es') =>
  `NULLIF(REGEXP_REPLACE(${es}.grade::TEXT, '[^0-9]', '', 'g'), '')::INTEGER`;

// SQL predicate. `es` is the enrolled_students alias, `c` the classes alias.
function inClass(es = 'es', c = 'c') {
  return `(
    ${es}.class_id = ${c}.id
    OR (
      ${es}.class_id IS NULL
      AND ${gradeInt(es)} = ${c}.grade
      AND (${c}.stream IS NULL OR ${es}.stream IS NULL OR ${c}.stream = ${es}.stream)
    )
  )`;
}

// True when an active student of this school is in the class. `db` is a pool or
// a checked-out client.
async function studentInClass(db, schoolId, studentId, classId) {
  const { rows } = await db.query(
    `SELECT 1
     FROM enrolled_students es
     JOIN classes c ON c.id = $3 AND c.school_id = es.school_id
     WHERE es.id = $2 AND es.school_id = $1 AND es.is_active = true AND ${inClass()}`,
    [schoolId, studentId, classId]
  );
  return rows.length > 0;
}

// The ids (from `studentIds`) that are active members of the class — for
// validating a batch (attendance, exam results) in one query.
async function membersOfClass(db, schoolId, classId, studentIds) {
  const ids = studentIds.map(Number).filter(Number.isInteger);
  if (!ids.length) return new Set();
  const { rows } = await db.query(
    `SELECT es.id
     FROM enrolled_students es
     JOIN classes c ON c.id = $2 AND c.school_id = es.school_id
     WHERE es.school_id = $1 AND es.is_active = true AND es.id = ANY($3::int[]) AND ${inClass()}`,
    [schoolId, classId, ids]
  );
  return new Set(rows.map(r => r.id));
}

module.exports = { inClass, gradeInt, studentInClass, membersOfClass };
