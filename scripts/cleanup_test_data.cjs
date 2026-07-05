require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TEST_TOURNAMENT_ID = 'cmqklecn70000p0n70p1ju4gp';

// Teams that belong ONLY to the test tournament (not Rise & Rule)
// These are teams we created purely for the test tournament — we need to find them
// by their registration in the test tournament only

async function main() {
  console.log('🧹 Cleanup Script\n==================\n');

  // 1. Find all registrations in the test tournament
  const testRegs = await prisma.tournamentRegistration.findMany({
    where: { tournamentId: TEST_TOURNAMENT_ID },
    select: { entityId: true, entityType: true }
  });

  const testTeamIds = testRegs
    .filter(r => r.entityType === 'TEAM')
    .map(r => r.entityId);

  console.log(`Found ${testTeamIds.length} team registrations in test tournament`);

  // 2. Find which of those teams are ALSO registered in Rise & Rule
  const riseRuleRegs = await prisma.tournamentRegistration.findMany({
    where: {
      tournamentId: 'cmqhqix0k000004lefnfrikp6',
      entityId: { in: testTeamIds }
    },
    select: { entityId: true }
  });
  const riseRuleTeamIds = new Set(riseRuleRegs.map(r => r.entityId));

  // 3. Teams that are ONLY in the test tournament (not in Rise & Rule) → delete
  const teamsToDelete = testTeamIds.filter(id => !riseRuleTeamIds.has(id));
  console.log(`Teams only in test tournament (safe to delete): ${teamsToDelete.length}`);

  // 4. Delete test tournament data (cascading order)
  console.log('\n🗑️  Deleting test tournament data...');

  // Delete standings
  const ds = await prisma.tournamentStanding.deleteMany({ where: { tournamentId: TEST_TOURNAMENT_ID } });
  console.log(`  ✅ Deleted ${ds.count} standings`);

  // Delete matches
  const dm = await prisma.tournamentMatch.deleteMany({ where: { tournamentId: TEST_TOURNAMENT_ID } });
  console.log(`  ✅ Deleted ${dm.count} matches`);

  // Delete groups
  const dg = await prisma.tournamentGroup.deleteMany({ where: { tournamentId: TEST_TOURNAMENT_ID } });
  console.log(`  ✅ Deleted ${dg.count} groups`);

  // Delete registrations
  const dr = await prisma.tournamentRegistration.deleteMany({ where: { tournamentId: TEST_TOURNAMENT_ID } });
  console.log(`  ✅ Deleted ${dr.count} registrations`);

  // Delete tournament itself
  await prisma.tournament.delete({ where: { id: TEST_TOURNAMENT_ID } });
  console.log('  ✅ Deleted test tournament');

  // 5. Delete teams that were ONLY in the test tournament
  if (teamsToDelete.length > 0) {
    for (const teamId of teamsToDelete) {
      // Delete team members first
      await prisma.teamMember.deleteMany({ where: { teamId } });
      // Delete team
      const t = await prisma.team.delete({ where: { id: teamId } }).catch(() => null);
      if (t) console.log(`  🗑️  Deleted team: ${t.name}`);
    }
  }

  // 6. Summary: Rise & Rule tournament state
  const riseRule = await prisma.tournament.findUnique({
    where: { id: 'cmqhqix0k000004lefnfrikp6' },
    select: {
      name: true, status: true,
      _count: { select: { registrations: true, groups: true, matches: true } }
    }
  });
  console.log('\n📊 Rise & Rule Tournament (KEPT):');
  console.log(`  Name: ${riseRule?.name}`);
  console.log(`  Status: ${riseRule?.status}`);
  console.log(`  Registrations: ${riseRule?._count.registrations}`);
  console.log(`  Groups: ${riseRule?._count.groups}`);
  console.log(`  Matches: ${riseRule?._count.matches}`);

  console.log('\n✅ Cleanup complete!');
}

main().catch(e => { console.error('ERR:', e.message); process.exit(1); }).finally(() => prisma.$disconnect());
