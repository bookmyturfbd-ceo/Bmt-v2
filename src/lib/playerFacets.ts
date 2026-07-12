/**
 * playerFacets.ts — Server-only derived stat engine
 *
 * Computes 6 facets (0–99) + overall rating for a player in a given sport.
 * NEVER imported by client components. All math runs on the server.
 *
 * Facets:
 *   Football/Futsal: ATT (goals/match), PLY (assists/match), FRM (MMR trend),
 *                    WIN (weighted win rate), REL (attendance), EXP (log experience)
 *   Cricket:         BAT (runs+SR), BWL (wickets+economy), FRM, WIN, REL, EXP
 *
 * Overall = weighted blend anchored to MMR percentile (trusted signal).
 */

import prisma from '@/lib/prisma';
import { getRankData } from '@/lib/rankUtils';

export type FacetSport = 'football' | 'cricket';

export interface PlayerFacets {
  sport: FacetSport;
  // Football / Futsal labels
  ATT: number;  // 0–99
  PLY: number;  // 0–99
  // Cricket re-uses ATT slot for BAT, PLY for BWL — label layer handles display
  FRM: number;  // 0–99
  WIN: number;  // 0–99
  REL: number;  // 0–99
  EXP: number;  // 0–99
  overall: number;  // 0–99
  provisional: boolean;
  matchCount: number;
  // Form strip data
  last5: Array<{ outcome: 'W' | 'L' | 'D'; mmrDelta: number }>;
  mmrDeltaMonth: number;  // net MMR change over last 30 days
}

// ─── Normalization helpers ────────────────────────────────────────────────────

/** Clamp a value to [0, 99] */
function clamp99(v: number): number {
  return Math.max(0, Math.min(99, Math.round(v)));
}

/** Map a rate (0.0–1.0 or higher) to 0–99 using a soft ceiling */
function rateToFacet(rate: number, ceiling: number): number {
  if (ceiling <= 0) return 0;
  return clamp99((rate / ceiling) * 99);
}

/** Map MMR to a 0–99 percentile within the bracket system */
function mmrToPercentile(mmr: number): number {
  // Legend cap: 2700+ → treated as 99 at 3500
  const MAX_MMR = 3500;
  return clamp99((mmr / MAX_MMR) * 99);
}

/** Experience: log curve, saturates around 100 matches at 99 */
function expFacet(matchCount: number): number {
  if (matchCount <= 0) return 0;
  return clamp99(Math.log(matchCount + 1) / Math.log(102) * 99);
}

