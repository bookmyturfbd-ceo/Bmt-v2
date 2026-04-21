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
  if (!isA && !isB) return null;
  const myTeam   = isA ? match.teamA : match.teamB;
  const myTeamId = isA ? match.teamA_Id : match.teamB_Id;
  const myRole   = myTeam.members.find(m => m.playerId === playerId)?.role
    ?? (myTeam.ownerId === playerId ? 'owner' : 'member');
  const isOMC = ['owner', 'manager', 'captain'].includes(myRole);
  // Check if this player is the OMC-assigned scorer (only active during LIVE)
  const myScorer = match.scorers.find(s => s.teamId === myTeamId);
  const isScorer = myScorer?.playerId === playerId && match.status === 'LIVE';
  return { match, isA, isB, isOMC, isScorer, myTeamId };
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

    const { match, isA, myTeamId, isOMC, isScorer } = ctx;
    if (!['LIVE'].includes(match.status))
      return NextResponse.json({ error: 'Match must be LIVE to log events' }, { status: 400 });

    const body = await req.json();
    const { type, scorerPlayerId, assistPlayerId, playerOnId, minute } = body;

    if (!type || minute === undefined)
      return NextResponse.json({ error: 'type and minute required' }, { status: 400 });

    // OMC or assigned scorer can log all events
    if (!isOMC && !isScorer)
      return NextResponse.json({ error: 'Only OMC or assigned scorer can log match events' }, { status: 403 });

    // OWN_GOAL: eventTeamId is the conceding team (logged by the scoring team)
    // All other events: eventTeamId must equal myTeamId
    const targetTeamId = type === 'OWN_GOAL'
      ? (isA ? match.teamB_Id : match.teamA_Id) // conceding team is opponent's team
      : myTeamId;

    // Substitutions don't need opponent confirmation — auto-confirm
    const initialStatus = type === 'SUBSTITUTION' ? 'CONFIRMED' : 'PENDING';

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
