import prisma from '@/lib/prisma';

/**
 * Recalculates and updates a Tournament Team's MMR based on the average
 * of its current players' individual Tournament MMRs.
 * 
 * If the team is NOT a tournament team, this does nothing.
 */
export async function syncTournamentTeamMmr(teamId: string) {
  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: { include: { player: true } } }
    });

    if (!team || team.teamType !== 'TOURNAMENT') return;

    if (team.members.length === 0) {
      // Default to 1000 if empty
      await prisma.team.update({
        where: { id: teamId },
        data: { footballMmr: 1000, cricketMmr: 1000, teamMmr: 1000 }
      });
      return;
    }

    const isCricket = team.sportType.includes('CRICKET');
    const players = team.members.map(m => m.player);

    if (isCricket) {
      const total = players.reduce((sum, p) => sum + (p.tournamentCricketMmr || 1000), 0);
      const avg = Math.round(total / players.length);
      await prisma.team.update({
        where: { id: teamId },
        data: { cricketMmr: avg, teamMmr: avg }
      });
    } else {
      const total = players.reduce((sum, p) => sum + (p.tournamentFootballMmr || 1000), 0);
      const avg = Math.round(total / players.length);
      await prisma.team.update({
        where: { id: teamId },
        data: { footballMmr: avg, teamMmr: avg }
      });
    }
  } catch (error) {
    console.error('Failed to sync tournament team MMR:', error);
  }
}
