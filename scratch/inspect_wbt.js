const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const turfs = await prisma.wbtTurf.findMany({
    include: {
      city: true,
      division: true
    }
  });

  const cities = await prisma.city.findMany({});

  const divisions = await prisma.division.findMany({
    where: {
      name: { contains: 'Dhaka', mode: 'insensitive' }
    }
  });

  console.log('--- WBT TURFS ---');
  console.log(JSON.stringify(turfs, null, 2));

  console.log('--- CITIES ---');
  console.log(JSON.stringify(cities, null, 2));

  console.log('--- DIVISIONS ---');
  console.log(JSON.stringify(divisions, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
