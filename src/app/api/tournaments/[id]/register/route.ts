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

    const registration = await prisma.tournamentRegistration.create({
      data: {
        tournamentId: id,
        entityType,
        entityId,
        status: 'PENDING',
        entryFeePaid: tournament.entryFee === 0
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
