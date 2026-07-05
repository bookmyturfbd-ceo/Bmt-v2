const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  try {
    const models = [
      'player', 'owner', 'turf', 'ground', 'slot', 'booking',
      'shopProduct', 'shopCategory', 'shopCarouselSlide', 'bannerSlide',
      'team', 'match', 'shopOrder'
    ];
    for (const model of models) {
      try {
        const count = await prisma[model].count();
        console.log(`${model}: ${count} rows`);
      } catch (err) {
        console.log(`${model}: Error (${err.message})`);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
