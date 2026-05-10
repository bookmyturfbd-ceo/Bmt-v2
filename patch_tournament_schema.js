// patch_tournament_schema.js — applies tournament engine SQL directly to the DB
// Uses pg Pool with DIRECT_URL (same as prisma.config.ts for migrations)
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

async function main() {
  const sqlFile = path.join(__dirname, 'prisma', 'tournament_engine_migration.sql');
  const sql = fs.readFileSync(sqlFile, 'utf-8');

  const client = await pool.connect();
  try {
    console.log('Connected. Applying tournament engine migration...\n');

    // Run the entire SQL block as a single transaction
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log('✅ Migration applied successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.message.includes('already exists')) {
      console.log('⟳ Tables already exist — migration already applied or partial. Details:');
      console.log(err.message);
    } else {
      console.error('❌ Migration failed:\n', err.message);
      process.exit(1);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main();
