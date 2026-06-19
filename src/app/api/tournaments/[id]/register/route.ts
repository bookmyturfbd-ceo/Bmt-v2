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

      // Balance check for entry fee
      if (tournament.entryFee > 0) {
        const ownerMember = team.members.find((m: any) => m.role === 'owner');
        if (!ownerMember || !ownerMember.player) {
          return NextResponse.json({ success: false, error: 'Team owner not found.' }, { status: 400 });
        }
        
        if (ownerMember.player.walletBalance < tournament.entryFee) {
          return NextResponse.json({ 
            success: false, 
            error: `Insufficient balance. Team owner (${ownerMember.player.fullName}) needs BDT ${tournament.entryFee} to register, but only has BDT ${ownerMember.player.walletBalance}.` 
          }, { status: 400 });
        }
        ownerIdToCharge = ownerMember.player.id;
      }
    } else if (entityType === 'PLAYER') {
      if (tournament.entryFee > 0) {
         const player = await prisma.player.findUnique({ where: { id: entityId }});
         if (!player) return NextResponse.json({ success: false, error: 'Player not found.' }, { status: 400 });
         if (player.walletBalance < tournament.entryFee) {
            return NextResponse.json({ success: false, error: `Insufficient balance. You need BDT ${tournament.entryFee} to register, but only have BDT ${player.walletBalance}.` }, { status: 400 });
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

      const reg = await tx.tournamentRegistration.create({
        data: {
          tournamentId: id,
          entityType,
          entityId,
          status: 'PENDING',
          entryFeePaid: tournament.entryFee === 0 || !!ownerIdToCharge
        }
      });

      // Create payout holding record if there's an entry fee
      if (tournament.entryFee > 0) {
        let entityName = entityId;
        if (entityType === 'TEAM') {
          const team = await tx.team.findUnique({ where: { id: entityId }, select: { name: true } });
          entityName = team?.name ?? entityId;
        } else {
          const player = await tx.player.findUnique({ where: { id: entityId }, select: { fullName: true } });
          entityName = player?.fullName ?? entityId;
        }
        const organizerId = tournament.operatorType === 'ORGANIZER' ? tournament.operatorId : null;
        await tx.tournamentPayout.create({
          data: {
            tournamentId: id,
            organizerId,
            entityType,
            entityId,
            entityName,
            amount: tournament.entryFee,
            status: 'HOLDING',
          }
        });
      }

      return reg;
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
