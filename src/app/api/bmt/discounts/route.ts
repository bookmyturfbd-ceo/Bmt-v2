import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const discounts = await prisma.discount.findMany({
    orderBy: { createdAt: 'desc' },
    include: { turf: { select: { name: true } } }
  });
  return NextResponse.json(discounts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { 
    turfId, code, type, value, active, expiresAt, minBookings, maxUses,
    groundId, targetSport, targetDays, targetTimes,
    // Extract legacy JSON fields not strictly mapped to Prisma 
    reason, discountPct, timeOfDay, days, 
    ...rest 
  } = body;

  if (!turfId) {
    return NextResponse.json({ error: 'Missing turfId' }, { status: 400 });
  }

  // Fallback to legacy fields if new ones aren't provided
  const resolvedCode = code || reason || `DISC-${Date.now()}`;
  const resolvedValue = value !== undefined ? Number(value) : Number(discountPct || 0);

  const discount = await prisma.discount.create({
    data: {
      turfId,
      code: resolvedCode,
      type: type || 'percentage',
      value: resolvedValue,
      active: active ?? true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      minBookings: minBookings ? Number(minBookings) : null,
      maxUses: maxUses ? Number(maxUses) : null,
      groundId: groundId || null,
      targetSport: targetSport || null,
      targetDays: Array.isArray(targetDays) ? targetDays : [],
      targetTimes: Array.isArray(targetTimes) ? targetTimes : []
    }
  });

  return NextResponse.json(discount, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  const { id } = body;
  
  if (!id) {
    return NextResponse.json({ error: 'Missing discount ID' }, { status: 400 });
  }

  try {
    await prisma.discount.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
