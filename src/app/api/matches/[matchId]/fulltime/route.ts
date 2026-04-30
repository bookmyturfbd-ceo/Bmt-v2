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
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    await req.json().catch(() => ({})); // consume body, ignore contents

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
    const myTeamId = isA ? match.teamA_Id : match.teamB_Id;
    const myRole = myTeam.members.find(m => m.playerId === playerId)?.role
      ?? (myTeam.ownerId === playerId ? 'owner' : 'member');
    if (!['owner','manager','captain'].includes(myRole))
      return NextResponse.json({ error: 'Only OMC can call full time' }, { status: 403 });

    // Idempotent — if already flagged, don't re-broadcast
    const alreadyEnded = isA ? match.matchEndedByA : match.matchEndedByB;

    // Save this team's end flag
    const updateData = isA ? { matchEndedByA: true } : { matchEndedByB: true };
    const updated = await prisma.match.update({ where: { id: matchId }, data: updateData });

    // ── Both ended → proceed to score entry ───────────────────────────────────
    if (updated.matchEndedByA && updated.matchEndedByB) {
      if (match.scoringMode === 'SCORE_AFTER') {
        await prisma.matchEvent.create({
          data: { matchId, type: 'FULL_TIME', teamId: match.teamA_Id, minute: 0, status: 'CONFIRMED' }
        });
        await prisma.match.update({ where: { id: matchId }, data: { status: 'SCORE_ENTRY' } });
        await broadcastMatchEvent(matchId, 'SCORE_ENTRY_OPEN', {});
        return NextResponse.json({ ok: true, fullTimeConfirmed: true, scoreAfterMode: true, scoreA: 0, scoreB: 0 });
      }

      // ── LIVE scoring path ────────────────────────────────────────────────────
      await prisma.matchEvent.updateMany({
        where: { matchId, status: 'PENDING' },
        data: { status: 'CONFIRMED', resolvedAt: new Date(), resolution: 'auto_fulltime' }
      });
      await prisma.matchEvent.create({
        data: { matchId, type: 'FULL_TIME', teamId: match.teamA_Id, minute: 90, status: 'CONFIRMED' }
      });

      const events = await prisma.matchEvent.findMany({
        where: { matchId, status: 'CONFIRMED', type: { in: ['GOAL', 'PENALTY_SCORED', 'OWN_GOAL'] } }
      });
      let sA = 0, sB = 0;
      events.forEach(e => {
        if (e.type === 'OWN_GOAL') { if (e.teamId === match.teamA_Id) sB++; else sA++; }
        else { if (e.teamId === match.teamA_Id) sA++; else sB++; }
      });

      await prisma.match.update({ where: { id: matchId }, data: { status: 'SCORE_ENTRY', scoreA: sA, scoreB: sB } });
      await broadcastMatchEvent(matchId, 'FULL_TIME', { scoreA: sA, scoreB: sB });
      return NextResponse.json({ ok: true, fullTimeConfirmed: true, scoreA: sA, scoreB: sB });
    }

    // ── Only one team pressed — broadcast request to opponent ─────────────────
    if (!alreadyEnded) {
      await broadcastMatchEvent(matchId, 'END_GAME_REQUEST', { fromTeamId: myTeamId });
    }
    return NextResponse.json({ ok: true, fullTimeConfirmed: false });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
