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

  if (teamAPlayers.length > 0) {
    updates.push(
      prisma.player.updateMany({
        where: { id: { in: teamAPlayers } },
        data: { [playerMmrField]: { increment: deltaA } }
      })
    );
  }

  if (teamBPlayers.length > 0) {
    updates.push(
      prisma.player.updateMany({
        where: { id: { in: teamBPlayers } },
        data: { [playerMmrField]: { increment: deltaB } }
      })
    );
  }

  await prisma.$transaction(updates);
}
