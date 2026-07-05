import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

async function ensureBaseEntities() {
  // 1. Create Division & City
  const division = await prisma.division.upsert({
    where: { name: 'Test Division' },
    update: {},
    create: { name: 'Test Division' },
  });

  const city = await prisma.city.upsert({
    where: { name_divisionId: { name: 'Test City', divisionId: division.id } },
    update: {},
    create: { name: 'Test City', divisionId: division.id },
  });

  // 2. Create WbtTurfs
  await prisma.wbtTurf.upsert({
    where: { id: 'dummy_wbt_turf' },
    update: { name: 'Test WBT Turf', divisionId: division.id, cityId: city.id },
    create: { id: 'dummy_wbt_turf', name: 'Test WBT Turf', divisionId: division.id, cityId: city.id },
  });

  // 3. Create Players
  await prisma.player.upsert({
    where: { id: 'dummy_player_a' },
    update: { fullName: 'Challenger Player A', email: 'player_a@test.com', walletBalance: 1000 },
    create: { id: 'dummy_player_a', fullName: 'Challenger Player A', email: 'player_a@test.com', password: 'password_hashed', walletBalance: 1000 },
  });

  await prisma.player.upsert({
    where: { id: 'dummy_player_b' },
    update: { fullName: 'Opponent Player B', email: 'player_b@test.com', walletBalance: 1000 },
    create: { id: 'dummy_player_b', fullName: 'Opponent Player B', email: 'player_b@test.com', password: 'password_hashed', walletBalance: 1000 },
  });

  for (let i = 1; i <= 4; i++) {
    await prisma.player.upsert({
      where: { id: `dummy_player_a${i}` },
      update: { fullName: `Challenger Sub ${i}`, email: `player_a${i}@test.com` },
      create: { id: `dummy_player_a${i}`, fullName: `Challenger Sub ${i}`, email: `player_a${i}@test.com`, password: 'password_hashed' },
    });

    await prisma.player.upsert({
      where: { id: `dummy_player_b${i}` },
      update: { fullName: `Opponent Sub ${i}`, email: `player_b${i}@test.com` },
      create: { id: `dummy_player_b${i}`, fullName: `Opponent Sub ${i}`, email: `player_b${i}@test.com`, password: 'password_hashed' },
    });
  }

  // 4. Create Teams
  await prisma.team.upsert({
    where: { id: 'dummy_team_a' },
    update: { name: 'Dummy Team A', ownerId: 'dummy_player_a', sportType: 'FUTSAL_5', isSubscribed: true },
    create: { id: 'dummy_team_a', name: 'Dummy Team A', ownerId: 'dummy_player_a', sportType: 'FUTSAL_5', isSubscribed: true },
  });

  await prisma.team.upsert({
    where: { id: 'dummy_team_b' },
    update: { name: 'Dummy Team B', ownerId: 'dummy_player_b', sportType: 'FUTSAL_5', isSubscribed: true },
    create: { id: 'dummy_team_b', name: 'Dummy Team B', ownerId: 'dummy_player_b', sportType: 'FUTSAL_5', isSubscribed: true },
  });

  // Create Challenge Subscriptions to satisfy Challenge Market constraints
  await prisma.challengeSubscription.upsert({
    where: { teamId: 'dummy_team_a' },
    update: { active: true },
    create: { teamId: 'dummy_team_a', active: true },
  });
  await prisma.challengeSubscription.upsert({
    where: { teamId: 'dummy_team_b' },
    update: { active: true },
    create: { teamId: 'dummy_team_b', active: true },
  });

  // 5. Add members
  await prisma.teamMember.upsert({
    where: { teamId_playerId: { teamId: 'dummy_team_a', playerId: 'dummy_player_a' } },
    update: { role: 'owner' },
    create: { teamId: 'dummy_team_a', playerId: 'dummy_player_a', role: 'owner' },
  });

  await prisma.teamMember.upsert({
    where: { teamId_playerId: { teamId: 'dummy_team_b', playerId: 'dummy_player_b' } },
    update: { role: 'owner' },
    create: { teamId: 'dummy_team_b', playerId: 'dummy_player_b', role: 'owner' },
  });

  for (let i = 1; i <= 4; i++) {
    await prisma.teamMember.upsert({
      where: { teamId_playerId: { teamId: 'dummy_team_a', playerId: `dummy_player_a${i}` } },
      update: { role: 'member' },
      create: { teamId: 'dummy_team_a', playerId: `dummy_player_a${i}`, role: 'member' },
    });

    await prisma.teamMember.upsert({
      where: { teamId_playerId: { teamId: 'dummy_team_b', playerId: `dummy_player_b${i}` } },
      update: { role: 'member' },
      create: { teamId: 'dummy_team_b', playerId: `dummy_player_b${i}`, role: 'member' },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();

    if (action === 'setup') {
      await ensureBaseEntities();

      // 6. Delete previous picks for clean test state
      await prisma.matchRosterPick.deleteMany({
        where: { matchId: 'dummy_match_id' },
      });

      // 7. Create/Reset Match
      const match = await prisma.match.upsert({
        where: { id: 'dummy_match_id' },
        update: {
          teamA_Id: 'dummy_team_a',
          teamB_Id: 'dummy_team_b',
          status: 'INTERACTION',
          formationA: null,
          formationB: null,
          rosterLockedA: false,
          rosterLockedB: false,
          venueType: null,
          venueConfirmedByB: false,
          selectedSlotId: null,
          wbtTurfId: null,
          wbtTurfName: null,
          wbtFrom: null,
          wbtTo: null,
          matchDate: null,
          bookingCode: null,
          venueBookedAt: null,
          matchStartedByA: false,
          matchStartedByB: false,
          matchEndedByA: false,
          matchEndedByB: false,
          scoreSubmittedByA: false,
          scoreSubmittedByB: false,
          agreedByA: false,
          agreedByB: false,
          scoringMode: 'LIVE',
          scoreModeAgreed: false,
          scoreModeRequestedBy: null,
          proposedSingleScorerId: null,
        },
        create: {
          id: 'dummy_match_id',
          teamA_Id: 'dummy_team_a',
          teamB_Id: 'dummy_team_b',
          status: 'INTERACTION',
          formationA: null,
          formationB: null,
          rosterLockedA: false,
          rosterLockedB: false,
          venueType: null,
          venueConfirmedByB: false,
          selectedSlotId: null,
          wbtTurfId: null,
          wbtTurfName: null,
          wbtFrom: null,
          wbtTo: null,
          matchDate: null,
          bookingCode: null,
          venueBookedAt: null,
          matchStartedByA: false,
          matchStartedByB: false,
        },
      });

      return NextResponse.json({ ok: true, matchId: match.id });
    }

    if (action === 'reset_all') {
      await ensureBaseEntities();

      // Delete any match between Dummy Team A and Dummy Team B
      await prisma.match.deleteMany({
        where: {
          OR: [
            { teamA_Id: 'dummy_team_a', teamB_Id: 'dummy_team_b' },
            { teamA_Id: 'dummy_team_b', teamB_Id: 'dummy_team_a' }
          ]
        }
      });

      return NextResponse.json({ ok: true, message: 'All test matches deleted. Teams initialized and subscribed.' });
    }

    if (action === 'login_a') {
      const res = NextResponse.json({ ok: true, player: 'dummy_player_a' });
      res.cookies.set('bmt_player_id', 'dummy_player_a', { path: '/' });
      return res;
    }

    if (action === 'login_b') {
      const res = NextResponse.json({ ok: true, player: 'dummy_player_b' });
      res.cookies.set('bmt_player_id', 'dummy_player_b', { path: '/' });
      return res;
    }

    if (action === 'logout') {
      const res = NextResponse.json({ ok: true });
      res.cookies.delete('bmt_player_id');
      return res;
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
