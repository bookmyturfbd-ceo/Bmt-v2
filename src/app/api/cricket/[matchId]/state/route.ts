import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function pid(req: NextRequest) { return req.cookies.get('bmt_player_id')?.value ?? null; }

export async function GET(
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
        teamA: {
          include: {
            members: {
              include: { player: { select: { id: true, fullName: true, avatarUrl: true } } },
            },
          },
        },
        teamB: {
          include: {
            members: {
              include: { player: { select: { id: true, fullName: true, avatarUrl: true } } },
            },
          },
        },
        cricketToss: true,
        cricketInnings: {
          orderBy: { inningsNumber: 'asc' },
          include: {
            overs: { orderBy: { overNumber: 'asc' } },
            deliveries: { orderBy: { deliverySequence: 'asc' } },
            battingPerfs: { orderBy: { battingPosition: 'asc' } },
            bowlingPerfs: true,
            signOffs: true,
          },
        },
      },
    });

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    const isA  = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
    const isB  = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);
    if (!isA && !isB) return NextResponse.json({ error: 'Not in this match' }, { status: 403 });

    const myTeamId     = isA ? match.teamA_Id : match.teamB_Id;
    const myTeam       = isA ? match.teamA    : match.teamB;
    const OMC_ROLES    = ['owner', 'manager', 'captain'];
    const myMember     = myTeam.members.find(m => m.playerId === playerId);
    const myRole       = myMember?.role ?? (myTeam.ownerId === playerId ? 'owner' : 'member');
    const isOMC        = OMC_ROLES.includes(myRole);
    const isTeamA      = isA;

    const innings        = match.cricketInnings;
    const currentInnings = innings.find(i => i.status === 'IN_PROGRESS') ?? innings[innings.length - 1] ?? null;

    const agreedOvers = (match as any).agreedOvers
      ?? (match.teamA.sportType === 'CRICKET_7' ? 7 : 20);

    // Build matchResult if match is already completed
    let matchResult = null;
    if ((match as any).status === 'COMPLETED') {
      const i1 = innings.find(i => i.inningsNumber === 1);
      const i2 = innings.find(i => i.inningsNumber === 2);
      matchResult = {
        winnerId: (match as any).winnerId,
        scoreA: (match as any).scoreA,
        scoreB: (match as any).scoreB,
        mmrChangeA: (match as any).mmrChangeA ?? 0,
        mmrChangeB: (match as any).mmrChangeB ?? 0,
        innings1Runs: i1?.totalRuns ?? 0,
        innings2Runs: i2?.totalRuns ?? 0,
        target: i1 ? i1.totalRuns + 1 : null,
      };
    }

    return NextResponse.json({
      match,
      myTeamId,
      isTeamA,
      isOMC,
      innings,
      currentInnings,
      agreedOvers,
      matchResult,
    });
  } catch (err: any) {
    console.error('[cricket/state] ERROR:', err);
    return NextResponse.json(
      { error: err?.message ?? 'Internal server error', stack: err?.stack?.split('\n').slice(0, 5) },
      { status: 500 }
    );
  }
}
