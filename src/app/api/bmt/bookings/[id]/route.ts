import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notify } from '@/lib/notificationService';

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { 
      player: true, 
      slot: { include: { ground: true } } 
    }
  });

  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  return NextResponse.json(booking);
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const body = await req.json();
  const { 
    id: _id, 
    playerId: _pid, 
    slotId: _sid, 
    player, 
    slot, 
    slotDiscount, // Intentionally detached since it isn't in Prisma
    ...patch 
  } = body;

  if (patch.price !== undefined) patch.price = Number(patch.price);
  if (patch.ownerShare !== undefined) patch.ownerShare = Number(patch.ownerShare);
  if (patch.bmtCut !== undefined) patch.bmtCut = Number(patch.bmtCut);

  try {
    const oldBooking = await prisma.booking.findUnique({ where: { id } });
    const updated = await prisma.booking.update({
      where: { id },
      data: patch,
      include: { 
        player: true, 
        slot: { include: { ground: true } } 
      }
    });

    if (oldBooking?.status !== 'cancelled' && updated.status === 'cancelled') {
      const turf = await prisma.turf.findUnique({
        where: { id: updated.turfId },
        select: { name: true, ownerId: true }
      });
      if (turf) {
        const dateTimeStr = `${updated.date} (${updated.slot.startTime} - ${updated.slot.endTime})`;
        
        // Notify player
        await notify({
          userIds: [updated.playerId],
          type: 'booking_cancelled',
          url: '/en/book?tab=history',
          params: { turfName: turf.name, dateTime: dateTimeStr }
        });

        // Notify owner
        await notify({
          userIds: [turf.ownerId],
          type: 'booking_cancelled',
          url: '/en/dashboard/owner',
          params: { turfName: turf.name, dateTime: dateTimeStr }
        });
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  try {
    await prisma.booking.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }
}
