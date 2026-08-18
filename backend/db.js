const { Pool } = require('pg');
const dbConfig = require('./db-config');

const pool = new Pool({
  ...dbConfig,
  max: 20,
  idleTimeoutMillis: 30000,
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