const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  try {
    console.log('--- TURFS ---');
    const turfs = await prisma.turf.findMany({
      include: {
        owner: true
      }
    });
    for (const t of turfs) {
      console.log(`ID: ${t.id} | Name: "${t.name}" | Owner: "${t.owner?.name}" (ID: ${t.ownerId}, Email: ${t.owner?.email})`);
    }

    console.log('\n--- ALL OWNERS ---');
    const owners = await prisma.owner.findMany({
      include: {
        turfs: true
      }
    });
    for (const o of owners) {
      console.log(`ID: ${o.id} | Name: "${o.name}" | Email: "${o.email}" | Turfs: ${o.turfs.map(t => `"${t.name}"`).join(', ')}`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
