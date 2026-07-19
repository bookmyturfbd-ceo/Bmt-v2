import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(process.cwd(), '.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const owners = await prisma.owner.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      isCoach: true,
      turfs: {
        select: {
          id: true,
          name: true,
          isCoachProfile: true,
        }
      }
    }
  });
  console.log("ALL OWNERS AND THEIR TURFS:");
  console.log(JSON.stringify(owners, null, 2));
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
