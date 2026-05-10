import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    const request = await prisma.organizerRechargeRequest.findUnique({ where: { id } });
    if (!request) {
      return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });
    }
    if (request.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'Already reviewed' }, { status: 400 });
    }

    if (status === 'approved') {
      // Ensure wallet row exists (needed for the connect below)
      await prisma.organizerWallet.upsert({
        where:  { organizerId: request.organizerId },
        create: { organizerId: request.organizerId, balance: 0, totalToppedUp: 0, totalSpent: 0 },
        update: {},          // no-op if already exists
      });

      // Now run everything atomically
      await prisma.$transaction([
        // 1. Mark request approved
        prisma.organizerRechargeRequest.update({
          where: { id },
          data:  { status: 'approved' },
        }),
        // 2. Credit balance
        prisma.organizerWallet.update({
          where: { organizerId: request.organizerId },
          data:  { balance: { increment: request.amount }, totalToppedUp: { increment: request.amount } },
        }),
        // 3. Log transaction — use `connect` so Prisma resolves the FK itself
        prisma.organizerWalletTransaction.create({
          data: {
            wallet:      { connect: { organizerId: request.organizerId } },
            type:        'TOP_UP',
            amount:      request.amount,
            description: `Wallet top-up via ${request.method} — approved by admin`,
          },
        }),
      ]);
    } else {
      await prisma.organizerRechargeRequest.update({
        where: { id },
        data:  { status: 'rejected' },
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[orgRecharge PATCH]', e.message);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
