import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  
  const payout = await prisma.payout.findUnique({
    where: { id },
    include: { owner: { select: { name: true, phone: true } } }
  });

  if (!payout) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ...payout, proofBase64: payout.proofUrl });
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const body = await req.json();
  
  const { id: _id, ownerId: _oid, owner, proofBase64, ...patch } = body;

  if (patch.amount !== undefined) patch.amount = Number(patch.amount);
  if (patch.bmtCut !== undefined) patch.bmtCut = Number(patch.bmtCut);
  
  if (proofBase64) patch.proofUrl = proofBase64;

  try {
    const updated = await prisma.payout.update({
      where: { id },
      data: patch,
      include: { owner: { select: { name: true, phone: true } } }
    });
    return NextResponse.json({ ...updated, proofBase64: updated.proofUrl });
  } catch (err) {
    return NextResponse.json({ error: 'Update failed', details: String(err) }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  try {
    await prisma.payout.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
