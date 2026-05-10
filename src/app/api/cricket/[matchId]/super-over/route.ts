import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastMatchEvent } from '@/lib/supabaseRealtime';

function pid(req: NextRequest) { return req.cookies.get('bmt_player_id')?.value ?? null; }

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
      cricketInnings: { orderBy: { inningsNumber: 'asc' } }
    },
  });
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

  const isA = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
  const isB = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);
  if (!isA && !isB) return NextResponse.json({ error: 'Not in match' }, { status: 403 });

  const body = await req.json();
  const { action } = body;

  const myTeamId = isA ? match.teamA_Id : match.teamB_Id;

  if (action === 'propose') {
    await broadcastMatchEvent(matchId, 'SUPER_OVER_PROPOSAL', { fromTeamId: myTeamId });
    return NextResponse.json({ ok: true });
  }

  if (action === 'accept') {
    // Determine batting/bowling team for Super Over. 
    // The team that batted SECOND (Innings 2) bats FIRST in Super Over (Innings 3).
    const innings2 = match.cricketInnings.find(i => i.inningsNumber === 2);
    if (!innings2) return NextResponse.json({ error: 'Innings 2 not found' }, { status: 400 });

    const newBattingTeamId = innings2.battingTeamId;
    const newBowlingTeamId = innings2.bowlingTeamId;

    const innings3 = await prisma.cricketInnings.create({
      data: {
        matchId,
        inningsNumber: 3,
        battingTeamId: newBattingTeamId,
        bowlingTeamId: newBowlingTeamId,
      }
    });

    await broadcastMatchEvent(matchId, 'SUPER_OVER_STARTED', { innings: innings3 });
    return NextResponse.json({ ok: true, innings: innings3 });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
