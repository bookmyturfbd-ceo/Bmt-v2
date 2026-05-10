import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastMatchEvent } from '@/lib/supabaseRealtime';

function pid(req: NextRequest) { return req.cookies.get('bmt_player_id')?.value ?? null; }

// POST /api/cricket/[matchId]/innings/[inningsId]/signoff
// Both OMCs sign off on the innings scorecard.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string; inningsId: string }> }
) {
  const { matchId, inningsId } = await params;
  const playerId = pid(req);
  if (!playerId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const innings = await prisma.cricketInnings.findUnique({
    where: { id: inningsId },
    include: {
      signOffs: true,
      match: {
        include: {
          teamA: { include: { members: { select: { playerId: true, role: true } } } },
          teamB: { include: { members: { select: { playerId: true, role: true } } } },
        },
      },
    },
  });
  if (!innings) return NextResponse.json({ error: 'Innings not found' }, { status: 404 });
  if (innings.status !== 'COMPLETED' && innings.status !== 'IN_PROGRESS')
    return NextResponse.json({ error: 'Innings not yet complete' }, { status: 400 });

  const match = innings.match;
  const isA   = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
  const isB   = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);
  if (!isA && !isB) return NextResponse.json({ error: 'Not in match' }, { status: 403 });

  const myTeam   = isA ? match.teamA : match.teamB;
  const myTeamId = isA ? match.teamA_Id : match.teamB_Id;
  const myRole   = myTeam.members.find(m => m.playerId === playerId)?.role
    ?? (myTeam.ownerId === playerId ? 'owner' : 'member');
  if (!['owner', 'manager', 'captain'].includes(myRole))
    return NextResponse.json({ error: 'Only OMC can sign off' }, { status: 403 });

  // Upsert signoff
  await prisma.cricketMatchSignOff.create({
    data: { matchId, inningsId, teamId: myTeamId, type: 'INNINGS' },
  });

  const allSignOffs = await prisma.cricketMatchSignOff.findMany({
    where: { matchId, inningsId, type: 'INNINGS' },
  });

  const signedA = allSignOffs.some(s => s.teamId === match.teamA_Id);
  const signedB = allSignOffs.some(s => s.teamId === match.teamB_Id);
  const bothSigned = signedA && signedB;

  if (bothSigned) {
    await prisma.cricketInnings.update({
      where: { id: inningsId },
      data: { status: 'SIGNED_OFF' },
    });

    // If this is innings 1, the second innings can now be set up
    const isFirstInnings = innings.inningsNumber === 1;
    await broadcastMatchEvent(matchId, 'INNINGS_SIGNED_OFF', {
      inningsId,
      inningsNumber: innings.inningsNumber,
      isFirstInnings,
      target: isFirstInnings ? innings.totalRuns + 1 : null,
    });
  } else {
    await broadcastMatchEvent(matchId, 'INNINGS_SIGNOFF_PARTIAL', { inningsId, myTeamId });
  }

  return NextResponse.json({ bothSigned });
}
