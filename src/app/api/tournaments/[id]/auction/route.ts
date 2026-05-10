import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/tournaments/[id]/auction — Get auction room state
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    const room = await prisma.auctionRoom.findUnique({
      where: { tournamentId },
      include: {
        bids: {
          orderBy: { timestamp: 'desc' },
          take: 20
        }
      }
    });

    if (!room) {
      return NextResponse.json({ success: false, error: 'Auction room not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: room });
  } catch (error: any) {
    console.error('Error fetching auction room:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/tournaments/[id]/auction — Create auction room
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;
    const body = await request.json();
    const { bidTimerSeconds = 30 } = body;

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 });
    }

    if (!tournament.auctionEnabled) {
      return NextResponse.json({ success: false, error: 'Auction is not enabled for this tournament' }, { status: 400 });
    }

    // Upsert auction room
    const room = await prisma.auctionRoom.upsert({
      where: { tournamentId },
      create: { tournamentId, bidTimerSeconds, status: 'WAITING' },
      update: { bidTimerSeconds }
    });

    // Update tournament status to AUCTION_LIVE
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: 'AUCTION_LIVE' }
    });

    return NextResponse.json({ success: true, data: room });
  } catch (error: any) {
    console.error('Error creating auction room:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
