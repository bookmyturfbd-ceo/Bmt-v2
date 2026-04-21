import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get('playerId');

  const where = playerId ? { playerId } : {};

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      player: true,
      slot: {
        include: { ground: true }
      }
    }
  });
  return NextResponse.json(bookings);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { 
    playerId, slotId, turfId, date, 
    price, status, 
    paymentProofUrl, 
    selectedSport,
  } = body;

  if (!playerId || !slotId || !turfId || !date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const grossPrice = Number(price || 0);

  // ── Fetch turf revenue model to calculate ownerShare & bmtCut ──────────────
  const turf = await prisma.turf.findUnique({
    where: { id: turfId },
    select: { revenueModelType: true, revenueModelValue: true },
  });

  let computedBmtCut = 0;
  let computedOwnerShare = grossPrice;

  if (turf?.revenueModelType === 'percentage' && turf.revenueModelValue) {
    computedBmtCut = Math.round(grossPrice * turf.revenueModelValue / 100);
    computedOwnerShare = grossPrice - computedBmtCut;
  }
  // monthly model: owner keeps full booking price; BMT collects flat fee separately

  const booking = await prisma.booking.create({
    data: {
      playerId,
      slotId,
      turfId,
      date,
      price: grossPrice,
      ownerShare: computedOwnerShare,
      bmtCut: computedBmtCut,
      status: status || 'confirmed',
      paymentProofUrl: paymentProofUrl || null,
      selectedSport: selectedSport || null,
    },
    include: { 
      player: true, 
      slot: { include: { ground: true } }
    }
  });

  // ── Increment owner wallet balance ──────────────────────────────────────────
  if (computedOwnerShare > 0) {
    await prisma.owner.updateMany({
      where: { turfs: { some: { id: turfId } } },
      data: { walletBalance: { increment: computedOwnerShare } },
    });
  }

  return NextResponse.json(booking, { status: 201 });
}
