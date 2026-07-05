const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config({ path: '.env' });

const createId = () => 'c' + crypto.randomUUID().replace(/-/g, '').slice(0, 23);

async function main() {
  let pool;
  try {
    const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
    pool = new Pool({ 
      connectionString,
      connectionTimeoutMillis: 10000,
      ssl: { rejectUnauthorized: false }
    });

    const targetEmail = 'o1@bmt.com';
    const newPassword = 'pass12345678';
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    console.log('Hashed password:', hashedPassword);

    // 1. Check & Upsert in Organizers
    const orgCheck = await pool.query('SELECT id FROM "organizers" WHERE LOWER(email) = LOWER($1)', [targetEmail]);
    if (orgCheck.rows.length > 0) {
      await pool.query('UPDATE "organizers" SET password = $1 WHERE LOWER(email) = LOWER($2)', [hashedPassword, targetEmail]);
      console.log('Updated existing organizer password.');
    } else {
      const orgId = createId();
      await pool.query(`
        INSERT INTO "organizers" (id, name, email, phone, password, "isVerified", "joinedAt", "chargePerTournament", "banStatus", "publishForFree")
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8, $9)
      `, [orgId, 'Organizer 1', targetEmail, '', hashedPassword, true, 0, 'none', true]);
      console.log('Created new organizer account.');
    }

    // 2. Check & Upsert in Owners
    const ownerCheck = await pool.query('SELECT id FROM "owners" WHERE LOWER(email) = LOWER($1)', [targetEmail]);
    if (ownerCheck.rows.length > 0) {
      await pool.query('UPDATE "owners" SET password = $1 WHERE LOWER(email) = LOWER($2)', [hashedPassword, targetEmail]);
      console.log('Updated existing owner password.');
    } else {
      const ownerId = createId();
      await pool.query(`
        INSERT INTO "owners" (id, name, email, phone, password, "walletBalance", "pendingBmtCut", "joinedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `, [ownerId, 'Owner 1', targetEmail, '', hashedPassword, 0, 0]);
      console.log('Created new owner account.');
    }

    // 3. Check & Upsert in Players
    const playerCheck = await pool.query('SELECT id FROM "players" WHERE LOWER(email) = LOWER($1)', [targetEmail]);
    if (playerCheck.rows.length > 0) {
      await pool.query('UPDATE "players" SET password = $1 WHERE LOWER(email) = LOWER($2)', [hashedPassword, targetEmail]);
      console.log('Updated existing player password.');
    } else {
      const playerId = createId();
      await pool.query(`
        INSERT INTO "players" (id, "fullName", email, phone, password, "walletBalance", "loyaltyPoints", level, "levelProgress", mmr, "footballMmr", "cricketMmr", "joinedAt", "banStatus")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13)
      `, [playerId, 'Player 1', targetEmail, '', hashedPassword, 0, 0, 1, 0, 1000, 1000, 1000, 'none']);
      console.log('Created new player account.');
    }

    console.log('Verification: checking accounts in database...');
    const resultOrgs = await pool.query('SELECT email FROM "organizers" WHERE email = $1', [targetEmail]);
    const resultOwners = await pool.query('SELECT email FROM "owners" WHERE email = $1', [targetEmail]);
    const resultPlayers = await pool.query('SELECT email FROM "players" WHERE email = $1', [targetEmail]);
    
    console.log('Organizer exists:', resultOrgs.rows.length > 0);
    console.log('Owner exists:', resultOwners.rows.length > 0);
    console.log('Player exists:', resultPlayers.rows.length > 0);
    console.log('✅ Successfully completed password resets/creations for o1@bmt.com.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

main();
