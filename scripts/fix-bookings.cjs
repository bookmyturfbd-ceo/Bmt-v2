// Fix existing bookings that have ownerShare=0 and bmtCut=0 by recalculating from turf revenue model
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const bookings = await prisma.booking.findMany({
    where: { ownerShare: 0, price: { gt: 0 } },
    select: { id: true, turfId: true, price: true }
  });

  console.log(`Found ${bookings.length} booking(s) to fix.`);

  for (const b of bookings) {
    const turf = await prisma.turf.findUnique({
      where: { id: b.turfId },
      select: { revenueModelType: true, revenueModelValue: true, ownerId: true }
    });

    let bmtCut = 0;
    let ownerShare = b.price;

    if (turf?.revenueModelType === 'percentage' && turf.revenueModelValue) {
      bmtCut = Math.round(b.price * turf.revenueModelValue / 100);
      ownerShare = b.price - bmtCut;
    }

    await prisma.booking.update({
      where: { id: b.id },
      data: { ownerShare, bmtCut }
    });

    // Update owner wallet
    if (ownerShare > 0 && turf?.ownerId) {
      await prisma.owner.update({
        where: { id: turf.ownerId },
        data: { walletBalance: { increment: ownerShare } }
      });
    }

    console.log(`Fixed booking ${b.id}: price=${b.price}, ownerShare=${ownerShare}, bmtCut=${bmtCut}`);
  }

  console.log('\n✅ Done fixing bookings.');
}

main()
  .catch(console.error)
  .finally(() => { prisma.$disconnect(); pool.end(); });
