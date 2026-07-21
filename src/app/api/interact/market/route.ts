import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

async function calcTeamStats(teamId: string) {
  // Last 5 completed matches for this team
  const matches = await prisma.match.findMany({
    where: {
      status: 'COMPLETED',
      OR: [{ teamA_Id: teamId }, { teamB_Id: teamId }],
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      status: true,
      winnerId: true,
      teamA_Id: true,
      teamB_Id: true,
      scoreA: true,
      scoreB: true,
      teamA: { select: { id: true, name: true, logoUrl: true } },
      teamB: { select: { id: true, name: true, logoUrl: true } },
    },
  });

  const history = matches.map(m => {
    const outcome = m.winnerId === teamId ? 'W' : (m.winnerId === null && m.scoreA === m.scoreB && m.status === 'COMPLETED') ? 'D' : 'L';
    const opponent = m.teamA_Id === teamId ? m.teamB : m.teamA;
    return { outcome, won: outcome === 'W', opponent, scoreA: m.scoreA, scoreB: m.scoreB };
  });

  // Calculate current win streak (most recent first)
  let winStreak = 0;
  for (const h of history) {
    if (h.outcome === 'W') winStreak++;
    else break;
  }

  // Calculate completed and disputed matches to derive trustScore
  const [completedCount, disputedCount] = await Promise.all([
    prisma.match.count({
      where: {
        status: 'COMPLETED',
        OR: [{ teamA_Id: teamId }, { teamB_Id: teamId }],
      },
    }),
    prisma.match.count({
      where: {
        status: 'DISPUTED',
        OR: [{ teamA_Id: teamId }, { teamB_Id: teamId }],
      },
    }),
  ]);

  const totalMatches = completedCount + disputedCount;
  let trustScore = 100;
  if (totalMatches > 0) {
    trustScore = Math.round((completedCount / totalMatches) * 100);
  }

  return { history, winStreak, completedCount, disputedCount, trustScore };
}

export async function GET(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    const cfg = await prisma.challengeMarketConfig.findUnique({ where: { id: 'singleton' } });
    const isFree = cfg?.isFree ?? false;

    const activeSeason = await prisma.challengeSeason.findFirst({
      where: { isActive: true },
    });

    // Check if user is part of any test team
    const userTestTeams = await prisma.teamMember.findMany({
      where: { playerId, team: { isTestTeam: true } },
      select: { teamId: true }
    });
    const isTestUser = userTestTeams.length > 0;

    const baseWhere: any = isFree 
      ? { isDisbanded: false, teamType: 'REGULAR' }
      : {
          isDisbanded: false,
          teamType: 'REGULAR',
          isSubscribed: true,
        };

    if (!isTestUser) {
      baseWhere.isTestTeam = false;
    }

    const teams = await prisma.team.findMany({
      where: baseWhere,
      select: {
        id: true,
        name: true,
        logoUrl: true,
        sportType: true,
        teamMmr: true,
        ownerId: true,
        isSubscribed: true,
        isVerified: true,
        teamCode: true,
        isTestTeam: true,
        challengeSubscription: {
          select: { active: true, subscribedAt: true, gracePeriodEnd: true },
        },
        members: {
          select: {
            playerId: true,
            role: true,
            sportRole: true,
            player: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                mmr: true,
                level: true,
              },
            },
          },
        },
        homeAreas: { select: { id: true, name: true } },
        homeTurfs: { select: { id: true, name: true } },
      },
      orderBy: { teamMmr: 'desc' },
    });

    const myTeams: any[] = [];
    const otherTeams: any[] = [];

    for (const t of teams) {
      const isOwner = t.ownerId === playerId;
      const memberRole = t.members.find((m: any) => m.playerId === playerId)?.role;
      const isOMC = isOwner || ['owner', 'manager', 'captain'].includes(memberRole ?? '');
      const stats = await calcTeamStats(t.id);
      const enriched = { ...t, ...stats };
      if (isOMC) {
        myTeams.push(enriched);
      } else {
        otherTeams.push(enriched);
      }
    }

    return NextResponse.json({ myTeams, otherTeams, activeSeason });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
