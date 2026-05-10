import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PATCH /api/play/requests/[id] — owner accepts or rejects
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { status } = await req.json(); // 'ACCEPTED' | 'REJECTED'
  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const request = await prisma.playJoinRequest.findUnique({
    where: { id },
    include: { listing: { include: { group: true } } },
  });
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Only the group owner can accept/reject
  if (request.listing.group.ownerId !== playerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updated = await prisma.playJoinRequest.update({
    where: { id },
    data: { status },
    include: { player: { select: { id: true, fullName: true, avatarUrl: true, footballMmr: true, cricketMmr: true } } },
  });

  return NextResponse.json({ request: updated });
}

