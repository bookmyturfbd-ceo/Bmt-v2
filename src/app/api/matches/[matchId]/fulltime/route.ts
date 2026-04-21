import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function pid(req: NextRequest) { return req.cookies.get('bmt_player_id')?.value ?? null; }

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const playerId = pid(req);
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    const body = await req.json();
    const { confirmed } = body; // true = confirming full time

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: { include: { members: { select: { playerId: true, role: true } } } },
        teamB: { include: { members: { select: { playerId: true, role: true } } } },
      }
    });
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    if (match.status !== 'LIVE') return NextResponse.json({ error: 'Match must be LIVE' }, { status: 400 });

    const isA = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
    const isB = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);
    if (!isA && !isB) return NextResponse.json({ error: 'Not in match' }, { status: 403 });

    const myTeam = isA ? match.teamA : match.teamB;
    const myRole = myTeam.members.find(m => m.playerId === playerId)?.role
      ?? (myTeam.ownerId === playerId ? 'owner' : 'member');
    if (!['owner','manager','captain'].includes(myRole))
      return NextResponse.json({ error: 'Only OMC can call full time' }, { status: 403 });

    // track with match columns matchEndedByA/B (re-used from old schema)
    const updateData = isA ? { matchEndedByA: true } : { matchEndedByB: true };
    const updated = await prisma.match.update({ where: { id: matchId }, data: updateData });

    if (updated.matchEndedByA && updated.matchEndedByB) {
      // Auto-confirm all remaining PENDING events
      await prisma.matchEvent.updateMany({
        where: { matchId, status: 'PENDING' },
        data: { status: 'CONFIRMED', resolvedAt: new Date(), resolution: 'auto_fulltime' }
      });

      // Log FULL_TIME marker event
      await prisma.matchEvent.create({
        data: { matchId, type: 'FULL_TIME', teamId: match.teamA_Id, minute: 90, status: 'CONFIRMED' }
      });

      // Compute score from confirmed events
      const events = await prisma.matchEvent.findMany({
        where: { matchId, status: 'CONFIRMED', type: { in: ['GOAL', 'PENALTY_SCORED', 'OWN_GOAL'] } }
      });
      let sA = 0, sB = 0;
      events.forEach(e => {
        if (e.type === 'OWN_GOAL') { if (e.teamId === match.teamA_Id) sB++; else sA++; }
        else { if (e.teamId === match.teamA_Id) sA++; else sB++; }
      });

      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'SCORE_ENTRY', scoreA: sA, scoreB: sB }
      });

      return NextResponse.json({ ok: true, fullTimeConfirmed: true, scoreA: sA, scoreB: sB });
    }

    return NextResponse.json({ ok: true, fullTimeConfirmed: false });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
