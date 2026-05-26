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
    const sport = 'CRICKET_FULL';
    const category = 'ranked';
    const type = 'teams';
    const tier = 'ALL';

    const isCricketSport = sport.includes('CRICKET');
    let mmrField = isCricketSport ? 'cricketMmr' : 'footballMmr';

    const TIER_RANGES = {
      ALL     : [0,    9999],
    };
    const [minMmr, maxMmr] = TIER_RANGES[tier] ?? [0, 9999];

    const whereClause = {
      [mmrField]: { gte: minMmr, lte: maxMmr },
      teamType: category === 'tournament' ? 'TOURNAMENT' : 'REGULAR',
    };
    if (sport !== 'ALL') whereClause.sportType = sport;

    console.log('whereClause:', whereClause);

    const teams = await prisma.team.findMany({
      where: whereClause,
      orderBy: { [mmrField]: 'desc' },
      take: 50,
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

    console.log('Result length:', teams.length);
    console.log('Teams:', teams);
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main();
