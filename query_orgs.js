const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const envFile = fs.readFileSync('.env', 'utf-8');
let databaseUrl = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    databaseUrl = line.split('DATABASE_URL=')[1].trim().replace(/"/g, '').replace(/'/g, '');
    break;
  }
}

const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  try {
    const player = await prisma.player.findFirst({
      select: { id: true, fullName: true, email: true }
    });
    console.log('Sample Player:', player);

    const owner = await prisma.owner.findFirst({
      select: { id: true, name: true }
    });
    console.log('Sample Owner:', owner);

    const division = await prisma.division.findFirst({
      select: { id: true, name: true }
    });
    console.log('Sample Division:', division);

    const city = await prisma.city.findFirst({
      select: { id: true, name: true }
    });
    console.log('Sample City:', city);

    const tournament = await prisma.tournament.findFirst({
      select: { id: true, name: true, operatorId: true, status: true }
    });
    console.log('Sample Tournament:', tournament);

    const registrations = await prisma.tournamentRegistration.findMany({
      take: 5
    });
    console.log('Sample Registrations:', registrations);

  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main();
