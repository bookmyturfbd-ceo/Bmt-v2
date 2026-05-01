/**
 * Tournament Engine — Standing Calculator
 * Recomputes standings from scratch from match results.
 * Called after every match completes so standings are always consistent.
 */

export type MatchResult = {
  id: string;
  teamAId: string;
  teamBId: string;
  winnerId: string | null;
  status: string;
  resultSummary: Record<string, unknown> | null;
  groupId: string | null;
};

export type Standing = {
  teamId: string;
  tournamentId: string;
  groupId: string | null;
  played: number;
  won: number;
  lost: number;
  drawn: number;      // football
  noResult: number;   // cricket
  points: number;
  nrr: number;        // cricket
  goalDifference: int;
  goalsScored: number;
  goalsConceded: number;
  headToHead: Record<string, { pts: number; gd?: number; nrr?: number }>;
  position: number;
  qualified: boolean;
};

type int = number;

// ── Football standings ─────────────────────────────────────────────────────
// Points: Win=3, Draw=1, Loss=0
// Tiebreaker: Points → GD → Goals scored → H2H → coin toss (flagged)
export function computeFootballStandings(
  matches: MatchResult[],
  groupId: string | null,
  tournamentId: string
): Standing[] {
  const standings = new Map<string, Standing>();

  const get = (teamId: string): Standing => {
    if (!standings.has(teamId)) {
      standings.set(teamId, {
        teamId,
        tournamentId,
        groupId,
        played: 0, won: 0, lost: 0, drawn: 0, noResult: 0,
        points: 0, nrr: 0, goalDifference: 0, goalsScored: 0,
        goalsConceded: 0, headToHead: {}, position: 0, qualified: false,
      });
    }
    return standings.get(teamId)!;
  };

  for (const m of matches) {
    if (m.status !== 'COMPLETED' && m.status !== 'WALKOVER') continue;

    const a = get(m.teamAId);
    const b = get(m.teamBId);

    if (m.status === 'WALKOVER') {
      // Walkover: winner gets 3 pts, loser 0, no goals
      if (m.winnerId) {
        const winner = m.winnerId === m.teamAId ? a : b;
        const loser = m.winnerId === m.teamAId ? b : a;
        winner.played++; winner.won++; winner.points += 3;
        loser.played++; loser.lost++;
      }
      continue;
    }

    const summary = m.resultSummary as Record<string, number> | null;
    const goalsA = summary?.goalsA ?? 0;
    const goalsB = summary?.goalsB ?? 0;

    a.played++; b.played++;
    a.goalsScored += goalsA; a.goalsConceded += goalsB;
    b.goalsScored += goalsB; b.goalsConceded += goalsA;
    a.goalDifference = a.goalsScored - a.goalsConceded;
    b.goalDifference = b.goalsScored - b.goalsConceded;

    if (m.winnerId === m.teamAId) {
      a.won++; b.lost++;
      a.points += 3;
      a.headToHead[m.teamBId] = { pts: (a.headToHead[m.teamBId]?.pts ?? 0) + 3, gd: goalsA - goalsB };
      b.headToHead[m.teamAId] = { pts: (b.headToHead[m.teamAId]?.pts ?? 0), gd: goalsB - goalsA };
    } else if (m.winnerId === m.teamBId) {
      b.won++; a.lost++;
      b.points += 3;
      b.headToHead[m.teamAId] = { pts: (b.headToHead[m.teamAId]?.pts ?? 0) + 3, gd: goalsB - goalsA };
      a.headToHead[m.teamBId] = { pts: (a.headToHead[m.teamBId]?.pts ?? 0), gd: goalsA - goalsB };
    } else {
      // Draw
      a.drawn++; b.drawn++;
      a.points += 1; b.points += 1;
      a.headToHead[m.teamBId] = { pts: (a.headToHead[m.teamBId]?.pts ?? 0) + 1 };
      b.headToHead[m.teamAId] = { pts: (b.headToHead[m.teamAId]?.pts ?? 0) + 1 };
    }
  }

  const sorted = Array.from(standings.values()).sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.goalDifference !== x.goalDifference) return y.goalDifference - x.goalDifference;
    if (y.goalsScored !== x.goalsScored) return y.goalsScored - x.goalsScored;
    const h2hX = x.headToHead[y.teamId]?.pts ?? 0;
    const h2hY = y.headToHead[x.teamId]?.pts ?? 0;
    return h2hY - h2hX;
  });

  return sorted.map((s, i) => ({ ...s, position: i + 1 }));
}

