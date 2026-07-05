require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Check PlayerMatchStat columns via raw SQL
  const cols = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'player_match_stats'
    ORDER BY ordinal_position
  `;
  console.log('\n=== PlayerMatchStat columns ===');
  console.log(cols.map(c => `  ${c.column_name}: ${c.data_type}`).join('\n'));

  // Also check TournamentMatch columns for scoring
  const tmCols = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'tournament_matches'
    ORDER BY ordinal_position
  `;
  console.log('\n=== TournamentMatch columns ===');
  console.log(tmCols.map(c => `  ${c.column_name}: ${c.data_type}`).join('\n'));

  // Check FC Blackouts
  const fcb = await prisma.team.findUnique({
    where: { id: 'cmqgtnmnk00000bgizo30fu6m' },
    select: { id: true, name: true, teamType: true, ownerId: true, _count: { select: { members: true } } }
  });
  console.log('\n=== FC Blackouts ===', fcb);
}

main().catch(e => console.error('ERR:', e.message)).finally(() => prisma.$disconnect());
