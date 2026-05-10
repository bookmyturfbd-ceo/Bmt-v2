import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function randomCode(len = 6) {
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase();
}

// POST /api/play/groups/[id]/book
// Group split booking — validates allocation vs slot price and each member's wallet,
// then atomically deducts all wallets and creates the booking.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: groupId } = await params;
  const ownerId = req.cookies.get('bmt_player_id')?.value;
  if (!ownerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { slotId, turfId, date, selectedSport } = await req.json();
  if (!slotId || !turfId || !date) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  try {

  // ── Load group with members and their wallet balances ──────────────────────
  const group = await prisma.playGroup.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          player: { select: { id: true, fullName: true, walletBalance: true } },
        },
      },
    },
  });

  if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  if (group.ownerId !== ownerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // ── Load slot price ────────────────────────────────────────────────────────
  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    select: { id: true, price: true },
  });
  if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 });

  const slotPrice = slot.price;
  const members = group.members;

  // ── Validation A: total allocated splits must cover slot price ─────────────
  const totalAllocated = members.reduce((s, m) => s + (m.splitAmount || 0), 0);
  if (totalAllocated < slotPrice) {
    return NextResponse.json({
      error: 'insufficient_allocation',
      message: `Allocated amount (৳${totalAllocated}) is not enough to cover the slot price (৳${slotPrice}). You are ৳${slotPrice - totalAllocated} short.`,
      totalAllocated,
      slotPrice,
      shortfall: slotPrice - totalAllocated,
    }, { status: 422 });
  }

  // ── Validation B: each member must have enough wallet balance ──────────────
  const culprits = members
    .filter(m => m.splitAmount > 0 && (m.player.walletBalance ?? 0) < m.splitAmount)
    .map(m => ({
      name: m.player.fullName,
      playerId: m.player.id,
      required: m.splitAmount,
      available: m.player.walletBalance ?? 0,
      shortfall: m.splitAmount - (m.player.walletBalance ?? 0),
    }));

  if (culprits.length > 0) {
    return NextResponse.json({
      error: 'insufficient_balance',
      message: `Some members don't have enough wallet balance.`,
      culprits,
    }, { status: 422 });
  }

  // ── Fetch turf revenue model ───────────────────────────────────────────────
  const turf = await prisma.turf.findUnique({
    where: { id: turfId },
    select: { revenueModelType: true, revenueModelValue: true },
  });

  const grossPrice = slotPrice;
  let computedBmtCut = 0;
  let computedOwnerShare = grossPrice;
  if (turf?.revenueModelType === 'percentage' && turf.revenueModelValue) {
    computedBmtCut = Math.round(grossPrice * turf.revenueModelValue / 100);
    computedOwnerShare = grossPrice - computedBmtCut;
  }

  // ── Generate shared booking code ───────────────────────────────────────────
  const groupBookingCode = randomCode(6);

    // ── Atomic transaction: create booking + deduct all member wallets ─────────
    const [booking] = await prisma.$transaction([
      // Create the booking (owned by the group owner's player record)
      prisma.booking.create({
        data: {
          playerId: ownerId,
          slotId,
          turfId,
          date,
          price: grossPrice,
          ownerShare: computedOwnerShare,
          bmtCut: computedBmtCut,
          status: 'confirmed',
          selectedSport: selectedSport || null,
          groupId,
          groupBookingCode,
          source: 'play_group',
          notes: `Group split booking — ${group.members.length} members — Code: ${groupBookingCode}`,
          splits: {
            create: members.filter(m => m.splitAmount > 0).map(m => ({
              playerId: m.player.id,
              amount: m.splitAmount
            }))
          }
        },
      }),
      // Deduct each member's wallet (only those with splitAmount > 0)
      ...members
        .filter(m => m.splitAmount > 0)
        .map(m =>
          prisma.player.update({
            where: { id: m.player.id },
            data: { walletBalance: { decrement: m.splitAmount } },
          })
        ),
      // Credit turf owner wallet
      ...(computedOwnerShare > 0
        ? [prisma.owner.updateMany({
            where: { turfs: { some: { id: turfId } } },
            data: { walletBalance: { increment: computedOwnerShare } },
          })]
        : []),
    ]);

    return NextResponse.json({
      ok: true,
      booking,
      groupBookingCode,
      message: `Booking confirmed! Code: ${groupBookingCode}`,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Group split booking error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
