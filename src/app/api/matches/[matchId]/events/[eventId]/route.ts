import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function pid(req: NextRequest) { return req.cookies.get('bmt_player_id')?.value ?? null; }

// PATCH /api/matches/[matchId]/events/[eventId]
// action: 'confirm' | 'dispute' | 'resolve'
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string; eventId: string }> }
) {
  const { matchId, eventId } = await params;
  const playerId = pid(req);
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: { include: { members: { select: { playerId: true, role: true } } } },
        teamB: { include: { members: { select: { playerId: true, role: true } } } },
      }
    });
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    const isA = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
    const isB = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);
    if (!isA && !isB) return NextResponse.json({ error: 'Not in match' }, { status: 403 });

    const myTeamId = isA ? match.teamA_Id : match.teamB_Id;
    const myTeam   = isA ? match.teamA : match.teamB;
    const myRole   = myTeam.members.find(m => m.playerId === playerId)?.role
      ?? (myTeam.ownerId === playerId ? 'owner' : 'member');
    const isOMC = ['owner', 'manager', 'captain'].includes(myRole);

    const event = await prisma.matchEvent.findUnique({ where: { id: eventId } });
    if (!event || event.matchId !== matchId)
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const body = await req.json();
    const { action, resolution } = body;

    // ── confirm ──────────────────────────────────────────────────────────────
    if (action === 'confirm') {
      // Only the OPPOSING team can confirm (challenger logs, challenged confirms)
      if (event.teamId === myTeamId)
        return NextResponse.json({ error: 'Cannot confirm your own team\'s event' }, { status: 403 });
      if (event.status !== 'PENDING')
        return NextResponse.json({ error: 'Event is not pending' }, { status: 400 });

      const updated = await prisma.matchEvent.update({
        where: { id: eventId },
        data: { status: 'CONFIRMED', resolvedAt: new Date(), resolution: 'accepted' }
      });
      return NextResponse.json({ ok: true, event: updated });
    }

    // ── dispute ───────────────────────────────────────────────────────────────
    if (action === 'dispute') {
      if (event.teamId === myTeamId)
        return NextResponse.json({ error: 'Cannot dispute your own team\'s event' }, { status: 403 });
      if (event.status !== 'PENDING')
        return NextResponse.json({ error: 'Event is not pending' }, { status: 400 });
      if (!isOMC)
        return NextResponse.json({ error: 'Only OMC can raise a dispute' }, { status: 403 });

      const updated = await prisma.matchEvent.update({
        where: { id: eventId },
        data: { status: 'DISPUTED', disputedByTeamId: myTeamId }
      });
      return NextResponse.json({ ok: true, event: updated });
    }

    // ── resolve ───────────────────────────────────────────────────────────────
    if (action === 'resolve') {
      // Resolution options: 'confirm' | 'remove'
      if (!isOMC) return NextResponse.json({ error: 'Only OMC can resolve disputes' }, { status: 403 });
      if (event.status !== 'DISPUTED')
        return NextResponse.json({ error: 'Event is not disputed' }, { status: 400 });

      const newStatus = resolution === 'remove' ? 'REMOVED' : 'CONFIRMED';
      const updated = await prisma.matchEvent.update({
        where: { id: eventId },
        data: {
          status: newStatus as any,
          resolvedAt: new Date(),
          resolution: resolution || 'accepted',
        }
      });
      return NextResponse.json({ ok: true, event: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    console.error('[events PATCH]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
