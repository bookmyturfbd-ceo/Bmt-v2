import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const method = await prisma.paymentMethod.findUnique({ where: { id } });
  
  if (!method) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(method);
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const body = await req.json();
  const { id: _id, type: _t, ...patch } = body;

  try {
    const updated = await prisma.paymentMethod.update({
      where: { id },
      data: patch
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Update failed' }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  try {
    await prisma.paymentMethod.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
