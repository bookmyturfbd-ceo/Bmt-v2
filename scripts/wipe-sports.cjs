// One-time wipe script for old sports
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const deleted = await prisma.sport.deleteMany({});
  console.log(`Deleted ${deleted.count} sport(s).`);
}

main()
  .catch(console.error)
  .finally(() => { prisma.$disconnect(); pool.end(); });
