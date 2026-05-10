require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const password = await bcrypt.hash('1234578', 10);

  for (let i = 3; i <= 13; i++) {
    const created = await prisma.player.upsert({
      where: { email: `p${i}@bmt.com` },
      update: {},
      create: {
        email: `p${i}@bmt.com`,
        fullName: `Test Play ${i}`,
        phone: `010000000${String(i).padStart(2, '0')}`,
        password,
      },
    });
    console.log(`✔  ${created.fullName}  <${created.email}>  id=${created.id}`);
  }

  console.log('\nDone! 11 test players seeded (p3 - p13).');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
