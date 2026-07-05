const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const matchId = 'dummy_match_id';
  try {
    console.log('Running resolveMatch query...');
    const matchResolve = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: { include: { members: { select: { playerId: true, role: true } } } },
        teamB: { include: { members: { select: { playerId: true, role: true } } } },
      },
    });
    console.log('resolveMatch result found:', !!matchResolve);

    console.log('Running main state query...');
    const [match, scorers, events, signOffs, halfTime] = await Promise.all([
      prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teamA: {
            select: { id: true, name: true, logoUrl: true, sportType: true, teamMmr: true, ownerId: true,
              members: { select: { id: true, playerId: true, role: true, sportRole: true,
                player: { select: { id: true, fullName: true, avatarUrl: true, mmr: true } } } } }
          },
          teamB: {
            select: { id: true, name: true, logoUrl: true, sportType: true, teamMmr: true, ownerId: true,
              members: { select: { id: true, playerId: true, role: true, sportRole: true,
                player: { select: { id: true, fullName: true, avatarUrl: true, mmr: true } } } } }
          },
          rosterPicks: true,
          proposedSingleScorer: { select: { id: true, fullName: true, avatarUrl: true } },
        }
      }),
      prisma.matchScorer.findMany({ where: { matchId } }),
      prisma.matchEvent.findMany({ where: { matchId }, orderBy: { createdAt: 'asc' } }),
      prisma.matchSignOff.findMany({ where: { matchId } }),
      prisma.matchHalfTime.findUnique({ where: { matchId } }),
    ]);
    console.log('Queries completed successfully!');
    console.log('Match status:', match?.status);
    console.log('Scorers count:', scorers.length);
    console.log('Events count:', events.length);
  } catch (err) {
    console.error('CRITICAL QUERY ERROR:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
