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

    const groupCount = tournament.groupCount || 2;
    if (teamIds.length < groupCount) {
      return NextResponse.json({ success: false, error: 'Not enough teams to fill groups' }, { status: 400 });
    }

    // Shuffle teams
    for (let i = teamIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [teamIds[i], teamIds[j]] = [teamIds[j], teamIds[i]];
    }

    // Delete existing groups if any
    await prisma.tournamentGroup.deleteMany({
      where: { tournamentId: id }
    });

    // Create groups and assign
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const newGroups = [];
    
    for (let i = 0; i < groupCount; i++) {
      newGroups.push(await prisma.tournamentGroup.create({
        data: {
          tournamentId: id,
          name: `Group \${alphabet[i]}`,
          teamIds: []
        }
      }));
    }

    // Distribute teams evenly
    for (let i = 0; i < teamIds.length; i++) {
      const groupIndex = i % groupCount;
      await prisma.tournamentGroup.update({
        where: { id: newGroups[groupIndex].id },
        data: {
          teamIds: { push: teamIds[i] }
        }
      });
    }

    const finalGroups = await prisma.tournamentGroup.findMany({ where: { tournamentId: id } });

    return NextResponse.json({ success: true, data: finalGroups });
  } catch (error: any) {
    console.error('Error drawing groups:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
