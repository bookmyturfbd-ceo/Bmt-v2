import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastMatchEvent } from '@/lib/supabaseRealtime';

function pid(req: NextRequest) { return req.cookies.get('bmt_player_id')?.value ?? null; }

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string; inningsId: string }> }
) {
  try {
    const { matchId, inningsId } = await params;
    const playerId = pid(req);
    if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      deliveryType,   // 'LEGAL' | 'WIDE' | 'NO_BALL'
    runs,           // total runs on delivery
    isWicket,
    dismissalType,
    dismissedPlayerId,
    fielderId,
    bowlerCredited, // false for run outs off no ball etc.
    isBye,
    isLegBye,
    nextBatsmanId   // Batting Team assigns this instantly on [WICKET]
  } = body;

  const innings = await prisma.cricketInnings.findUnique({
    where: { id: inningsId },
    include: {
      match: {
        include: {
          teamA: { include: { members: { select: { playerId: true, role: true } } } },
          teamB: { include: { members: { select: { playerId: true, role: true } } } },
        },
      },
      overs: { orderBy: { overNumber: 'desc' }, take: 1 },
      deliveries: { orderBy: { deliverySequence: 'desc' }, take: 1 },
    },
  });
  if (!innings) return NextResponse.json({ error: 'Innings not found' }, { status: 404 });
  if (innings.status !== 'IN_PROGRESS') return NextResponse.json({ error: 'Innings not in progress' }, { status: 400 });

  const match = innings.match;

  const battingTeam = match.teamA_Id === innings.battingTeamId ? match.teamA : match.teamB;
  const isBattingMember = battingTeam.ownerId === playerId || battingTeam.members.some(m => m.playerId === playerId);
  if (!isBattingMember) return NextResponse.json({ error: 'Only batting team can submit deliveries (Maker-Checker)' }, { status: 403 });

  const currentOver = innings.overs[0];
  if (!currentOver) return NextResponse.json({ error: 'No active over' }, { status: 400 });

  const lastDelivery = innings.deliveries[0];
  const deliverySequence = lastDelivery ? lastDelivery.deliverySequence + 1 : 1;

  const isLegal = deliveryType === 'LEGAL';
  const legalBallNumber = isLegal ? currentOver.legalBalls + 1 : currentOver.legalBalls;
  const isFreeHit = lastDelivery?.deliveryType === 'NO_BALL' && lastDelivery.status === 'CONFIRMED';

  const isWide = deliveryType === 'WIDE';
  const isNoBall = deliveryType === 'NO_BALL';
  const isByeRuns = isBye || isLegBye;
  const totalRunsParam = runs ?? 0;
  const batterCanScore = !isWide && !isByeRuns;
  
  const strikerRuns = batterCanScore ? totalRunsParam : 0;
  const nonStrikerRuns = 0; 
  const physicalRuns = strikerRuns + nonStrikerRuns;

  const teamRunsIncrement = (isWide ? 1 : 0) + (isNoBall ? 1 : 0) + totalRunsParam;
  const extrasIncrement = (isWide ? 1 + totalRunsParam : 0) + (isNoBall ? 1 + (isByeRuns ? totalRunsParam : 0) : 0) + (isLegal && isByeRuns ? totalRunsParam : 0);
  const bowlerRunsIncrement = (isLegal && isByeRuns) ? 0 : teamRunsIncrement;

  // Wait! If it is a WICKET, we must tag it as PENDING natively so it locks the screen for Bowling confirmation
  // UPDATE: User requested to remove bowling confirmation. All deliveries auto-confirm.
  const finalStatus = 'CONFIRMED';

  let activeStrikerId = innings.currentStrikerId;
  let activeNonStrikerId = innings.currentNonStrikerId;

  // --- SELF HEALING LOGIC ---
  if (!activeStrikerId || !activeNonStrikerId) {
    const unbatted = battingTeam.members.filter((m: any) => {
      const perf = innings.battingPerfs?.find((p: any) => p.playerId === m.playerId);
      return !perf || (!perf.hasBatted && !perf.isOut);
    });
    if (!activeStrikerId && unbatted.length > 0) {
      activeStrikerId = unbatted[0].playerId;
      unbatted.shift();
    }
    if (!activeNonStrikerId && unbatted.length > 0) {
      activeNonStrikerId = unbatted[0].playerId;
    }
  }

  // --- ENSURE BATTING PERFORMANCE ROWS EXIST ---
  for (const pid of [activeStrikerId, activeNonStrikerId]) {
    if (pid) {
      await prisma.battingPerformance.upsert({
        where: { inningsId_playerId: { inningsId, playerId: pid } },
        create: { inningsId, matchId, playerId: pid, battingPosition: 999, hasBatted: true },
        update: { hasBatted: true },
      });
    }
  }

  // 1. Create Delivery
  const delivery = await prisma.cricketDelivery.create({
    data: {
      inningsId, matchId, overId: currentOver.id, overNumber: currentOver.overNumber,
      ballNumber: isLegal ? legalBallNumber : currentOver.legalBalls,
      deliverySequence, bowlerId: innings.currentBowlerId!, strikerId: activeStrikerId!, nonStrikerId: activeNonStrikerId!,
      deliveryType, runs: totalRunsParam, strikerRuns, nonStrikerRuns, isWicket: isWicket ?? false,
      dismissalType: isWicket ? dismissalType : undefined, dismissedPlayerId: isWicket ? dismissedPlayerId : undefined,
      fielderId: fielderId ?? undefined, bowlerCredited: bowlerCredited ?? true, isBye: isBye ?? false, isLegBye: isLegBye ?? false,
      isFreeHit: isFreeHit ?? false, status: finalStatus, submittedByPlayerId: playerId, confirmedByPlayerId: playerId,
    },
  });

  // 2. Execute Math instantly for all deliveries!
  await prisma.cricketOver.update({
    where: { id: currentOver.id },
    data: { runs: { increment: teamRunsIncrement }, wides: { increment: isWide ? 1 : 0 }, noBalls: { increment: isNoBall ? 1 : 0 }, legalBalls: { increment: isLegal ? 1 : 0 }, wickets: { increment: isWicket ? 1 : 0 } }
  });

  if (strikerRuns > 0 || (isLegal && !isWide)) {
    await prisma.battingPerformance.updateMany({
      where: { inningsId: innings.id, playerId: delivery.strikerId },
      data: { runs: { increment: strikerRuns }, ballsFaced: { increment: (isLegal && !isWide) ? 1 : 0 }, fours: { increment: strikerRuns === 4 ? 1 : 0 }, sixes: { increment: strikerRuns === 6 ? 1 : 0 }, hasBatted: true }
    });
  }

  if (delivery.bowlerCredited || bowlerRunsIncrement > 0 || isLegal) {
    await prisma.bowlingPerformance.updateMany({
      where: { inningsId: innings.id, playerId: delivery.bowlerId },
      data: { runs: { increment: bowlerRunsIncrement }, wides: { increment: isWide ? 1 : 0 }, noBalls: { increment: isNoBall ? 1 : 0 }, legalBalls: { increment: isLegal ? 1 : 0 }, wickets: { increment: (isWicket && bowlerCredited) ? 1 : 0 } }
    });
  }

  let inningsUpdate: Record<string, any> = { totalRuns: { increment: teamRunsIncrement }, extras: { increment: extrasIncrement }, wides: { increment: isWide ? 1 : 0 }, noBalls: { increment: isNoBall ? 1 : 0 } };

  if (isWicket && dismissedPlayerId) {
    await prisma.battingPerformance.updateMany({
      where: { inningsId: innings.id, playerId: dismissedPlayerId },
      data: { isOut: true, notOut: false, dismissalType: dismissalType ?? undefined, dismissedByBowlerId: bowlerCredited ? delivery.bowlerId : undefined, dismissedByFielderId: fielderId ?? undefined }
    });
    inningsUpdate.totalWickets = { increment: 1 };
  }

  let newStrikerId = activeStrikerId;
  let newNonStrikerId = activeNonStrikerId;

  // Strike rotation calculation
  const isCaught = isWicket && dismissalType === 'CAUGHT';
  const strikersSwap = (physicalRuns % 2 === 1);

  if (isCaught) {
    if (dismissedPlayerId === activeStrikerId) {
        newStrikerId = nextBatsmanId ?? null;
    } else {
        newNonStrikerId = nextBatsmanId ?? null; 
        [newStrikerId, newNonStrikerId] = [newNonStrikerId, newStrikerId];
    }
  } else if (isWicket && dismissedPlayerId === activeStrikerId) {
    newStrikerId = nextBatsmanId ?? null;
    if (strikersSwap) [newStrikerId, newNonStrikerId] = [newNonStrikerId, newStrikerId];
  } else if (isWicket && dismissedPlayerId === activeNonStrikerId) {
    newNonStrikerId = nextBatsmanId ?? null;
    if (strikersSwap) [newStrikerId, newNonStrikerId] = [newNonStrikerId, newStrikerId];
  } else if (strikersSwap) {
    [newStrikerId, newNonStrikerId] = [newNonStrikerId, newStrikerId];
  }

  const overComplete = (isLegal ? currentOver.legalBalls + 1 : currentOver.legalBalls) >= 6;
  let finalOverData = currentOver as any;

  if (overComplete) {
    [newStrikerId, newNonStrikerId] = [newNonStrikerId, newStrikerId];
    const totalLegalBalls = await prisma.cricketDelivery.count({ where: { inningsId: innings.id, deliveryType: 'LEGAL', status: 'CONFIRMED' } }) + 1;
    inningsUpdate.totalOvers = Math.floor(totalLegalBalls / 6) + (totalLegalBalls % 6) / 10;
    inningsUpdate.currentBowlerId = null; 

    finalOverData = await prisma.cricketOver.update({
      where: { id: currentOver.id },
      data: { status: 'CONFIRMED', confirmedByBatting: true, confirmedByBowling: true }
    });
  }

  inningsUpdate.currentStrikerId = newStrikerId;
  inningsUpdate.currentNonStrikerId = newNonStrikerId;

  const updatedInnings = await prisma.cricketInnings.update({ where: { id: innings.id }, data: inningsUpdate });
  const agreedOvers = (match as any).agreedOvers ?? (match.teamA.sportType === 'CRICKET_7' ? 7 : 20);
  
  // 1. All Out Check
  const maxWickets = match.teamA.sportType === 'CRICKET_7' ? 6 : 10;
  const isAllOut = updatedInnings.totalWickets >= maxWickets;

  // 2. Super Over Limits
  const isSuperOver = innings.inningsNumber === 3 || innings.inningsNumber === 4;
  const isSuperOverAllOut = isSuperOver && updatedInnings.totalWickets >= 2;
  const oversLimit = isSuperOver ? 1 : agreedOvers;
  const oversFinished = Math.floor(updatedInnings.totalOvers) >= oversLimit;

  // 3. Target Reached Check
  let isTargetReached = false;
  if (innings.inningsNumber === 2) {
    const firstInnings = await prisma.cricketInnings.findFirst({ where: { matchId, inningsNumber: 1 } });
    if (firstInnings && updatedInnings.totalRuns > firstInnings.totalRuns) isTargetReached = true;
  } else if (innings.inningsNumber === 4) {
    const thirdInnings = await prisma.cricketInnings.findFirst({ where: { matchId, inningsNumber: 3 } });
    if (thirdInnings && updatedInnings.totalRuns > thirdInnings.totalRuns) isTargetReached = true;
  }

  const inningsOver = oversFinished || isAllOut || isSuperOverAllOut || isTargetReached;

  if (inningsOver) {
    await prisma.cricketInnings.update({ where: { id: innings.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
  }

  const broadcastPayload = { delivery, innings: updatedInnings, overComplete, over: finalOverData, inningsOver };
  await broadcastMatchEvent(matchId, 'DELIVERY_CONFIRMED', broadcastPayload);
  if (overComplete) await broadcastMatchEvent(matchId, 'OVER_COMPLETE', broadcastPayload);
  if (inningsOver) await broadcastMatchEvent(matchId, 'INNINGS_COMPLETE', broadcastPayload);

  return NextResponse.json({ delivery, innings: updatedInnings, overComplete, inningsOver });
  } catch (error: any) {
    const fs = require('fs');
    fs.appendFileSync('c:/BMT-V2/error_log.txt', new Date().toISOString() + ' ' + (error.stack || error.message) + '\\n');
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
