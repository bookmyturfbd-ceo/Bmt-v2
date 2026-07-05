// scripts/rise_rule_setup.mjs
// Check current tournament state for Rise & Rule Futsal Cup 2026
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TOURNAMENT_ID = 'cmqklecn70000p0n70p1ju4gp';

async function main() {
  const t = await prisma.tournament.findUnique({
    where: { id: TOURNAMENT_ID },
    include: {
      registrations: true,
      groups: true,
      matches: { take: 5 },
    },
  });

  if (!t) {
    console.log('Tournament not found!');
    return;
  }

  console.log('=== Tournament State ===');
  console.log('ID:', t.id);
  console.log('Name:', t.name);
  console.log('Status:', t.status);
  console.log('Format:', t.formatType);
  console.log('Max Participants:', t.maxParticipants);
  console.log('Registration Type:', t.registrationType);
  console.log('Sport:', t.sport);
  console.log('Group Count:', t.groupCount);
  console.log('Teams Per Group:', t.teamsPerGroup);
  console.log('Qualify Per Group:', t.qualifyPerGroup);
  console.log('Registrations:', t.registrations.length);
  console.log('Groups:', t.groups.length);
  console.log('Matches (first 5):', t.matches.length);
  
  if (t.registrations.length > 0) {
    console.log('\nExisting registrations:');
    t.registrations.forEach(r => {
      console.log(' -', r.entityType, r.entityId, r.status);
    });
  }
  
  if (t.groups.length > 0) {
    console.log('\nExisting groups:');
    t.groups.forEach(g => {
      console.log(' -', g.name, 'teams:', g.teamIds);
    });
  }
  
  // Check for dummy owner player - we need a player to be owner of placeholder teams
  const anyPlayer = await prisma.player.findFirst({ select: { id: true, fullName: true } });
  console.log('\nFirst player (for team owner):', anyPlayer);
}

main().catch(console.error).finally(() => prisma.$disconnect());
