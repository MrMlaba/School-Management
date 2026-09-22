// Class letters used to be unique per (grade, stream) — "10A Physics" and "10A
// Commerce" could coexist, on purpose (see the baseline migration). The school
// has since clarified that's not what they want: a letter should be unique
// across the whole grade, so streams share one A-to-Z sequence (10A Physics,
// 10B Physics, 10C Humanities — never two 10A's).
//
// Any class created under the old rule that shares a letter with another class
// in the same grade (but a different stream) would violate the new, stricter
// index outright. Rather than let this migration fail on whichever school
// actually used that allowance, the first step relabels the later-created
// class of each clashing pair to the next free letter in that grade — so
// existing classes are kept, not merged or dropped, and the rename is visible
// afterward as a "Migration note" for whoever's watching the deploy log.

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = async (pgm) => {
  const { rows: classes } = await pgm.db.query(`
    SELECT id, school_id, academic_year_id, grade, stream, letter
    FROM classes
    ORDER BY school_id, academic_year_id, grade, id
  `);

  const usedLetters = new Map(); // "school-year-grade" -> Set of letters already claimed
  const relettered = [];
  for (const c of classes) {
    const key = `${c.school_id}-${c.academic_year_id}-${c.grade}`;
    if (!usedLetters.has(key)) usedLetters.set(key, new Set());
    const claimed = usedLetters.get(key);
    if (!claimed.has(c.letter)) {
      claimed.add(c.letter);
      continue;
    }
    let next = null;
    for (let code = 65; code <= 90; code++) {
      const candidate = String.fromCharCode(code);
      if (!claimed.has(candidate)) { next = candidate; break; }
    }
    if (!next) continue; // all 26 letters taken in one grade — surfaces as a constraint error to fix by hand
    claimed.add(next);
    const newName = c.stream ? `${c.grade}${next} ${c.stream}` : `${c.grade}${next}`;
    await pgm.db.query('UPDATE classes SET letter = $1, name = $2 WHERE id = $3', [next, newName, c.id]);
    relettered.push({ id: c.id, grade: c.grade, stream: c.stream, from: c.letter, to: next });
  }
  if (relettered.length) {
    console.warn('Migration note: reassigned class letters to make them unique per grade:', JSON.stringify(relettered));
  }

  await pgm.db.query(`DROP INDEX IF EXISTS classes_unique_idx`);
  await pgm.db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS classes_unique_idx
      ON classes (school_id, academic_year_id, grade, letter)
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = async (pgm) => {
  await pgm.db.query(`DROP INDEX IF EXISTS classes_unique_idx`);
  await pgm.db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS classes_unique_idx
      ON classes (school_id, academic_year_id, grade, COALESCE(stream, 'NONE'), letter)
  `);
};
