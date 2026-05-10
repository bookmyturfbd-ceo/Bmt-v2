const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'v1@bmt.com';

  const player = await prisma.player.findUnique({ where: { email } });
  if (player) {
    console.log('Found as PLAYER:', { id: player.id, name: player.fullName, email: player.email, hash: player.password });
    return;
  }

  const owner = await prisma.owner.findUnique({ where: { email } });
  if (owner) {
    console.log('Found as OWNER:', { id: owner.id, name: owner.name, email: owner.email, hash: owner.password });
    return;
  }

  console.log('No user found with email:', email);
}

main()
  .catch(console.error)
  .finally(() => { prisma.$disconnect(); pool.end(); });
