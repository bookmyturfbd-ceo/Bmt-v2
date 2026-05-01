import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateLeagueFixtures, generateKnockoutBracket, generateGroupFixtures, generateDoubleEliminationStubs } from '@/lib/tournament/fixture-generator';

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
      return NextResponse.json({ success: false, error: 'Tournament must be in DRAFTING state to generate fixtures' }, { status: 400 });
    }

    // Determine the teams participating
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

    if (teamIds.length < 2) {
      return NextResponse.json({ success: false, error: 'Not enough teams to generate fixtures' }, { status: 400 });
    }

    // Delete existing fixtures if any
    await prisma.tournamentMatch.deleteMany({
      where: { tournamentId: id }
    });

    let slots: any[] = [];

    // Generate based on format
    switch (tournament.formatType) {
      case 'LEAGUE':
        slots = generateLeagueFixtures(teamIds);
        break;
      case 'KNOCKOUT':
        slots = generateKnockoutBracket(teamIds);
        break;
      case 'GROUP_KNOCKOUT':
        if (!tournament.groups || tournament.groups.length === 0) {
          return NextResponse.json({ success: false, error: 'Groups must be drawn first for GROUP_KNOCKOUT' }, { status: 400 });
        }
        slots = generateGroupFixtures(tournament.groups);
        break;
      case 'DOUBLE_ELIMINATION':
        const deSlots = generateDoubleEliminationStubs(teamIds);
        slots = [...deSlots.winners, ...deSlots.losers, deSlots.grandFinal];
        break;
    }

    // Insert to DB
    const createdMatches = [];
    for (const slot of slots) {
      const match = await prisma.tournamentMatch.create({
        data: {
          tournamentId: id,
          groupId: slot.groupId || null,
          stage: slot.stage as any,
          matchNumber: slot.matchNumber,
          teamAId: slot.teamAId || 'TBD', // using 'TBD' as placeholder since ID is required
          teamBId: slot.teamBId || 'TBD',
          status: 'SCHEDULED'
        }
      });
      createdMatches.push(match);
    }

    // Update tournament status
    const updated = await prisma.tournament.update({
      where: { id },
      data: { status: 'SCHEDULED' }
    });

    return NextResponse.json({ success: true, data: { tournament: updated, matchesCount: createdMatches.length } });
  } catch (error: any) {
    console.error('Error generating fixtures:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
