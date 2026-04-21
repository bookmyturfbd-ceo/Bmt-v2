import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastMatchEvent } from '@/lib/supabaseRealtime';

function pid(req: NextRequest) { return req.cookies.get('bmt_player_id')?.value ?? null; }

// POST /api/cricket/[matchId]/over/[overId]/confirm
// Both teams tap "Confirm Over". When both confirm, bowling OMC selects next bowler.
// action: 'confirm' | 'select_bowler'
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string; overId: string }> }
) {
  const { matchId, overId } = await params;
  const playerId = pid(req);
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, nextBowlerId } = body;

  const over = await prisma.cricketOver.findUnique({
    where: { id: overId },
    include: {
      innings: {
        include: {
          match: {
            include: {
              teamA: { include: { members: { select: { playerId: true, role: true } } } },
              teamB: { include: { members: { select: { playerId: true, role: true } } } },
            },
          },
          bowlingPerfs: true,
        },
      },
    },
  });
  if (!over) return NextResponse.json({ error: 'Over not found' }, { status: 404 });

  const innings = over.innings;
  const match   = innings.match;

  const battingTeam = match.teamA_Id === innings.battingTeamId ? match.teamA : match.teamB;
  const bowlingTeam = match.teamA_Id === innings.bowlingTeamId ? match.teamA : match.teamB;
  const isBatting   = battingTeam.ownerId === playerId || battingTeam.members.some(m => m.playerId === playerId);
  const isBowling   = bowlingTeam.ownerId === playerId || bowlingTeam.members.some(m => m.playerId === playerId);
  if (!isBatting && !isBowling) return NextResponse.json({ error: 'Not in match' }, { status: 403 });

  const myRole = (isBatting ? battingTeam : bowlingTeam).members.find(m => m.playerId === playerId)?.role
    ?? 'owner';
  if (!['owner', 'manager', 'captain'].includes(myRole))
    return NextResponse.json({ error: 'Only OMC can confirm over' }, { status: 403 });

  if (action === 'confirm') {
    const updateData = isBatting
      ? { confirmedByBatting: true }
      : { confirmedByBowling: true };

    const updated = await prisma.cricketOver.update({ where: { id: overId }, data: updateData });
    const bothConfirmed = updated.confirmedByBatting && updated.confirmedByBowling;

    if (bothConfirmed) {
      await prisma.cricketOver.update({ where: { id: overId }, data: { status: 'CONFIRMED' } });
      await broadcastMatchEvent(matchId, 'OVER_CONFIRMED', { over: updated, inningsId: innings.id });
    } else {
      await broadcastMatchEvent(matchId, 'OVER_CONFIRM_PARTIAL', { over: updated, inningsId: innings.id });
    }

    return NextResponse.json({ over: updated, bothConfirmed });
  }

  if (action === 'select_bowler') {
    if (!isBowling) return NextResponse.json({ error: 'Only bowling team can select next bowler' }, { status: 403 });
    if (!nextBowlerId) return NextResponse.json({ error: 'nextBowlerId required' }, { status: 400 });

    // Enforce: cannot bowl same bowler consecutive overs
    if (nextBowlerId === innings.currentBowlerId)
      return NextResponse.json({ error: 'Cannot bowl consecutive overs with the same bowler' }, { status: 400 });

    // Enforce max overs per bowler
    const sport = match.teamA.sportType;
    const maxBowlerOvers = sport === 'CRICKET_7' ? 2 : Math.ceil(((match as any).agreedOvers ?? 20) / 5);
    const bowlerPerf = innings.bowlingPerfs.find(p => p.playerId === nextBowlerId);
    const bowlerOvers = bowlerPerf ? Math.floor(bowlerPerf.legalBalls / 6) : 0;
    if (bowlerOvers >= maxBowlerOvers)
      return NextResponse.json({ error: `Bowler has reached maximum ${maxBowlerOvers} overs` }, { status: 400 });

    const nextOverNumber = over.overNumber + 1;

    // Create next over
    const nextOver = await prisma.cricketOver.create({
      data: {
        inningsId: innings.id,
        matchId,
        overNumber: nextOverNumber,
        bowlerId: nextBowlerId,
      },
    });

    // Ensure bowling performance row exists for new bowler
    await prisma.bowlingPerformance.upsert({
      where: { inningsId_playerId: { inningsId: innings.id, playerId: nextBowlerId } },
      create: { inningsId: innings.id, matchId, playerId: nextBowlerId },
      update: {},
    });

    // Update innings current bowler and over number
    await prisma.cricketInnings.update({
      where: { id: innings.id },
      data: { currentBowlerId: nextBowlerId, currentOverNumber: nextOverNumber },
    });

    await broadcastMatchEvent(matchId, 'NEXT_OVER_STARTED', {
      nextOver,
      nextBowlerId,
      overNumber: nextOverNumber,
      inningsId: innings.id,
    });

    return NextResponse.json({ nextOver });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
