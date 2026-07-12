/**
 * GET /api/players/public/[code]
 *
 * Public player profile — accessible by ANY BMT user without authentication.
 * SECURITY: This route deliberately omits all financial and private fields.
 * The select clause is the enforcement layer — no money data can leak.
 *
 * Returns: public identity, rank, facets, badges, teams, stats
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { computePlayerFacets } from '@/lib/playerFacets';
import { isProvisional } from '@/lib/rankUtils';

type Params = Promise<{ code: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { code } = await params;

  try {
    // ─── Public fields ONLY — no walletBalance, loyaltyPoints, email, phone, password ───
    const player = await prisma.player.findUnique({
      where: { playerCode: code },
      select: {
        id:            true,
        fullName:      true,
        playerCode:    true,
        joinedAt:      true,
        avatarUrl:     true,
        banStatus:     true,
        // MMR (public — displayed on rank card)
        mmr:           true,
        footballMmr:   true,
        cricketMmr:    true,
        tournamentFootballMmr: true,
        tournamentCricketMmr:  true,
        // Identity
        position:      true,
        preferredFoot: true,
        ageBracket:    true,
        homeArea:      { select: { id: true, name: true } },
        // Khep
        khepAvailability: { select: { available: true, positions: true, areas: true } },
        // Teams (public — name, crest only)
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
        // Match stats (for facet computation + display)
        matchStats: {
          where: { match: { status: 'COMPLETED' } },
          select: {
            goals: true, assists: true, runs: true, wickets: true,
            overs: true, badge: true, mmrChange: true, badgeBonus: true,
            match: {
              select: {
                id: true, sportType: true, winnerId: true, createdAt: true,
                teamA_Id: true, teamB_Id: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        // Badges (showcase + all earned)
        badges: {
          select: {
            id: true, title: true, description: true, icon: true,
            earnedAt: true, isShowcased: true,
          },
        },
      },
    });

    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Block perma-banned players from public profile
    if (player.banStatus === 'perma') {
      return NextResponse.json({ error: 'Profile unavailable' }, { status: 403 });
    }

    // ─── Football match count (for provisional gate) ──────────────────────
    const fbStats = player.matchStats.filter(s =>
      s.match?.sportType && !s.match.sportType.includes('CRICKET')
    );
    const ckStats = player.matchStats.filter(s =>
      s.match?.sportType?.includes('CRICKET')
    );
    const fbCount = fbStats.length;
    const ckCount = ckStats.length;

    // ─── Compute facets server-side ───────────────────────────────────────
    const [footballFacets, cricketFacets] = await Promise.all([
      computePlayerFacets(player.id, 'football', player.footballMmr ?? player.mmr ?? 1000),
      computePlayerFacets(player.id, 'cricket',  player.cricketMmr  ?? 1000),
    ]);

    // ─── Peak tournament finish ───────────────────────────────────────────
    const teamIds = player.teamMemberships.map(m => m.team.id);
    let peakTournamentFinish: number | null = null;
    if (teamIds.length > 0) {
      const standing = await prisma.tournamentStanding.findFirst({
        where: { teamId: { in: teamIds }, position: { gt: 0 } },
        orderBy: { position: 'asc' },
        select: { position: true },
      });
      if (standing) peakTournamentFinish = standing.position;
    }

    // ─── Active season (for HoF surfacing) ───────────────────────────────
    const activeSeason = await prisma.season.findFirst({
      where: { isActive: true },
      select: { name: true, endsAt: true, sport: true },
    });

    return NextResponse.json({
      player: {
        id:            player.id,
        fullName:      player.fullName,
        playerCode:    player.playerCode,
        joinedAt:      player.joinedAt,
        avatarUrl:     player.avatarUrl,
        position:      player.position,
        preferredFoot: player.preferredFoot,
        ageBracket:    player.ageBracket,
        homeArea:      player.homeArea,
        khep:          player.khepAvailability,
        // MMR values (public)
        footballMmr:   player.footballMmr ?? player.mmr ?? 1000,
        cricketMmr:    player.cricketMmr ?? 1000,
        tournamentFootballMmr: player.tournamentFootballMmr ?? 1000,
        tournamentCricketMmr:  player.tournamentCricketMmr  ?? 1000,
        isFootballProvisional: isProvisional(fbCount),
        isCricketProvisional:  isProvisional(ckCount),
        peakTournamentFinish,
        teams:         player.teamMemberships,
        badges:        player.badges,
        // Match summary for stat tiles (no raw financial data)
        matchSummary: {
          football: { count: fbCount, goals: fbStats.reduce((s, st) => s + (st.goals ?? 0), 0), assists: fbStats.reduce((s, st) => s + (st.assists ?? 0), 0) },
          cricket:  { count: ckCount, runs: ckStats.reduce((s, st) => s + (st.runs ?? 0), 0), wickets: ckStats.reduce((s, st) => s + (st.wickets ?? 0), 0) },
        },
      },
      facets: { football: footballFacets, cricket: cricketFacets },
      activeSeason,
    });
  } catch (err: any) {
    console.error('[public player GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
