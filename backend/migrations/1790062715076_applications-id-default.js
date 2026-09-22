// applications.id is BIGINT with no default on at least one real database
// (found while testing, not by inspecting a schema dump) — every other table
// (schools, enrolled_students, parents, teachers) has a working `nextval(...)`
// default; applications does not. That means any INSERT that doesn't name
// `id` explicitly — which is exactly what POST /api/applications does — fails
// outright with a NOT NULL violation. This is the same class of drift as the
// generate_student_number and audit_logs fixes: applications predates this
// migration system and never had its identity column fully wired up.
//
// This gives it one, the way SERIAL would have: a sequence, a default calling
// it, and ownership so dropping the column drops the sequence too. The
// sequence starts above the highest id already in the table (which may be far
// larger than a normal serial's range — this table's ids look like millisecond
// timestamps) so a new row can never collide with an existing one.

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = async (pgm) => {
  const { rows } = await pgm.db.query(`
    SELECT 1 FROM pg_attrdef ad
    JOIN pg_attribute a ON a.attnum = ad.adnum AND a.attrelid = ad.adrelid
    WHERE ad.adrelid = 'applications'::regclass AND a.attname = 'id'
  `);
  if (rows.length) return; // already has a default — nothing to do

  await pgm.db.query(`CREATE SEQUENCE IF NOT EXISTS applications_id_seq`);
  await pgm.db.query(`
    SELECT setval('applications_id_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM applications), 1))
  `);
  await pgm.db.query(`ALTER TABLE applications ALTER COLUMN id SET DEFAULT nextval('applications_id_seq')`);
  await pgm.db.query(`ALTER SEQUENCE applications_id_seq OWNED BY applications.id`);
};

/**
 * Deliberately a no-op: removing the default would put a previously-fixed
 * database right back into the state that caused the bug.
 */
export const down = () => {};
