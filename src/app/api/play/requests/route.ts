import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/play/requests — player requests to join a listing
export async function POST(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { listingId } = await req.json();
  if (!listingId) return NextResponse.json({ error: 'listingId required' }, { status: 400 });

  const listing = await prisma.playListing.findUnique({ where: { id: listingId } });
  if (!listing || !listing.active) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });

  // Can't request your own group's listing
  const group = await prisma.playGroup.findUnique({ where: { id: listing.groupId } });
  if (group?.ownerId === playerId) return NextResponse.json({ error: 'Cannot request your own listing' }, { status: 400 });

  const request = await prisma.playJoinRequest.upsert({
    where: { listingId_playerId: { listingId, playerId } },
    update: { status: 'PENDING' },
    create: { listingId, playerId },
    include: { player: { select: { id: true, fullName: true, avatarUrl: true, footballMmr: true, cricketMmr: true } } },
  });

  return NextResponse.json({ request });
}
