const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  try {
    const iconTurfId = 'cmqj9es2b000004jl32igmnys';
    const iconOwnerId = 'cmqj8jjpj000004jpcq7g0thz';

    // 1. Find turfs to delete
    const turfsToDelete = await prisma.turf.findMany({
      where: {
        id: { not: iconTurfId }
      }
    });
    const turfIdsToDelete = turfsToDelete.map(t => t.id);

    // 2. Find owners to delete
    const ownersToDelete = await prisma.owner.findMany({
      where: {
        id: { not: iconOwnerId }
      }
    });
    const ownerIdsToDelete = ownersToDelete.map(o => o.id);

    // 3. Find monthly fees to delete
    const monthlyFeesToDelete = await prisma.monthlyFee.findMany({
      where: {
        OR: [
          { turfId: { in: turfIdsToDelete } },
          { ownerId: { in: ownerIdsToDelete } }
        ]
      }
    });
    const monthlyFeeIdsToDelete = monthlyFeesToDelete.map(f => f.id);

    console.log('--- STARTING CLEANUP ---');

    await prisma.$transaction(async (tx) => {
      // Delete monthly fees
      if (monthlyFeeIdsToDelete.length > 0) {
        const deletedFees = await tx.monthlyFee.deleteMany({
          where: {
            id: { in: monthlyFeeIdsToDelete }
          }
        });
        console.log(`Deleted ${deletedFees.count} monthly fee records.`);
      }

      // Delete turfs
      if (turfIdsToDelete.length > 0) {
        const deletedTurfs = await tx.turf.deleteMany({
          where: {
            id: { in: turfIdsToDelete }
          }
        });
        console.log(`Deleted ${deletedTurfs.count} turf records (and their cascaded slots/grounds/amenities/sports).`);
      }

      // Delete owners
      if (ownerIdsToDelete.length > 0) {
        const deletedOwners = await tx.owner.deleteMany({
          where: {
            id: { in: ownerIdsToDelete }
          }
        });
        console.log(`Deleted ${deletedOwners.count} owner records (and their cascaded payouts/ledger entries/finance locks).`);
      }

      // Delete dummy WBT turf if it exists
      const wbt = await tx.wbtTurf.findUnique({
        where: { id: 'dummy_wbt_turf' }
      });
      if (wbt) {
        await tx.wbtTurf.delete({
          where: { id: 'dummy_wbt_turf' }
        });
        console.log('Deleted dummy WBT Turf "Test WBT Turf".');
      }

      // Delete dummy WBT City if it exists
      const city = await tx.city.findUnique({
        where: { id: 'cmqdj37j20001hcn74sjsijbx' } // Test City
      });
      if (city) {
        await tx.city.delete({
          where: { id: 'cmqdj37j20001hcn74sjsijbx' }
        });
        console.log('Deleted dummy City "Test City".');
      }

      // Delete dummy WBT Division if it exists
      const division = await tx.division.findUnique({
        where: { id: 'cmqdj37bd0000hcn74as8r8xj' } // Test Division
      });
      if (division) {
        await tx.division.delete({
          where: { id: 'cmqdj37bd0000hcn74as8r8xj' }
        });
        console.log('Deleted dummy Division "Test Division".');
      }
    });

    console.log('\n--- VERIFICATION ---');
    const remainingTurfs = await prisma.turf.findMany({
      include: { owner: true }
    });
    console.log(`Remaining turfs count: ${remainingTurfs.length}`);
    for (const t of remainingTurfs) {
      console.log(`- Turf Name: "${t.name}" (ID: ${t.id}) | Owner: "${t.owner?.name}" (ID: ${t.ownerId})`);
    }

    const remainingOwners = await prisma.owner.findMany();
    console.log(`Remaining owners count: ${remainingOwners.length}`);
    for (const o of remainingOwners) {
      console.log(`- Owner Name: "${o.name}" (ID: ${o.id})`);
    }

    const remainingWbtTurfs = await prisma.wbtTurf.findMany();
    console.log(`Remaining WBT turfs count: ${remainingWbtTurfs.length}`);
    for (const w of remainingWbtTurfs) {
      console.log(`- WBT Turf Name: "${w.name}" (ID: ${w.id})`);
    }

    console.log('\nCleanup completed successfully!');

  } catch (err) {
    console.error('Error during cleanup:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
