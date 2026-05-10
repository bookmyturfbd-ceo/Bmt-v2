// Simulate the exact state API call using the same prisma setup
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const matchId = 'cmo7hr632001dnkhwdbn7z9sz';

async function main() {
  try {
    console.log('Testing simple match query...');
    const m = await prisma.match.findUnique({
      where: { id: matchId },
      select: { id: true, status: true }
    });
    console.log('Simple query OK:', m);

    console.log('\nTesting cricketToss include...');
    const m2 = await prisma.match.findUnique({
      where: { id: matchId },
      include: { cricketToss: true }
    });
    console.log('cricketToss include OK:', m2?.cricketToss);

    console.log('\nTesting cricketInnings include...');
    const m3 = await prisma.match.findUnique({
      where: { id: matchId },
      include: { cricketInnings: true }
    });
    console.log('cricketInnings include OK:', m3?.cricketInnings?.length, 'records');

    console.log('\nAll tests passed!');
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error('Code:', err.code);
    console.error('Meta:', err.meta);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
