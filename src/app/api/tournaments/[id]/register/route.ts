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

    // ── REGISTRATION VALIDATION & BALANCE CHECK ──
    let ownerIdToCharge = null;

    if (entityType === 'TEAM') {
      const team = await prisma.team.findUnique({
        where: { id: entityId },
        include: { members: { include: { player: true } } }
      });
      if (!team) return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
      
      // Rank teams cannot join tournaments
      if (team.teamType !== 'TOURNAMENT') {
        return NextResponse.json({ success: false, error: 'Rank teams cannot join tournaments. You must use a Tournament Team.' }, { status: 400 });
      }

      const formatCfg = tournament.formatConfig as any;
      const variant = formatCfg?.sportVariant;
      
      // Strict Variant Match
      if (variant && team.sportType !== variant) {
        return NextResponse.json({ success: false, error: `Tournament requires a ${variant.replace('_', ' ')} team, but yours is ${team.sportType.replace('_', ' ')}.` }, { status: 400 });
      }

      // Minimum Roster Validation
      let requiredPlayers = 5;
      if (team.sportType === 'FUTSAL_6') requiredPlayers = 6;
      if (team.sportType === 'FUTSAL_7' || team.sportType === 'CRICKET_7') requiredPlayers = 7;
      if (team.sportType.includes('FULL')) requiredPlayers = 11;
      
      // Fallback required size if variant isn't explicitly set but we can guess it from the team they are using
      if (team.members.length < requiredPlayers) {
        return NextResponse.json({ success: false, error: `Your team must have at least ${requiredPlayers} players to join.` }, { status: 400 });
      }

      // Balance check for entry fee
      if (tournament.entryFee > 0) {
        const ownerMember = team.members.find((m: any) => m.role === 'owner');
        if (!ownerMember || !ownerMember.player) {
          return NextResponse.json({ success: false, error: 'Team owner not found.' }, { status: 400 });
        }
        
        if (ownerMember.player.walletBalance < tournament.entryFee) {
          return NextResponse.json({ 
            success: false, 
            error: `Insufficient balance. Team owner (${ownerMember.player.fullName}) needs ৳${tournament.entryFee} to register, but only has ৳${ownerMember.player.walletBalance}.` 
          }, { status: 400 });
        }
        ownerIdToCharge = ownerMember.player.id;
      }
    } else if (entityType === 'PLAYER') {
      if (tournament.entryFee > 0) {
         const player = await prisma.player.findUnique({ where: { id: entityId }});
         if (!player) return NextResponse.json({ success: false, error: 'Player not found.' }, { status: 400 });
         if (player.walletBalance < tournament.entryFee) {
            return NextResponse.json({ success: false, error: `Insufficient balance. You need ৳${tournament.entryFee} to register, but only have ৳${player.walletBalance}.` }, { status: 400 });
         }
         ownerIdToCharge = player.id;
      }
    }

    const registration = await prisma.$transaction(async (tx) => {
      if (ownerIdToCharge && tournament.entryFee > 0) {
        await tx.player.update({
          where: { id: ownerIdToCharge },
          data: { walletBalance: { decrement: tournament.entryFee } }
        });
      }

      return await tx.tournamentRegistration.create({
        data: {
          tournamentId: id,
          entityType,
          entityId,
          status: 'PENDING',
          entryFeePaid: tournament.entryFee === 0 || !!ownerIdToCharge
        }
      });
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
