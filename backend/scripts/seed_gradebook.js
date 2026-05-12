const pool = require('../db');

async function seed() {
  try {
    const marker = 'SEED_SAMPLE_' + Date.now();

    // 1. Insert assessment
    const a = await pool.query(
      `INSERT INTO assessments (school_id, class_id, subject_id, title, type, date, max_score, weight, term, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [1, 1, 1, marker, 'exam', new Date(), 100, 1, '2026T1', -9999]
    );
    const assessment = a.rows[0];
    console.log('Inserted assessment id=', assessment.id);

    // 2. Insert two marks (student ids purposely high to avoid collisions)
    const students = [999001, 999002];
    for (const sid of students) {
      const m = await pool.query(
        `INSERT INTO marks (assessment_id, student_id, score, max_score, source, entered_by)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [assessment.id, sid, Math.floor(50 + Math.random() * 50), 100, 'manual', -9999]
      );
      console.log('Inserted mark id=', m.rows[0].id, 'for student', sid);
    }

    // 3. Insert exam_submissions (no actual file required)
    for (const sid of students) {
      const fname = `SEED_SCAN_${sid}_${Date.now()}.pdf`;
      const s = await pool.query(
        `INSERT INTO exam_submissions (assessment_id, student_id, filename, filepath, status)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [assessment.id, sid, fname, 'uploads/' + fname, 'uploaded']
      );
      console.log('Inserted exam_submission id=', s.rows[0].id, 'file=', fname);
    }

    console.log('Seeding complete. Use cleanup_gradebook.js to remove these rows when finished testing.');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
