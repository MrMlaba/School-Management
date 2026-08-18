// Adds the content needed for the public school-profile page: a free-text
// "about" blurb, open-ended programs/sports lists (per-school, not a fixed
// shared list like grades/streams), and a photo gallery. Mirrors the
// existing school_images/school_logos pattern (BYTEA in Postgres, not disk)
// but is one-to-many instead of one-to-one, since a school has many gallery
// photos.

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.addColumns('schools', {
    about: { type: 'text' },
    programs: { type: 'jsonb', notNull: true, default: pgm.func("'[]'::jsonb") },
    sports: { type: 'jsonb', notNull: true, default: pgm.func("'[]'::jsonb") },
  });

  pgm.createTable('school_gallery_images', {
    id: 'id',
    school_id: {
      type: 'integer',
      notNull: true,
      references: 'schools',
      onDelete: 'CASCADE',
    },
    image_data: { type: 'bytea', notNull: true },
    mime_type: { type: 'varchar(50)' },
    file_size: { type: 'integer' },
    caption: { type: 'text' },
    sort_order: { type: 'integer', notNull: true, default: 0 },
    uploaded_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('school_gallery_images', 'school_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTable('school_gallery_images');
  pgm.dropColumns('schools', ['about', 'programs', 'sports']);
};
