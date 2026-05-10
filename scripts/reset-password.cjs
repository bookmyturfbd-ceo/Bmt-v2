const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'v1@bmt.com';
  const newPassword = '12345678';
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.owner.update({ where: { email }, data: { password: hash } });
  console.log(`✅ Password for ${email} reset to: ${newPassword}`);
}

main()
  .catch(console.error)
  .finally(() => { prisma.$disconnect(); pool.end(); });
