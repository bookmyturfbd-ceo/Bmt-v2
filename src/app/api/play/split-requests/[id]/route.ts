import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PATCH /api/play/split-requests/[id]
// Player accepts or rejects a payment/split request
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { action } = await req.json(); // 'accept' | 'reject'
  if (!['accept', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Load the split request and verify this player owns the membership
  const splitReq = await prisma.playSplitRequest.findUnique({
    where: { id },
    include: { member: true },
  });

  if (!splitReq) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (splitReq.member.playerId !== playerId) {
    return NextResponse.json({ error: 'Forbidden — not your request' }, { status: 403 });
  }
  if (splitReq.status !== 'PENDING') {
    return NextResponse.json({ error: 'Already resolved' }, { status: 400 });
  }

  if (action === 'accept') {
    // Apply the split amount to the membership and mark request accepted
    await prisma.$transaction([
      prisma.playGroupMember.update({
        where: { id: splitReq.memberId },
        data: { splitAmount: splitReq.amount },
      }),
      prisma.playSplitRequest.update({
        where: { id },
        data: { status: 'ACCEPTED' },
      }),
    ]);
    return NextResponse.json({ ok: true, applied: splitReq.amount });
  }

  // reject
  await prisma.playSplitRequest.update({ where: { id }, data: { status: 'REJECTED' } });
  return NextResponse.json({ ok: true });
}
