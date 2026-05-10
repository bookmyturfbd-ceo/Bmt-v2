import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

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
    const updated = await prisma.booking.update({
      where: { id },
      data: patch,
      include: { 
        player: true, 
        slot: { include: { ground: true } } 
      }
    });
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
