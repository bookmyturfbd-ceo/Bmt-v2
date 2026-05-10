import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { supabase } from '@/lib/supabase';

async function broadcastAuctionState(tournamentId: string, event: string, payload: object) {
  try {
    await supabase
      .channel(`auction:${tournamentId}`)
      .send({ type: 'broadcast', event, payload });
  } catch (e) {
    console.warn('Auction broadcast failed:', e);
  }
}

// POST /api/auction/[roomId]/next-player — Move to next player
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { playerId, basePrice = 100 } = body;

    if (!playerId) {
      return NextResponse.json({ success: false, error: 'playerId is required' }, { status: 400 });
    }

    const room = await prisma.auctionRoom.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
    }

    // Set current player being auctioned
    const updated = await prisma.auctionRoom.update({
      where: { id: roomId },
      data: {
        status: 'LIVE',
        currentPlayerId: playerId,
        currentBasePrice: basePrice,
        currentHighestBid: basePrice,
        currentHighestBidderId: null
      }
    });

    await broadcastAuctionState(room.tournamentId, 'auction:next_player', {
      playerId,
      basePrice,
      timer: room.bidTimerSeconds
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error advancing player:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
