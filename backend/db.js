// db.js — PostgreSQL connection pool
// Uses the 'pg' package: npm install pg
// Configure via .env (see .env.example)

const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  // Optional: max connections in pool (default 10)
  max: 10,
  // Throw if a client sits idle for >30 s
  idleTimeoutMillis: 30000,
  // Throw if we can't get a connection within 2 s
  connectionTimeoutMillis: 2000,
});

// Quick connectivity check on startup
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌  PostgreSQL connection failed:', err.message);
    console.error('   Check your .env DB_* variables and that postgres is running.');
  } else {
    console.log('✅  PostgreSQL connected successfully');
    release();
  }
});

module.exports = pool;