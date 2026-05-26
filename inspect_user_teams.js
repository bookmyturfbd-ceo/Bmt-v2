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
    // 1. Let's see all active REGULAR teams
    const teams = await prisma.team.findMany({
      where: {
        teamType: 'REGULAR',
        isDisbanded: false,
        NOT: {
          name: {
            startsWith: 'Mock Team'
          }
        }
      },
      select: {
        id: true,
        name: true,
        sportType: true,
        footballMmr: true,
        cricketMmr: true,
        matchesAsTeamA: {
          select: { id: true, status: true }
        },
        matchesAsTeamB: {
          select: { id: true, status: true }
        }
      }
    });

    console.log('--- ACTIVE REGULAR TEAMS (' + teams.length + ') ---');
    console.log(teams.map(t => ({
      id: t.id,
      name: t.name,
      sportType: t.sportType,
      footballMmr: t.footballMmr,
      cricketMmr: t.cricketMmr,
      matchesPlayed: t.matchesAsTeamA.filter(m => m.status === 'COMPLETED').length + t.matchesAsTeamB.filter(m => m.status === 'COMPLETED').length
    })));
    console.log('------------------------------------');
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
