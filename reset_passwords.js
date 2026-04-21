const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.bvimgjnauzbpauyhjrky:K5rjyAdPVredMI76@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = '$2b$10$Jl8a0Gvzd7NOVjWu7I/3dOJBJYeNcvC/NoDnT9g/htnKCzWvL0aaK'; // bcrypt hash for "12345678"
  try {
    const p = await prisma.player.updateMany({ data: { password: hash } });
    const o = await prisma.owner.updateMany({ data: { password: hash } });
    const a = await prisma.bmtAdmin.updateMany({ data: { password: hash } });
    console.log(`Players updated: ${p.count}, Owners updated: ${o.count}, Admins updated: ${a.count}`);
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
