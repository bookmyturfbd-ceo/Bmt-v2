const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

// Manually parse .env file
const envFile = fs.readFileSync('.env', 'utf-8');
let databaseUrl = '';
for (const line of envFile.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    databaseUrl = line.split('DATABASE_URL=')[1].trim().replace(/"/g, '').replace(/'/g, '');
    break;
  }
}

if (!databaseUrl) {
  console.error('DATABASE_URL not found in .env');
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  try {
    const teams = await prisma.team.findMany({
      select: {
        id: true,
        name: true,
        sportType: true,
        teamType: true,
        footballMmr: true,
        cricketMmr: true,
        isDisbanded: true
      }
    });
    console.log('--- ALL TEAMS ---');
    console.log(JSON.stringify(teams, null, 2));
    console.log('-----------------');
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
