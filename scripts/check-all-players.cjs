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
      playerCode: true
    }
  });
  console.log(`Total players: ${players.length}`);
  console.log('Players list:', players);
}

main()
  .catch(console.error)
  .finally(() => { prisma.$disconnect(); pool.end(); });
