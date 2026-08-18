// Per-school application windows. The school proposes a date range
// (application_open_from/until, self-service — see managementRoutes.js);
// applications_enabled is the actual on/off switch, held by the system
// admin (see systemRoutes.js), set per what the school has requested. A
// school only actually accepts applications when the switch is on AND
// today falls inside its proposed window (see the shared isOpen logic in
// server.js — GET /api/schools, GET /api/schools/:id, POST /api/applications
// all compute this the same way).

/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.addColumns('schools', {
    application_open_from: { type: 'date' },
    application_open_until: { type: 'date' },
    applications_enabled: { type: 'boolean', notNull: true, default: true },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropColumns('schools', ['application_open_from', 'application_open_until', 'applications_enabled']);
};
