const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env' });
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting Local Tournament Setup...');
  
  // 1. Find or create the organizer
  let organizer = await prisma.organizer.findUnique({
    where: { email: 'safftayef6@gmail.com' }
  });

  if (!organizer) {
    console.log('Creating organizer safftayef6@gmail.com...');
    const hashedPassword = await bcrypt.hash('test1234', 10);
    organizer = await prisma.organizer.create({
      data: {
        name: 'Saff Tayef',
        email: 'safftayef6@gmail.com',
        phone: '01711223344',
        password: hashedPassword,
        isVerified: true
      }
    });
  }

  // 2. Clean up any existing "Local Test Futsal Championship" to make this repeatable
  const existing = await prisma.tournament.findMany({
    where: { name: 'Local Test Futsal Championship' }
  });

  for (const t of existing) {
    console.log(`Deleting old tournament instance: ${t.id}...`);
    // Delete registrations, groups, matches, standings first
    await prisma.tournamentMatch.deleteMany({ where: { tournamentId: t.id } });
    await prisma.tournamentStanding.deleteMany({ where: { tournamentId: t.id } });
    await prisma.tournamentGroup.deleteMany({ where: { tournamentId: t.id } });
    await prisma.tournamentRegistration.deleteMany({ where: { tournamentId: t.id } });
    await prisma.tournament.delete({ where: { id: t.id } });
  }

  // 3. Create a new tournament
  console.log('Creating new GROUP_KNOCKOUT tournament...');
  const tournament = await prisma.tournament.create({
    data: {
      name: 'Local Test Futsal Championship',
      operatorId: organizer.id,
      operatorType: 'ORGANIZER',
      sport: 'FOOTBALL',
      registrationType: 'TEAM',
      maxParticipants: 12,
      entryFee: 0,
      prizePoolTotal: 5000,
      formatType: 'GROUP_KNOCKOUT',
      groupCount: 4,
      teamsPerGroup: 3,
      qualifyPerGroup: 2,
      mmrEnabled: false,
      status: 'DRAFT',
      isRegistrationOpen: true,
      formatConfig: {
        numberOfGroups: '4',
        teamsPerGroup: '3',
        teamsAdvancePerGroup: '2',
        sportVariant: 'FUTSAL'
      }
    }
  });

  console.log(`Tournament created successfully with ID: ${tournament.id}`);

  // 4. Create 12 mock teams with 5 mock players each
  console.log('Creating 12 mock teams and registering them...');
  const passwordHash = await bcrypt.hash('test1234', 10);
  const teamIds = [];

  for (let s = 1; s <= 12; s++) {
    const uniqueId = `t${s}_` + Math.random().toString(36).substring(2, 5);
    
    // Create 5 mock players for this team
    const mockPlayers = [];
    for (let i = 1; i <= 5; i++) {
      const player = await prisma.player.create({
        data: {
          fullName: `Player ${s}_${i}`,
          email: `player.${uniqueId}.${i}@bmt.test`,
          phone: `01799000${s}${i}`,
          password: passwordHash,
          footballMmr: 1000,
          cricketMmr: 1000,
          level: 1,
        },
      });
      mockPlayers.push(player);
    }

    const ownerPlayer = mockPlayers[0];
    
    // Create team
    const team = await prisma.team.create({
      data: {
        name: `Local Futsal Club ${s} (${uniqueId.toUpperCase()})`,
        sportType: 'FUTSAL',
        ownerId: ownerPlayer.id,
        footballMmr: 1000,
        cricketMmr: 1000,
        level: 1,
      },
    });
    teamIds.push(team.id);

    // Link members
    await prisma.teamMember.createMany({
      data: mockPlayers.map((p, idx) => ({
        teamId: team.id,
        playerId: p.id,
        role: idx === 0 ? 'owner' : 'member',
        sportRole: 'PLAYER',
        isStarter: true,
      })),
    });

    // Register team to tournament
    await prisma.tournamentRegistration.create({
      data: {
        tournamentId: tournament.id,
        entityType: 'TEAM',
        entityId: team.id,
        status: 'APPROVED',
        entryFeePaid: true,
      },
    });
  }

  console.log('12 teams registered and approved.');

  // 5. Update tournament status to DRAFTING
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { status: 'DRAFTING' }
  });

  // 6. Draw groups A, B, C, D (3 teams each)
  console.log('Drawing groups...');
  const alphabet = 'ABCD';
  const newGroups = [];
  
  for (let i = 0; i < 4; i++) {
    const gid = `${tournament.id}_g_${alphabet[i]}`;
    newGroups.push(await prisma.tournamentGroup.create({
      data: {
        id: gid,
        tournamentId: tournament.id,
        name: `Group ${alphabet[i]}`,
        teamIds: []
      }
    }));
  }

  // Shuffle teams randomly
  for (let i = teamIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [teamIds[i], teamIds[j]] = [teamIds[j], teamIds[i]];
  }

  // Distribute teams evenly into 4 groups of 3
  const assignedTeamsMap = {};
  for (let i = 0; i < 4; i++) {
    assignedTeamsMap[newGroups[i].id] = [];
  }
  for (let i = 0; i < teamIds.length; i++) {
    const groupIndex = i % 4;
    const gid = newGroups[groupIndex].id;
    assignedTeamsMap[gid].push(teamIds[i]);
  }

  // Update groups and standings
  for (const [gid, tIds] of Object.entries(assignedTeamsMap)) {
    await prisma.tournamentGroup.update({
      where: { id: gid },
      data: { teamIds: tIds }
    });

    for (let idx = 0; idx < tIds.length; idx++) {
      await prisma.tournamentStanding.create({
        data: {
          tournamentId: tournament.id,
          groupId: gid,
          teamId: tIds[idx],
          position: idx + 1,
          played: 0,
          won: 0,
          lost: 0,
          drawn: 0,
          noResult: 0,
          points: 0
        }
      });
    }
  }

  console.log('Groups and standings created.');

  // 7. Generate round-robin group fixtures
  console.log('Generating round-robin group fixtures...');
  const finalGroups = await prisma.tournamentGroup.findMany({
    where: { tournamentId: tournament.id }
  });

  const slots = generateGroupFixtures(finalGroups);

  // Insert matches to database
  for (const slot of slots) {
    await prisma.tournamentMatch.create({
      data: {
        tournamentId: tournament.id,
        groupId: slot.groupId,
        stage: 'GROUP',
        matchNumber: slot.matchNumber,
        teamAId: slot.teamAId,
        teamBId: slot.teamBId,
        status: 'SCHEDULED'
      }
    });
  }

  console.log(`${slots.length} matches scheduled.`);

  // 8. Activate tournament
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { status: 'ACTIVE' }
  });

  console.log('Tournament is now ACTIVE and ready to play!');
  console.log(`View it here: http://localhost:3000/en/organizer/tournaments/${tournament.id}`);
}

