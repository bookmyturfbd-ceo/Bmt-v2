/**
 * Rise & Rule Futsal Cup 2026 — One-Time Database Setup Script
 * 
 * This script:
 * 1. Finds (or creates) 12 placeholder teams using the exact names from the tournament poster
 * 2. Registers them in the tournament
 * 3. Creates 4 groups (A, B, C, D) and assigns teams
 * 4. Creates 12 group-stage matches with correct pairings and scheduled times
 * 5. Locks the format config
 * 6. Updates tournament status to ACTIVE
 * 
 * "Linkage" strategy: Teams are created as real Team records with the exact names.
 * When captains later create their team with the same name, the API returns a "team already exists"
 * error. We'll add a separate linking mechanism so captains can claim ownership of their placeholder team.
 * 
 * For now, we use a system/placeholder player as the owner (first organizer account or a dummy player).
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TOURNAMENT_ID = 'cmqhqix0k000004lefnfrikp6';

// All 12 teams from the poster
const TEAMS = {
  GROUP_A: ['Zerox FC', 'FC Blackouts', 'Royal Unit'],
  GROUP_B: ['Kishwan FC', 'Cranioclasts FC', 'Savar CF'],
  GROUP_C: ['FC Carnival', 'Shanta Morium 1', 'Fire Warriors FC'],
  GROUP_D: ['Hell Hounds', 'Team Azimpur Sports Club', 'Shanta Morium 2'],
};

// Fixtures from the poster (match number → [Team Name A, Team Name B])
const FIXTURES = [
  // Group A
  [1, 'Zerox FC', 'FC Blackouts'],
  [2, 'Zerox FC', 'Royal Unit'],
  [3, 'FC Blackouts', 'Royal Unit'],
  // Group B
  [4, 'Kishwan FC', 'Cranioclasts FC'],
  [5, 'Kishwan FC', 'Savar CF'],
  [6, 'Cranioclasts FC', 'Savar CF'],
  // Group C
  [7, 'FC Carnival', 'Shanta Morium 1'],
  [8, 'FC Carnival', 'Fire Warriors FC'],
  [9, 'Shanta Morium 1', 'Fire Warriors FC'],
  // Group D
  [10, 'Hell Hounds', 'Team Azimpur Sports Club'],
  [11, 'Hell Hounds', 'Shanta Morium 2'],
  [12, 'Team Azimpur Sports Club', 'Shanta Morium 2'],
];

// Match schedule — today's date will be used, times from poster
// Using the date of the tournament event (adjust if needed)
// Times: 3:00 PM, 3:15 PM, 3:30 PM, 3:45 PM, 4:00 PM, 4:15 PM, 4:30 PM, 4:45 PM, 5:00 PM, 5:15 PM, 5:30 PM, 5:45 PM
// These are the START times for each match (in Bangladesh timezone UTC+6)
const MATCH_TIMES = [
  '15:00', '15:15', '15:30', '15:45',
  '16:00', '16:15', '16:30', '16:45',
  '17:00', '17:15', '17:30', '17:45',
];

// We'll parse the tournament's startDate to get the event date
// If not set, we'll use today

async function main() {
  console.log('🏆 Rise & Rule Futsal Cup 2026 — Setup Script');
  console.log('================================================\n');

  // ── 1. Fetch the tournament ──────────────────────────────────────────────────
  const tournament = await prisma.tournament.findUnique({
    where: { id: TOURNAMENT_ID },
    include: {
      registrations: true,
      groups: true,
      matches: true,
    }
  });

  if (!tournament) {
    console.error('❌ Tournament not found!');
    return;
  }

  console.log(`✅ Found: "${tournament.name}" (${tournament.status})`);
  console.log(`   Format: ${tournament.formatType}, Max: ${tournament.maxParticipants}`);
  console.log(`   Registrations: ${tournament.registrations.length}, Groups: ${tournament.groups.length}, Matches: ${tournament.matches.length}`);

  // Guard — don't re-run if already has matches
  if (tournament.matches.length >= 12) {
    console.log('\n⚠️  Tournament already has matches. Aborting to avoid duplicates.');
    console.log('   Delete all matches, groups, and registrations first if you want to re-run.');
    return;
  }

  // ── 2. Find a placeholder owner player (first player in DB) ─────────────────
  const placeholderOwner = await prisma.player.findFirst({
    orderBy: { joinedAt: 'asc' },
    select: { id: true, fullName: true }
  });

  if (!placeholderOwner) {
    console.error('❌ No players found in database. Create at least one player first.');
    return;
  }

  console.log(`\n📦 Using placeholder owner: ${placeholderOwner.fullName} (${placeholderOwner.id})`);

  // ── 3. Find or create the 12 teams ──────────────────────────────────────────
  console.log('\n👥 Creating/finding placeholder teams...');
  const teamIdMap = {}; // name → team.id

  const allTeamNames = Object.values(TEAMS).flat();

  for (const teamName of allTeamNames) {
    // Check if team already exists
    let team = await prisma.team.findFirst({ where: { name: teamName } });

    if (team) {
      console.log(`   ✓ Found existing: ${teamName} (${team.id})`);
    } else {
      // Create a placeholder team
      team = await prisma.team.create({
        data: {
          name: teamName,
          sportType: 'FOOTBALL',
          ownerId: placeholderOwner.id,
          teamType: 'TOURNAMENT',
          footballMmr: 1000,
          cricketMmr: 1000,
        }
      });
      console.log(`   ✨ Created: ${teamName} (${team.id})`);
    }

    teamIdMap[teamName] = team.id;
  }

  // ── 4. Register all teams in the tournament ──────────────────────────────────
  console.log('\n📋 Registering teams...');

  for (const teamName of allTeamNames) {
    const teamId = teamIdMap[teamName];
    
    // Check if already registered
    const existing = await prisma.tournamentRegistration.findFirst({
      where: { tournamentId: TOURNAMENT_ID, entityId: teamId }
    });

    if (existing) {
      console.log(`   ✓ Already registered: ${teamName}`);
    } else {
      await prisma.tournamentRegistration.create({
        data: {
          tournamentId: TOURNAMENT_ID,
          entityType: 'TEAM',
          entityId: teamId,
          status: 'APPROVED',
          entryFeePaid: true,
        }
      });
      console.log(`   ✨ Registered: ${teamName}`);
    }
  }

  // ── 5. Create 4 groups ───────────────────────────────────────────────────────
  console.log('\n🏷️  Creating groups...');
  const groupIdMap = {}; // 'GROUP_A' → group.id

  for (const [groupKey, teamNames] of Object.entries(TEAMS)) {
    const groupLabel = groupKey.replace('_', ' '); // 'GROUP A', 'GROUP B', etc.
    
    // Check if group already exists
    let group = tournament.groups.find(g => g.name === groupLabel);

    if (group) {
      console.log(`   ✓ Found existing: ${groupLabel}`);
    } else {
      const teamIds = teamNames.map(n => teamIdMap[n]);
      group = await prisma.tournamentGroup.create({
        data: {
          tournamentId: TOURNAMENT_ID,
          name: groupLabel,
          teamIds: teamIds,
        }
      });
      console.log(`   ✨ Created: ${groupLabel} → [${teamNames.join(', ')}]`);
    }

    groupIdMap[groupKey] = group.id;
  }

  // ── 6. Create standings entries (0-0 starting) ───────────────────────────────
  console.log('\n📊 Creating initial standings...');

  for (const [groupKey, teamNames] of Object.entries(TEAMS)) {
    const groupId = groupIdMap[groupKey];

    for (const teamName of teamNames) {
      const teamId = teamIdMap[teamName];
      
      const existing = await prisma.tournamentStanding.findFirst({
        where: { tournamentId: TOURNAMENT_ID, groupId, teamId }
      });

      if (existing) {
        console.log(`   ✓ Existing standing: ${teamName}`);
      } else {
        await prisma.tournamentStanding.create({
          data: {
            tournamentId: TOURNAMENT_ID,
            groupId,
            teamId,
            played: 0, won: 0, lost: 0, drawn: 0, points: 0,
            goalDifference: 0, goalsScored: 0, goalsConceded: 0,
            position: 0,
          }
        });
        console.log(`   ✨ Standing: ${teamName}`);
      }
    }
  }

  // ── 7. Determine event date from tournament.startDate ───────────────────────
  let eventDate = tournament.startDate ? new Date(tournament.startDate) : new Date();
  // Normalize to Bangladesh timezone (UTC+6) — we store UTC in DB, so subtract 6h
  // The poster shows times like 3:00 PM BDT = 09:00 UTC
  console.log(`\n📅 Event date: ${eventDate.toISOString().split('T')[0]}`);

  // ── 8. Create group stage matches ────────────────────────────────────────────
  console.log('\n⚽ Creating group stage matches...');

  // Figure out which group each team belongs to
  const teamGroupMap = {}; // teamName → groupKey
  for (const [groupKey, teamNames] of Object.entries(TEAMS)) {
    for (const teamName of teamNames) {
      teamGroupMap[teamName] = groupKey;
    }
  }

  for (const [matchNumber, teamAName, teamBName] of FIXTURES) {
    const teamAId = teamIdMap[teamAName];
    const teamBId = teamIdMap[teamBName];
    const groupKey = teamGroupMap[teamAName];
    const groupId = groupIdMap[groupKey];

    // Check if match already exists
    const existingMatch = await prisma.tournamentMatch.findFirst({
      where: { tournamentId: TOURNAMENT_ID, matchNumber }
    });

    if (existingMatch) {
      console.log(`   ✓ Match ${matchNumber} already exists`);
      continue;
    }

    // Calculate scheduled time
    const timeStr = MATCH_TIMES[matchNumber - 1]; // e.g. "15:00"
    const [hour, minute] = timeStr.split(':').map(Number);
    
    // Event date at the given time in BDT (UTC+6)
    const scheduledAt = new Date(eventDate);
    scheduledAt.setUTCHours(hour - 6, minute, 0, 0); // Convert BDT to UTC

    await prisma.tournamentMatch.create({
      data: {
        tournamentId: TOURNAMENT_ID,
        groupId,
        stage: 'GROUP',
        matchNumber,
        teamAId,
        teamBId,
        scheduledAt,
        status: 'SCHEDULED',
        venue: tournament.venue || null,
      }
    });

    console.log(`   ✨ Match ${matchNumber}: ${teamAName} vs ${teamBName} @ ${timeStr} BDT`);
  }

  // ── 9. Lock format config and update tournament status ───────────────────────
  console.log('\n🔒 Locking format config and activating tournament...');

  await prisma.tournament.update({
    where: { id: TOURNAMENT_ID },
    data: {
      status: 'ACTIVE',
      formatConfigLocked: true,
      groupCount: 4,
      teamsPerGroup: 3,
      qualifyPerGroup: 2, // top 2 from each group → 8 teams in QF
    }
  });

  console.log('   ✅ Tournament status → ACTIVE, format locked');

  // ── 10. Summary ──────────────────────────────────────────────────────────────
  console.log('\n🎉 Setup Complete!');
  console.log('==================');
  console.log('Teams created/found:', Object.keys(teamIdMap).length);
  console.log('Groups created:', Object.keys(groupIdMap).length);
  console.log('Matches scheduled: 12');
  console.log('\nTeam IDs (for reference):');
  for (const [name, id] of Object.entries(teamIdMap)) {
    console.log(`  ${name}: ${id}`);
  }

  console.log('\n📝 Next step: When captains create their team with the matching name,');
  console.log('   use the "claim team" mechanism to transfer ownership to them.');
}

main().catch(e => {
  console.error('❌ Error:', e.message);
  console.error(e);
}).finally(() => prisma.$disconnect());
