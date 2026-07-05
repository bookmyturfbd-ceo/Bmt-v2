const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env' });

async function main() {
  let pool;
  try {
    const targetEmail = 'o1@bmt.com';
    const newPassword = 'pass12345678';
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('Hashed password for "' + newPassword + '": ' + hashedPassword);

    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    console.log('Connecting with connection string and 60s timeout...');

    pool = new Pool({ 
      connectionString,
      connectionTimeoutMillis: 60000, // 60 seconds timeout
      ssl: {
        rejectUnauthorized: false
      }
    });

    console.log('Querying database (waiting for wake-up if needed)...');
    // Find all tables that have an 'email' column
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.columns 
      WHERE column_name = 'email' 
        AND table_schema = 'public'
    `);
    
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('Tables with an "email" column:', tables);
    
    let found = false;
    for (const table of tables) {
      // Find user
      const queryStr = 'SELECT * FROM "' + table + '" WHERE LOWER(email) = LOWER($1)';
      const userRes = await pool.query(queryStr, [targetEmail]);
      if (userRes.rows.length > 0) {
        console.log('Found user in table "' + table + '":', userRes.rows.map(r => {
          // Exclude password and sensitive columns from log print for safety
          const { password, ...rest } = r;
          return rest;
        }));
        found = true;
        
        // Update user password
        // Let's first check if there is a 'password' column in this table
        const colRes = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 
            AND column_name = 'password'
            AND table_schema = 'public'
        `, [table]);
        
        if (colRes.rows.length > 0) {
          const updateStr = 'UPDATE "' + table + '" SET password = $1 WHERE LOWER(email) = LOWER($2)';
          const updateRes = await pool.query(updateStr, [hashedPassword, targetEmail]);
          console.log('Updated password in "' + table + '". Row count: ' + updateRes.rowCount);
        } else {
          console.log('Table "' + table + '" does not have a "password" column!');
        }
      }
    }
    
    if (!found) {
      console.log('No user with email "' + targetEmail + '" was found in any table.');
    }
  } catch (err) {
    console.error('Error running find_and_reset:', err);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

main();
