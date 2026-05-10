import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  
  const discount = await prisma.discount.findUnique({
    where: { id }
  });

  if (!discount) return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
  return NextResponse.json(discount);
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const body = await req.json();
  const { 
    id: _id, turfId: _turfId, turf,
    timeOfDay, days, reason, discountPct, // Omit legacy unsupported array fields
    ...patch 
  } = body;

  // Remap payload mapping fallback safely
  if (patch.value !== undefined) patch.value = Number(patch.value);
  else if (discountPct !== undefined) patch.value = Number(discountPct);

  if (patch.minBookings !== undefined) patch.minBookings = patch.minBookings ? Number(patch.minBookings) : null;
  if (patch.maxUses !== undefined) patch.maxUses = patch.maxUses ? Number(patch.maxUses) : null;
  if (patch.expiresAt) patch.expiresAt = new Date(patch.expiresAt);
  if (reason) patch.code = reason;

  try {
    const updated = await prisma.discount.update({
      where: { id },
      data: patch
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update discount' }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  try {
    await prisma.discount.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Discount not found' }, { status: 404 });
  }
}
