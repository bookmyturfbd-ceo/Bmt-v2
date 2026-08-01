import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { entityId, entityType } = body;
    
    if (!entityId || !entityType) {
      return NextResponse.json({ success: false, error: 'entityId and entityType are required' }, { status: 400 });
    }

    const tournament = await prisma.tournament.findUnique({ 
      where: { id },
      include: {
        _count: { select: { registrations: true } }
      }
    });

    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.status !== 'REGISTRATION_OPEN') {
      return NextResponse.json({ success: false, error: 'Registration is closed' }, { status: 400 });
    }

    if (tournament.registrationType !== entityType) {
      return NextResponse.json({ success: false, error: `Tournament expects \${tournament.registrationType} registration` }, { status: 400 });
    }

    if (tournament.maxParticipants && tournament._count.registrations >= tournament.maxParticipants) {
      return NextResponse.json({ success: false, error: 'Tournament is full' }, { status: 400 });
    }

    // ── REGISTRATION VALIDATION ──
    if (entityType === 'TEAM') {
      const team = await prisma.team.findUnique({
        where: { id: entityId },
        include: { members: { include: { player: true } } }
      });
      if (!team) return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
      
      const formatCfg = tournament.formatConfig as any;
      const variant = formatCfg?.sportVariant;
      
      const getSportFamily = (sport: string): 'FUTSAL' | 'FOOTBALL' | 'CRICKET' | null => {
        if (sport === 'FUTSAL' || sport.startsWith('FUTSAL_')) return 'FUTSAL';
        if (sport === 'FOOTBALL' || sport === 'FOOTBALL_FULL') return 'FOOTBALL';
        if (sport === 'CRICKET' || sport.startsWith('CRICKET_')) return 'CRICKET';
        return null;
      };

      const isSportCompatible = (teamSport: string, tourneyVariant: string): boolean => {
        const teamFamily = getSportFamily(teamSport);
        const tourneyFamily = getSportFamily(tourneyVariant);
        return teamFamily !== null && teamFamily === tourneyFamily;
      };

      // Strict Variant Match
      if (variant && !isSportCompatible(team.sportType, variant)) {
        return NextResponse.json({ success: false, error: `Tournament requires a ${variant.replace('_', ' ')} team, but yours is a ${team.sportType.replace('_', ' ')} team.` }, { status: 400 });
      }

      // Minimum Roster Validation
      let requiredPlayers = 5;
      const targetVariant = variant || team.sportType;
      if (targetVariant === 'FUTSAL_6') requiredPlayers = 6;
      else if (targetVariant === 'FUTSAL_7' || targetVariant === 'CRICKET_7') requiredPlayers = 7;
      else if (targetVariant.includes('FULL') || targetVariant === 'FOOTBALL' || targetVariant === 'FOOTBALL_FULL') requiredPlayers = 11;
      else if (targetVariant === 'CRICKET') requiredPlayers = 7;
      else if (targetVariant === 'FUTSAL') requiredPlayers = 5;
      
      if (team.members.length < requiredPlayers) {
        return NextResponse.json({ success: false, error: `Your team must have at least ${requiredPlayers} players to join.` }, { status: 400 });
      }
    } else if (entityType === 'PLAYER') {
      const player = await prisma.player.findUnique({ where: { id: entityId }});
      if (!player) return NextResponse.json({ success: false, error: 'Player not found.' }, { status: 400 });
    }

    const registration = await prisma.tournamentRegistration.create({
      data: {
        tournamentId: id,
        entityType,
        entityId,
        status: 'PENDING',
        entryFeePaid: true
      }
    });

    return NextResponse.json({ success: true, data: registration });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Already registered' }, { status: 400 });
    }
    console.error('Error registering:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
