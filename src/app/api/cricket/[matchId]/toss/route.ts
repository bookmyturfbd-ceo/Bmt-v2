import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastMatchEvent } from '@/lib/supabaseRealtime';

function pid(req: NextRequest) { return req.cookies.get('bmt_player_id')?.value ?? null; }

// POST /api/cricket/[matchId]/toss
// Body: { winnerTeamId, electedTo: 'BAT' | 'BOWL' }
// Action: confirm (both teams confirm the toss result)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const playerId = pid(req);
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, winnerTeamId, electedTo } = body;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      teamA: { include: { members: { select: { playerId: true, role: true } } } },
      teamB: { include: { members: { select: { playerId: true, role: true } } } },
      cricketToss: true,
    },
  });
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  if (match.status !== 'LIVE') return NextResponse.json({ error: 'Match not live' }, { status: 400 });

  const isA = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
  const isB = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);
  if (!isA && !isB) return NextResponse.json({ error: 'Not in match' }, { status: 403 });

  const myTeam = isA ? match.teamA : match.teamB;
  const myRole = myTeam.members.find(m => m.playerId === playerId)?.role
    ?? (myTeam.ownerId === playerId ? 'owner' : 'member');
  if (!['owner', 'manager', 'captain'].includes(myRole))
    return NextResponse.json({ error: 'Only OMC can record toss' }, { status: 403 });

  // PROPOSE_OVERS — team proposes target match length
  if (action === 'propose_overs') {
    let toss = match.cricketToss;
    if (!toss) {
      toss = await prisma.cricketToss.create({
        data: { matchId }
      });
    }

    const { overs } = body;
    if (typeof overs !== 'number' || overs < 1) return NextResponse.json({ error: 'Invalid overs' }, { status: 400 });

    const updateData = isA ? { proposedOversA: overs } : { proposedOversB: overs };
    const updatedToss = await prisma.cricketToss.update({
      where: { matchId },
      data: updateData,
    });

    const proposedA = updatedToss.proposedOversA;
    const proposedB = updatedToss.proposedOversB;
    
    let consensusReached = false;
    if (proposedA !== null && proposedB !== null && proposedA === proposedB) {
      consensusReached = true;
      await prisma.match.update({
        where: { id: matchId },
        data: { agreedOvers: proposedA },
      });
      await broadcastMatchEvent(matchId, 'OVERS_AGREED', { agreedOvers: proposedA });
    } else {
      await broadcastMatchEvent(matchId, 'OVERS_PROPOSED', { toss: updatedToss });
    }
    return NextResponse.json({ toss: updatedToss, consensusReached });
  }

  // ACCEPT_OVERS — team accepts opponent's explicit proposal
  if (action === 'accept_overs') {
    const toss = match.cricketToss;
    if (!toss) return NextResponse.json({ error: 'No proposals to accept' }, { status: 400 });

    const opponentProposed = isA ? toss.proposedOversB : toss.proposedOversA;
    if (!opponentProposed) return NextResponse.json({ error: 'Opponent has not proposed' }, { status: 400 });

    const updateData = isA ? { proposedOversA: opponentProposed } : { proposedOversB: opponentProposed };
    const updatedToss = await prisma.cricketToss.update({ where: { matchId }, data: updateData });

    await prisma.match.update({ where: { id: matchId }, data: { agreedOvers: opponentProposed } });
    await broadcastMatchEvent(matchId, 'OVERS_AGREED', { agreedOvers: opponentProposed });
    return NextResponse.json({ toss: updatedToss, consensusReached: true });
  }

  // FLIP_COIN — triggers the RNG toss and broadcasts result
  if (action === 'flip_coin') {
    const toss = match.cricketToss;
    if (!toss) return NextResponse.json({ error: 'Toss not initialized' }, { status: 400 });
    if (toss.coinLandedOn) return NextResponse.json({ error: 'Coin already flipped' }, { status: 400 });

    const { call } = body;
    if (!['HEADS', 'TAILS'].includes(call)) return NextResponse.json({ error: 'Invalid call' }, { status: 400 });

    const coinLandedOn = Math.random() > 0.5 ? 'HEADS' : 'TAILS';
    const callerTeamId = isA ? match.teamA_Id : match.teamB_Id;
    const winnerTeamId = call === coinLandedOn ? callerTeamId : (isA ? match.teamB_Id : match.teamA_Id);

    const updated = await prisma.cricketToss.update({
      where: { matchId },
      data: {
        calledByTeamId: callerTeamId,
        tossCall: call,
        coinLandedOn,
        winnerTeamId,
        recordedByPlayerId: playerId,
      }
    });

    await broadcastMatchEvent(matchId, 'COIN_FLIPPED', { toss: updated });
    return NextResponse.json({ toss: updated });
  }

  // ELECT_TOSS — determines bat vs bowl for the winner
  if (action === 'elect_toss') {
    const toss = match.cricketToss;
    if (!toss || !toss.winnerTeamId) return NextResponse.json({ error: 'Toss not flipped yet' }, { status: 400 });
    
    if (toss.winnerTeamId !== (isA ? match.teamA_Id : match.teamB_Id)) {
      return NextResponse.json({ error: 'Only the toss winner can elect' }, { status: 403 });
    }

    const { electedTo } = body;
    if (!['BAT', 'BOWL'].includes(electedTo)) return NextResponse.json({ error: 'Invalid election' }, { status: 400 });

    const updated = await prisma.cricketToss.update({
      where: { matchId },
      data: {
        electedTo,
        confirmedAt: new Date(),
        confirmedByA: true,
        confirmedByB: true,
      }
    });

    await broadcastMatchEvent(matchId, 'TOSS_CONFIRMED', { toss: updated });
    return NextResponse.json({ toss: updated });
  }

  // SKIP_TOSS_PROPOSAL
  if (action === 'skip_toss_proposal') {
    const toss = match.cricketToss;
    if (!toss) return NextResponse.json({ error: 'Toss not initialized' }, { status: 400 });

    const updated = await prisma.cricketToss.update({
      where: { matchId },
      data: { tossCall: isA ? 'SKIP_PROPOSED_A' : 'SKIP_PROPOSED_B' }
    });
    await broadcastMatchEvent(matchId, 'TOSS_SKIP_PROPOSED', { toss: updated });
    return NextResponse.json({ toss: updated });
  }

  // ACCEPT_TOSS_SKIP
  if (action === 'accept_toss_skip') {
    const toss = match.cricketToss;
    if (!toss) return NextResponse.json({ error: 'Toss not initialized' }, { status: 400 });

    const updated = await prisma.cricketToss.update({
      where: { matchId },
      data: { coinLandedOn: 'SKIPPED' } // Fallback sentinel
    });
    await broadcastMatchEvent(matchId, 'TOSS_SKIP_ACCEPTED', { toss: updated });
    return NextResponse.json({ toss: updated });
  }

  // RECORD_MANUAL_TOSS 
  if (action === 'record_manual_toss') {
    const toss = match.cricketToss;
    if (!toss || toss.coinLandedOn !== 'SKIPPED') return NextResponse.json({ error: 'Manual not allowed' }, { status: 400 });

    const { winnerTeamId, electedTo } = body;
    if (!winnerTeamId || !electedTo) return NextResponse.json({ error: 'Missing logic' }, { status: 400 });

    const updated = await prisma.cricketToss.update({
      where: { matchId },
      data: {
        winnerTeamId,
        electedTo,
        recordedByPlayerId: playerId,
        confirmedByA: isA,
        confirmedByB: isB,
      }
    });

    await broadcastMatchEvent(matchId, 'TOSS_RECORDED', { toss: updated });
    return NextResponse.json({ toss: updated });
  }

  // CONFIRM_MANUAL_TOSS
  if (action === 'confirm_manual_toss') {
    const toss = match.cricketToss;
    if (!toss || toss.coinLandedOn !== 'SKIPPED') return NextResponse.json({ error: 'Manual not allowed' }, { status: 400 });

    const updateData = isA ? { confirmedByA: true } : { confirmedByB: true };
    const updated = await prisma.cricketToss.update({ where: { matchId }, data: updateData });

    const bothConfirmed = updated.confirmedByA && updated.confirmedByB;
    if (bothConfirmed) {
      await prisma.cricketToss.update({ where: { matchId }, data: { confirmedAt: new Date() } });
      await broadcastMatchEvent(matchId, 'TOSS_CONFIRMED', { toss: updated });
    } else {
      await broadcastMatchEvent(matchId, 'TOSS_CONFIRM_PARTIAL', { toss: updated });
    }
    return NextResponse.json({ toss: updated, bothConfirmed });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
