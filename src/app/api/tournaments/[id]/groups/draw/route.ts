import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const tournament = await prisma.tournament.findUnique({ 
      where: { id },
      include: { groups: true }
    });
    
    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.status !== 'DRAFTING') {
      return NextResponse.json({ success: false, error: 'Tournament must be in DRAFTING state to draw groups' }, { status: 400 });
    }

    if (tournament.formatType !== 'GROUP_KNOCKOUT') {
      return NextResponse.json({ success: false, error: 'Groups can only be drawn for GROUP_KNOCKOUT format' }, { status: 400 });
    }

    // Determine the teams
    let teamIds: string[] = [];
    if (tournament.registrationType === 'TEAM') {
      const registrations = await prisma.tournamentRegistration.findMany({
        where: { tournamentId: id, status: 'APPROVED' },
        select: { entityId: true }
      });
      teamIds = registrations.map(r => r.entityId);
    } else {
      const teams = await prisma.tournamentTeam.findMany({
        where: { tournamentId: id },
        select: { id: true }
      });
      teamIds = teams.map(t => t.id);
    }

    if (teamIds.length % 2 !== 0) {
      return NextResponse.json({
        success: false,
        error: "Group-based tournaments require an even number of approved teams to draw balanced groups. Please approve/register one more team or reject one."
      }, { status: 400 });
    }

    if (teamIds.length < 2) {
      return NextResponse.json({ success: false, error: 'Not enough teams to fill groups' }, { status: 400 });
    }

    // Determine group count adaptively
    let groupCount = tournament.groupCount;
    let teamsPerGroup = tournament.teamsPerGroup;
    let qualifyPerGroup = tournament.qualifyPerGroup;

    let needsDbSync = false;

    if (tournament.formatConfig && tournament.formatType === 'GROUP_KNOCKOUT') {
      const config = tournament.formatConfig as any;
      if (config.numberOfGroups && !groupCount) {
        groupCount = parseInt(config.numberOfGroups);
        needsDbSync = true;
      }
      if (config.teamsPerGroup && !teamsPerGroup) {
        teamsPerGroup = parseInt(config.teamsPerGroup);
        needsDbSync = true;
      }
      if (config.teamsAdvancePerGroup && !qualifyPerGroup) {
        qualifyPerGroup = parseInt(config.teamsAdvancePerGroup);
        needsDbSync = true;
      }
    }

    if (!groupCount) {
      if (teamsPerGroup) {
        groupCount = Math.max(1, Math.ceil(teamIds.length / teamsPerGroup));
      } else {
        groupCount = 2; // Default fallback
      }
    }

    // Cap group count at number of teams
    groupCount = Math.min(groupCount, teamIds.length);

    // Auto-heal the tournament columns in database
    if (needsDbSync) {
      await prisma.tournament.update({
        where: { id },
        data: {
          groupCount,
          teamsPerGroup,
          qualifyPerGroup
        }
      });
    }

    // Shuffle teams
    for (let i = teamIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [teamIds[i], teamIds[j]] = [teamIds[j], teamIds[i]];
    }

    // Delete existing groups and standings
    await prisma.tournamentGroup.deleteMany({
      where: { tournamentId: id }
    });
    await prisma.tournamentStanding.deleteMany({
      where: { tournamentId: id }
    });

    // Create groups and assign
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const newGroups = [];
    
    for (let i = 0; i < groupCount; i++) {
      newGroups.push(await prisma.tournamentGroup.create({
        data: {
          tournamentId: id,
          name: `Group ${alphabet[i] || i + 1}`,
          teamIds: []
        }
      }));
    }

    // Distribute teams evenly and create standings
    const assignedTeamsMap: Record<string, string[]> = {};
    for (let i = 0; i < groupCount; i++) {
      assignedTeamsMap[newGroups[i].id] = [];
    }

    for (let i = 0; i < teamIds.length; i++) {
      const groupIndex = i % groupCount;
      const gid = newGroups[groupIndex].id;
      assignedTeamsMap[gid].push(teamIds[i]);
    }

    // Update group teamIds and insert standings
    for (const [gid, tIds] of Object.entries(assignedTeamsMap)) {
      await prisma.tournamentGroup.update({
        where: { id: gid },
        data: { teamIds: tIds }
      });

      for (let idx = 0; idx < tIds.length; idx++) {
        await prisma.tournamentStanding.create({
          data: {
            tournamentId: id,
            groupId: gid,
            teamId: tIds[idx],
            position: idx + 1,
            played: 0,
            won: 0,
            lost: 0,
            drawn: 0,
            noResult: 0,
            points: 0
          }
        });
      }
    }

    const finalGroups = await prisma.tournamentGroup.findMany({ where: { tournamentId: id } });

    return NextResponse.json({ success: true, data: finalGroups });
  } catch (error: any) {
    console.error('Error drawing groups:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
