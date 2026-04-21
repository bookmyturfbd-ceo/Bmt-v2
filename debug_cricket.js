// Quick debug — call the cricket state API and print full response
const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function main() {
  const client = new Client({ connectionString: process.env.DIRECT_URL });
  await client.connect();

  // Find the most recent LIVE match
  const { rows } = await client.query(`
    SELECT m.id, m.status, ta."sportType"
    FROM matches m
    JOIN teams ta ON ta.id = m."teamA_Id"
    WHERE m.status = 'LIVE'
    ORDER BY m."createdAt" DESC
    LIMIT 5
  `);

  console.log('LIVE matches:', rows);

  if (rows.length > 0) {
    const matchId = rows[0].id;
    console.log('\nChecking cricket_tosses for matchId:', matchId);
    const t = await client.query(`SELECT * FROM cricket_tosses WHERE "matchId" = $1`, [matchId]);
    console.log('Tosses:', t.rows);

    console.log('\nChecking cricket_innings for matchId:', matchId);
    const i = await client.query(`SELECT * FROM cricket_innings WHERE "matchId" = $1`, [matchId]);
    console.log('Innings:', i.rows);

    // Also check members are included properly
    const m = await client.query(`SELECT * FROM matches WHERE id = $1`, [matchId]);
    console.log('\nMatch record:', m.rows[0]);
  }

  await client.end();
}

main().catch(console.error);
