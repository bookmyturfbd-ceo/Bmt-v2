const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

async function main() {
  let pool;
  try {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    pool = new Pool({ 
      connectionString,
      connectionTimeoutMillis: 10000,
      ssl: { rejectUnauthorized: false }
    });

    console.log('Updating tournament status to REGISTRATION_OPEN...');
    const res = await pool.query(`
      UPDATE tournaments 
      SET status = 'REGISTRATION_OPEN', "isRegistrationOpen" = true
      WHERE id = 'cmqhqix0k000004lefnfrikp6'
      RETURNING id, name, status, "isRegistrationOpen"
    `);
    console.log('Updated tournament:', res.rows[0]);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

main();
