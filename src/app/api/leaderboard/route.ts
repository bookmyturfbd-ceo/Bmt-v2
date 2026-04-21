import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/leaderboard?type=teams|players&sport=FUTSAL_5|FUTSAL_6|FUTSAL_7|FOOTBALL_FULL|CRICKET_7|CRICKET_FULL&tier=ALL|Bronze|Silver|Gold|Platinum|Legend
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type  = searchParams.get('type')  ?? 'teams';
  const sport = searchParams.get('sport') ?? 'ALL';
  const tier  = searchParams.get('tier')  ?? 'ALL';

  const isCricketSport = sport.includes('CRICKET');
  const mmrField = isCricketSport ? 'cricketMmr' : 'footballMmr';

  // Tier MMR ranges (225-pt brackets)
  const TIER_RANGES: Record<string, [number, number]> = {
    ALL     : [0,    9999],
    Bronze  : [0,    674],
    Silver  : [675,  1349],
    Gold    : [1350, 2024],
    Platinum: [2025, 2699],
    Legend  : [2700, 9999],
  };
  const [minMmr, maxMmr] = TIER_RANGES[tier] ?? [0, 9999];

  try {
    if (type === 'teams') {
      const whereClause: any = {
        [mmrField]: { gte: minMmr, lte: maxMmr },
      };
      if (sport !== 'ALL') whereClause.sportType = sport;

      const teams = await prisma.team.findMany({
        where: whereClause,
        orderBy: { [mmrField]: 'desc' },
        take: 50,
        select: {
          id        : true,
          name      : true,
          sportType : true,
          logoUrl   : true,
          teamMmr   : true,
          footballMmr: true,
          cricketMmr : true,
          _count: {
            select: { members: true }
          },
          matchesAsTeamA: {
            where: { status: 'COMPLETED' },
            select: { id: true, winnerId: true }
          },
          matchesAsTeamB: {
            where: { status: 'COMPLETED' },
            select: { id: true, winnerId: true }
          },
        },
      });

      const enriched = teams.map((t, idx) => {
        const allMatches = [...t.matchesAsTeamA, ...t.matchesAsTeamB];
        const wins   = allMatches.filter(m => m.winnerId === t.id).length;
        const played = allMatches.length;
        const mmr    = isCricketSport ? t.cricketMmr : t.footballMmr;
        return {
          rank     : idx + 1,
          id       : t.id,
          name     : t.name,
          sportType: t.sportType,
          logoUrl  : t.logoUrl,
          mmr,
          members  : t._count.members,
          played,
          wins,
          winRate  : played > 0 ? Math.round((wins / played) * 100) : 0,
        };
      });

      return NextResponse.json({ leaderboard: enriched });
    }

    // Players
    const playerWhere: any = {
      [mmrField]: { gte: minMmr, lte: maxMmr },
    };

    const players = await prisma.player.findMany({
      where: playerWhere,
      orderBy: { [mmrField]: 'desc' },
      take: 50,
      select: {
        id          : true,
        fullName    : true,
        avatarUrl   : true,
        footballMmr : true,
        cricketMmr  : true,
        teamMemberships: {
          take: 1,
          where: sport !== 'ALL' ? { team: { sportType: sport as any } } : undefined,
          select: {
            team: {
              select: { id: true, name: true, logoUrl: true, sportType: true }
            }
          }
        },
        matchStats: {
          where: { match: { status: 'COMPLETED' } },
          select: { mmrChange: true, badgeBonus: true, badge: true }
        },
      },
    });

    const enrichedPlayers = players.map((p, idx) => {
      const mmr     = isCricketSport ? p.cricketMmr : p.footballMmr;
      const team    = p.teamMemberships[0]?.team ?? null;
      const stats   = p.matchStats;
      const badges  = stats.filter((s: { badge: string | null; mmrChange: number; badgeBonus: number }) => s.badge && s.badge !== 'NONE').length;
      const played  = stats.length;
      return {
        rank    : idx + 1,
        id      : p.id,
        fullName: p.fullName,
        avatarUrl: p.avatarUrl,
        mmr,
        team,
        played,
        badges,
      };
    });

    return NextResponse.json({ leaderboard: enrichedPlayers });
  } catch (e: any) {
    console.error('[leaderboard GET]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
