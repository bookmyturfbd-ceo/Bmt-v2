import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { computeFootballStandings, computeCricketStandings } from '@/lib/tournament/standing-calculator';
import { logTournamentEvent } from '@/lib/tournament/timeline';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const body = await request.json();
    const { groupId, name, teamIds } = body;

    if (!groupId) {
      return NextResponse.json({ success: false, error: 'Group ID is required' }, { status: 400 });
    }

    const group = await prisma.tournamentGroup.findFirst({
      where: { id: groupId, tournamentId }
    });

    if (!group) {
      return NextResponse.json({ success: false, error: 'Group not found in this tournament' }, { status: 404 });
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 });
    }

    // Update group name and/or teamIds
    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (teamIds !== undefined) updateData.teamIds = teamIds;

    const updatedGroup = await prisma.tournamentGroup.update({
      where: { id: groupId },
      data: updateData
    });

    // If teamIds were updated, clean up removed teams' standings and recompute standings for current team list
    if (teamIds !== undefined) {
      // 1. Delete standings for teams no longer in the group
      await prisma.tournamentStanding.deleteMany({
        where: {
          tournamentId,
          groupId,
          teamId: { notIn: teamIds }
        }
      });

      // 2. Fetch all group matches
      const groupMatches = await prisma.tournamentMatch.findMany({
        where: { groupId }
      });

      // 3. Compute standings from matches for current team list
      const newStandings = tournament.sport === 'CRICKET'
        ? computeCricketStandings(groupMatches as any[], groupId, tournamentId, teamIds)
        : computeFootballStandings(groupMatches as any[], groupId, tournamentId, teamIds);

      // 4. Save/upsert standings
      for (const standing of newStandings) {
        await prisma.tournamentStanding.upsert({
          where: {
            tournamentId_groupId_teamId: {
              tournamentId,
              groupId,
              teamId: standing.teamId
            }
          },
          update: standing,
          create: standing
        });
      }
    }

    // Get team names for log message
    const teams = await prisma.team.findMany({
      where: { id: { in: updatedGroup.teamIds } },
      select: { name: true }
    });
    const teamNames = teams.map(t => t.name).join(', ');

    const timelineMessage = `Organizer updated Group "${updatedGroup.name}": teams set to [${teamNames || 'None'}]`;
    await logTournamentEvent(tournamentId, 'GROUP_UPDATE', timelineMessage, {
      groupId,
      name: updatedGroup.name,
      teamIds: updatedGroup.teamIds
    });

    return NextResponse.json({ success: true, data: updatedGroup });
  } catch (error: any) {
    console.error('Error updating tournament group:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
