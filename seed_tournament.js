/**
 * seed_tournament.js
 *
 * Creates a complete, ready-to-test tournament with:
 *  - 1 Test Organizer (email: organizer@bmt.test / pass: test1234)
 *  - 1 KNOCKOUT Football Tournament (8 teams, free entry)
 *  - 8 real Teams from your DB (or fake ones if you don't have enough)
 *  - All 7 matches generated (quarter x4, semi x2, final x1)
 *  - 1 Scorer token for match 1 (so you can test the scorer UI)
 *  - 1 Auction-enabled cricket tournament (player pool from Player table)
 *
 * Usage:
 *   node seed_tournament.js
 *
 * Safe to run multiple times — uses unique names with timestamps.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function log(msg) { console.log(`\n  ${msg}`); }
function ok(msg)  { console.log(`  ✅  ${msg}`); }
function info(msg){ console.log(`  ℹ️   ${msg}`); }

async function main() {
  const ts = Date.now().toString().slice(-6);
  console.log('\n🏆  BMT Tournament Engine Seed Script');
  console.log('════════════════════════════════════\n');

  // ─── 1. Organizer ────────────────────────────────────────────────────────

  log('Creating test organizer...');
  const hashedPw = await bcrypt.hash('test1234', 10);
  const organizer = await prisma.organizer.upsert({
    where: { email: 'organizer@bmt.test' },
    create: {
      name: 'Test Organizer',
      email: 'organizer@bmt.test',
      password: hashedPw,
      isVerified: true,
      wallet: { create: { balance: 5000 } }
    },
    update: { isVerified: true }
  });
  ok(`Organizer: organizer@bmt.test / test1234 (id: ${organizer.id})`);

  // ─── 2. Fetch real teams from DB ─────────────────────────────────────────

  log('Fetching teams...');
  const realTeams = await prisma.team.findMany({ take: 8, select: { id: true, name: true } });
  info(`Found ${realTeams.length} real teams in DB`);

  // Pad with fake team IDs if needed
  const fakeTeamBase = 'fake-team-seed';
  const teams = [...realTeams];
  while (teams.length < 8) {
    teams.push({ id: `${fakeTeamBase}-${teams.length + 1}`, name: `Ghost Team ${teams.length + 1}` });
  }
  teams.forEach((t, i) => info(`  ${i + 1}. ${t.name} (${t.id.slice(0, 12)}...)`));

  // ─── 3. Football Knockout Tournament (MAIN TEST) ──────────────────────────

  log(`Creating Football Knockout tournament "BMT Test Cup #${ts}"...`);
  const tournament = await prisma.tournament.create({
    data: {
      name: `BMT Test Cup #${ts}`,
      description: 'Auto-generated seed tournament for testing the Tournament Engine.',
      sport: 'FOOTBALL',
      formatType: 'KNOCKOUT',
      status: 'REGISTRATION_OPEN',
      registrationType: 'TEAM',
      maxParticipants: 8,
      entryFee: 0,
      prizePoolTotal: 10000,
      mmrMultiplier: 1.5,
      operatorType: 'ORGANIZER',
      organizer: { connect: { id: organizer.id } },
      auctionEnabled: false,
    }
  });
  ok(`Tournament created: "${tournament.name}" (id: ${tournament.id})`);

  // ─── 4. Register teams ────────────────────────────────────────────────────

  log('Registering 8 teams...');
  for (const team of teams) {
    await prisma.tournamentRegistration.upsert({
      where: { tournamentId_entityId: { tournamentId: tournament.id, entityId: team.id } },
      create: {
        tournamentId: tournament.id,
        entityId: team.id,
        entityType: 'TEAM',
        status: 'APPROVED',
        entryFeePaid: true
      },
      update: { status: 'APPROVED' }
    });
  }
  ok('All 8 teams registered and approved');

  // ─── 5. Generate Knockout Fixtures ────────────────────────────────────────

  log('Generating knockout fixtures...');
  // 8-team bracket: QF1-4, SF1-2, F1
  const stages = [
    { stage: 'QUARTER', pairs: [[0,1],[2,3],[4,5],[6,7]] },
    { stage: 'SEMI',    pairs: [['TBD','TBD'],['TBD','TBD']] },
    { stage: 'FINAL',   pairs: [['TBD','TBD']] },
  ];

  let matchNum = 1;
  const createdMatches = [];

  for (const { stage, pairs } of stages) {
    for (const [a, b] of pairs) {
      const teamAId = typeof a === 'number' ? teams[a].id : 'TBD';
      const teamBId = typeof b === 'number' ? teams[b].id : 'TBD';
      const m = await prisma.tournamentMatch.create({
        data: {
          tournamentId: tournament.id,
          stage,
          matchNumber: matchNum++,
          teamAId,
          teamBId,
          status: 'SCHEDULED'
        }
      });
      createdMatches.push(m);
      info(`  Match ${m.matchNumber}: ${teamAId.slice(0,8)} vs ${teamBId.slice(0,8)} [${stage}]`);
    }
  }
  ok(`${createdMatches.length} matches created`);

  // ─── 6. Activate tournament ───────────────────────────────────────────────

  log('Activating tournament...');
  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { status: 'ACTIVE' }
  });
  ok('Tournament is now ACTIVE');

  // ─── 7. Generate a Scorer Token for Match 1 ──────────────────────────────

  log('Creating scorer token for Match 1 (QF1)...');
  const firstMatch = createdMatches[0];
  const token = crypto.randomBytes(24).toString('hex');
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  await prisma.tournamentMatch.update({
    where: { id: firstMatch.id },
    data: {
      status: 'SCORER_ASSIGNED',
      scorerToken: {
        create: {
          token,
          expiresAt: expiry
        }
      }
    }
  });

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  ok(`Scorer URL (copy and open in browser):`);
  console.log(`\n     👉  ${baseUrl}/en/score/${token}\n`);

  // ─── 8. Auction-Enabled Cricket Tournament ────────────────────────────────

  log('Creating Cricket Auction Tournament...');
  const cricketTournament = await prisma.tournament.create({
    data: {
      name: `BMT Auction Test #${ts}`,
      description: 'Auction-enabled tournament. Players are auctioned to team captains.',
      sport: 'CRICKET',
      formatType: 'LEAGUE',
      status: 'REGISTRATION_OPEN',
      registrationType: 'PLAYER',
      maxParticipants: 30,
      entryFee: 0,
      prizePoolTotal: 5000,
      mmrEnabled: false,
      operatorType: 'ORGANIZER',
      organizer: { connect: { id: organizer.id } },
      auctionEnabled: true,
    }
  });
  ok(`Cricket tournament: "${cricketTournament.name}" (id: ${cricketTournament.id})`);

  // Register some players for the auction
  log('Fetching players for auction pool...');
  const players = await prisma.player.findMany({ take: 12, select: { id: true, fullName: true } });
  info(`Found ${players.length} players`);
  for (const p of players) {
    await prisma.tournamentRegistration.upsert({
      where: { tournamentId_entityId: { tournamentId: cricketTournament.id, entityId: p.id } },
      create: {
        tournamentId: cricketTournament.id,
        entityId: p.id,
        entityType: 'PLAYER',
        status: 'PENDING'
      },
      update: {}
    });
  }
  if (players.length > 0) ok(`${players.length} players registered in auction pool`);

  // Create the auction room
  log('Creating auction room...');
  const auctionRoom = await prisma.auctionRoom.upsert({
    where: { tournamentId: cricketTournament.id },
    create: {
      tournamentId: cricketTournament.id,
      bidTimerSeconds: 30,
      status: 'WAITING'
    },
    update: {}
  });
  ok(`Auction room ready (id: ${auctionRoom.id})`);

  // ─── SUMMARY ─────────────────────────────────────────────────────────────

  console.log('\n════════════════════════════════════');
  console.log('🎉  Seed complete! Here\'s what you can test:\n');
  console.log('  📋  MAIN TOURNAMENT (Football Knockout):');
  console.log(`       Public:    ${baseUrl}/en/tournaments/${tournament.id}`);
  console.log(`       Organizer: ${baseUrl}/en/organizer/tournaments/${tournament.id}`);
  console.log(`       Admin:     ${baseUrl}/en/admin  → Tournament Engine\n`);
  console.log('  🏏  AUCTION TOURNAMENT (Cricket):');
  console.log(`       Public:    ${baseUrl}/en/tournaments/${cricketTournament.id}`);
  console.log(`       Auction:   ${baseUrl}/en/auction/${cricketTournament.id}\n`);
  console.log('  🎯  SCORER TEST URL (Match 1 — copy into mobile browser):');
  console.log(`       ${baseUrl}/en/score/${token}\n`);
  console.log('  🔐  ORGANIZER LOGIN:');
  console.log('       Email:  organizer@bmt.test');
  console.log('       Pass:   test1234');
  console.log('       URL:    ' + baseUrl + '/en/organizer/login\n');
  console.log('════════════════════════════════════\n');
}

main()
  .catch(e => { console.error('\n❌ Seed failed:\n', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
