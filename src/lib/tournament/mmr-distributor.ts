/**
 * Tournament Engine — MMR Distributor
 * Calculates and distributes MMR after a tournament match completes.
 */
import prisma from '@/lib/prisma';

export async function distributeTournamentMmr(matchId: string) {
  const match = await prisma.tournamentMatch.findUnique({
    where: { id: matchId },
    include: {
      tournament: { select: { mmrEnabled: true, mmrMultiplier: true, sport: true } },
    },
  });

  if (!match || !match.tournament.mmrEnabled) return;

  const mult = match.tournament.mmrMultiplier;
  const isCricket = match.tournament.sport === 'CRICKET';
  
  // Calculate Base Team MMR Deltas
  let deltaA = 0;
  let deltaB = 0;

  if (match.winnerId === match.teamAId) {
    deltaA = 25 * mult;
    deltaB = -15 * mult;
  } else if (match.winnerId === match.teamBId) {
    deltaA = -15 * mult;
    deltaB = 25 * mult;
  } else {
    // Draw / No Result
    deltaA = 5 * mult;
    deltaB = 5 * mult;
  }

  // Update Team MMRs
  const mmrField = isCricket ? 'tournamentCricketMmr' : 'tournamentFootballMmr';
  
  // Fetch team member player IDs for Team A and Team B
  const [teamAMembersList, teamBMembersList] = await Promise.all([
    prisma.teamMember.findMany({
      where: { teamId: match.teamAId },
      select: { playerId: true }
    }),
    prisma.teamMember.findMany({
      where: { teamId: match.teamBId },
      select: { playerId: true }
    })
  ]);

  const teamAPlayers = teamAMembersList.map((m: { playerId: string }) => m.playerId);
  const teamBPlayers = teamBMembersList.map((m: { playerId: string }) => m.playerId);

  const playerMmrField = isCricket ? 'tournamentCricketMmr' : 'tournamentFootballMmr';

  // Extract played player IDs from resultSummary
  const playedPlayerIds = new Set<string>();
  const summary = (match.resultSummary as Record<string, any>) || {};

  // 1. Football/Futsal events
  const events = summary.events || [];
  events.forEach((e: any) => {
    if (e.scorerPlayerId) playedPlayerIds.add(e.scorerPlayerId);
    if (e.assistPlayerId) playedPlayerIds.add(e.assistPlayerId);
    if (e.playerId) playedPlayerIds.add(e.playerId);
    if (e.playerOnId) playedPlayerIds.add(e.playerOnId);
    if (e.playerOffId) playedPlayerIds.add(e.playerOffId);
  });

  // 2. CricketState
  const cs = summary.cricketState;
  if (cs) {
    const parseInnings = (inn: any) => {
      if (!inn) return;
      if (inn.currentStrikerId) playedPlayerIds.add(inn.currentStrikerId);
      if (inn.currentNonStrikerId) playedPlayerIds.add(inn.currentNonStrikerId);
      if (inn.currentBowlerId) playedPlayerIds.add(inn.currentBowlerId);
      
      if (Array.isArray(inn.battingOrder)) {
        inn.battingOrder.forEach((id: string) => playedPlayerIds.add(id));
      }
      if (Array.isArray(inn.bowlingOrder)) {
        inn.bowlingOrder.forEach((id: string) => playedPlayerIds.add(id));
      }
      if (inn.battingStats) {
        Object.keys(inn.battingStats).forEach(id => playedPlayerIds.add(id));
      }
      if (inn.bowlingStats) {
        Object.keys(inn.bowlingStats).forEach(id => playedPlayerIds.add(id));
      }
    };
    parseInnings(cs.innings1);
    parseInnings(cs.innings2);
  }

  const updates: any[] = [
    prisma.team.update({
      where: { id: match.teamAId },
      data: { [mmrField]: { increment: deltaA } },
    }),
    prisma.team.update({
      where: { id: match.teamBId },
      data: { [mmrField]: { increment: deltaB } },
    })
  ];

  // Apply participation gating: only update players who played (if any events/participation recorded)
  const hasPlayedRecord = playedPlayerIds.size > 0;
  const teamAPlayersToUpdate = hasPlayedRecord
    ? teamAPlayers.filter(id => playedPlayerIds.has(id))
    : teamAPlayers;
  const teamBPlayersToUpdate = hasPlayedRecord
    ? teamBPlayers.filter(id => playedPlayerIds.has(id))
    : teamBPlayers;

  if (teamAPlayersToUpdate.length > 0) {
    updates.push(
      prisma.player.updateMany({
        where: { id: { in: teamAPlayersToUpdate } },
        data: { [playerMmrField]: { increment: deltaA } }
      })
    );
  }

  if (teamBPlayersToUpdate.length > 0) {
    updates.push(
      prisma.player.updateMany({
        where: { id: { in: teamBPlayersToUpdate } },
        data: { [playerMmrField]: { increment: deltaB } }
      })
    );
  }

  await prisma.$transaction(updates);
}
