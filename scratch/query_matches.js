const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const matches = await prisma.match.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        teamA: { select: { name: true } },
        teamB: { select: { name: true } }
      }
    });
    console.log('Latest 10 matches:');
    matches.forEach(m => {
      console.log(`ID: ${m.id}, Status: ${m.status}, TeamA: ${m.teamA.name}, TeamB: ${m.teamB.name}, Created: ${m.createdAt}`);
    });
  } catch (err) {
    console.error('Error fetching matches:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
