import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastMatchEvent } from '@/lib/supabaseRealtime';

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
  return { match, isA, isOMC, myTeamId: isA ? match.teamA_Id : match.teamB_Id };
}

// POST /api/matches/[matchId]/mode
// Body: { mode: 'LIVE' | 'SCORE_AFTER' }
// OMC proposes a scoring mode — broadcasts SCORE_MODE_REQUEST to the opponent
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

  const { mode } = await req.json();
  if (!['LIVE', 'SCORE_AFTER'].includes(mode)) {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  }

  // Allow picking mode even after match becomes LIVE (since that's when the UI prompts for it)
  const allowed = ['PENDING', 'INTERACTION', 'SCHEDULED', 'LIVE'];
  if (!allowed.includes(ctx.match.status)) {
    return NextResponse.json({ error: 'Cannot change mode after match is completed' }, { status: 409 });
  }

  const updated = await prisma.match.update({
    where: { id: matchId },
    data: {
      scoringMode: mode,
      scoreModeRequestedBy: ctx.myTeamId,
      scoreModeAgreed: false,
    },
  });

  await broadcastMatchEvent(matchId, 'SCORE_MODE_REQUEST', {
    mode,
    fromTeamId: ctx.myTeamId,
  });

  return NextResponse.json({ ok: true, scoringMode: updated.scoringMode });
}

// PATCH /api/matches/[matchId]/mode
// Body: { accept: boolean }
// Opponent OMC accepts or rejects the proposed mode
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

  // Must be the OTHER team accepting (not the proposer)
  const { match } = ctx;
  if (match.scoreModeRequestedBy === ctx.myTeamId) {
    return NextResponse.json({ error: 'You proposed this mode — wait for opponent' }, { status: 409 });
  }
  if (!match.scoreModeRequestedBy) {
    return NextResponse.json({ error: 'No pending mode request' }, { status: 400 });
  }

  const { accept } = await req.json();

  if (accept) {
    await prisma.match.update({
      where: { id: matchId },
      data: { scoreModeAgreed: true },
    });
    await broadcastMatchEvent(matchId, 'SCORE_MODE_AGREED', { mode: match.scoringMode });
    return NextResponse.json({ ok: true, agreed: true, mode: match.scoringMode });
  } else {
    // Reset — mode reverts to LIVE
    await prisma.match.update({
      where: { id: matchId },
      data: {
        scoringMode: 'LIVE',
        scoreModeRequestedBy: null,
        scoreModeAgreed: false,
      },
    });
    await broadcastMatchEvent(matchId, 'SCORE_MODE_REJECTED', { fromTeamId: ctx.myTeamId });
    return NextResponse.json({ ok: true, agreed: false });
  }
}
