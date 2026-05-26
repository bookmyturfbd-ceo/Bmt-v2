const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const id = 'cmnw1gsmq000gichw4dq4d0y7';
  
  // Directly mimic the GET API logic
  const player = await prisma.player.findUnique({
    where: { id },
    select: {
      id:            true,
      fullName:      true,
      email:         true,
      phone:         true,
      joinedAt:      true,
      walletBalance: true,
      loyaltyPoints: true,
      level:         true,
      levelProgress: true,
      avatarUrl:     true,
      banStatus:     true,
      banUntil:      true,
      banReason:     true,
      playerCode:    true,
      mmr:           true,
      footballMmr:   true,
      cricketMmr:    true,
      teamMemberships: {
        include: { team: true },
      },
      matchStats: {
        include: { team: true },
      },
      badges: true,
      battingPerformances: {
        select: { runs: true, ballsFaced: true, fours: true, sixes: true, notOut: true, matchId: true }
      },
      bowlingPerformances: {
        select: { legalBalls: true, runs: true, wickets: true, wides: true, noBalls: true, matchId: true }
      },
    },
  });

  console.log('mimicked API player output:', player);
}

main()
  .catch(console.error)
  .finally(() => { prisma.$disconnect(); pool.end(); });
