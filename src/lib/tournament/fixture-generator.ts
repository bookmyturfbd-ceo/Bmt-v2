/**
 * Tournament Engine — Fixture Generator
 * Supports: LEAGUE (round-robin), KNOCKOUT, GROUP_KNOCKOUT, DOUBLE_ELIMINATION
 */

export type FixtureSlot = {
  matchNumber: number;
  stage: string;
  teamAId: string | null; // null = TBD (knockout before teams are known)
  teamBId: string | null;
  groupId?: string | null;
};

// Helper function to pad team list to the next power of two using 'BYE'
function padToPowerOfTwo(teamIds: string[]): string[] {
  const n = teamIds.length;
  if (n <= 2) return teamIds;
  const nextPower = Math.pow(2, Math.ceil(Math.log2(n)));
  const padded = [...teamIds];
  while (padded.length < nextPower) {
    padded.push('BYE');
  }
  return padded;
}

// ── Round-robin (circle method) ────────────────────────────────────────────
// Generates all N*(N-1)/2 unique pairings for a list of team IDs.
// If N is odd, inserts a dummy "BYE" team so the rotation works correctly.
export function generateLeagueFixtures(teamIds: string[]): FixtureSlot[] {
  const teams = [...teamIds];
  if (teams.length % 2 !== 0) teams.push('BYE');
  const n = teams.length;
  const rounds = n - 1;
  const fixtures: FixtureSlot[] = [];
  let matchNumber = 1;

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < n / 2; i++) {
      const home = teams[i];
      const away = teams[n - 1 - i];
      if (home === 'BYE' || away === 'BYE') continue;
      fixtures.push({
        matchNumber: matchNumber++,
        stage: 'GROUP',
        teamAId: home,
        teamBId: away,
      });
    }
    // Circle rotation: keep teams[0] fixed, rotate the rest
    const last = teams.pop()!;
    teams.splice(1, 0, last);
  }
  return fixtures;
}

// ── Knockout bracket ───────────────────────────────────────────────────────
// Generates a single-elimination bracket from a seeded list.
// Teams are paired: seed[0] vs seed[n-1], seed[1] vs seed[n-2], etc.
// Later rounds have TBD teams (filled after previous round completes).
export function generateKnockoutBracket(
  teamIds: string[]
): FixtureSlot[] {
  // Pad to power of two to support odd counts and non-power-of-two counts robustly
  const paddedTeams = padToPowerOfTwo(teamIds);
  const n = paddedTeams.length;
  const stages = knockoutStages(n);
  const fixtures: FixtureSlot[] = [];
  let matchNumber = 1;

  // First round — seeded pairings
  const firstStage = stages[0];
  for (let i = 0; i < n / 2; i++) {
    fixtures.push({
      matchNumber: matchNumber++,
      stage: firstStage,
      teamAId: paddedTeams[i],
      teamBId: paddedTeams[n - 1 - i],
    });
  }

  // Subsequent rounds — TBD until previous round finishes
  for (let r = 1; r < stages.length; r++) {
    const matchesInRound = Math.pow(2, stages.length - 1 - r);
    for (let i = 0; i < matchesInRound; i++) {
      fixtures.push({
        matchNumber: matchNumber++,
        stage: stages[r],
        teamAId: null,
        teamBId: null,
      });
    }
  }

  return fixtures;
}

function knockoutStages(n: number): string[] {
  const all = ['ROUND_OF_16', 'QUARTER', 'SEMI', 'FINAL'];
  if (n <= 2) return ['FINAL'];
  if (n <= 4) return ['SEMI', 'FINAL'];
  if (n <= 8) return ['QUARTER', 'SEMI', 'FINAL'];
  return all;
}

// ── Group + Knockout combo ─────────────────────────────────────────────────
// Returns group-stage fixtures. Knockout fixtures are generated later
// via generateKnockoutBracket() once group stage qualifiers are known.
export function generateGroupFixtures(
  groups: { id: string; teamIds: string[] }[]
): FixtureSlot[] {
  const fixtures: FixtureSlot[] = [];
  let matchNumber = 1;

  // For each group, generate its round-robin matches grouped by round
  const groupsMatchesByRound: Record<string, FixtureSlot[][]> = {};
  let maxRounds = 0;

  for (const group of groups) {
    const teams = [...group.teamIds];
    if (teams.length % 2 !== 0) teams.push('BYE');
    const n = teams.length;
    const rounds = n - 1;
    if (rounds > maxRounds) maxRounds = rounds;

    const roundList: FixtureSlot[][] = [];

    for (let round = 0; round < rounds; round++) {
      const roundMatches: FixtureSlot[] = [];
      for (let i = 0; i < n / 2; i++) {
        const home = teams[i];
        const away = teams[n - 1 - i];
        if (home === 'BYE' || away === 'BYE') continue;
        roundMatches.push({
          matchNumber: 0, // Placeholder, set later during interleaving
          stage: 'GROUP',
          teamAId: home,
          teamBId: away,
          groupId: group.id,
        });
      }
      roundList.push(roundMatches);

      // Circle rotation: keep teams[0] fixed, rotate the rest
      const last = teams.pop()!;
      teams.splice(1, 0, last);
    }
    groupsMatchesByRound[group.id] = roundList;
  }

  // Now interleave matches round-by-round across all groups (e.g. Round 1 of Group A, B, C... then Round 2 of Group A, B, C...)
  for (let r = 0; r < maxRounds; r++) {
    for (const group of groups) {
      const roundList = groupsMatchesByRound[group.id];
      if (roundList && roundList[r]) {
        for (const match of roundList[r]) {
          fixtures.push({
            ...match,
            matchNumber: matchNumber++,
          });
        }
      }
    }
  }

  return fixtures;
}

// ── Double Elimination ─────────────────────────────────────────────────────
// Returns winners + losers bracket stubs. TBD teams filled progressively.
export function generateDoubleEliminationStubs(teamIds: string[]): {
  winners: FixtureSlot[];
  losers: FixtureSlot[];
  grandFinal: FixtureSlot;
} {
  // Pad to power of two to support odd/non-power-of-two robustly
  const paddedTeams = padToPowerOfTwo(teamIds);
  const n = paddedTeams.length;
  const winnersRound1: FixtureSlot[] = [];
  let matchNumber = 1;

  for (let i = 0; i < n / 2; i++) {
    winnersRound1.push({
      matchNumber: matchNumber++,
      stage: n <= 4 ? 'SEMI' : n <= 8 ? 'QUARTER' : 'ROUND_OF_16',
      teamAId: paddedTeams[i],
      teamBId: paddedTeams[n - 1 - i],
    });
  }

  const losersRound1: FixtureSlot[] = Array.from({ length: n / 2 }, () => ({
    matchNumber: matchNumber++,
    stage: n <= 4 ? 'SEMI' : n <= 8 ? 'QUARTER' : 'ROUND_OF_16',
    teamAId: null,
    teamBId: null,
  }));

  const grandFinal: FixtureSlot = {
    matchNumber: matchNumber++,
    stage: 'FINAL',
    teamAId: null,
    teamBId: null,
  };

  return { winners: winnersRound1, losers: losersRound1, grandFinal };
}
