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

    console.log('Querying organizers columns...');
    const colRes = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'organizers'
        AND table_schema = 'public'
    `);
    console.log('Columns in "organizers":', colRes.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

main();
