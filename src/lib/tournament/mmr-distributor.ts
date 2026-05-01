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
  const mmrField = isCricket ? 'cricketMmr' : 'footballMmr';
  
  await prisma.$transaction([
    prisma.team.update({
      where: { id: match.teamAId },
      data: { [mmrField]: { increment: deltaA } },
    }),
    prisma.team.update({
      where: { id: match.teamBId },
      data: { [mmrField]: { increment: deltaB } },
    })
  ]);

  // TODO: Player MMR updates (requires looking up roster for this specific match)
  // For tournaments, rosters are either Team members or TournamentTeam players
  // This can be expanded based on the player tracking logic in scoring.
}
