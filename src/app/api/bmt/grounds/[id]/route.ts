import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  
  const ground = await prisma.ground.findUnique({
    where: { id },
    include: { slots: true }
  });

  if (!ground) return NextResponse.json({ error: 'Ground not found' }, { status: 404 });
  return NextResponse.json(ground);
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const body = await req.json();
  const { id: _id, turfId: _turfId, slots: _slots, ...patch } = body;

  try {
    const updated = await prisma.ground.update({
      where: { id },
      data: patch,
      include: { slots: true }
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update ground' }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  try {
    await prisma.ground.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Ground not found' }, { status: 404 });
  }
}
