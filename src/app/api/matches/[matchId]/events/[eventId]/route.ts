import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateCasualScorerToken } from '@/lib/match/token-generator';

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

// DELETE /api/matches/[matchId]/events/[eventId]
// Completely removes an event (Undo flow)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string; eventId: string }> }
) {
  const { matchId, eventId } = await params;
  const body = await req.json().catch(() => ({}));
  const token = req.headers.get('authorization')?.split(' ')[1] || body.token || null;
  const playerId = pid(req);

  try {
    let isOMC = false;
    let isSingleScorer = false;
    let match: any;

    if (token) {
      const tokenMatchId = validateCasualScorerToken(token);
      if (tokenMatchId === matchId) {
        isSingleScorer = true;
        isOMC = true;
        match = await prisma.match.findUnique({ where: { id: matchId } });
      }
    }

    if (!isSingleScorer && playerId) {
      const ctx = await getCtx(matchId, playerId);
      if (ctx) {
        isOMC = ctx.isOMC;
        isSingleScorer = ctx.isSingleScorer;
        match = ctx.match;
      }
    }

    if (!match) return NextResponse.json({ error: 'Not in match or unauthorized' }, { status: 403 });
    if (['COMPLETED', 'SCORE_ENTRY'].includes(match.status)) {
      return NextResponse.json({ error: 'Cannot modify events after match is completed/finalized' }, { status: 400 });
    }
    if (!isOMC && !isSingleScorer) {
      return NextResponse.json({ error: 'Only OMC or scorer can remove events' }, { status: 403 });
    }

    const event = await prisma.matchEvent.findUnique({ where: { id: eventId } });
    if (!event || event.matchId !== matchId) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    await prisma.matchEvent.delete({ where: { id: eventId } });
    return NextResponse.json({ ok: true, deleted: true });
  } catch (e: any) {
    console.error('[events DELETE]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/matches/[matchId]/events/[eventId]
// action: 'confirm' | 'dispute' | 'resolve' | 'edit' | 'delete'
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string; eventId: string }> }
) {
  const { matchId, eventId } = await params;
  const playerId = pid(req);
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    const ctx = await getCtx(matchId, playerId);
    if (!ctx) return NextResponse.json({ error: 'Not in match' }, { status: 403 });

    const { match, myTeamId, isOMC, isSingleScorer } = ctx;

    const event = await prisma.matchEvent.findUnique({ where: { id: eventId } });
    if (!event || event.matchId !== matchId)
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });

    const body = await req.json();
    const { action, resolution, minute, scorerPlayerId, assistPlayerId, playerOnId } = body;

    // Reject modifications for completed/finalized matches
    if (['COMPLETED', 'SCORE_ENTRY'].includes(match.status) && ['edit', 'delete', 'resolve'].includes(action)) {
      return NextResponse.json({ error: 'Cannot modify events after match is completed/finalized' }, { status: 400 });
    }

    // ── confirm ──────────────────────────────────────────────────────────────
    if (action === 'confirm') {
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
      if (!['PENDING', 'CONFIRMED'].includes(event.status))
        return NextResponse.json({ error: 'Event is not active' }, { status: 400 });
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

    // ── edit (Long-press custom edit) ─────────────────────────────────────────
    if (action === 'edit') {
      if (!isOMC && !isSingleScorer)
        return NextResponse.json({ error: 'Only OMC or scorer can edit events' }, { status: 403 });

      const updated = await prisma.matchEvent.update({
        where: { id: eventId },
        data: {
          minute: minute !== undefined ? Number(minute) : event.minute,
          playerId: scorerPlayerId !== undefined ? scorerPlayerId : event.playerId,
          assistPlayerId: assistPlayerId !== undefined ? assistPlayerId : event.assistPlayerId,
          playerOnId: playerOnId !== undefined ? playerOnId : event.playerOnId,
          isEdited: true,
        }
      });
      return NextResponse.json({ ok: true, event: updated });
    }

    // ── delete (Soft-delete via Edit/Delete sheet) ───────────────────────────
    if (action === 'delete') {
      if (!isOMC && !isSingleScorer)
        return NextResponse.json({ error: 'Only OMC or scorer can delete events' }, { status: 403 });

      const updated = await prisma.matchEvent.update({
        where: { id: eventId },
        data: {
          status: 'REMOVED',
          isEdited: true,
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
