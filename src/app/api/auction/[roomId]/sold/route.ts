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

// POST /api/auction/[roomId]/sold — Hammer down, record the winning bid
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    const room = await prisma.auctionRoom.findUnique({ where: { id: roomId } });
    if (!room || room.status !== 'LIVE') {
      return NextResponse.json({ success: false, error: 'Auction is not live' }, { status: 400 });
    }

    if (!room.currentPlayerId) {
      return NextResponse.json({ success: false, error: 'No player is up for auction' }, { status: 400 });
    }

    const soldPlayerId = room.currentPlayerId;

    if (!room.currentHighestBidderId) {
      // UNSOLD — no one bid, pause room
      await prisma.auctionRoom.update({
        where: { id: roomId },
        data: { status: 'PAUSED', currentPlayerId: null }
      });

      await broadcastAuctionState(room.tournamentId, 'auction:unsold', {
        playerId: soldPlayerId
      });

      return NextResponse.json({ success: true, result: 'UNSOLD', playerId: soldPlayerId });
    }

    const soldAmount = room.currentHighestBid!;
    const soldToCaptainId = room.currentHighestBidderId;

    // Mark the player registration as APPROVED (sold)
    await prisma.tournamentRegistration.updateMany({
      where: {
        tournamentId: room.tournamentId,
        entityId: soldPlayerId
      },
      data: { status: 'APPROVED' }
    });

    // Pause room between players
    await prisma.auctionRoom.update({
      where: { id: roomId },
      data: {
        status: 'PAUSED',
        currentPlayerId: null,
        currentHighestBid: null,
        currentHighestBidderId: null
      }
    });

    await broadcastAuctionState(room.tournamentId, 'auction:sold', {
      playerId: soldPlayerId,
      soldTo: soldToCaptainId,
      amount: soldAmount
    });

    return NextResponse.json({
      success: true,
      result: 'SOLD',
      playerId: soldPlayerId,
      soldTo: soldToCaptainId,
      amount: soldAmount
    });
  } catch (error: any) {
    console.error('Error selling player:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
