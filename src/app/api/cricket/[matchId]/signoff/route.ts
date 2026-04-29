import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastMatchEvent } from '@/lib/supabaseRealtime';
import { calcTeamMMR, calcPlayerBaseMMR } from '@/lib/mmrCalculator';

function pid(req: NextRequest) { return req.cookies.get('bmt_player_id')?.value ?? null; }

// POST /api/cricket/[matchId]/signoff
// Final match sign-off after both innings complete.
// Triggers base Team MMR (+80/-40) AND base Player MMR (+70/-40) for all rostered players.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const playerId = pid(req);
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      teamA: { include: { members: { select: { playerId: true, role: true } } } },
      teamB: { include: { members: { select: { playerId: true, role: true } } } },
      cricketInnings: { orderBy: { inningsNumber: 'asc' } },
      rosterPicks: true,
    },
  });
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  if (match.status === 'COMPLETED') return NextResponse.json({ error: 'Match already completed' }, { status: 400 });

  const isA = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
  const isB = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);
  if (!isA && !isB) return NextResponse.json({ error: 'Not in match' }, { status: 403 });

  const myTeam   = isA ? match.teamA : match.teamB;
  const myTeamId = isA ? match.teamA_Id : match.teamB_Id;
  const myRole   = myTeam.members.find(m => m.playerId === playerId)?.role
    ?? (myTeam.ownerId === playerId ? 'owner' : 'member');
  if (!['owner', 'manager', 'captain'].includes(myRole))
    return NextResponse.json({ error: 'Only OMC can sign off' }, { status: 403 });

  // Both innings must be signed off
  const innings = match.cricketInnings;
  if (innings.length < 2 || innings.some(i => i.status !== 'SIGNED_OFF'))
    return NextResponse.json({ error: 'Both innings must be signed off first' }, { status: 400 });

  await prisma.cricketMatchSignOff.create({
    data: { matchId, teamId: myTeamId, type: 'MATCH' },
  });

  const allSignOffs = await prisma.cricketMatchSignOff.findMany({
    where: { matchId, type: 'MATCH' },
  });

  const signedA = allSignOffs.some(s => s.teamId === match.teamA_Id);
  const signedB = allSignOffs.some(s => s.teamId === match.teamB_Id);
  const bothSigned = signedA && signedB;

  if (!bothSigned) {
    await broadcastMatchEvent(matchId, 'MATCH_SIGNOFF_PARTIAL', { myTeamId });
    return NextResponse.json({ ok: true, bothSigned: false });
  }

  // ── Determine winner ────────────────────────────────────────────────────────
  const innings1 = innings.find(i => i.inningsNumber === 1)!;
  const innings2 = innings.find(i => i.inningsNumber === 2)!;
  let target = innings1.totalRuns + 1;

  let winnerId: string | null = null;
  let victoryString = '';

  if (innings.length >= 4) {
    const innings3 = innings.find(i => i.inningsNumber === 3)!;
    const innings4 = innings.find(i => i.inningsNumber === 4)!;
    if (innings4.totalRuns > innings3.totalRuns) {
      winnerId = innings4.battingTeamId;
      victoryString = `${winnerId === match.teamA_Id ? match.teamA.name : match.teamB.name} won the Super Over`;
    } else if (innings3.totalRuns > innings4.totalRuns) {
      winnerId = innings3.battingTeamId;
      victoryString = `${winnerId === match.teamA_Id ? match.teamA.name : match.teamB.name} won the Super Over`;
    } else {
      winnerId = null;
      victoryString = 'Super Over Tied';
    }
  } else {
    if (innings2.totalRuns >= target) {
      winnerId = innings2.battingTeamId;
      const maxWickets = match.teamA.sportType === 'CRICKET_7' ? 6 : 10;
      const wicketsWonBy = maxWickets - innings2.totalWickets;
      victoryString = `${winnerId === match.teamA_Id ? match.teamA.name : match.teamB.name} won by ${Math.max(1, wicketsWonBy)} Wickets`;
    } else if (innings2.totalRuns === target - 1) {
      winnerId = null;
      victoryString = 'Match Tied';
    } else {
      winnerId = innings1.battingTeamId;
      const runsWonBy = innings1.totalRuns - innings2.totalRuns;
      victoryString = `${winnerId === match.teamA_Id ? match.teamA.name : match.teamB.name} won by ${runsWonBy} Runs`;
    }
  }

  const scoreA = innings.reduce((s: number, i: any) => i.battingTeamId === match.teamA_Id ? s + i.totalRuns : s, 0);
  const scoreB = innings.reduce((s: number, i: any) => i.battingTeamId === match.teamB_Id ? s + i.totalRuns : s, 0);

  // ── MMR calculation ─────────────────────────────────────────────────────────
  const sportType = match.teamA.sportType as any;
  const { mmrChangeA, mmrChangeB, mmrField } = calcTeamMMR(match.teamA_Id, match.teamB_Id, winnerId, sportType);

  // Gather rostered players and apply base player MMR
  const rosterMemberIds = match.rosterPicks.map(r => r.memberId);
  const rosterMembers = await prisma.teamMember.findMany({
    where: { id: { in: rosterMemberIds } },
    select: { playerId: true, teamId: true },
  });

  const playerBaseResults = calcPlayerBaseMMR(
    rosterMembers.map(m => ({ playerId: m.playerId, teamId: m.teamId })),
    winnerId,
    sportType,
  );

  const statUpserts = rosterMembers.map(m => prisma.playerMatchStat.upsert({
    where: { matchId_playerId: { matchId, playerId: m.playerId } },
    create: {
      matchId,
      playerId: m.playerId,
      teamId: m.teamId,
      mmrChange: playerBaseResults.find(r => r.playerId === m.playerId)?.mmrChange ?? 0,
    },
    update: {
      mmrChange: playerBaseResults.find(r => r.playerId === m.playerId)?.mmrChange ?? 0,
    },
  }));

  const playerMmrUpdates = playerBaseResults.map(r =>
    prisma.player.update({
      where: { id: r.playerId },
      data: {
        [r.mmrField]: { increment: r.mmrChange },
        mmr           : { increment: r.mmrChange },
      },
    })
  );

  await prisma.$transaction([
    prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'COMPLETED',
        winnerId,
        scoreA, scoreB,
        runsA: scoreA, runsB: scoreB,
        mmrChangeA, mmrChangeB,
        finalOutcome: 'agreed',
      },
    }),
    prisma.team.update({ where: { id: match.teamA_Id }, data: { [mmrField]: { increment: mmrChangeA }, teamMmr: { increment: mmrChangeA } } }),
    prisma.team.update({ where: { id: match.teamB_Id }, data: { [mmrField]: { increment: mmrChangeB }, teamMmr: { increment: mmrChangeB } } }),
    ...statUpserts,
    ...playerMmrUpdates,
  ]);

  await broadcastMatchEvent(matchId, 'MATCH_COMPLETE', {
    winnerId, scoreA, scoreB, mmrChangeA, mmrChangeB,
    playerResults: playerBaseResults,
    innings1Runs: innings1.totalRuns,
    innings2Runs: innings2.totalRuns,
    target, victoryString
  });

  return NextResponse.json({
    ok: true, bothSigned: true,
    winnerId, scoreA, scoreB, mmrChangeA, mmrChangeB,
    playerResults: playerBaseResults, victoryString
  });
}
