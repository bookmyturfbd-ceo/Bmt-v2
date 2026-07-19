const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const teams = await prisma.team.findMany({
    where: {
      name: { in: ['Kishwan FC', 'Zerox FC', 'Royal Unit'] }
    },
    include: {
      members: {
        include: {
          player: {
            select: { id: true, fullName: true }
          }
        }
      },
      owner: {
        select: { id: true, fullName: true }
      }
    }
  });

  console.log(JSON.stringify(teams, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
