import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { invalidateScorerToken } from '@/lib/tournament/token-generator';
import { computeFootballStandings, computeCricketStandings } from '@/lib/tournament/standing-calculator';
import { checkAndAdvanceGroupStage, advanceKnockoutWinner } from '@/lib/tournament/advancement';
import { distributeTournamentMmr } from '@/lib/tournament/mmr-distributor';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { winnerId, resultSummary } = body;
    
    const match = await prisma.tournamentMatch.findUnique({
      where: { id },
      include: { tournament: true }
    });

    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    if (match.status === 'COMPLETED' || match.status === 'CANCELLED') {
      return NextResponse.json({ success: false, error: 'Match is already finished' }, { status: 400 });
    }

    // Determine target resultSummary. If it is empty or falsy, use the live-scored resultSummary.
    const targetSummary = (resultSummary && Object.keys(resultSummary).length > 0) 
      ? { ...(match.resultSummary as Record<string, any> || {}), ...resultSummary } 
      : match.resultSummary;

    // 1. Mark match as completed
    const updatedMatch = await prisma.tournamentMatch.update({
      where: { id },
      data: { 
        status: 'COMPLETED',
        winnerId: winnerId || null,
        resultSummary: targetSummary
      }
    });

    // 2. Invalidate token
    await invalidateScorerToken(id);

    // 3. Compute Standings if it's a group match
    if (match.groupId) {
      const allGroupMatches = await prisma.tournamentMatch.findMany({
        where: { groupId: match.groupId }
      });
      
      const group = await prisma.tournamentGroup.findUnique({
        where: { id: match.groupId }
      });
      const groupTeamIds = group?.teamIds || [];
      
      const newStandings = match.tournament.sport === 'CRICKET' 
        ? computeCricketStandings(allGroupMatches as any[], match.groupId, match.tournamentId, groupTeamIds)
        : computeFootballStandings(allGroupMatches as any[], match.groupId, match.tournamentId, groupTeamIds);

      // Save standings
      for (const standing of newStandings) {
        await prisma.tournamentStanding.upsert({
          where: {
            tournamentId_groupId_teamId: {
              tournamentId: match.tournamentId,
              groupId: match.groupId,
              teamId: standing.teamId
            }
          },
          update: standing,
          create: standing
        });
      }

      // Manual advancement is now used, so we do not auto-advance here upon match completion.

    } else if (winnerId) {
      // 4. Advance Knockout Winner
      await advanceKnockoutWinner(match.tournamentId, id, winnerId);
    }

    // 5. Distribute MMR
    await distributeTournamentMmr(id);

    return NextResponse.json({ success: true, data: updatedMatch });
  } catch (error: any) {
    console.error('Error completing match:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
