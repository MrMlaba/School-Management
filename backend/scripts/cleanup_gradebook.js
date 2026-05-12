const pool = require('../db');

async function cleanup() {
  try {
    // Delete rows inserted by seed script (created_by = -9999 or entered_by = -9999 or filename like 'SEED_SCAN_%')
    const delMarks = await pool.query(`DELETE FROM marks WHERE entered_by = $1 RETURNING id`, [-9999]);
    console.log('Deleted marks:', delMarks.rowCount);

    const delSubs = await pool.query(`DELETE FROM exam_submissions WHERE filename LIKE $1 RETURNING id`, ['SEED_SCAN_%']);
    console.log('Deleted exam_submissions:', delSubs.rowCount);

    const delAssess = await pool.query(`DELETE FROM assessments WHERE created_by = $1 RETURNING id`, [-9999]);
    console.log('Deleted assessments:', delAssess.rowCount);

    console.log('Cleanup complete.');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

cleanup();
