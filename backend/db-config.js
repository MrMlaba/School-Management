// Single source of truth for how the app connects to Postgres — shared by
// the runtime pool (db.js) and the migration runner (migrate.js) so the two
// can never drift into talking to the database differently.
const dbConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      // Neon's free tier scales to zero when idle — a cold-start reconnect
      // can take a few seconds, so this needs more headroom than a
      // typically-always-on host like Railway needed.
      connectionTimeoutMillis: 10000,
      ssl: { rejectUnauthorized: false },
    }
  : {
      host:     process.env.PGHOST,
      port:     parseInt(process.env.PGPORT, 10) || 5432,
      database: process.env.PGDATABASE,
      user:     process.env.PGUSER,
      password: process.env.PGPASSWORD,
      connectionTimeoutMillis: 2000,
      // A local Postgres install doesn't speak SSL by default; forcing it
      // here made the app unable to ever connect to localhost. Still forced
      // for any real (non-localhost) host, e.g. Render/Railway-hosted Postgres.
      ssl: ['localhost', '127.0.0.1'].includes(process.env.PGHOST)
        ? false
        : { rejectUnauthorized: false },
    };

module.exports = dbConfig;
