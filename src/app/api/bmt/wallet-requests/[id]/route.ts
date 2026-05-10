import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  
  const request = await prisma.walletRequest.findUnique({
    where: { id },
    include: { player: { select: { fullName: true, phone: true } } }
  });

  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ...request, screenshotBase64: request.screenshotUrl });
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const body = await req.json();
  // Safe extraction bypassing structural overrides
  const { id: _id, playerId: _pid, player, screenshotBase64, ...patch } = body;

  if (patch.amount !== undefined) patch.amount = Number(patch.amount);
  
  // Extract explicit screenshot modification mapping
  if (screenshotBase64) patch.screenshotUrl = screenshotBase64;

  const existing = await prisma.walletRequest.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // If newly approving a pending request, credit player seamlessly.
  if (patch.status === 'approved' && existing.status !== 'approved') {
    patch.reviewedAt = new Date();
    
    // Attempt transaction (Atomic sequential operations contextually bounded)
    const [updated] = await prisma.$transaction([
      prisma.walletRequest.update({ where: { id }, data: patch, include: { player: true } }),
      prisma.player.update({
         where: { id: existing.playerId },
         data: { walletBalance: { increment: existing.amount } }
      })
    ]);
    return NextResponse.json({ ...updated, screenshotBase64: updated.screenshotUrl });
  }

  // If it's merely a text update or rejection
  if (['approved', 'rejected'].includes(patch.status)) patch.reviewedAt = new Date();
  
  const updated = await prisma.walletRequest.update({
    where: { id },
    data: patch,
    include: { player: { select: { fullName: true, phone: true } } }
  });

  return NextResponse.json({ ...updated, screenshotBase64: updated.screenshotUrl });
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  try {
    await prisma.walletRequest.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
