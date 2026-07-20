import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function pid(req: NextRequest) {
  return req.cookies.get('bmt_player_id')?.value ?? null;
}

function oid(req: NextRequest) {
  return req.cookies.get('bmt_owner_id')?.value ?? null;
}

// GET /api/bmt/custom-slot-requests
export async function GET(req: NextRequest) {
  const playerId = pid(req);
  const ownerId = oid(req);
  const isAll = req.nextUrl.searchParams.get('all') === 'true' || req.cookies.get('bmt_role')?.value === 'admin';

  try {
    const requests = await prisma.customSlotRequest.findMany({
      where: isAll ? {} : {
        OR: [
          ownerId ? { coachOwnerId: ownerId } : {},
          playerId ? { playerId: playerId } : {},
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(requests);
  } catch (err) {
    console.error('[custom-slot-requests GET]', err);
    return NextResponse.json([], { status: 500 });
  }
}

// POST /api/bmt/custom-slot-requests — Player submits custom slot request to a coach
export async function POST(req: NextRequest) {
  const playerId = pid(req);
  const body = await req.json();
  const {
    turfId,
    coachOwnerId,
    preferredDate,
    startTime,
    endTime,
    proposedPrice,
    notes,
    serviceName,
    playerName,
    playerPhone,
  } = body;

  if (!turfId || !coachOwnerId || !preferredDate || !startTime || !endTime) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  let pName = playerName;
  if (!pName && playerId) {
    const p = await prisma.player.findUnique({ where: { id: playerId }, select: { fullName: true, phone: true } });
    if (p) {
      pName = p.fullName;
    }
  }

  try {
    const request = await prisma.customSlotRequest.create({
      data: {
        turfId,
        coachOwnerId,
        playerId: playerId || 'anonymous',
        playerName: pName || 'Player',
        playerPhone: playerPhone || '',
        serviceName: serviceName || 'Custom Coaching Slot',
        preferredDate,
        startTime,
        endTime,
        proposedPrice: Number(proposedPrice || 0),
        notes: notes || '',
        status: 'pending',
      },
    });

    // Notify Coach
    if (coachOwnerId) {
      await prisma.notification.create({
        data: {
          userId: coachOwnerId,
          type: 'CUSTOM_SLOT_REQUEST',
          title: JSON.stringify({ en: '⚡ New Custom Slot Request' }),
          body: JSON.stringify({ en: `${pName || 'A player'} requested a custom slot for ${preferredDate} (${startTime} - ${endTime})` }),
          url: '/en/dashboard/coach?tab=bookings',
        },
      }).catch(() => {});
    }

    return NextResponse.json(request, { status: 201 });
  } catch (err) {
    console.error('[custom-slot-requests POST]', err);
    return NextResponse.json({ error: 'Failed to create slot request' }, { status: 500 });
  }
}

// PATCH /api/bmt/custom-slot-requests — Coach accepts or declines a request
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, status } = body;

  if (!id || !['accepted', 'declined'].includes(status)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    const updated = await prisma.customSlotRequest.update({
      where: { id },
      data: { status },
    });

    // Notify Player
    if (updated.playerId && updated.playerId !== 'anonymous') {
      const statusText = status === 'accepted' ? 'accepted ✅' : 'declined ❌';
      await prisma.notification.create({
        data: {
          userId: updated.playerId,
          type: 'CUSTOM_SLOT_RESPONSE',
          title: JSON.stringify({ en: `Custom Slot Request ${status === 'accepted' ? 'Accepted' : 'Declined'}` }),
          body: JSON.stringify({ en: `Your custom slot request for ${updated.preferredDate} (${updated.startTime} - ${updated.endTime}) was ${statusText}` }),
          url: '/en/profile',
        },
      }).catch(() => {});
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error('[custom-slot-requests PATCH]', err);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}
