const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Check all turfs + their revenue model values
  const turfs = await prisma.turf.findMany({
    select: { id: true, name: true, status: true, revenueModelType: true, revenueModelValue: true }
  });
  console.log('\n=== TURFS ===');
  console.log(JSON.stringify(turfs, null, 2));

  // Check latest bookings
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, turfId: true, date: true, price: true, ownerShare: true, bmtCut: true, createdAt: true }
  });
  console.log('\n=== LATEST BOOKINGS ===');
  console.log(JSON.stringify(bookings, null, 2));

  // Check owner wallets
  const owners = await prisma.owner.findMany({
    select: { id: true, name: true, email: true, walletBalance: true }
  });
  console.log('\n=== OWNERS WALLET ===');
  console.log(JSON.stringify(owners, null, 2));
}

main()
  .catch(console.error)
  .finally(() => { prisma.$disconnect(); pool.end(); });
