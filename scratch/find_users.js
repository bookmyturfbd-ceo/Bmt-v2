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

    console.log('Querying all public tables...');
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('Tables in database:', tables);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

main();
