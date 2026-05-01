import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.status !== 'REGISTRATION_OPEN') {
      return NextResponse.json({ success: false, error: 'Tournament is not open for registration' }, { status: 400 });
    }

    // Determine next state
    let nextStatus = 'DRAFTING';
    if (tournament.registrationType === 'PLAYER' && tournament.auctionEnabled) {
      nextStatus = 'AUCTION_PENDING';
    }

    const updated = await prisma.tournament.update({
      where: { id },
      data: { status: nextStatus as any }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error closing registration:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
