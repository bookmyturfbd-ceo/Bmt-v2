require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const tournaments = await prisma.tournament.findMany({
    select: {
      id: true,
      name: true,
      status: true,
      formatType: true,
      maxParticipants: true,
      sport: true,
      createdAt: true,
      _count: { select: { registrations: true, groups: true, matches: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log('All Tournaments:');
  tournaments.forEach(t => {
    console.log(`\n  ID: ${t.id}`);
    console.log(`  Name: ${t.name}`);
    console.log(`  Status: ${t.status}`);
    console.log(`  Format: ${t.formatType} | Sport: ${t.sport} | Max: ${t.maxParticipants}`);
    console.log(`  Regs: ${t._count.registrations} | Groups: ${t._count.groups} | Matches: ${t._count.matches}`);
    console.log(`  Created: ${t.createdAt.toISOString()}`);
  });
}

main().catch(e => console.error('ERR:', e.message)).finally(() => prisma.$disconnect());
