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

// POST /api/auction/[roomId]/control — Start, Pause, End the auction
export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { action } = body; // 'start' | 'pause' | 'resume' | 'end'

    const room = await prisma.auctionRoom.findUnique({ where: { id: roomId } });
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 });
    }

    let newStatus: string;
    switch (action) {
      case 'start':
      case 'resume':
        newStatus = 'PAUSED'; // PAUSED means waiting for next player to be called up
        break;
      case 'pause':
        newStatus = 'PAUSED';
        break;
      case 'end':
        newStatus = 'COMPLETED';
        // Also update tournament status
        await prisma.tournament.update({
          where: { id: room.tournamentId },
          data: { status: 'SCHEDULED' } // Move back to scheduled — teams now ready to play
        });
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const updated = await prisma.auctionRoom.update({
      where: { id: roomId },
      data: { status: newStatus as any }
    });

    await broadcastAuctionState(room.tournamentId, 'auction:control', { action, newStatus });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error controlling auction:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
