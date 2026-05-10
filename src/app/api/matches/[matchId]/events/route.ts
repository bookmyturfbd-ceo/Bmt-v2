import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function pid(req: NextRequest) { return req.cookies.get('bmt_player_id')?.value ?? null; }

async function getCtx(matchId: string, playerId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      teamA: { include: { members: { select: { playerId: true, role: true } } } },
      teamB: { include: { members: { select: { playerId: true, role: true } } } },
      scorers: true,
    }
  });
  if (!match) return null;
  const isA = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
  const isB = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);
  
  const isAssignedScorer = match.scorers.some(s => s.playerId === playerId);
  const isSingleScorer = match.scoringMode === 'LIVE_SINGLE' && match.scorers.filter(s => s.playerId === playerId).length === 2;

  if (!isA && !isB && !isAssignedScorer) return null;

  const myTeam   = isA ? match.teamA : isB ? match.teamB : match.teamA;
  const myTeamId = isA ? match.teamA_Id : isB ? match.teamB_Id : match.teamA_Id;
  const myRole   = myTeam.members.find(m => m.playerId === playerId)?.role
    ?? (myTeam.ownerId === playerId ? 'owner' : 'member');
  const isOMC = (isA || isB) ? ['owner', 'manager', 'captain'].includes(myRole) : false;
  
  const isScorer = isAssignedScorer && match.status === 'LIVE';
  return { match, isA, isB, isOMC, isScorer, isSingleScorer, myTeamId };
}

// GET — fetch all events (for timeline rebuild on reconnect)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const playerId = pid(req);
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  const ctx = await getCtx(matchId, playerId);
  if (!ctx) return NextResponse.json({ error: 'Not in match' }, { status: 403 });

  const events = await prisma.matchEvent.findMany({
    where: { matchId },
    orderBy: { createdAt: 'asc' }
  });
  return NextResponse.json({ events });
}

// POST — create new match event
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const playerId = pid(req);
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    const ctx = await getCtx(matchId, playerId);
    if (!ctx) return NextResponse.json({ error: 'Not in match' }, { status: 403 });

    const { match, isA, myTeamId, isOMC, isScorer, isSingleScorer } = ctx;
    if (!['LIVE'].includes(match.status))
      return NextResponse.json({ error: 'Match must be LIVE to log events' }, { status: 400 });

    const body = await req.json();
    const { type, scorerPlayerId, assistPlayerId, playerOnId, minute, teamId } = body;

    if (!type || minute === undefined)
      return NextResponse.json({ error: 'type and minute required' }, { status: 400 });

    // OMC or assigned scorer can log all events
    if (!isOMC && !isScorer)
      return NextResponse.json({ error: 'Only OMC or assigned scorer can log match events' }, { status: 403 });

    // OWN_GOAL: eventTeamId is the conceding team (logged by the scoring team)
    // Single Scorer: use provided teamId
    const targetTeamId = isSingleScorer ? (teamId || myTeamId) : (type === 'OWN_GOAL'
      ? (isA ? match.teamB_Id : match.teamA_Id) // conceding team is opponent's team
      : myTeamId);

    // Substitutions don't need opponent confirmation — auto-confirm
    // Single Scorer events don't need opponent confirmation — auto-confirm
    const initialStatus = (type === 'SUBSTITUTION' || isSingleScorer) ? 'CONFIRMED' : 'PENDING';

    const event = await prisma.matchEvent.create({
      data: {
        matchId,
        type,
        teamId: targetTeamId,
        playerId: scorerPlayerId || null,
        assistPlayerId: assistPlayerId || null,
        playerOnId: playerOnId || null,
        minute,
        status: initialStatus as any,
      }
    });

    return NextResponse.json({ ok: true, event });
  } catch (e: any) {
    console.error('[events POST]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
