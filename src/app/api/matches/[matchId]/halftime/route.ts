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
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: { include: { members: { select: { playerId: true, role: true } } } },
        teamB: { include: { members: { select: { playerId: true, role: true } } } },
        halfTime: true,
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
    const isOMC = ['owner', 'manager', 'captain'].includes(myRole);
    if (!isOMC) return NextResponse.json({ error: 'Only OMC can call half time' }, { status: 403 });

    const updateData = isA
      ? { calledByA: true }
      : { calledByB: true };

    const halfTime = await prisma.matchHalfTime.upsert({
      where: { matchId },
      create: { matchId, ...updateData },
      update: updateData,
    });

    // Both called → set confirmedAt
    if (halfTime.calledByA && halfTime.calledByB) {
      await prisma.matchHalfTime.update({
        where: { matchId },
        data: { confirmedAt: new Date() }
      });
      // Log HALF_TIME event
      await prisma.matchEvent.create({
        data: { matchId, type: 'HALF_TIME', teamId: match.teamA_Id, minute: 45, status: 'CONFIRMED' }
      });
      return NextResponse.json({ ok: true, halfTimeConfirmed: true });
    }

    return NextResponse.json({ ok: true, halfTimeConfirmed: false, halfTime });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
