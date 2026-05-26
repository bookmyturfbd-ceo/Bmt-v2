const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const players = await prisma.player.findMany({
    where: {
      fullName: { contains: 'test player 1', mode: 'insensitive' }
    }
  });
  console.log('Found players:', players);
}

main()
  .catch(console.error)
  .finally(() => { prisma.$disconnect(); pool.end(); });
