const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const dhakaDivisionId = 'cmnvygv5n0001ichwldhw49hj';

  // 1. Check or create Basundhara city
  let basundhara = await prisma.city.findFirst({
    where: {
      name: { equals: 'Basundhara', mode: 'insensitive' },
      divisionId: dhakaDivisionId
    }
  });

  if (!basundhara) {
    console.log('Basundhara city does not exist. Creating it...');
    basundhara = await prisma.city.create({
      data: {
        name: 'Basundhara',
        divisionId: dhakaDivisionId
      }
    });
    console.log('Created city:', basundhara);
  } else {
    console.log('Basundhara city already exists:', basundhara);
  }

  // 2. Check or create Jaff WbtTurf
  let jaff = await prisma.wbtTurf.findFirst({
    where: {
      name: { equals: 'Jaff', mode: 'insensitive' },
      cityId: basundhara.id
    }
  });

  if (!jaff) {
    console.log('Jaff WBT turf does not exist. Creating it...');
    jaff = await prisma.wbtTurf.create({
      data: {
        name: 'Jaff',
        cityId: basundhara.id,
        divisionId: dhakaDivisionId
      }
    });
    console.log('Created WBT Turf:', jaff);
  } else {
    console.log('Jaff WBT turf already exists:', jaff);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
