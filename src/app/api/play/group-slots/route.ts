import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/play/group-slots?turfId=&date=YYYY-MM-DD
// Returns all slots for a turf with real-time booked status for a given date
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const turfId = searchParams.get('turfId');
  const date   = searchParams.get('date');

  if (!turfId) return NextResponse.json({ error: 'turfId required' }, { status: 400 });

  // Get all grounds + slots for this turf
  const grounds = await prisma.ground.findMany({
    where: { turfId },
    include: {
      slots: {
        where: { status: { not: 'maintenance' } },
        orderBy: { startTime: 'asc' },
      },
    },
  });

  if (!date) {
    // No date — just return slots without booking info
    return NextResponse.json({ grounds });
  }

  // For each slot, check if it's booked on the given date
  const allSlotIds = grounds.flatMap(g => g.slots.map(s => s.id));
  const bookings = await prisma.booking.findMany({
    where: {
      slotId: { in: allSlotIds },
      date,
      status: { not: 'cancelled' },
    },
    select: { slotId: true },
  });
  const bookedSet = new Set(bookings.map(b => b.slotId));

  const enriched = grounds.map(g => ({
    ...g,
    slots: g.slots.map(s => ({ ...s, isBooked: bookedSet.has(s.id) })),
  }));

  return NextResponse.json({ grounds: enriched });
}
