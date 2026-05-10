const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });

async function cleanupDuplicates() {
  const invites = await p.organizerInvite.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' }
  });

  const seen = new Set();
  const dupeIds = [];

  for (const inv of invites) {
    if (seen.has(inv.emailOrPhone)) {
      dupeIds.push(inv.id);
    } else {
      seen.add(inv.emailOrPhone);
    }
  }

  console.log('Duplicate invites to cancel:', dupeIds.length);
  if (dupeIds.length > 0) {
    const result = await p.organizerInvite.updateMany({
      where: { id: { in: dupeIds } },
      data: { status: 'CANCELLED' }
    });
    console.log('Cancelled:', result.count);
  } else {
    console.log('No duplicates found.');
  }
}

cleanupDuplicates().finally(() => p.$disconnect().then(() => pool.end()));