function generateGroupFixtures(groups) {
  const fixtures = [];
  let matchNumber = 1;
  const groupsMatchesByRound = {};
  let maxRounds = 0;

  for (const group of groups) {
    const teams = [...group.teamIds];
    if (teams.length % 2 !== 0) teams.push('BYE');
    const n = teams.length;
    const rounds = n - 1;
    if (rounds > maxRounds) maxRounds = rounds;

    const roundList = [];
    for (let round = 0; round < rounds; round++) {
      const roundMatches = [];
      for (let i = 0; i < n / 2; i++) {
        const home = teams[i];
        const away = teams[n - 1 - i];
        if (home === 'BYE' || away === 'BYE') continue;
        roundMatches.push({
          matchNumber: 0,
          stage: 'GROUP',
          teamAId: home,
          teamBId: away,
          groupId: group.id,
        });
      }
      roundList.push(roundMatches);
      const last = teams.pop();
      teams.splice(1, 0, last);
    }
    groupsMatchesByRound[group.id] = roundList;
  }

  for (let r = 0; r < maxRounds; r++) {
    for (const group of groups) {
      const roundList = groupsMatchesByRound[group.id];
      if (roundList && roundList[r]) {
        for (const match of roundList[r]) {
          fixtures.push({
            ...match,
            matchNumber: matchNumber++,
          });
        }
      }
    }
  }
  return fixtures;
}

main()
  .catch(e => {
    console.error('Error setting up tournament:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
