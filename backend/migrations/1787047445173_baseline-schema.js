// Baseline migration — captures the schema exactly as it was being applied
// by the hand-rolled ensureTables() function in server.js at the time
// node-pg-migrate was introduced. This is intentionally a straight port
// (same statements, same order, same IF NOT EXISTS / ADD COLUMN IF NOT
// EXISTS idempotency) rather than a redesign, so that:
//   - running it against the existing production DB is a no-op (every
//     object already exists), and
//   - running it against an empty DB (local dev, or a lost database like
//     the one referenced in the comments below) rebuilds the same schema
//     from a single source of truth instead of from route-reading archaeology.
// All schema changes from here on should be NEW migration files, not edits
// to this one.

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

function generateReferenceCode() {
  return require('crypto').randomBytes(6).toString('hex').toUpperCase();
}

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void>}
 */
export const up = async (pgm) => {
  // Statement-by-statement, same as the original ensureTables() — not
  // wrapped in one big transaction, so an issue with one ALTER (guarded
  // below by its own try/catch, exactly as before) can't abort the ones
  // after it.
  pgm.noTransaction();

  // ───────────────────────────────────────────────────────────────────────────
  // RECOVERY NOTE (2026-07): the tables below (schools through quiz_answers)
  // had no CREATE TABLE anywhere in this codebase — they were created by hand
  // directly on the old Railway database at some point early in the project
  // and never committed as code. When that database was lost, this whole
  // block had to be reverse-engineered from how every route in this backend
  // reads/writes these tables (column names, types, foreign keys, unique
  // constraints inferred from ON CONFLICT clauses and 23505 error handling).
  // They must run FIRST, before anything below this block, since almost every
  // other table in this migration references them via foreign key.
  // ───────────────────────────────────────────────────────────────────────────

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS schools (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      location    TEXT,
      phone       TEXT,
      email       TEXT,
      principal   TEXT,
      grades      JSONB DEFAULT '["Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"]',
      streams     JSONB DEFAULT '["Physics","Commerce","Humanities"]',
      is_active   BOOLEAN DEFAULT true,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // national_subjects — shared curriculum reference list (no school_id; global
  // across every school). Nothing in the app can create these, so they must
  // be seeded once below.
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS national_subjects (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      code       TEXT,
      grade_min  INTEGER NOT NULL,
      grade_max  INTEGER NOT NULL,
      stream     TEXT
    )
  `);
  // The public application form's "Subject Stream" dropdown (ApplicationForm.js)
  // hardcodes 'Physics'/'Commerce'/'Humanities' — that's the real, live value
  // every applicant actually submits, and what schools.streams defaults to.
  // Reverses an earlier migration that had gone the other way and caused
  // enrolled students' streams to stop matching subjects tagged 'Science'.
  await pgm.db.query(`UPDATE national_subjects SET stream = 'Physics' WHERE stream = 'Science'`);

  // Seed national subjects — only inserts rows that don't already exist by code
  await pgm.db.query(`
    INSERT INTO national_subjects (name, code, grade_min, grade_max, stream)
    SELECT v.name, v.code, v.grade_min, v.grade_max, v.stream
    FROM (VALUES
      -- Grades 8–9 (compulsory, all streams)
      ('English Home Language',              'ENG',  8, 12, NULL),
      ('English First Additional Language',  'ENFL', 8, 12, NULL),
      ('IsiZulu Home Language',              'ZUL',  8, 12, NULL),
      ('Afrikaans First Additional Language','AFR',  8, 12, NULL),
      ('Mathematics',                        'MATH', 8, 12, NULL),
      ('Life Orientation',                   'LO',   8, 12, NULL),
      ('Natural Sciences',                   'NSCI', 8, 9,  NULL),
      ('Social Sciences',                    'SSCI', 8, 9,  NULL),
      ('Technology',                         'TECH', 8, 9,  NULL),
      ('Economic and Management Sciences',   'EMS',  8, 9,  NULL),
      ('Creative Arts',                      'ART',  8, 9,  NULL),
      -- Grade 10–12 general
      ('Mathematical Literacy',              'MATL', 10, 12, NULL),
      -- Physics stream
      ('Physical Sciences',                  'PSCI', 10, 12, 'Physics'),
      ('Life Sciences',                      'LSCI', 10, 12, 'Physics'),
      ('Agricultural Sciences',              'AGRI', 10, 12, 'Physics'),
      ('Information Technology',             'IT',   10, 12, 'Physics'),
      ('Geography',                          'GEOG', 10, 12, 'Physics'),
      -- Commerce stream
      ('Accounting',                         'ACC',  10, 12, 'Commerce'),
      ('Business Studies',                   'BUS',  10, 12, 'Commerce'),
      ('Economics',                          'ECON', 10, 12, 'Commerce'),
      ('Consumer Studies',                   'CONS', 10, 12, 'Commerce'),
      ('Tourism',                            'TOUR', 10, 12, 'Commerce'),
      -- Humanities stream
      ('History',                            'HIST', 10, 12, 'Humanities'),
      ('Geography (Humanities)',             'GEOH', 10, 12, 'Humanities'),
      ('Tourism (Humanities)',               'TOURH',10, 12, 'Humanities'),
      ('Visual Arts',                        'VART', 10, 12, 'Humanities'),
      ('Dramatic Arts',                      'DRAM', 10, 12, 'Humanities'),
      ('Music',                              'MUS',  10, 12, 'Humanities')
    ) AS v(name, code, grade_min, grade_max, stream)
    WHERE NOT EXISTS (SELECT 1 FROM national_subjects WHERE code = v.code)
  `);

  // applications — linked to schools by NAME (not id) throughout the app,
  // one row per school a candidate applied to.
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id                  SERIAL PRIMARY KEY,
      national_id         TEXT,
      first_name          TEXT,
      last_name           TEXT,
      date_of_birth       DATE,
      gender              TEXT,
      email               TEXT,
      phone               TEXT,
      address             TEXT,
      city                TEXT,
      parent_name         TEXT,
      parent_phone        TEXT,
      parent_email        TEXT,
      parent_occupation   TEXT,
      relationship        TEXT,
      school              TEXT,
      grade               TEXT,
      subject             TEXT,
      previous_school     TEXT,
      achievements        TEXT,
      why_attend          TEXT,
      emergency_contact   TEXT,
      emergency_phone     TEXT,
      documents           JSONB,
      document_count      INTEGER DEFAULT 0,
      required_documents  JSONB,
      status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','approved','accepted','rejected')),
      comment             TEXT DEFAULT '',
      submitted_at        TIMESTAMPTZ DEFAULT NOW(),
      updated_at          TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS school_admins (
      id                  SERIAL PRIMARY KEY,
      school_id           INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      name                TEXT,
      username            VARCHAR(100) NOT NULL UNIQUE,
      password_hash       TEXT NOT NULL,
      is_active           BOOLEAN DEFAULT true,
      temp_password_flag  BOOLEAN DEFAULT true,
      last_login          TIMESTAMPTZ,
      created_at          TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS teachers (
      id                  SERIAL PRIMARY KEY,
      school_id           INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      first_name          TEXT NOT NULL,
      last_name           TEXT NOT NULL,
      email               TEXT,
      phone               TEXT,
      employee_number     VARCHAR(50) UNIQUE,
      gender              TEXT,
      is_active           BOOLEAN DEFAULT true,
      username            VARCHAR(100) UNIQUE,
      password_hash       TEXT,
      temp_password_flag  BOOLEAN DEFAULT true,
      last_login          TIMESTAMPTZ,
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      updated_at          TIMESTAMPTZ
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS academic_years (
      id          SERIAL PRIMARY KEY,
      school_id   INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      year        INTEGER NOT NULL,
      is_current  BOOLEAN DEFAULT false,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(school_id, year)
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS parents (
      id                    SERIAL PRIMARY KEY,
      school_id             INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      first_name            TEXT,
      last_name             TEXT,
      phone                 TEXT,
      email                 TEXT,
      relationship          TEXT DEFAULT 'Guardian',
      is_emergency_contact  BOOLEAN DEFAULT false,
      created_at            TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS school_periods (
      id             SERIAL PRIMARY KEY,
      school_id      INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      period_number  INTEGER NOT NULL,
      name           TEXT,
      time_start     TIME,
      time_end       TIME,
      is_break       BOOLEAN DEFAULT false,
      UNIQUE(school_id, period_number)
    )
  `);

  // school_logos mirrors school_images (below) — same replace-then-insert
  // pattern, same schools.logo_id back-reference.
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS school_logos (
      id          SERIAL PRIMARY KEY,
      school_id   INTEGER NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
      image_data  BYTEA NOT NULL,
      mime_type   VARCHAR(50) DEFAULT 'image/png',
      file_size   INTEGER,
      uploaded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS classes (
      id                SERIAL PRIMARY KEY,
      school_id         INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      academic_year_id  INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
      name              TEXT NOT NULL,
      grade             INTEGER NOT NULL,
      stream            TEXT,
      letter            TEXT NOT NULL,
      capacity          INTEGER DEFAULT 40,
      is_active         BOOLEAN DEFAULT true,
      UNIQUE(school_id, academic_year_id, grade, letter)
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS school_subjects (
      id                    SERIAL PRIMARY KEY,
      school_id             INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      academic_year_id      INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
      national_subject_id   INTEGER NOT NULL REFERENCES national_subjects(id),
      name                  TEXT NOT NULL,
      code                  TEXT,
      grade                 INTEGER NOT NULL,
      stream                TEXT,
      is_active             BOOLEAN DEFAULT true
    )
  `);
  await pgm.db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS school_subjects_unique_idx
      ON school_subjects (school_id, academic_year_id, national_subject_id, grade, COALESCE(stream, 'ALL'))
  `);
  // Same 'Science' → 'Physics' correction as national_subjects above —
  // school_subjects.stream is set independently (from the admin's own stream
  // picker at add-subject time, see SystemSchoolSetup.jsx), so subjects added
  // before that picker was fixed were left permanently tagged 'Science',
  // silently orphaning every mark recorded against them from Physics-stream
  // students' reports (stream filter never matched).
  await pgm.db.query(`UPDATE school_subjects SET stream = 'Physics' WHERE stream = 'Science'`);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS terms (
      id                SERIAL PRIMARY KEY,
      school_id         INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      academic_year_id  INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
      term_number       INTEGER NOT NULL,
      start_date        DATE NOT NULL,
      end_date          DATE NOT NULL,
      is_current        BOOLEAN DEFAULT false,
      UNIQUE(school_id, academic_year_id, term_number)
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS teacher_subjects (
      id                    SERIAL PRIMARY KEY,
      teacher_id            INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      school_id             INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      national_subject_id   INTEGER NOT NULL REFERENCES national_subjects(id) ON DELETE CASCADE,
      UNIQUE(teacher_id, national_subject_id)
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS enrolled_students (
      id                  SERIAL PRIMARY KEY,
      school_id           INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      application_id      INTEGER REFERENCES applications(id) ON DELETE SET NULL,
      student_number      VARCHAR(50) UNIQUE,
      first_name          TEXT NOT NULL,
      last_name           TEXT NOT NULL,
      national_id         TEXT,
      email               TEXT,
      phone               TEXT,
      date_of_birth       DATE,
      gender              TEXT,
      grade               TEXT,
      stream              TEXT,
      enrolled_by         INTEGER REFERENCES school_admins(id),
      notes               TEXT,
      is_active           BOOLEAN DEFAULT true,
      enrollment_date     TIMESTAMPTZ DEFAULT NOW(),
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      password_hash       TEXT,
      temp_password_flag  BOOLEAN DEFAULT true,
      last_login          TIMESTAMPTZ,
      updated_at          TIMESTAMPTZ
    )
  `);

  // generate_student_number() — the original function is lost along with the
  // old database. This reconstruction guarantees global uniqueness (student
  // login looks students up by number alone, with no school scoping) via a
  // dedicated sequence; the exact format of existing numbers can't be
  // recovered, but new ones will look like STU00100001.
  await pgm.db.query(`CREATE SEQUENCE IF NOT EXISTS student_number_seq`);
  try {
    // CREATE OR REPLACE can't change a function's return type — a DB whose
    // generate_student_number predates this migration (a different local
    // dev DB, or a pre-migration manual setup) has it with some other
    // signature, and REPLACE alone would abort the whole migration. Drop it
    // first so this is idempotent regardless of what shape it was in.
    await pgm.db.query(`DROP FUNCTION IF EXISTS generate_student_number(INTEGER)`);
    await pgm.db.query(`
      CREATE FUNCTION generate_student_number(p_school_id INTEGER)
      RETURNS TEXT AS $$
      DECLARE
        v_num BIGINT;
      BEGIN
        v_num := nextval('student_number_seq');
        RETURN 'STU' || LPAD(p_school_id::TEXT, 3, '0') || LPAD(v_num::TEXT, 6, '0');
      END;
      $$ LANGUAGE plpgsql
    `);
  } catch (err) {
    console.warn('Migration note (generate_student_number):', err.message);
  }

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id          SERIAL PRIMARY KEY,
      school_id   INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      audience    VARCHAR(20) DEFAULT 'all',
      is_pinned   BOOLEAN DEFAULT false,
      is_active   BOOLEAN DEFAULT true,
      created_by  INTEGER REFERENCES school_admins(id),
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS events (
      id           SERIAL PRIMARY KEY,
      school_id    INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title        TEXT NOT NULL,
      description  TEXT,
      event_date   DATE NOT NULL,
      event_time   TIME,
      location     TEXT,
      type         VARCHAR(30) DEFAULT 'general',
      created_by   INTEGER REFERENCES school_admins(id),
      created_at   TIMESTAMPTZ DEFAULT NOW(),
      updated_at   TIMESTAMPTZ
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS student_parents (
      id          SERIAL PRIMARY KEY,
      student_id  INTEGER NOT NULL REFERENCES enrolled_students(id) ON DELETE CASCADE,
      parent_id   INTEGER NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
      UNIQUE(student_id, parent_id)
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS assignments (
      id                SERIAL PRIMARY KEY,
      school_id         INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      class_id          INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      subject_id        INTEGER NOT NULL REFERENCES school_subjects(id) ON DELETE CASCADE,
      teacher_id        INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      title             TEXT NOT NULL,
      description       TEXT,
      due_date          DATE NOT NULL,
      total_marks       NUMERIC,
      academic_year_id  INTEGER REFERENCES academic_years(id),
      term_id           INTEGER REFERENCES terms(id) ON DELETE SET NULL,
      created_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS exams (
      id                SERIAL PRIMARY KEY,
      school_id         INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      class_id          INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      subject_id        INTEGER NOT NULL REFERENCES school_subjects(id) ON DELETE CASCADE,
      teacher_id        INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      title             TEXT NOT NULL,
      exam_date         DATE NOT NULL,
      total_marks       NUMERIC DEFAULT 100,
      type              VARCHAR(30) DEFAULT 'test',
      academic_year_id  INTEGER REFERENCES academic_years(id),
      term_id           INTEGER REFERENCES terms(id) ON DELETE SET NULL,
      created_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS timetable_slots (
      id                SERIAL PRIMARY KEY,
      school_id         INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      academic_year_id  INTEGER REFERENCES academic_years(id),
      class_id          INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      subject_id        INTEGER NOT NULL REFERENCES school_subjects(id) ON DELETE CASCADE,
      teacher_id        INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      period_id         INTEGER NOT NULL REFERENCES school_periods(id) ON DELETE CASCADE,
      day_of_week       VARCHAR(20) NOT NULL,
      CONSTRAINT uq_slot_teacher UNIQUE (teacher_id, period_id, day_of_week),
      CONSTRAINT uq_slot_class   UNIQUE (class_id, period_id, day_of_week)
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS quizzes (
      id                  SERIAL PRIMARY KEY,
      school_id           INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      teacher_id          INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      subject_id          INTEGER REFERENCES school_subjects(id),
      class_id            INTEGER REFERENCES classes(id),
      title               TEXT NOT NULL,
      description         TEXT,
      total_questions     INTEGER,
      time_limit_minutes  INTEGER DEFAULT 30,
      difficulty          VARCHAR(20) DEFAULT 'medium',
      status              VARCHAR(20) NOT NULL DEFAULT 'draft',
      published_at        TIMESTAMPTZ,
      closes_at           TIMESTAMPTZ,
      created_at          TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS quiz_questions (
      id             SERIAL PRIMARY KEY,
      quiz_id        INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      question_text  TEXT NOT NULL,
      options        JSONB NOT NULL,
      correct        VARCHAR(10) NOT NULL,
      explanation    TEXT,
      topic          TEXT,
      order_num      INTEGER DEFAULT 0
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id                SERIAL PRIMARY KEY,
      school_id         INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      grade             INTEGER NOT NULL,
      sender_id         INTEGER NOT NULL,
      sender_name       TEXT NOT NULL,
      sender_type       VARCHAR(20) NOT NULL,
      message           TEXT NOT NULL,
      reply_to_id       INTEGER REFERENCES chat_messages(id) ON DELETE SET NULL,
      reply_to_sender   TEXT,
      reply_to_preview  TEXT,
      created_at        TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS teacher_materials (
      id              SERIAL PRIMARY KEY,
      teacher_id      INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      subject_id      INTEGER REFERENCES school_subjects(id),
      class_id        INTEGER REFERENCES classes(id),
      school_id       INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      title           TEXT NOT NULL,
      material_type   VARCHAR(30),
      filename        TEXT,
      originalname    TEXT,
      extracted_text  TEXT NOT NULL,
      char_count      INTEGER GENERATED ALWAYS AS (char_length(extracted_text)) STORED,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id                 SERIAL PRIMARY KEY,
      school_id          INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      timetable_slot_id  INTEGER NOT NULL REFERENCES timetable_slots(id) ON DELETE CASCADE,
      student_id         INTEGER NOT NULL REFERENCES enrolled_students(id) ON DELETE CASCADE,
      date               DATE NOT NULL,
      status             VARCHAR(20) NOT NULL DEFAULT 'present',
      marked_by          INTEGER REFERENCES teachers(id),
      note               TEXT,
      marked_at          TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(timetable_slot_id, student_id, date)
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS results (
      id              SERIAL PRIMARY KEY,
      school_id       INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      student_id      INTEGER NOT NULL REFERENCES enrolled_students(id) ON DELETE CASCADE,
      exam_id         INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      marks_obtained  NUMERIC NOT NULL,
      percentage      NUMERIC,
      captured_by     INTEGER REFERENCES teachers(id),
      captured_at     TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(student_id, exam_id)
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id                  SERIAL PRIMARY KEY,
      quiz_id             INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      student_id          INTEGER NOT NULL REFERENCES enrolled_students(id) ON DELETE CASCADE,
      school_id           INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      started_at          TIMESTAMPTZ DEFAULT NOW(),
      submitted_at        TIMESTAMPTZ,
      score               INTEGER,
      total               INTEGER,
      percentage          NUMERIC(5,2),
      time_taken_seconds  INTEGER,
      UNIQUE(quiz_id, student_id)
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS chat_reactions (
      id          SERIAL PRIMARY KEY,
      message_id  INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
      student_id  INTEGER NOT NULL REFERENCES enrolled_students(id) ON DELETE CASCADE,
      emoji       VARCHAR(10) NOT NULL,
      UNIQUE(message_id, student_id, emoji)
    )
  `);

  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS quiz_answers (
      id               SERIAL PRIMARY KEY,
      attempt_id       INTEGER NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
      question_id      INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
      selected_answer  VARCHAR(10),
      is_correct       BOOLEAN
    )
  `);

  console.log('✅ Recovered core schema verified');
  // ───────────────────────────────────────────────────────────────────────────

  // Streamed grades (10-12) can have the same letter across different streams
  // — "10A Physics" and "10A Commerce" are different classes — so the old
  // UNIQUE(school_id, academic_year_id, grade, letter) constraint (which
  // ignored stream entirely) made that impossible. Replaced with an
  // expression index that treats "no stream" (grades 8-9) as its own slot.
  try {
    await pgm.db.query(`ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_school_id_academic_year_id_grade_letter_key`);
    await pgm.db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS classes_unique_idx
        ON classes (school_id, academic_year_id, grade, COALESCE(stream, 'NONE'), letter)
    `);
  } catch (err) {
    console.warn('Migration note (classes stream-aware uniqueness):', err.message);
  }

  // enrolled_students needs a direct class assignment (not just loose grade/
  // stream text) so enrollment can allocate students into a specific class
  // by capacity — see allocateClass() in managementRoutes.js.
  try {
    await pgm.db.query(`ALTER TABLE enrolled_students ADD COLUMN IF NOT EXISTS class_id INTEGER REFERENCES classes(id) ON DELETE SET NULL`);
  } catch (err) {
    console.warn('Migration note (enrolled_students.class_id):', err.message);
  }

  // exams/assignments.weight — teacher-set % weighting toward the term total.
  // Was already in use by the app code (POST /exams, POST /assignments,
  // /weight-budget) but had no CREATE/ALTER anywhere, so it only existed on
  // the live database from a manual change — codifying it here so it
  // survives a future rebuild.
  for (const col of [
    `ALTER TABLE exams       ADD COLUMN IF NOT EXISTS weight NUMERIC`,
    `ALTER TABLE assignments ADD COLUMN IF NOT EXISTS weight NUMERIC`,
  ]) {
    try { await pgm.db.query(col); } catch (err) {
      console.warn('Migration note (exams/assignments.weight):', err.message);
    }
  }

  // assignment_submissions
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS assignment_submissions (
      id             SERIAL PRIMARY KEY,
      assignment_id  INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
      student_id     INTEGER,
      filename       TEXT,
      originalname   TEXT,
      mimetype       TEXT,
      marks_obtained NUMERIC,
      percentage     NUMERIC,
      submitted_at   TIMESTAMPTZ DEFAULT NOW(),
      graded_at      TIMESTAMPTZ,
      graded_by      INTEGER
    )
  `);

  // audit_logs — was missing at one point, caused every login/action to throw an error
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id          SERIAL PRIMARY KEY,
      school_id   INTEGER,
      admin_id    INTEGER,
      actor       VARCHAR(200),
      actor_role  VARCHAR(50),
      action      VARCHAR(100) NOT NULL,
      target_type VARCHAR(50),
      target_id   INTEGER,
      target      TEXT,
      detail      TEXT,
      school      TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // assessments — needed by /api/exams/upload and /api/marks
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS assessments (
      id          SERIAL PRIMARY KEY,
      school_id   INTEGER,
      class_id    INTEGER,
      subject_id  INTEGER,
      title       VARCHAR(200) NOT NULL,
      type        VARCHAR(50),
      date        DATE,
      max_score   NUMERIC DEFAULT 100,
      weight      NUMERIC DEFAULT 1,
      term        VARCHAR(20),
      created_by  INTEGER,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // marks
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS marks (
      id            SERIAL PRIMARY KEY,
      assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
      student_id    INTEGER NOT NULL,
      score         NUMERIC,
      max_score     NUMERIC,
      source        VARCHAR(50) DEFAULT 'manual',
      entered_by    INTEGER,
      entered_at    TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(assessment_id, student_id)
    )
  `);

  // exam_submissions
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS exam_submissions (
      id            SERIAL PRIMARY KEY,
      assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
      student_id    INTEGER,
      filename      TEXT,
      filepath      TEXT,
      status        VARCHAR(50) DEFAULT 'uploaded',
      created_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // grade_audit_log
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS grade_audit_log (
      id            SERIAL PRIMARY KEY,
      school_id     INTEGER,
      student_id    INTEGER,
      assessment_id INTEGER,
      old_score     NUMERIC,
      new_score     NUMERIC,
      changed_by    INTEGER,
      changed_at    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // school_images — Image storage (BYTEA binary format)
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS school_images (
      id          SERIAL PRIMARY KEY,
      school_id   INTEGER NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
      image_data  BYTEA NOT NULL,
      mime_type   VARCHAR(50) DEFAULT 'image/jpeg',
      file_size   INTEGER,
      uploaded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // system_admin — System-level administrators
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS system_admin (
      id              SERIAL PRIMARY KEY,
      username        VARCHAR(100) NOT NULL UNIQUE,
      name            VARCHAR(200),
      password_hash   VARCHAR(255) NOT NULL,
      is_active       BOOLEAN DEFAULT TRUE,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      last_login      TIMESTAMPTZ
    )
  `);

  // Add image_id column to schools if it doesn't exist
  try {
    await pgm.db.query(`
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS image_id INTEGER REFERENCES school_images(id) ON DELETE SET NULL
    `);
  } catch (err) {
    console.warn('Note: image_id column ALTER failed:', err.message);
  }

  // Add logo_id column to schools if it doesn't exist
  try {
    await pgm.db.query(`
      ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_id INTEGER REFERENCES school_logos(id) ON DELETE SET NULL
    `);
  } catch (err) {
    console.warn('Note: logo_id column ALTER failed:', err.message);
  }

  // document_files — persistent binary storage for uploaded documents
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS document_files (
      id            SERIAL PRIMARY KEY,
      filename      VARCHAR(255) NOT NULL UNIQUE,
      original_name VARCHAR(255),
      mimetype      VARCHAR(100),
      file_size     INTEGER,
      data          BYTEA NOT NULL,
      uploaded_at   TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Add application form columns to schools
  for (const col of [
    `ALTER TABLE schools ADD COLUMN IF NOT EXISTS application_form_required BOOLEAN DEFAULT false`,
    `ALTER TABLE schools ADD COLUMN IF NOT EXISTS application_form_filename TEXT`,
    `ALTER TABLE schools ADD COLUMN IF NOT EXISTS application_form_originalname TEXT`,
  ]) {
    try { await pgm.db.query(col); } catch (err) {
      console.warn('Migration note:', err.message);
    }
  }

  // Multi-account system admin (IT support team) + created/modified tracking.
  // Only the LATEST modifier is kept per row (updated_by/updated_at) — full
  // history already lives in audit_logs for whoever needs to dig further.
  for (const col of [
    `ALTER TABLE system_admin  ADD COLUMN IF NOT EXISTS is_active  BOOLEAN DEFAULT true`,
    `ALTER TABLE system_admin  ADD COLUMN IF NOT EXISTS created_by VARCHAR(100)`,
    `ALTER TABLE system_admin  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()`,
    `ALTER TABLE schools       ADD COLUMN IF NOT EXISTS created_by VARCHAR(100)`,
    `ALTER TABLE schools       ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100)`,
    `ALTER TABLE schools       ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`,
    `ALTER TABLE school_admins ADD COLUMN IF NOT EXISTS created_by VARCHAR(100)`,
    `ALTER TABLE school_admins ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100)`,
    `ALTER TABLE school_admins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ`,
  ]) {
    try { await pgm.db.query(col); } catch (err) {
      console.warn('Migration note (system admin / audit tracking):', err.message);
    }
  }

  // Parent portal login — parents rows are created during enrollment with only
  // contact info (see managementRoutes.js), so credentials are added on top here.
  for (const col of [
    `ALTER TABLE parents ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE`,
    `ALTER TABLE parents ADD COLUMN IF NOT EXISTS password_hash TEXT`,
    `ALTER TABLE parents ADD COLUMN IF NOT EXISTS temp_password_flag BOOLEAN DEFAULT true`,
    `ALTER TABLE parents ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ`,
  ]) {
    try { await pgm.db.query(col); } catch (err) {
      console.warn('Migration note (parents auth):', err.message);
    }
  }

  // Opaque public reference code for applications — see generateReferenceCode()
  // in server.js. Backfills any rows submitted before this column existed.
  try {
    await pgm.db.query(`ALTER TABLE applications ADD COLUMN IF NOT EXISTS reference_code VARCHAR(20)`);
    await pgm.db.query(`CREATE UNIQUE INDEX IF NOT EXISTS applications_reference_code_idx ON applications(reference_code) WHERE reference_code IS NOT NULL`);
    const { rows: missingCodes } = await pgm.db.query(`SELECT id FROM applications WHERE reference_code IS NULL`);
    for (const { id } of missingCodes) {
      await pgm.db.query(`UPDATE applications SET reference_code = $1 WHERE id = $2`, [generateReferenceCode(), id]);
    }
  } catch (err) {
    console.warn('Migration note (reference_code):', err.message);
  }

  // Term report release — school admin flips this once teachers have finished
  // grading, and only then can students download their report card for that term.
  for (const col of [
    `ALTER TABLE terms ADD COLUMN IF NOT EXISTS reports_released BOOLEAN DEFAULT false`,
    `ALTER TABLE terms ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ`,
    `ALTER TABLE terms ADD COLUMN IF NOT EXISTS released_by VARCHAR(100)`,
  ]) {
    try { await pgm.db.query(col); } catch (err) {
      console.warn('Migration note (term report release):', err.message);
    }
  }

  // support_tickets / support_ticket_replies — the school-admin ↔ system-admin
  // helpdesk. school_id ties a ticket to the reporting school; replies carry
  // author_role so the UI can tell provider responses from the school's own.
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id                  SERIAL PRIMARY KEY,
      school_id           INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      created_by_admin_id INTEGER REFERENCES school_admins(id),
      subject             VARCHAR(200) NOT NULL,
      description         TEXT NOT NULL,
      priority            VARCHAR(20) NOT NULL DEFAULT 'normal',
      status              VARCHAR(20) NOT NULL DEFAULT 'open',
      created_at          TIMESTAMPTZ DEFAULT NOW(),
      updated_at          TIMESTAMPTZ DEFAULT NOW(),
      resolved_at         TIMESTAMPTZ
    )
  `);
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS support_ticket_replies (
      id          SERIAL PRIMARY KEY,
      ticket_id   INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
      author      VARCHAR(200) NOT NULL,
      author_role VARCHAR(20)  NOT NULL,
      message     TEXT NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // system_errors — populated by the global error handler; backs /api/system/health
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS system_errors (
      id         SERIAL PRIMARY KEY,
      method     VARCHAR(10),
      path       TEXT,
      message    TEXT,
      stack      TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // term_weights — per (class, subject, term) split between assignment marks and exam marks
  // used by the report-card calculator to compute each subject's final percentage
  await pgm.db.query(`
    CREATE TABLE IF NOT EXISTS term_weights (
      id                SERIAL PRIMARY KEY,
      school_id         INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      class_id          INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
      subject_id        INTEGER NOT NULL REFERENCES school_subjects(id) ON DELETE CASCADE,
      term_id           INTEGER NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
      assignment_weight NUMERIC NOT NULL DEFAULT 50,
      exam_weight       NUMERIC NOT NULL DEFAULT 50,
      updated_at        TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(class_id, subject_id, term_id)
    )
  `);

  console.log('✅ Baseline schema verified');
};

// This migration recreates the whole schema — a "down" would mean dropping
// every table in the app. Not implemented on purpose; roll forward only.
export const down = false;
