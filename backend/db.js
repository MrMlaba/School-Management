const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      // Neon's free tier scales to zero when idle — a cold-start reconnect
      // can take a few seconds, so this needs more headroom than a
      // typically-always-on host like Railway needed.
      connectionTimeoutMillis: 10000,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host:     process.env.PGHOST,
      port:     parseInt(process.env.PGPORT, 10) || 5432,
      database: process.env.PGDATABASE,
      user:     process.env.PGUSER,
      password: process.env.PGPASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: {
        rejectUnauthorized: false  // required for Railway
      }
    });

// Idle pooled clients can have their connection dropped by the network or
// the DB host at any time. Without this listener, pg emits an 'error' event
// on the pool that Node treats as uncaught — crashing the entire process
// over a single stale connection instead of just letting the pool discard it.
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client:', err.message);
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ PostgreSQL connection failed:', err.message);
  } else {
    console.log('✅ PostgreSQL connected successfully');
    release();
  }
});

module.exports = pool;