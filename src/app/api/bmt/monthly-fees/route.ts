import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET — return all monthly fees, optionally filtered by month
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // e.g. "2026-04"

  const fees = await prisma.monthlyFee.findMany({
    where: month ? { month } : undefined,
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(fees);
}

// POST — two actions:
//  { action: 'generate', month } → create fee rows for all monthly turfs (idempotent)
//  { action: 'markPaid', id }   → mark a specific fee as paid
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === 'generate') {
    const month: string = body.month ?? new Date().toISOString().slice(0, 7);

    // Get all published turfs on monthly model
    const turfs = await prisma.turf.findMany({
      where: { status: 'published', revenueModelType: 'monthly' },
      include: { owner: { select: { id: true, name: true } } },
    });

    // Upsert one record per turf per month (skip already existing)
    const created: any[] = [];
    for (const t of turfs) {
      try {
        const fee = await prisma.monthlyFee.create({
          data: {
            turfId:    t.id,
            ownerId:   t.ownerId,
            turfName:  t.name,
            ownerName: t.owner.name,
            month,
            amount:    t.revenueModelValue ?? 0,
            paid:      false,
          },
        });
        created.push(fee);
      } catch {
        // unique constraint hit = already generated for this month, skip
      }
    }
    return NextResponse.json({ generated: created.length, month });
  }

  if (body.action === 'markPaid') {
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const fee = await prisma.monthlyFee.update({
      where: { id },
      data: { paid: true, paidAt: new Date() },
    });
    return NextResponse.json(fee);
  }

  if (body.action === 'markUnpaid') {
    const { id } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const fee = await prisma.monthlyFee.update({
      where: { id },
      data: { paid: false, paidAt: null },
    });
    return NextResponse.json(fee);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
