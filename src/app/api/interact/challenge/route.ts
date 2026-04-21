import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST: Issue a challenge (creates a Match in PENDING status)
export async function POST(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    const { challengerTeamId, opponentTeamId } = await req.json();
    if (!challengerTeamId || !opponentTeamId) {
      return NextResponse.json({ error: 'Missing team IDs' }, { status: 400 });
    }

    // Validate challenger team: check player is OMC
    const challengerTeam = await prisma.team.findUnique({
      where: { id: challengerTeamId },
      include: {
        members: { select: { playerId: true, role: true } },
        challengeSubscription: true,
      },
    });

    if (!challengerTeam) return NextResponse.json({ error: 'Challenger team not found' }, { status: 404 });

    const myMembership = challengerTeam.members.find(m => m.playerId === playerId)
      ?? (challengerTeam.ownerId === playerId ? { role: 'owner' } : null);

    if (!myMembership || !['owner', 'manager', 'captain'].includes(myMembership.role as string)) {
      return NextResponse.json({ error: 'Only Owners, Managers, or Captains can issue challenges' }, { status: 403 });
    }

    if (!challengerTeam.isSubscribed || !challengerTeam.challengeSubscription?.active) {
      return NextResponse.json({ error: 'Your team must be subscribed to the Challenge Market' }, { status: 403 });
    }

    // Validate opponent team
    const opponentTeam = await prisma.team.findUnique({
      where: { id: opponentTeamId },
      include: { challengeSubscription: true },
    });

    if (!opponentTeam) return NextResponse.json({ error: 'Opponent team not found' }, { status: 404 });
    if (!opponentTeam.isSubscribed || !opponentTeam.challengeSubscription?.active) {
      return NextResponse.json({ error: 'Opponent team is not in Challenge Market' }, { status: 400 });
    }
    if (opponentTeam.sportType !== challengerTeam.sportType) {
      return NextResponse.json({ error: 'Teams must be the same sport type' }, { status: 400 });
    }

    // Prevent duplicate pending challenge between same pair
    const existing = await prisma.match.findFirst({
      where: {
        status: 'PENDING',
        OR: [
          { teamA_Id: challengerTeamId, teamB_Id: opponentTeamId },
          { teamA_Id: opponentTeamId, teamB_Id: challengerTeamId },
        ],
      },
    });
    if (existing) {
      return NextResponse.json({ error: 'A pending challenge already exists between these teams' }, { status: 409 });
    }

    const match = await prisma.match.create({
      data: {
        teamA_Id: challengerTeamId,
        teamB_Id: opponentTeamId,
        status: 'PENDING',
      },
      include: {
        teamA: { select: { id: true, name: true } },
        teamB: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ ok: true, match });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Accept or Decline a pending challenge
export async function PATCH(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    const { matchId, action } = await req.json(); // action: 'accept' | 'decline'
    if (!matchId || !action) return NextResponse.json({ error: 'Missing matchId or action' }, { status: 400 });

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamB: { include: { members: { select: { playerId: true, role: true } } } },
      },
    });

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    if (match.status !== 'PENDING') return NextResponse.json({ error: 'Match is not pending' }, { status: 400 });

    // Only the receiving team (teamB) can accept/decline
    const teamB = match.teamB;
    const myMembership = teamB.members.find(m => m.playerId === playerId)
      ?? (teamB.ownerId === playerId ? { role: 'owner' } : null);

    if (!myMembership || !['owner', 'manager', 'captain'].includes(myMembership.role as string)) {
      return NextResponse.json({ error: 'Only the receiving team captain can respond to challenges' }, { status: 403 });
    }

    if (action === 'accept') {
      const updated = await prisma.match.update({
        where: { id: matchId },
        data: { status: 'INTERACTION' },
      });
      return NextResponse.json({ ok: true, match: updated });
    } else if (action === 'decline') {
      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'CANCELLED' },
      });
      return NextResponse.json({ ok: true, message: 'Challenge declined' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: Fetch user's challenges (sent, received, upcoming)
export async function GET(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    // Get all teams the user is OMC of
    const myTeams = await prisma.team.findMany({
      where: {
        OR: [
          { ownerId: playerId },
          { members: { some: { playerId, role: { in: ['owner', 'manager', 'captain'] } } } },
        ],
      },
      select: { id: true },
    });

    const myTeamIds = myTeams.map(t => t.id);

    const matchInclude = {
      teamA: { select: { id: true, name: true, logoUrl: true, sportType: true, teamMmr: true } },
      teamB: { select: { id: true, name: true, logoUrl: true, sportType: true, teamMmr: true } },
      playerStats: { where: { teamId: { in: myTeamIds } }, select: { id: true } },
      scorers: true,
    };

    const sent = await prisma.match.findMany({
      where: {
        status: { notIn: ['CANCELLED'] },
        teamA_Id: { in: myTeamIds },
      },
      include: matchInclude,
      orderBy: { createdAt: 'desc' },
    });

    // Received = I was challenged (teamB), show all except CANCELLED
    const received = await prisma.match.findMany({
      where: {
        status: { notIn: ['CANCELLED'] },
        teamB_Id: { in: myTeamIds },
      },
      include: matchInclude,
      orderBy: { createdAt: 'desc' },
    });

    // Matches tab = SCHEDULED, LIVE, SCORE_ENTRY, COMPLETED, DISPUTED
    const upcoming = await prisma.match.findMany({
      where: {
        status: { in: ['SCHEDULED', 'LIVE', 'SCORE_ENTRY', 'COMPLETED', 'DISPUTED'] },
        OR: [{ teamA_Id: { in: myTeamIds } }, { teamB_Id: { in: myTeamIds } }],
      },
      include: matchInclude,
      orderBy: { createdAt: 'desc' },
    });


    // Scorer matches — matches where the player is assigned as scorer
    const scorerEntries = await prisma.matchScorer.findMany({
      where: { playerId },
      select: { matchId: true, teamId: true },
    });
    const scorerMatchIds = scorerEntries.map(s => s.matchId);

    const scorerMatches = scorerMatchIds.length > 0
      ? await prisma.match.findMany({
          where: {
            id: { in: scorerMatchIds },
            status: { notIn: ['CANCELLED', 'COMPLETED', 'DISPUTED'] },
          },
          include: matchInclude,
          orderBy: { createdAt: 'desc' },
        })
      : [];

    // Merge scorer matches into upcoming (they need to see and start the match)
    const allUpcoming = [
      ...upcoming,
      ...scorerMatches.filter(sm => !upcoming.some(u => u.id === sm.id)),
    ];

    return NextResponse.json({ sent, received, upcoming: allUpcoming });
  } catch (error: any) {
    console.error('[challenge GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
