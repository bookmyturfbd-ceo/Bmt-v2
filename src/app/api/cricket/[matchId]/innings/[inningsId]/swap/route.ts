import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastMatchEvent } from '@/lib/supabaseRealtime';

function pid(req: NextRequest) { return req.cookies.get('bmt_player_id')?.value ?? null; }

// POST /api/cricket/[matchId]/innings/[inningsId]/swap
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string; inningsId: string }> }
) {
  const { matchId, inningsId } = await params;
  const playerId = pid(req);
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      teamA: { include: { members: { select: { playerId: true, role: true } } } },
      teamB: { include: { members: { select: { playerId: true, role: true } } } },
    },
  });
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

  const innings = await prisma.cricketInnings.findUnique({ where: { id: inningsId } });
  if (!innings) return NextResponse.json({ error: 'Innings not found' }, { status: 404 });

  const isA = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
  const isB = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);
  if (!isA && !isB) return NextResponse.json({ error: 'Not in match' }, { status: 403 });

  const myTeamId = isA ? match.teamA_Id : match.teamB_Id;
  const myTeam = isA ? match.teamA : match.teamB;
  const myRole = myTeam.members.find(m => m.playerId === playerId)?.role ?? (myTeam.ownerId === playerId ? 'owner' : 'member');
  
  if (!['owner', 'manager', 'captain'].includes(myRole)) {
    return NextResponse.json({ error: 'Only OMC can swap strikers' }, { status: 403 });
  }
  if (myTeamId !== innings.battingTeamId) {
    return NextResponse.json({ error: 'Only batting team OMC can swap strikers' }, { status: 403 });
  }

  if (!innings.currentStrikerId || !innings.currentNonStrikerId) {
    return NextResponse.json({ error: 'Need two strikers to swap' }, { status: 400 });
  }

  const updated = await prisma.cricketInnings.update({
    where: { id: inningsId },
    data: {
      currentStrikerId: innings.currentNonStrikerId,
      currentNonStrikerId: innings.currentStrikerId,
    },
  });

  await broadcastMatchEvent(matchId, 'STRIKERS_SWAPPED', { innings: updated });
  return NextResponse.json({ innings: updated });
}
