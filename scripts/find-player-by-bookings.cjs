const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const players = await prisma.player.findMany({
    select: {
      id: true,
      fullName: true,
      email: true,
      walletBalance: true,
      avatarUrl: true,
      playerCode: true,
      bookings: {
        select: { id: true }
      }
    }
  });

  const matching = players.filter(p => p.bookings.length === 22);
  console.log(`Found ${matching.length} players with 22 bookings:`);
  for (const m of matching) {
    console.log({
      id: m.id,
      fullName: m.fullName,
      email: m.email,
      walletBalance: m.walletBalance,
      avatarUrl: m.avatarUrl,
      playerCode: m.playerCode,
      bookingsCount: m.bookings.length
    });
  }
}

main()
  .catch(console.error)
  .finally(() => { prisma.$disconnect(); pool.end(); });
