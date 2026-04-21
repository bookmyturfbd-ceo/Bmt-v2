import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastMatchEvent } from '@/lib/supabaseRealtime';

function pid(req: NextRequest) { return req.cookies.get('bmt_player_id')?.value ?? null; }

// POST /api/cricket/[matchId]/innings
// Starts a new innings. Requires batting order + opening bowler.
// Batting OMC submits battingOrder, bowling OMC submits openingBowlerId.
// Both must submit before innings begins.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const playerId = pid(req);
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  // battingOrder: [{ playerId, position }]
  // openingBowlerId: string
  // inningsNumber: 1 | 2
  // action: 'submit_batting_order' | 'submit_opening_bowler' | 'confirm_ready'
  const { action, battingOrder, openingBowlerId, inningsNumber = 1, currentStrikerId, currentNonStrikerId } = body;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      teamA: { include: { members: { select: { playerId: true, role: true } } } },
      teamB: { include: { members: { select: { playerId: true, role: true } } } },
      cricketToss: true,
      cricketInnings: { orderBy: { inningsNumber: 'asc' } },
    },
  });
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  if (match.status !== 'LIVE') return NextResponse.json({ error: 'Match not live' }, { status: 400 });
  if (!match.cricketToss?.confirmedAt) return NextResponse.json({ error: 'Toss not confirmed' }, { status: 400 });

  const isA = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
  const isB = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);
  if (!isA && !isB) return NextResponse.json({ error: 'Not in match' }, { status: 403 });

  const myTeam   = isA ? match.teamA : match.teamB;
  const myTeamId = isA ? match.teamA_Id : match.teamB_Id;
  const myRole   = myTeam.members.find(m => m.playerId === playerId)?.role
    ?? (myTeam.ownerId === playerId ? 'owner' : 'member');
  if (!['owner', 'manager', 'captain'].includes(myRole))
    return NextResponse.json({ error: 'Only OMC can set up innings' }, { status: 403 });

  // Determine batting/bowling teams from toss
  const toss = match.cricketToss;
  
  // Find currently pending innings, or use provided inningsNumber
  let pendingInnings = match.cricketInnings.find(i => i.status === 'PENDING');
  const activeInningsNum = pendingInnings ? pendingInnings.inningsNumber : (match.cricketInnings.filter(i => i.status === 'COMPLETED' || i.status === 'SIGNED_OFF').length === 1 ? 2 : 1);

  let battingTeamId: string, bowlingTeamId: string;
  if (activeInningsNum === 1) {
    const tossWinnerBats = toss.electedTo === 'BAT';
    battingTeamId  = tossWinnerBats ? toss.winnerTeamId : (toss.winnerTeamId === match.teamA_Id ? match.teamB_Id : match.teamA_Id);
    bowlingTeamId  = tossWinnerBats ? (toss.winnerTeamId === match.teamA_Id ? match.teamB_Id : match.teamA_Id) : toss.winnerTeamId;
  } else {
    // Second innings — roles flip
    const firstInnings = match.cricketInnings.find(i => i.inningsNumber === 1);
    if (!firstInnings) return NextResponse.json({ error: 'First innings not found' }, { status: 400 });
    battingTeamId = firstInnings.bowlingTeamId;
    bowlingTeamId = firstInnings.battingTeamId;
  }

  const isBattingOMC = myTeamId === battingTeamId;
  const isBowlingOMC = myTeamId === bowlingTeamId;

  // Find or create innings record
  let innings = match.cricketInnings.find(i => i.inningsNumber === activeInningsNum);

  const attemptAutoStart = async (currentInnings: any) => {
    if (!currentInnings.battingOrder || (currentInnings.battingOrder as any[]).length === 0) return null;
    if (!currentInnings.openingBowlerId) return null;

    const agreOvers = (match as any).agreedOvers ?? (match.teamA.sportType === 'CRICKET_7' ? 7 : 20);

    const firstOver = await prisma.cricketOver.create({
      data: { inningsId: currentInnings.id, matchId, overNumber: 1, bowlerId: currentInnings.openingBowlerId },
    });

    const updatedInnings = await prisma.cricketInnings.update({
      where: { id: currentInnings.id },
      data: { status: 'IN_PROGRESS', startedAt: new Date(), currentOverNumber: 1 },
    });

    await prisma.bowlingPerformance.upsert({
      where: { inningsId_playerId: { inningsId: currentInnings.id, playerId: currentInnings.openingBowlerId } },
      create: { inningsId: currentInnings.id, matchId, playerId: currentInnings.openingBowlerId },
      update: {},
    });

    await broadcastMatchEvent(matchId, 'INNINGS_STARTED', { innings: updatedInnings, firstOver, agreedOvers: agreOvers });
    return updatedInnings;
  };

  if (action === 'submit_batting_order') {
    if (!isBattingOMC) return NextResponse.json({ error: 'Only batting team OMC can submit batting order' }, { status: 403 });
    if (!Array.isArray(battingOrder) || battingOrder.length === 0)
      return NextResponse.json({ error: 'battingOrder required' }, { status: 400 });

    if (!innings) {
      innings = await prisma.cricketInnings.create({
        data: {
          matchId,
          inningsNumber,
          battingTeamId,
          bowlingTeamId,
          battingOrder: battingOrder,
          currentStrikerId: currentStrikerId ?? battingOrder[0]?.playerId,
          currentNonStrikerId: currentNonStrikerId ?? battingOrder[1]?.playerId,
        },
      });
    } else {
      innings = await prisma.cricketInnings.update({
        where: { id: innings.id },
        data: {
          battingOrder: battingOrder,
          currentStrikerId: currentStrikerId ?? battingOrder[0]?.playerId,
          currentNonStrikerId: currentNonStrikerId ?? battingOrder[1]?.playerId,
        },
      });
    }

    for (const { playerId: bpId, position } of battingOrder) {
      await prisma.battingPerformance.upsert({
        where: { inningsId_playerId: { inningsId: innings.id, playerId: bpId } },
        create: { inningsId: innings.id, matchId, playerId: bpId, battingPosition: position },
        update: { battingPosition: position },
      });
    }

    await broadcastMatchEvent(matchId, 'BATTING_ORDER_SUBMITTED', { innings, battingOrder });
    await attemptAutoStart(innings);
    return NextResponse.json({ innings });
  }

  if (action === 'submit_opening_bowler') {
    if (!isBowlingOMC) return NextResponse.json({ error: 'Only bowling team OMC can select opening bowler' }, { status: 403 });
    if (!openingBowlerId) return NextResponse.json({ error: 'openingBowlerId required' }, { status: 400 });

    if (!innings) {
      innings = await prisma.cricketInnings.create({
        data: { matchId, inningsNumber, battingTeamId, bowlingTeamId, openingBowlerId, currentBowlerId: openingBowlerId },
      });
    } else {
      innings = await prisma.cricketInnings.update({
        where: { id: innings.id },
        data: { openingBowlerId, currentBowlerId: openingBowlerId },
      });
    }

    await broadcastMatchEvent(matchId, 'OPENING_BOWLER_SELECTED', { innings, openingBowlerId });
    await attemptAutoStart(innings);
    return NextResponse.json({ innings });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
