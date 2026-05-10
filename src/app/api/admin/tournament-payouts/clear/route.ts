import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/admin/tournament-payouts/clear
// Body: { organizerId, proofImageUrl?, note?, method? }
// Clears ALL HOLDING payouts for an organizer and credits their wallet — mirrors the turf PayoutsLedger flow
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { organizerId, proofImageUrl, note, method } = body;

    if (!organizerId) {
      return NextResponse.json({ success: false, error: 'organizerId is required' }, { status: 400 });
    }

    const holdingPayouts = await prisma.tournamentPayout.findMany({
      where: { organizerId, status: 'HOLDING' },
      include: { tournament: { select: { name: true } } },
    });

    if (holdingPayouts.length === 0) {
      return NextResponse.json({ success: false, error: 'No holding payouts for this organizer' }, { status: 400 });
    }

    const totalAmount = holdingPayouts.reduce((s, p) => s + p.amount, 0);

    await prisma.$transaction(async (tx) => {
      // Mark all as CLEARED with proof
      await tx.tournamentPayout.updateMany({
        where: { organizerId, status: 'HOLDING' },
        data: {
          status: 'CLEARED',
          clearedAt: new Date(),
          proofImageUrl: proofImageUrl || null,
          note: note || null,
        },
      });

      // Credit organizer wallet
      await tx.organizerWallet.upsert({
        where: { organizerId },
        create: { organizerId, balance: totalAmount, totalToppedUp: totalAmount, totalSpent: 0 },
        update: { balance: { increment: totalAmount }, totalToppedUp: { increment: totalAmount } },
      });

      await tx.organizerWalletTransaction.create({
        data: {
          organizerId,
          type: 'TOP_UP',
          amount: totalAmount,
          description: `Tournament entry fee payout — ৳${totalAmount} cleared by BMT super admin`,
        },
      });
    });

    return NextResponse.json({ success: true, totalCleared: totalAmount });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
