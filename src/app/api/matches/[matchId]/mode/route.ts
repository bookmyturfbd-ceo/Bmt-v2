import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastMatchEvent } from '@/lib/supabaseRealtime';
import { notify } from '@/lib/notificationService';

function pid(req: NextRequest) {
  return req.cookies.get('bmt_player_id')?.value ?? null;
}

async function resolveMatchOMC(matchId: string, playerId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      teamA: { include: { members: { select: { playerId: true, role: true } } } },
      teamB: { include: { members: { select: { playerId: true, role: true } } } },
    },
  });
  if (!match) return null;
  const isA = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
  const isB = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);
  if (!isA && !isB) return null;
  const myTeam = isA ? match.teamA : match.teamB;
  const myRole = myTeam.members.find(m => m.playerId === playerId)?.role
    ?? (myTeam.ownerId === playerId ? 'owner' : 'member');
  const isOMC = ['owner', 'manager', 'captain'].includes(myRole);
  return { match, isA, isB, isOMC, myTeamId: isA ? match.teamA_Id : match.teamB_Id };
}

// POST /api/matches/[matchId]/mode
// Proposes scoring mode
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const playerId = pid(req);
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const ctx = await resolveMatchOMC(matchId, playerId);
  if (!ctx) return NextResponse.json({ error: 'Not found or not in match' }, { status: 404 });
  if (!ctx.isOMC) return NextResponse.json({ error: 'OMC only' }, { status: 403 });

  const { proposedMode, proposedMethod, singleScorerId } = await req.json();
  if (!['live', 'after_match'].includes(proposedMode)) {
    return NextResponse.json({ error: 'Invalid proposed mode' }, { status: 400 });
  }
  if (proposedMode === 'live' && !['individual', 'single_scorer'].includes(proposedMethod)) {
    return NextResponse.json({ error: 'Invalid proposed method' }, { status: 400 });
  }

  const allowed = ['PENDING', 'INTERACTION', 'SCHEDULED', 'LIVE'];
  if (!allowed.includes(ctx.match.status)) {
    return NextResponse.json({ error: 'Cannot change mode after match is completed' }, { status: 409 });
  }

  // Update proposal fields
  const dataToUpdate: any = {
    negotiation_proposed_by: ctx.myTeamId,
    negotiation_proposed_mode: proposedMode,
    negotiation_proposed_method: proposedMethod,
    scoringNegotiationStatus: 'negotiating',
    proposedSingleScorerId: proposedMethod === 'single_scorer' ? singleScorerId : null,
  };

  if (ctx.isA) {
    dataToUpdate.proposalA_mode = proposedMode;
    dataToUpdate.proposalA_method = proposedMethod;
  } else {
    dataToUpdate.proposalB_mode = proposedMode;
    dataToUpdate.proposalB_method = proposedMethod;
  }

  const updatedMatch = await prisma.match.update({
    where: { id: matchId },
    data: dataToUpdate,
    include: {
      teamA: { select: { id: true, name: true, ownerId: true } },
      teamB: { select: { id: true, name: true, ownerId: true } },
    }
  });

  // Check if opponent is present before update. If not, trigger scoring_mode_proposed push notification.
  const rawMatch = ctx.match as any;
  const isOpponentPresent = ctx.isA ? rawMatch.teamB_Present : rawMatch.teamA_Present;
  if (!isOpponentPresent) {
    const oppCaptainId = ctx.isA ? updatedMatch.teamB.ownerId : updatedMatch.teamA.ownerId;
    const modeName = proposedMode === 'live' ? 'Live Scoring' : 'Score After Match';
    await notify({
      userIds: [oppCaptainId],
      type: 'scoring_mode_proposed',
      url: `/matches/${matchId}/live`,
      params: {
        teamName: ctx.isA ? updatedMatch.teamA.name : updatedMatch.teamB.name,
        modeName
      },
      actorId: playerId
    });
  }

  await broadcastMatchEvent(matchId, 'SCORE_MODE_REQUEST', {
    match: updatedMatch
  });

  return NextResponse.json({ ok: true, match: updatedMatch });
}

// PATCH /api/matches/[matchId]/mode
// Accepts proposal
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const playerId = pid(req);
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const ctx = await resolveMatchOMC(matchId, playerId);
  if (!ctx) return NextResponse.json({ error: 'Not found or not in match' }, { status: 404 });
  if (!ctx.isOMC) return NextResponse.json({ error: 'OMC only' }, { status: 403 });

  // Get opponent's proposal to accept (ctx.match typed narrowly from include; cast to access scalars)
  const rawMatchPatch = ctx.match as any;
  const oppMode = ctx.isA ? rawMatchPatch.proposalB_mode : rawMatchPatch.proposalA_mode;
  const oppMethod = ctx.isA ? rawMatchPatch.proposalB_method : rawMatchPatch.proposalA_method;

  if (!oppMode) {
    return NextResponse.json({ error: 'No active proposal from opponent to accept' }, { status: 400 });
  }

  // Determine main enum ScoringMode
  const enumMode = oppMode === 'after_match'
    ? 'SCORE_AFTER'
    : oppMethod === 'single_scorer'
      ? 'LIVE_SINGLE'
      : 'LIVE';

  // Setup single scorer if agreed
  if (enumMode === 'LIVE_SINGLE' && rawMatchPatch.proposedSingleScorerId) {
    await prisma.matchScorer.deleteMany({ where: { matchId } });
    await prisma.matchScorer.createMany({
      data: [
        { matchId, teamId: rawMatchPatch.teamA_Id, playerId: rawMatchPatch.proposedSingleScorerId },
        { matchId, teamId: rawMatchPatch.teamB_Id, playerId: rawMatchPatch.proposedSingleScorerId }
      ]
    });
  }

  const bothPresent = rawMatchPatch.teamA_Present && rawMatchPatch.teamB_Present;
  const dataToUpdate: any = {
    scoringNegotiationStatus: 'agreed',
    negotiation_scoring_mode: oppMode,
    negotiation_live_method: oppMethod,
    scoringMode: enumMode,
    scoringAgreedAt: new Date(),
  };

  if (bothPresent && !rawMatchPatch.matchStartedAt) {
    dataToUpdate.matchStartedAt = new Date();
    dataToUpdate.status = 'LIVE';
  }

  const updatedMatch = await prisma.match.update({
    where: { id: matchId },
    data: dataToUpdate,
    include: {
      teamA: { select: { id: true, name: true, ownerId: true } },
      teamB: { select: { id: true, name: true, ownerId: true } },
    }
  });

  // Notify both captains
  const modeName = oppMode === 'live' ? 'Live Scoring' : 'Score After Match';
  await Promise.all([
    notify({
      userIds: [updatedMatch.teamA.ownerId],
      type: 'scoring_mode_agreed',
      url: `/matches/${matchId}/live`,
      params: { modeName },
      actorId: playerId
    }),
    notify({
      userIds: [updatedMatch.teamB.ownerId],
      type: 'scoring_mode_agreed',
      url: `/matches/${matchId}/live`,
      params: { modeName },
      actorId: playerId
    })
  ]);

  await broadcastMatchEvent(matchId, 'SCORE_MODE_AGREED', {
    match: updatedMatch
  });

  return NextResponse.json({ ok: true, match: updatedMatch });
}
