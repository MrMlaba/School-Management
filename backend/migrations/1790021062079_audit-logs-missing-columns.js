// audit_logs exists in an older shape on some databases (notably a long-lived
// local dev DB), and the baseline's CREATE TABLE IF NOT EXISTS can't repair a
// table that already exists. The result: logAudit() failed on every call with
// `column "school" does not exist` — and since logAudit deliberately swallows
// its errors, nothing was ever recorded — while the system admin's per-school
// log filter (WHERE school = …) would 500.
//
// This adds whichever columns the code reads or writes are missing. Every step
// is idempotent, so it is a no-op on a database that already has them.

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  for (const column of [
    'school_id   INTEGER',
    'admin_id    INTEGER',
    'actor       VARCHAR(200)',
    'actor_role  VARCHAR(50)',
    'target_type VARCHAR(50)',
    'target_id   INTEGER',
    'target      TEXT',
    'detail      TEXT',
  ]) {
    pgm.sql(`ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ${column}`);
  }

  // `school` (the school's name, as logAudit records it) is the column that was
  // missing. Only when it is actually being added, fill it in for existing rows
  // that carry a school_id, so the per-school filter finds them too.
  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'audit_logs' AND column_name = 'school'
      ) THEN
        ALTER TABLE audit_logs ADD COLUMN school TEXT;
        UPDATE audit_logs a SET school = s.name FROM schools s WHERE a.school_id = s.id;
      END IF;
    END $$;
  `);
};

/**
 * Deliberately a no-op: these columns may have existed before this migration
 * ran, so dropping them on rollback could delete real audit data.
 */
export const down = () => {};
