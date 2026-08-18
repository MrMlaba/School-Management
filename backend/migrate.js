// Runs any pending node-pg-migrate migrations from migrations/. Used both
// at server startup (server.js, before the app is marked ready for traffic)
// and standalone via `npm run migrate` for local/manual use.
const path = require('path');
require('dotenv').config();
const { runner } = require('node-pg-migrate');
const dbConfig = require('./db-config');

async function runMigrations() {
  await runner({
    databaseUrl: dbConfig,
    dir: path.join(__dirname, 'migrations'),
    direction: 'up',
    migrationsTable: 'pgmigrations',
    createMigrationsSchema: true,
    checkOrder: true,
  });
}

module.exports = { runMigrations };

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('✅ Migrations applied');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}
