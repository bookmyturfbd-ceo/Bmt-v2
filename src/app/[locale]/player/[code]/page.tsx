import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { computePlayerFacets } from '@/lib/playerFacets';
import { getRankData, isProvisional } from '@/lib/rankUtils';
import { PublicProfileClient } from './PublicProfileClient';

export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; code: string }> }) {
  const { code } = await params;
  const player = await prisma.player.findUnique({
    where: { playerCode: code },
    select: { fullName: true, avatarUrl: true, position: true, footballMmr: true },
  });
  if (!player) return { title: 'Player Not Found — BMT' };
  return {
    title: `${player.fullName} · BMT Player Profile`,
    description: `View ${player.fullName}'s BMT profile — rank, stats, and FIFA-style player card.`,
    openGraph: {
      title: `${player.fullName} — BMT`,
      images: player.avatarUrl ? [player.avatarUrl] : [],
    },
  };
}

export default async function PublicPlayerPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;

  // Identify if viewer is the owner
  const cookieStore = await cookies();
  const viewerPlayerId = cookieStore.get('bmt_player_id')?.value;

  // ── Fetch public player data (no financial fields) ────────────────────────
  const player = await prisma.player.findUnique({
    where: { playerCode: code },
    select: {
      id: true, fullName: true, playerCode: true, joinedAt: true,
      avatarUrl: true, banStatus: true,
      mmr: true, footballMmr: true, cricketMmr: true,
      tournamentFootballMmr: true, tournamentCricketMmr: true,
      position: true, preferredFoot: true, ageBracket: true,
      homeArea: { select: { id: true, name: true } },
      khepAvailability: { select: { available: true, positions: true, areas: true } },
      teamMemberships: {
        where: { team: { isDisbanded: false } },
        select: {
          role: true,
          team: {
            select: {
              id: true, name: true, logoUrl: true, sportType: true,
              teamMmr: true, isVerified: true,
            },
          },
        },
      },
      matchStats: {
        where: { match: { status: 'COMPLETED' } },
        select: {
          goals: true, assists: true, runs: true, wickets: true, overs: true,
          badge: true, mmrChange: true, badgeBonus: true,
          createdAt: true,
          match: {
            select: {
              id: true, sportType: true, winnerId: true,
              teamA_Id: true, teamB_Id: true, createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      badges: {
        select: {
          id: true, title: true, description: true, icon: true,
          earnedAt: true, isShowcased: true,
        },
      },
    },
  });

  if (!player || player.banStatus === 'perma') notFound();

  const isOwner = viewerPlayerId === player.id;

  // ── Compute facets (server-side) ──────────────────────────────────────────
  const [footballFacets, cricketFacets] = await Promise.all([
    computePlayerFacets(player.id, 'football', player.footballMmr ?? player.mmr ?? 1000),
    computePlayerFacets(player.id, 'cricket', player.cricketMmr ?? 1000),
  ]);

  // ── Rank data ─────────────────────────────────────────────────────────────
  const fbRank = getRankData(player.footballMmr ?? player.mmr ?? 1000);
  const ckRank = getRankData(player.cricketMmr ?? 1000);

  // ── Query completed tournament matches for the player's teams ─────────────
  const teamIds = player.teamMemberships.map(m => m.team.id);
  const tournamentStats: any[] = [];
  if (teamIds.length > 0) {
    const tourneyMatches = await prisma.tournamentMatch.findMany({
      where: {
        status: 'COMPLETED',
        OR: [
          { teamAId: { in: teamIds } },
          { teamBId: { in: teamIds } }
        ]
      },
      include: {
        tournament: {
          select: { sport: true }
        }
      }
    });

    for (const m of tourneyMatches) {
      const myTeamId = teamIds.find(tid => tid === m.teamAId || tid === m.teamBId);
      if (!myTeamId) continue;

      const events = (m.resultSummary as any)?.events || [];
      const goalsCount = events.filter((e: any) => e.type === 'goal' && e.scorerPlayerId === player.id && e.teamId === myTeamId).length;
      const assistsCount = events.filter((e: any) => e.type === 'goal' && e.assistPlayerId === player.id && e.teamId === myTeamId).length;
      const hasYellowCard = events.some((e: any) => e.type === 'card' && e.cardType === 'YELLOW' && e.scorerPlayerId === player.id);
      const hasRedCard = events.some((e: any) => e.type === 'card' && e.cardType === 'RED' && e.scorerPlayerId === player.id);

      if (goalsCount > 0 || assistsCount > 0 || hasYellowCard || hasRedCard) {
        tournamentStats.push({
          id: `tourney-stat-${m.id}`,
          matchId: m.id,
          playerId: player.id,
          teamId: myTeamId,
          goals: goalsCount,
          assists: assistsCount,
          runs: 0,
          wickets: 0,
          overs: 0,
          yellowCard: hasYellowCard,
          redCard: hasRedCard,
          createdAt: m.createdAt,
          match: {
            id: m.id,
            sportType: m.tournament.sport === 'CRICKET' ? 'CRICKET_FULL' : 'FUTSAL_5',
            winnerId: m.winnerId,
            teamA_Id: m.teamAId,
            teamB_Id: m.teamBId,
            createdAt: m.createdAt,
          }
        });
      }
    }
  }

  // ── Stat summaries (Regular + Tournament merged) ──────────────────────────
  const allStats = [...player.matchStats, ...tournamentStats];
  const fbStats = allStats.filter(s => s.match?.sportType && !s.match.sportType.includes('CRICKET'));
  const ckStats = allStats.filter(s => s.match?.sportType?.includes('CRICKET'));

  const matchSummary = {
    football: {
      count: fbStats.length,
      goals: fbStats.reduce((s, st) => s + (st.goals ?? 0), 0),
      assists: fbStats.reduce((s, st) => s + (st.assists ?? 0), 0),
    },
    cricket: {
      count: ckStats.length,
      runs: ckStats.reduce((s, st) => s + (st.runs ?? 0), 0),
      wickets: ckStats.reduce((s, st) => s + (st.wickets ?? 0), 0),
    },
  };

  // ── Peak tournament finish ────────────────────────────────────────────────
  let peakTournamentFinish: number | null = null;
  if (teamIds.length > 0) {
    const standing = await prisma.tournamentStanding.findFirst({
      where: { teamId: { in: teamIds }, position: { gt: 0 } },
      orderBy: { position: 'asc' },
      select: { position: true },
    });
    if (standing) peakTournamentFinish = standing.position;
  }

  // ── Active season ─────────────────────────────────────────────────────────
  const activeSeason = await prisma.season.findFirst({
    where: { isActive: true },
    select: { name: true, endsAt: true, sport: true },
  });

  // ── Primary team crest (first team as owner/captain) ──────────────────────
  const primaryTeam = player.teamMemberships.find(m =>
    ['owner', 'manager', 'captain'].includes(m.role)
  )?.team ?? player.teamMemberships[0]?.team ?? null;

  return (
    <PublicProfileClient
      player={{
        id: player.id,
        fullName: player.fullName,
        playerCode: player.playerCode,
        joinedAt: player.joinedAt.toISOString(),
        avatarUrl: player.avatarUrl,
        position: player.position,
        preferredFoot: player.preferredFoot,
        ageBracket: player.ageBracket,
        homeArea: player.homeArea,
        khep: player.khepAvailability,
        footballMmr: player.footballMmr ?? player.mmr ?? 1000,
        cricketMmr: player.cricketMmr ?? 1000,
        tournamentFootballMmr: player.tournamentFootballMmr ?? 1000,
        tournamentCricketMmr: player.tournamentCricketMmr ?? 1000,
        isFootballProvisional: isProvisional(fbStats.length),
        isCricketProvisional: isProvisional(ckStats.length),
        peakTournamentFinish,
        teams: player.teamMemberships as any,
        badges: player.badges as any,
        matchSummary,
      }}
      facets={{ football: footballFacets, cricket: cricketFacets }}
      fbRank={fbRank}
      ckRank={ckRank}
      primaryTeamLogoUrl={primaryTeam?.logoUrl ?? null}
      isOwner={isOwner}
      locale={locale}
      activeSeason={activeSeason ? { name: activeSeason.name, endsAt: activeSeason.endsAt.toISOString() } : null}
    />
  );
}
