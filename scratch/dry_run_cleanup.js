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
    console.log(`Turfs to delete (${turfsToDelete.length}):`);
    for (const t of turfsToDelete) {
      console.log(`- "${t.name}" (ID: ${t.id})`);
    }

    const turfIdsToDelete = turfsToDelete.map(t => t.id);

    // 2. Find owners to delete
    const ownersToDelete = await prisma.owner.findMany({
      where: {
        id: { not: iconOwnerId }
      }
    });
    console.log(`\nOwners to delete (${ownersToDelete.length}):`);
    for (const o of ownersToDelete) {
      console.log(`- "${o.name}" (ID: ${o.id}, Email: ${o.email})`);
    }

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
    console.log(`\nMonthly fees to delete (${monthlyFeesToDelete.length}):`);
    for (const f of monthlyFeesToDelete) {
      console.log(`- ID: ${f.id}, Turf: "${f.turfName}", Owner: "${f.ownerName}"`);
    }

    // 4. Test run in transaction (roll back at the end)
    console.log('\n--- DRY RUN DELETION (inside transaction with rollback) ---');
    
    // We will use raw SQL or prisma commands inside a transaction
    await prisma.$transaction(async (tx) => {
      // Delete monthly fees
      if (monthlyFeesToDelete.length > 0) {
        const deletedFees = await tx.monthlyFee.deleteMany({
          where: {
            id: { in: monthlyFeesToDelete.map(f => f.id) }
          }
        });
        console.log(`[Dry Run] Deleted ${deletedFees.count} monthly fee records.`);
      }

      // Delete turfs
      if (turfIdsToDelete.length > 0) {
        const deletedTurfs = await tx.turf.deleteMany({
          where: {
            id: { in: turfIdsToDelete }
          }
        });
        console.log(`[Dry Run] Deleted ${deletedTurfs.count} turf records.`);
      }

      // Delete owners
      if (ownerIdsToDelete.length > 0) {
        const deletedOwners = await tx.owner.deleteMany({
          where: {
            id: { in: ownerIdsToDelete }
          }
        });
        console.log(`[Dry Run] Deleted ${deletedOwners.count} owner records.`);
      }

      console.log('Transaction succeeded without errors! Rolling back to keep database clean for now.');
      throw new Error('ROLLBACK_TRIGGER');
    }).catch(err => {
      if (err.message === 'ROLLBACK_TRIGGER') {
        console.log('Dry run successfully rolled back. Database is untouched.');
      } else {
        console.error('Dry run failed with error:', err);
      }
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
