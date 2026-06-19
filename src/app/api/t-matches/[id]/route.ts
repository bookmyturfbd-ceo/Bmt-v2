import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { invalidateScorerToken } from '@/lib/tournament/token-generator';
import { computeFootballStandings, computeCricketStandings } from '@/lib/tournament/standing-calculator';
import { advanceKnockoutWinner } from '@/lib/tournament/advancement';
import { distributeTournamentMmr } from '@/lib/tournament/mmr-distributor';
import { logTournamentEvent } from '@/lib/tournament/timeline';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { teamAId, teamBId, scheduledAt, venue, status, winnerId, resultSummary } = body;

    const match = await prisma.tournamentMatch.findUnique({
      where: { id },
      include: { tournament: true }
    });

    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    // Capture old state for timeline comparison
    const oldStatus = match.status;
    const oldWinner = match.winnerId;

    // Build update data
    const updateData: Record<string, any> = {};
    if (teamAId !== undefined) updateData.teamAId = teamAId;
    if (teamBId !== undefined) updateData.teamBId = teamBId;
    if (scheduledAt !== undefined) updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    if (venue !== undefined) updateData.venue = venue;
    if (status !== undefined) updateData.status = status;
    if (winnerId !== undefined) updateData.winnerId = winnerId || null;
    
    if (resultSummary !== undefined) {
      updateData.resultSummary = (resultSummary && Object.keys(resultSummary).length > 0)
        ? { ...(match.resultSummary as Record<string, any> || {}), ...resultSummary }
        : resultSummary;
    }

    // Update match
    const updatedMatch = await prisma.tournamentMatch.update({
      where: { id },
      data: updateData,
      include: { group: true }
    });

    // Get team names for timeline logging
    const [teamA, teamB] = await Promise.all([
      prisma.team.findUnique({ where: { id: updatedMatch.teamAId }, select: { name: true } }),
      prisma.team.findUnique({ where: { id: updatedMatch.teamBId }, select: { name: true } })
    ]);
    const nameA = teamA?.name || updatedMatch.teamAId;
    const nameB = teamB?.name || updatedMatch.teamBId;

    // Handle timeline message construction
    let timelineMessage = `Organizer updated Match ${updatedMatch.matchNumber} (${nameA} vs ${nameB})`;
    const changes: string[] = [];

    if (scheduledAt !== undefined && scheduledAt !== (match.scheduledAt ? match.scheduledAt.toISOString() : null)) {
      changes.push(`rescheduled to ${scheduledAt ? new Date(scheduledAt).toLocaleString() : 'TBD'}`);
    }
    if (venue !== undefined && venue !== match.venue) {
      changes.push(`venue changed to ${venue || 'TBD'}`);
    }
    if (status !== undefined && status !== oldStatus) {
      changes.push(`status changed from ${oldStatus} to ${status}`);
    }
    
    // Log score changes
    if (resultSummary !== undefined) {
      if (match.tournament.sport === 'FOOTBALL') {
        const goalsA = resultSummary?.goalsA ?? 0;
        const goalsB = resultSummary?.goalsB ?? 0;
        changes.push(`score updated: ${nameA} ${goalsA} - ${goalsB} ${nameB}`);
      } else if (match.tournament.sport === 'CRICKET') {
        const runsA = resultSummary?.runsA ?? 0;
        const wicketsA = resultSummary?.wicketsA ?? 0;
        const runsB = resultSummary?.runsB ?? 0;
        const wicketsB = resultSummary?.wicketsB ?? 0;
        changes.push(`score updated: ${nameA} ${runsA}/${wicketsA} - ${runsB}/${wicketsB} ${nameB}`);
      }
    }

    if (changes.length > 0) {
      timelineMessage = `Organizer updated Match ${updatedMatch.matchNumber} (${nameA} vs ${nameB}): ${changes.join(', ')}`;
    }

    await logTournamentEvent(match.tournamentId, 'MATCH_UPDATE', timelineMessage, {
      matchId: id,
      matchNumber: updatedMatch.matchNumber,
      teamAId: updatedMatch.teamAId,
      teamBId: updatedMatch.teamBId,
      status: updatedMatch.status,
      resultSummary: updatedMatch.resultSummary
    });

    // Invalidate token if completed
    if (status === 'COMPLETED' && oldStatus !== 'COMPLETED') {
      await invalidateScorerToken(id);
      try {
        await distributeTournamentMmr(id);
      } catch (err) {
        console.error('MMR distribution failed:', err);
      }
    }

    // Recompute standings if group match
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
    } else if (winnerId && status === 'COMPLETED') {
      // Knockout stage advancement
      await advanceKnockoutWinner(match.tournamentId, id, winnerId);
    }

    return NextResponse.json({ success: true, data: updatedMatch });
  } catch (error: any) {
    console.error('Error updating match:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
