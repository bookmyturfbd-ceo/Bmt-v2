import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastMatchEvent } from '@/lib/supabaseRealtime';

function pid(req: NextRequest) { return req.cookies.get('bmt_player_id')?.value ?? null; }

// PATCH /api/cricket/[matchId]/delivery/[deliveryId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string; deliveryId: string }> }
) {
  const { matchId, deliveryId } = await params;
  const playerId = pid(req);
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, reason } = body;

  const delivery = await prisma.cricketDelivery.findUnique({
    where: { id: deliveryId },
    include: {
      innings: {
        include: {
          match: {
            include: {
              teamA: { include: { members: { select: { playerId: true, role: true } } } },
              teamB: { include: { members: { select: { playerId: true, role: true } } } },
            },
          },
        },
      },
    },
  });
  if (!delivery) return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });

  const innings  = delivery.innings;
  const match    = innings.match;

  const bowlingTeam = match.teamA_Id === innings.bowlingTeamId ? match.teamA : match.teamB;
  const battingTeam = match.teamA_Id === innings.battingTeamId ? match.teamA : match.teamB;

  const isBowlingMember = bowlingTeam.ownerId === playerId || bowlingTeam.members.some((m:any) => m.playerId === playerId);
  const isBattingMember = battingTeam.ownerId === playerId || battingTeam.members.some((m:any) => m.playerId === playerId);

  // ── Dispute (bowling team raises) ──────────────────────────────────────────
  if (action === 'dispute') {
    if (!isBowlingMember) return NextResponse.json({ error: 'Only bowling team can dispute' }, { status: 403 });
    if (!['PENDING','CONFIRMED'].includes(delivery.status))
      return NextResponse.json({ error: 'Cannot dispute this delivery' }, { status: 400 });
    const updated = await prisma.cricketDelivery.update({
      where: { id: deliveryId },
      data: { status: 'CONFLICTED' },
    });
    await prisma.cricketDispute.create({
      data: { deliveryId, raisedByTeamId: innings.bowlingTeamId, reason: reason ?? 'Bowling team disputed data entry' },
    });
    await broadcastMatchEvent(matchId, 'DELIVERY_CONFLICTED', { delivery: updated, inningsId: innings.id });
    return NextResponse.json({ delivery: updated });
  }

  // ── Acknowledge wicket (bowling team) ──────────────────────────────────────
  if (action === 'acknowledge_wicket') {
    if (!isBowlingMember) return NextResponse.json({ error: 'Only bowling team can acknowledge' }, { status: 403 });
    if (delivery.status !== 'PENDING') return NextResponse.json({ error: 'Delivery is not pending' }, { status: 400 });
    const updatedDelivery = await prisma.cricketDelivery.update({
      where: { id: deliveryId },
      data: { status: 'CONFIRMED', confirmedByPlayerId: playerId },
    });
    await broadcastMatchEvent(matchId, 'DELIVERY_ACKNOWLEDGED', { delivery: updatedDelivery });
    return NextResponse.json({ delivery: updatedDelivery });
  }

  // ── Resolve dispute: batting team accepts → voided ─────────────────────────
  if (action === 'resolve_dispute') {
    if (!isBattingMember) return NextResponse.json({ error: 'Only batting team can resolve disputes' }, { status: 403 });
    if (delivery.status !== 'CONFLICTED') return NextResponse.json({ error: 'No active dispute' }, { status: 400 });
    const updated = await prisma.cricketDelivery.update({
      where: { id: deliveryId },
      data: { status: 'VOIDED', runs: 0, isWicket: false },
    });
    await prisma.cricketDispute.updateMany({
      where: { deliveryId, resolvedAt: null },
      data: { resolution: 'ACCEPTED', resolvedAt: new Date() },
    });
    await broadcastMatchEvent(matchId, 'DISPUTE_RESOLVED', { delivery: updated, inningsId: innings.id });
    return NextResponse.json({ delivery: updated });
  }

  // ── Deny dispute: batting team denies → stays CONFIRMED ───────────────────
  if (action === 'deny_dispute') {
    if (!isBattingMember) return NextResponse.json({ error: 'Only batting team can deny disputes' }, { status: 403 });
    if (delivery.status !== 'CONFLICTED') return NextResponse.json({ error: 'No active dispute' }, { status: 400 });
    const updated = await prisma.cricketDelivery.update({
      where: { id: deliveryId },
      data: { status: 'CONFIRMED' },
    });
    await prisma.cricketDispute.updateMany({
      where: { deliveryId, resolvedAt: null },
      data: { resolution: 'DENIED', resolvedAt: new Date() },
    });
    await broadcastMatchEvent(matchId, 'DISPUTE_DENIED', { delivery: updated, inningsId: innings.id });
    return NextResponse.json({ delivery: updated });
  }

  // ── Match control proposals (Pause / Cancel) ───────────────────────────────
  if (['pause_proposal','cancel_proposal','accept_pause','deny_pause','accept_cancel','deny_cancel'].includes(action)) {
    if (!isBowlingMember && !isBattingMember) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    const proposingTeamId = isBattingMember ? innings.battingTeamId : innings.bowlingTeamId;
    const evtMap: Record<string,string> = {
      pause_proposal: 'PAUSE_PROPOSED', cancel_proposal: 'CANCEL_PROPOSED',
      accept_pause: 'PAUSE_ACCEPTED', deny_pause: 'PAUSE_DENIED',
      accept_cancel: 'CANCEL_ACCEPTED', deny_cancel: 'CANCEL_DENIED',
    };
    await broadcastMatchEvent(matchId, evtMap[action], { proposingTeamId, deliveryId });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
