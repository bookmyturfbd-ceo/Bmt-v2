import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/bookings
 *
 * Returns pre-aggregated booking stats for the Super Admin dashboard.
 * No raw booking records are sent to the browser — all heavy computation
 * happens here on the server via Prisma aggregations.
 *
 * Query params:
 *   ?date=YYYY-MM-DD  → filter today's breakdown by a specific date (defaults to today)
 *
 * Response shape:
 * {
 *   totalBmtCut: number,       // all-time sum of bmtCut across all bookings
 *   todayDate: string,         // the date used for today's breakdown
 *   todayGross: number,        // sum of booking prices today
 *   todayBmtCut: number,       // sum of bmtCut today
 *   todayByTurf: [             // per-turf breakdown for today
 *     { turfId, turfName, bookingCount, gross, bmtCut, ownerShare }
 *   ]
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const todayDate = searchParams.get('date') || new Date().toISOString().split('T')[0];

    // ── 1. All-time BMT cut (single aggregation — very fast) ─────────────────
    const allTimeAgg = await prisma.booking.aggregate({
      _sum: { bmtCut: true },
    });
    const totalBmtCut = allTimeAgg._sum.bmtCut ?? 0;

    // ── 2. Today's bookings — grouped by turf via groupBy ────────────────────
    const todayGroups = await prisma.booking.groupBy({
      by: ['turfId'],
      where: { date: todayDate },
      _count: { id: true },
      _sum: { price: true, bmtCut: true },
    });

    // ── 3. Resolve turf names for the turfIds returned ───────────────────────
    const turfIds = todayGroups.map((g) => g.turfId);
    const turfs = turfIds.length > 0
      ? await prisma.turf.findMany({
          where: { id: { in: turfIds } },
          select: { id: true, name: true },
        })
      : [];

    const turfMap = new Map(turfs.map((t) => [t.id, t.name]));

    const todayByTurf = todayGroups.map((g) => {
      const gross = g._sum.price ?? 0;
      const bmtCut = g._sum.bmtCut ?? 0;
      return {
        turfId: g.turfId,
        turfName: turfMap.get(g.turfId) ?? 'Unknown Turf',
        bookingCount: g._count.id,
        gross,
        bmtCut,
        ownerShare: gross - bmtCut,
      };
    });

    const todayGross = todayByTurf.reduce((s, r) => s + r.gross, 0);
    const todayBmtCut = todayByTurf.reduce((s, r) => s + r.bmtCut, 0);

    return NextResponse.json({
      totalBmtCut,
      todayDate,
      todayGross,
      todayBmtCut,
      todayByTurf,
    });
  } catch (error: any) {
    console.error('[admin/bookings] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
