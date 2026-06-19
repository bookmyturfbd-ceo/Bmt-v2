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
  const category = searchParams.get('category') ?? 'ranked';

  const isCricketSport = sport.includes('CRICKET');
  let mmrField = isCricketSport ? 'cricketMmr' : 'footballMmr';
  if (category === 'tournament') {
    mmrField = isCricketSport ? 'tournamentCricketMmr' : 'tournamentFootballMmr';
  }

  let sportTypes: any = [sport];
  if (sport === 'FUTSAL') sportTypes = ['FUTSAL', 'FUTSAL_5', 'FUTSAL_6', 'FUTSAL_7'];
  if (sport === 'FOOTBALL') sportTypes = ['FOOTBALL', 'FOOTBALL_FULL'];
  if (sport === 'CRICKET') sportTypes = ['CRICKET', 'CRICKET_7', 'CRICKET_FULL'];

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

  // Load tournament players who have played completed tournament matches
  let playedPlayerIds = new Set<string>();
  if (category === 'tournament' && type === 'players') {
    const completedTMatches = await prisma.tournamentMatch.findMany({
      where: { status: { in: ['COMPLETED', 'WALKOVER'] } },
      select: { teamAId: true, teamBId: true }
    });
    const teamIds = new Set<string>();
    completedTMatches.forEach(m => {
      teamIds.add(m.teamAId);
      teamIds.add(m.teamBId);
    });
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId: { in: Array.from(teamIds) } },
      select: { playerId: true }
    });
    playedPlayerIds = new Set(teamMembers.map(m => m.playerId));
  }

  try {
    if (type === 'teams') {
      if (sport === 'ALL') {
        const teams = await prisma.team.findMany({
          where: {
            isDisbanded: false,
          },
          select: {
            id        : true,
            name      : true,
            sportType : true,
            logoUrl   : true,
            teamMmr   : true,
            footballMmr: true,
            cricketMmr : true,
            tournamentFootballMmr: true,
            tournamentCricketMmr: true,
            isDisbanded: true,
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

        const enriched = teams.map(t => {
          const allMatches = [...t.matchesAsTeamA, ...t.matchesAsTeamB];
          const wins   = allMatches.filter(m => m.winnerId === t.id).length;
          const played = allMatches.length;
          const mmrFieldForTeam = t.sportType?.includes('CRICKET')
            ? (category === 'tournament' ? 'tournamentCricketMmr' : 'cricketMmr')
            : (category === 'tournament' ? 'tournamentFootballMmr' : 'footballMmr');
          const mmr    = t[mmrFieldForTeam] as number;
          return {
            id       : t.id,
            name     : t.name,
            sportType: t.sportType,
            logoUrl  : t.logoUrl,
            mmr,
            members  : t._count.members,
            played,
            wins,
            winRate  : played > 0 ? Math.round((wins / played) * 100) : 0,
            isDisbanded: t.isDisbanded,
          };
        })
        .filter(t => t.mmr >= minMmr && t.mmr <= maxMmr)
        .sort((a, b) => b.mmr - a.mmr);

        const top50 = enriched.slice(0, 50).map((t, idx) => ({
          ...t,
          rank: idx + 1,
        }));

        return NextResponse.json({ leaderboard: top50 });
      } else {
        const whereClause: any = {
          [mmrField]: { gte: minMmr, lte: maxMmr },
          isDisbanded: false,
          sportType: { in: sportTypes },
        };

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
            tournamentFootballMmr: true,
            tournamentCricketMmr: true,
            isDisbanded: true,
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
          const mmr    = t[mmrField as keyof typeof t] as number;
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
            isDisbanded: t.isDisbanded,
          };
        });

        return NextResponse.json({ leaderboard: enriched });
      }
    }

    // Players
    if (sport === 'ALL') {
      const footballField = category === 'tournament' ? ('tournamentFootballMmr' as const) : ('footballMmr' as const);
      const cricketField = category === 'tournament' ? ('tournamentCricketMmr' as const) : ('cricketMmr' as const);

      const whereClause: any = {};
      if (category === 'tournament') {
        whereClause.id = { in: Array.from(playedPlayerIds) };
      } else {
        whereClause.matchStats = {
          some: { match: { status: 'COMPLETED' } }
        };
      }

      const players = await prisma.player.findMany({
        where: whereClause,
        select: {
          id          : true,
          fullName    : true,
          avatarUrl   : true,
          footballMmr : true,
          cricketMmr  : true,
          tournamentFootballMmr: true,
          tournamentCricketMmr: true,
          teamMemberships: {
            take: 1,
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

      const enrichedPlayers = players.map(p => {
        const fMmr = p[footballField];
        const cMmr = p[cricketField];
        const mmr = Math.max(fMmr, cMmr);
        const team = p.teamMemberships[0]?.team ?? null;
        const stats = p.matchStats;
        const badges = stats.filter(s => s.badge && s.badge !== 'NONE').length;
        const played = stats.length;
        return {
          id: p.id,
          fullName: p.fullName,
          avatarUrl: p.avatarUrl,
          mmr,
          team,
          played,
          badges,
        };
      })
      .filter(p => p.mmr >= minMmr && p.mmr <= maxMmr)
      .sort((a, b) => b.mmr - a.mmr);

      const top50 = enrichedPlayers.slice(0, 50).map((p, idx) => ({
        ...p,
        rank: idx + 1,
      }));

      return NextResponse.json({ leaderboard: top50 });
    } else {
      const playerWhere: any = {
        [mmrField]: { gte: minMmr, lte: maxMmr },
      };
      if (category === 'tournament') {
        playerWhere.id = { in: Array.from(playedPlayerIds) };
      } else {
        playerWhere.matchStats = {
          some: { match: { status: 'COMPLETED' } }
        };
      }

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
            where: { team: { sportType: { in: sportTypes } } },
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
    }
  } catch (e: any) {
    console.error('[leaderboard GET]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
