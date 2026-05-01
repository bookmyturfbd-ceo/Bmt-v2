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

// POST /api/auction/[roomId]/bid — Place a bid
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { captainId, amount } = body;

    if (!captainId || !amount) {
      return NextResponse.json({ success: false, error: 'captainId and amount are required' }, { status: 400 });
    }

    const room = await prisma.auctionRoom.findUnique({ where: { id: roomId } });
    if (!room || room.status !== 'LIVE') {
      return NextResponse.json({ success: false, error: 'Auction is not live' }, { status: 400 });
    }

    if (!room.currentPlayerId) {
      return NextResponse.json({ success: false, error: 'No player is currently up for auction' }, { status: 400 });
    }

    // Bid must be strictly higher than the current highest
    const minBid = (room.currentHighestBid ?? room.currentBasePrice ?? 0) + 10;
    if (amount < minBid) {
      return NextResponse.json({ 
        success: false, 
        error: `Bid must be at least ${minBid} coins` 
      }, { status: 400 });
    }

    // Create the bid record
    await prisma.auctionBid.create({
      data: {
        auctionRoomId: roomId,
        playerId: room.currentPlayerId,
        captainId,
        amount
      }
    });

    // Update room with new highest bid
    const updated = await prisma.auctionRoom.update({
      where: { id: roomId },
      data: {
        currentHighestBid: amount,
        currentHighestBidderId: captainId
      }
    });

    await broadcastAuctionState(room.tournamentId, 'auction:new_bid', {
      captainId,
      amount,
      playerId: room.currentPlayerId,
      newHighestBid: amount,
      newHighestBidderId: captainId
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error placing bid:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET /api/auction/[roomId]/bid — Get bid history for current player
export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    const room = await prisma.auctionRoom.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
    }

    const bids = await prisma.auctionBid.findMany({
      where: { 
        auctionRoomId: roomId,
        playerId: room.currentPlayerId || ''
      },
      orderBy: { timestamp: 'desc' }
    });

    return NextResponse.json({ success: true, data: bids });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
