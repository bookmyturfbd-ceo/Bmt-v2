const { execSync } = require('child_process');

// We'll use Prisma's built-in db execute via stdin or just write raw SQL
// This avoids needing PrismaClient instantiation outside Next.js context

const bcryptjs = require('bcryptjs');
const { Client } = require('pg');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

async function main() {
  // Find DATABASE_URL
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DIRECT_URL;
  if (!url) {
    console.error('No DATABASE_URL found in .env / .env.local');
    process.exit(1);
  }

  const client = new Client({ connectionString: url });
  await client.connect();

  const password = await bcryptjs.hash('12345678', 10);
  let created = 0, skipped = 0;

  for (let i = 14; i <= 25; i++) {
    const email    = `p${i}@bmt.com`;
    const fullName = `Test Player ${i}`;
    const id       = `test-player-${i}`;

    // Check existing
    const exists = await client.query('SELECT id FROM players WHERE email = $1', [email]);
    if (exists.rows.length > 0) {
      console.log(`⚠️  Skipped (exists): ${email}`);
      skipped++;
      continue;
    }

    await client.query(
      `INSERT INTO players (id, "fullName", email, password, phone, "joinedAt", "walletBalance", "loyaltyPoints", level, "levelProgress", mmr, "banStatus")
       VALUES ($1, $2, $3, $4, '', NOW(), 0, 0, 1, 0, 1000, 'none')`,
      [id, fullName, email, password]
    );
    console.log(`✅ Created: ${email} — ${fullName}`);
    created++;
  }

  await client.end();
  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
}

main().catch(e => { console.error(e); process.exit(1); });
