import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notify } from '@/lib/notificationService';

// POST: Issue a challenge (creates a Match in PENDING status)
export async function POST(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    function getSportFamily(sport: string): 'FUTSAL' | 'FOOTBALL' | 'CRICKET' | null {
      if (sport === 'FUTSAL' || sport.startsWith('FUTSAL_')) return 'FUTSAL';
      if (sport === 'FOOTBALL' || sport === 'FOOTBALL_FULL') return 'FOOTBALL';
      if (sport === 'CRICKET' || sport.startsWith('CRICKET_')) return 'CRICKET';
      return null;
    }

    const { challengerTeamId, opponentTeamId, sportType, note, proposedDate } = await req.json();
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

    const cfg = await prisma.challengeMarketConfig.findUnique({ where: { id: 'singleton' } });
    const isFree = cfg?.isFree ?? false;

    if (!isFree && (!challengerTeam.isSubscribed || !challengerTeam.challengeSubscription?.active)) {
      return NextResponse.json({ error: 'Your team must be subscribed to the Challenge Market' }, { status: 403 });
    }

    // Validate opponent team
    const opponentTeam = await prisma.team.findUnique({
      where: { id: opponentTeamId },
      include: { 
        challengeSubscription: true,
        members: { select: { id: true } }
      },
    });

    if (!opponentTeam) return NextResponse.json({ error: 'Opponent team not found' }, { status: 404 });
    if (!isFree && (!opponentTeam.isSubscribed || !opponentTeam.challengeSubscription?.active)) {
      return NextResponse.json({ error: 'Opponent team is not in Challenge Market' }, { status: 400 });
    }

    const challengerFamily = getSportFamily(challengerTeam.sportType);
    const opponentFamily = getSportFamily(opponentTeam.sportType);
    if (!challengerFamily || !opponentFamily || challengerFamily !== opponentFamily) {
      return NextResponse.json({ error: 'Teams must be of the same sport type category' }, { status: 400 });
    }

    let matchSportType = sportType;
    if (!matchSportType) {
      matchSportType = challengerFamily;
    } else {
      const matchFamily = getSportFamily(matchSportType);
      if (matchFamily !== challengerFamily) {
        return NextResponse.json({ error: `Selected format ${matchSportType} is not compatible with team sport family ${challengerFamily}` }, { status: 400 });
      }
    }

    // Format eligibility checks
    function getFormatSize(sport: string): number {
      if (sport.includes('5')) return 5;
      if (sport.includes('6')) return 6;
      if (sport.includes('7')) return 7;
      if (sport.includes('FULL') || sport === 'FOOTBALL' || sport === 'CRICKET') return 11;
      return 5;
    }

    const N = getFormatSize(matchSportType);
    const challengerRosterSize = challengerTeam.members.length;
    const opponentRosterSize = opponentTeam.members.length;

    if (challengerRosterSize < N) {
      return NextResponse.json({ error: `You need ${N - challengerRosterSize} more player(s) for format size ${N}.` }, { status: 400 });
    }
    if (opponentRosterSize < N) {
      return NextResponse.json({ error: `Opponent team needs ${N - opponentRosterSize} more player(s) for format size ${N}.` }, { status: 400 });
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

    const match = await prisma.$transaction(async (tx) => {
      const m = await tx.match.create({
        data: {
          teamA_Id: challengerTeamId,
          teamB_Id: opponentTeamId,
          status: 'PENDING',
          sportType: matchSportType,
          matchDate: proposedDate || null,
        },
        include: {
          teamA: { select: { id: true, name: true } },
          teamB: { select: { id: true, name: true } },
        },
      });

      if (note && note.trim()) {
        await tx.matchChatMessage.create({
          data: {
            matchId: m.id,
            playerId: playerId,
            teamId: challengerTeamId,
            message: note.trim(),
          }
        });
      }

      return m;
    });

    await notify({
      userIds: [opponentTeam.ownerId],
      type: 'challenge_received',
      url: `/en/interact/match/${match.id}`,
      params: { teamName: match.teamA.name },
      actorId: playerId
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
        teamA: { select: { id: true, name: true, ownerId: true } },
        teamB: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            members: {
              select: {
                playerId: true,
                role: true
              }
            }
          }
        },
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
      const formatSize = (() => {
        const sport = match.sportType ?? '';
        if (sport.includes('5')) return 5;
        if (sport.includes('6')) return 6;
        if (sport.includes('7')) return 7;
        if (sport.includes('FULL') || sport === 'FOOTBALL' || sport === 'CRICKET') return 11;
        return 5;
      })();
      const myRosterSize = teamB.members.length;
      if (myRosterSize < formatSize) {
        return NextResponse.json({ error: `You need ${formatSize - myRosterSize} more player(s) for format size ${formatSize}.` }, { status: 400 });
      }

      const updated = await prisma.match.update({
        where: { id: matchId },
        data: { status: 'INTERACTION' },
      });

      await notify({
        userIds: [match.teamA.ownerId],
        type: 'challenge_accepted',
        url: `/en/interact/match/${matchId}`,
        params: { teamName: match.teamB.name },
        actorId: playerId
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
        teamType: 'REGULAR',
        OR: [
          { ownerId: playerId },
          { members: { some: { playerId, role: { in: ['owner', 'manager', 'captain'] } } } },
        ],
      },
      select: { id: true },
    });

    const myTeamIds = myTeams.map(t => t.id);

    const matchInclude = {
      teamA: { select: { id: true, name: true, logoUrl: true, sportType: true, teamMmr: true, completedCount: true } },
      teamB: { select: { id: true, name: true, logoUrl: true, sportType: true, teamMmr: true, completedCount: true } },
      playerStats: { where: { teamId: { in: myTeamIds } }, select: { id: true, badge: true } },
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
