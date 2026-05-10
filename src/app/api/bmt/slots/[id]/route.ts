import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  
  const slot = await prisma.slot.findUnique({
    where: { id }
  });

  if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
  return NextResponse.json(slot);
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const body = await req.json();
  const { id: _id, turfId: _turfId, groundId: _groundId, ...patch } = body;

  if (patch.price !== undefined) patch.price = Number(patch.price);
  if (patch.days !== undefined && !Array.isArray(patch.days)) patch.days = [];
  if (patch.sports !== undefined && !Array.isArray(patch.sports)) patch.sports = [];

  try {
    const updated = await prisma.slot.update({
      where: { id },
      data: patch
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update slot' }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  try {
    await prisma.slot.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
  }
}
