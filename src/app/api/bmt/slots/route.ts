import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const slots = await prisma.slot.findMany({
    orderBy: { startTime: 'asc' }
  });
  return NextResponse.json(slots);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { turfId, groundId, startTime, endTime, timeCategory, days, sports, price, status } = body;

  if (!turfId || !groundId || !startTime || !endTime || !timeCategory || price === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const slot = await prisma.slot.create({
    data: {
      turfId,
      groundId,
      startTime,
      endTime,
      timeCategory,
      price: Number(price),
      status: status || 'available',
      days: Array.isArray(days) ? days : [],
      sports: Array.isArray(sports) ? sports : []
    }
  });

  return NextResponse.json(slot, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { groundId, slotIds } = body;
    
    if (groundId) {
      const clearSlots = await prisma.slot.findMany({
        where: { groundId, bookings: { none: {} } },
        select: { id: true }
      });
      const deleted = await prisma.slot.deleteMany({
        where: { id: { in: clearSlots.map((s: {id: string}) => s.id) } }
      });
      return NextResponse.json({ success: true, count: deleted.count, skipped: (await prisma.slot.count({ where: { groundId } })) });
    }

    if (Array.isArray(slotIds) && slotIds.length > 0) {
      const deleted = await prisma.slot.deleteMany({
        where: { id: { in: slotIds } }
      });
      return NextResponse.json({ success: true, count: deleted.count });
    }

    return NextResponse.json({ error: 'Missing groundId or slotIds' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
