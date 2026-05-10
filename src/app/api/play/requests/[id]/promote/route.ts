import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/play/requests/[id]/promote — owner promotes accepted requester to group member
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await params;
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const request = await prisma.playJoinRequest.findUnique({
    where: { id: requestId },
    include: { listing: { include: { group: { include: { members: true } } } } },
  });

  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (request.listing.group.ownerId !== playerId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (request.status !== 'ACCEPTED') return NextResponse.json({ error: 'Request not accepted' }, { status: 400 });

  const groupId = request.listing.group.id;
  const listingId = request.listingId;
  const targetPlayerId = request.playerId;

  // Add to group (upsert in case already added)
  const alreadyMember = request.listing.group.members.some(m => m.playerId === targetPlayerId);
  if (!alreadyMember) {
    await prisma.playGroupMember.create({ data: { groupId, playerId: targetPlayerId } });
  }

  // Decrement playersNeeded on the listing (min 0)
  const listing = await prisma.playListing.findUnique({ where: { id: listingId } });
  if (listing && listing.playersNeeded > 0) {
    await prisma.playListing.update({
      where: { id: listingId },
      data: {
        playersNeeded: listing.playersNeeded - 1,
        active: listing.playersNeeded - 1 > 0, // deactivate if filled
      },
    });
  }

  // Load updated group
  const group = await prisma.playGroup.findUnique({
    where: { id: groupId },
    include: {
      members: { include: { player: { select: { fullName: true, avatarUrl: true } } } },
    },
  });

  return NextResponse.json({ ok: true, group });
}
