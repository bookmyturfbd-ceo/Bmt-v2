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

    console.log('Querying organizer saff...');
    const orgRes = await pool.query(`
      SELECT * FROM organizers WHERE email = 'safftayef6@gmail.com'
    `);
    
    if (orgRes.rows.length === 0) {
      console.log('Organizer not found!');
      return;
    }
    const org = orgRes.rows[0];
    console.log('Organizer:', org);

    console.log('Querying wallet...');
    const walletRes = await pool.query(`
      SELECT * FROM organizer_wallets WHERE "organizerId" = $1
    `, [org.id]);
    console.log('Wallet:', walletRes.rows[0]);

    console.log('Querying tournaments...');
    const tourRes = await pool.query(`
      SELECT id, name, status, "operatorId", "operatorType", "createdAt" FROM tournaments WHERE "operatorId" = $1
    `, [org.id]);
    console.log('Tournaments count:', tourRes.rows.length);
    console.log('Tournaments:', tourRes.rows);

    console.log('Querying wallet transactions...');
    const txRes = await pool.query(`
      SELECT * FROM organizer_wallet_transactions WHERE "organizerId" = $1
    `, [org.id]);
    console.log('Transactions:', txRes.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

main();
