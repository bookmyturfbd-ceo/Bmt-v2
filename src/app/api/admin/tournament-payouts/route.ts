import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/admin/tournament-payouts
// Returns all payout records grouped by organizer -> tournament
export async function GET() {
  try {
    const payouts = await prisma.tournamentPayout.findMany({
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            entryFee: true,
            operatorId: true,
            operatorType: true,
            status: true,
            organizer: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by organizer (or 'platform' for PLATFORM tournaments)
    const grouped: Record<string, any> = {};

    for (const payout of payouts) {
      const t = payout.tournament;
      const orgKey = t.organizer?.id ?? 'platform';
      const orgLabel = t.organizer
        ? { id: t.organizer.id, name: t.organizer.name, email: t.organizer.email }
        : { id: 'platform', name: 'BMT Platform', email: 'platform@bmt.com' };

      if (!grouped[orgKey]) {
        grouped[orgKey] = { organizer: orgLabel, tournaments: {} };
      }

      if (!grouped[orgKey].tournaments[t.id]) {
        grouped[orgKey].tournaments[t.id] = {
          id: t.id,
          name: t.name,
          entryFee: t.entryFee,
          status: t.status,
          payouts: [],
          totalHolding: 0,
          totalCleared: 0,
        };
      }

      const tourney = grouped[orgKey].tournaments[t.id];
      tourney.payouts.push(payout);
      if (payout.status === 'HOLDING') tourney.totalHolding += payout.amount;
      else tourney.totalCleared += payout.amount;
    }

    // Convert to array form
    const result = Object.values(grouped).map((g: any) => ({
      organizer: g.organizer,
      tournaments: Object.values(g.tournaments),
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