/** FRM: MMR slope over last N matches → 0–99 (50 = flat) */
function frmFacet(mmrDeltas: number[]): number {
  if (mmrDeltas.length === 0) return 50;
  const total = mmrDeltas.reduce((s, d) => s + d, 0);
  // Map -200 to +200 range → 0 to 99 (50 = flat/zero)
  const mapped = 50 + (total / 4); // each delta ≈ ±25 MMR → ±6 facet points
  return clamp99(mapped);
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function computePlayerFacets(
  playerId: string,
  sport: FacetSport,
  playerMmr: number
): Promise<PlayerFacets> {
  const isCricket = sport === 'cricket';

  // Get player team memberships to query tournament matches
  const teamMembers = await prisma.teamMember.findMany({
    where: { playerId },
    select: { teamId: true },
  });
  const teamIds = teamMembers.map(m => m.teamId);

  // Get all completed ranked matches for this player in this sport category
  const stats = await prisma.playerMatchStat.findMany({
    where: {
      playerId,
      match: {
        status: 'COMPLETED',
        sportType: isCricket
          ? { in: ['CRICKET', 'CRICKET_7', 'CRICKET_FULL'] }
          : { in: ['FUTSAL', 'FUTSAL_5', 'FUTSAL_6', 'FUTSAL_7', 'FOOTBALL', 'FOOTBALL_FULL'] },
      },
    },
    include: {
      match: {
        select: {
          id: true,
          winnerId: true,
          teamA_Id: true,
          teamB_Id: true,
          createdAt: true,
          teamA: { select: { teamMmr: true } },
          teamB: { select: { teamMmr: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Query completed tournament matches for this player's teams and parse events
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

      const isCricketMatch = m.tournament.sport === 'CRICKET';
      if (isCricket !== isCricketMatch) continue;

      const events = (m.resultSummary as any)?.events || [];
      const goalsCount = events.filter((e: any) => e.type === 'goal' && e.scorerPlayerId === playerId && e.teamId === myTeamId).length;
      const assistsCount = events.filter((e: any) => e.type === 'goal' && e.assistPlayerId === playerId && e.teamId === myTeamId).length;
      const hasYellowCard = events.some((e: any) => e.type === 'card' && e.cardType === 'YELLOW' && e.scorerPlayerId === playerId);
      const hasRedCard = events.some((e: any) => e.type === 'card' && e.cardType === 'RED' && e.scorerPlayerId === playerId);

      if (goalsCount > 0 || assistsCount > 0 || hasYellowCard || hasRedCard) {
        tournamentStats.push({
          id: `tourney-stat-${m.id}`,
          matchId: m.id,
          playerId,
          teamId: myTeamId,
          badge: 'NONE',
          badgeBonus: 0,
          goals: goalsCount,
          assists: assistsCount,
          runs: 0,
          wickets: 0,
          overs: 0,
          yellowCard: hasYellowCard,
          redCard: hasRedCard,
          mmrChange: 0,
          createdAt: m.createdAt,
          match: {
            id: m.id,
            sportType: isCricket ? 'CRICKET_FULL' : 'FUTSAL_5',
            winnerId: m.winnerId,
            teamA_Id: m.teamAId,
            teamB_Id: m.teamBId,
            createdAt: m.createdAt,
            teamA: { teamMmr: 1000 },
            teamB: { teamMmr: 1000 },
          }
        });
      }
    }
  }

  // Merge regular and tournament stats, sorting chronologically by date
  const mergedStats = [...stats, ...tournamentStats].sort(
    (a, b) => new Date(b.createdAt || b.match?.createdAt).getTime() - new Date(a.createdAt || a.match?.createdAt).getTime()
  );

  const matchCount = mergedStats.length;
  const provisional = matchCount < 3;

  if (matchCount === 0) {
    return {
      sport, ATT: 0, PLY: 0, FRM: 50, WIN: 0, REL: 0, EXP: 0,
      overall: 0, provisional: true, matchCount: 0, last5: [], mmrDeltaMonth: 0,
    };
  }

  // ── EXP ──────────────────────────────────────────────────────────────────
  const EXP = expFacet(matchCount);

  // ── ATT / PLY (football) or BAT / BWL (cricket) ──────────────────────────
  let ATT = 0;
  let PLY = 0;

  if (isCricket) {
    const totalRuns = mergedStats.reduce((s, st) => s + (st.runs ?? 0), 0);
    const totalWickets = mergedStats.reduce((s, st) => s + (st.wickets ?? 0), 0);
    const totalOvers = mergedStats.reduce((s, st) => s + (st.overs ?? 0), 0);
    const runsPerMatch = totalRuns / matchCount;
    const wicketsPerMatch = totalWickets / matchCount;
    const economy = totalOvers > 0 ? totalRuns / totalOvers : 0; // runs per over conceded
    // BAT: normalize runs/match against soft ceiling of 40 runs/match for 99
    ATT = rateToFacet(runsPerMatch, 40);
    // BWL: wickets/match normalized vs ceiling 2, penalize high economy
    const rawBwl = (wicketsPerMatch / 2) * 99;
    const economyPenalty = economy > 0 ? Math.max(0, (economy - 6) * 5) : 0; // penalize >6 RPO
    PLY = clamp99(rawBwl - economyPenalty);
  } else {
    const totalGoals = mergedStats.reduce((s, st) => s + (st.goals ?? 0), 0);
    const totalAssists = mergedStats.reduce((s, st) => s + (st.assists ?? 0), 0);
    const goalsPerMatch = totalGoals / matchCount;
    const assistsPerMatch = totalAssists / matchCount;
    // Normalize against soft ceilings: 1 goal/match = ~80; 0.8 assist/match = ~80
    ATT = rateToFacet(goalsPerMatch, 1.2);
    PLY = rateToFacet(assistsPerMatch, 1.0);
  }

  // ── WIN (weighted win rate) ───────────────────────────────────────────────
  let weightedWins = 0;
  let totalWeight = 0;
  for (const st of mergedStats) {
    const m = st.match;
    if (!m) continue;
    const isWin = m.winnerId === st.teamId;
    const isDraw = m.winnerId === null;
    const opponentTeam = st.teamId === m.teamA_Id ? m.teamB : m.teamA;
    const opponentMmr = opponentTeam?.teamMmr ?? 1000;
    // Higher opponent MMR → higher weight
    const weight = Math.max(0.5, opponentMmr / 1000);
    totalWeight += weight;
    if (isWin) weightedWins += weight;
    else if (isDraw) weightedWins += weight * 0.5;
  }
  const winRate = totalWeight > 0 ? weightedWins / totalWeight : 0;
  const WIN = clamp99(winRate * 99);

  // ── FRM (last 10 matches MMR trend) ──────────────────────────────────────
  const last10 = mergedStats.slice(0, 10);
  const mmrDeltas = last10.map(st => st.mmrChange + (st.badgeBonus ?? 0));
  const FRM = frmFacet(mmrDeltas);

  // ── REL (reliability — approximated by match participation) ──────────────
  // We count matches player appeared in vs total team matches in same period
  // Without check-in data, use match_count vs expected matches (soft heuristic)
  // Good enough proxy: high match count relative to team's total = reliable
  const uniqueTeamIds = [...new Set(mergedStats.map(st => st.teamId))];
  let teamTotalMatches = 0;
  if (uniqueTeamIds.length > 0) {
    teamTotalMatches = await prisma.playerMatchStat.count({
      where: {
        teamId: { in: uniqueTeamIds },
        match: {
          status: 'COMPLETED',
          sportType: isCricket
            ? { in: ['CRICKET', 'CRICKET_7', 'CRICKET_FULL'] }
            : { in: ['FUTSAL', 'FUTSAL_5', 'FUTSAL_6', 'FUTSAL_7', 'FOOTBALL', 'FOOTBALL_FULL'] },
        },
      },
    });
  }
  // Player participated in matchCount out of teamTotalMatches roster slots
  const relRate = teamTotalMatches > 0 ? matchCount / teamTotalMatches : 1;
  const REL = clamp99(relRate * 99);

  // ── OVERALL (weighted blend anchored to MMR) ──────────────────────────────
  const mmrPct = mmrToPercentile(playerMmr);
  // Weights: MMR is the trusted anchor; facets flavor it
  const overall = clamp99(
    0.35 * mmrPct +
    0.20 * FRM +
    0.15 * WIN +
    0.15 * ATT +
    0.10 * PLY +
    0.05 * EXP
  );

  // ── Last 5 form strip ─────────────────────────────────────────────────────
  const last5 = mergedStats.slice(0, 5).map(st => {
    const m = st.match;
    let outcome: 'W' | 'L' | 'D' = 'D';
    if (m?.winnerId === st.teamId) outcome = 'W';
    else if (m?.winnerId && m.winnerId !== st.teamId) outcome = 'L';
    return { outcome, mmrDelta: st.mmrChange + (st.badgeBonus ?? 0) };
  });

  // ── MMR delta over last 30 days ───────────────────────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentStats = mergedStats.filter(
    st => (st.createdAt || st.match?.createdAt) && new Date(st.createdAt || st.match?.createdAt) >= thirtyDaysAgo
  );
  const mmrDeltaMonth = recentStats.reduce(
    (s, st) => s + st.mmrChange + (st.badgeBonus ?? 0), 0
  );

  return {
    sport, ATT, PLY, FRM, WIN, REL, EXP,
    overall: provisional ? 0 : overall,
    provisional,
    matchCount,
    last5,
    mmrDeltaMonth,
  };
}
