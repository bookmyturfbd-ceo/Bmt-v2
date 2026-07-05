const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  try {
    const res = await pool.query("SELECT datname FROM pg_database WHERE datistemplate = false");
    console.log('Databases on server:');
    res.rows.forEach(r => console.log(`- ${r.datname}`));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

main();
