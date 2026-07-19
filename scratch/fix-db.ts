import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Find all owners who are coaches
  const coachOwners = await prisma.owner.findMany({
    where: { isCoach: true },
    select: { id: true, name: true }
  });

  console.log(`Found ${coachOwners.length} coach owners.`);

  for (const owner of coachOwners) {
    const updated = await prisma.turf.updateMany({
      where: { ownerId: owner.id },
      data: { isCoachProfile: true }
    });
    console.log(`Updated ${updated.count} turf profiles for owner ${owner.name} (${owner.id}) to isCoachProfile = true.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