// ── Cricket standings ──────────────────────────────────────────────────────
// Points: Win=2, NR=1, Loss=0
// Tiebreaker: Points → NRR → H2H → coin toss (flagged)
export function computeCricketStandings(
  matches: MatchResult[],
  groupId: string | null,
  tournamentId: string
): Standing[] {
  const standings = new Map<string, Standing>();

  const get = (teamId: string): Standing => {
    if (!standings.has(teamId)) {
      standings.set(teamId, {
        teamId,
        tournamentId,
        groupId,
        played: 0, won: 0, lost: 0, drawn: 0, noResult: 0,
        points: 0, nrr: 0, goalDifference: 0, goalsScored: 0,
        goalsConceded: 0, headToHead: {}, position: 0, qualified: false,
      });
    }
    return standings.get(teamId)!;
  };

  // NRR accumulators: runsFor, runsAgainst, oversFor, oversAgainst
  const nrrData = new Map<string, { rf: number; ra: number; of: number; oa: number }>();
  const getNrr = (teamId: string) => {
    if (!nrrData.has(teamId)) nrrData.set(teamId, { rf: 0, ra: 0, of: 0, oa: 0 });
    return nrrData.get(teamId)!;
  };

  for (const m of matches) {
    if (m.status !== 'COMPLETED' && m.status !== 'WALKOVER') continue;

    const a = get(m.teamAId);
    const b = get(m.teamBId);

    if (m.status === 'WALKOVER') {
      if (m.winnerId) {
        const winner = m.winnerId === m.teamAId ? a : b;
        const loser = m.winnerId === m.teamAId ? b : a;
        winner.played++; winner.won++; winner.points += 2;
        loser.played++; loser.lost++;
      }
      continue;
    }

    const summary = m.resultSummary as Record<string, number> | null;
    const runsA = summary?.runsA ?? 0;
    const runsB = summary?.runsB ?? 0;
    const oversA = summary?.oversA ?? 0;
    const oversB = summary?.oversB ?? 0;
    const isNoResult = summary?.noResult === 1;

    a.played++; b.played++;

    if (isNoResult) {
      a.noResult++; b.noResult++;
      a.points += 1; b.points += 1;
    } else if (m.winnerId === m.teamAId) {
      a.won++; b.lost++;
      a.points += 2;
      a.headToHead[m.teamBId] = { pts: (a.headToHead[m.teamBId]?.pts ?? 0) + 2 };
    } else if (m.winnerId === m.teamBId) {
      b.won++; a.lost++;
      b.points += 2;
      b.headToHead[m.teamAId] = { pts: (b.headToHead[m.teamAId]?.pts ?? 0) + 2 };
    }

    // Accumulate NRR data
    if (!isNoResult && oversA > 0 && oversB > 0) {
      const na = getNrr(m.teamAId);
      na.rf += runsA; na.ra += runsB; na.of += oversA; na.oa += oversB;
      const nb = getNrr(m.teamBId);
      nb.rf += runsB; nb.ra += runsA; nb.of += oversB; nb.oa += oversA;
    }
  }

  // Calculate NRR: (runs scored / overs faced) - (runs conceded / overs bowled)
  for (const [teamId, d] of nrrData) {
    const s = standings.get(teamId);
    if (s && d.of > 0 && d.oa > 0) {
      s.nrr = parseFloat(((d.rf / d.of) - (d.ra / d.oa)).toFixed(3));
    }
  }

  const sorted = Array.from(standings.values()).sort((x, y) => {
    if (y.points !== x.points) return y.points - x.points;
    if (y.nrr !== x.nrr) return y.nrr - x.nrr;
    const h2hX = x.headToHead[y.teamId]?.pts ?? 0;
    const h2hY = y.headToHead[x.teamId]?.pts ?? 0;
    return h2hY - h2hX;
  });

  return sorted.map((s, i) => ({ ...s, position: i + 1 }));
}
