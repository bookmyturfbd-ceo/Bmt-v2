import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/play/my-listing — return the calling owner's active listing with all join requests
export async function GET(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ listing: null });

  // Find the group owned by this player
  const group = await prisma.playGroup.findFirst({
    where: { ownerId: playerId },
  });
  if (!group) return NextResponse.json({ listing: null });

  const listing = await prisma.playListing.findFirst({
    where: { groupId: group.id, active: true },
    orderBy: { createdAt: 'desc' },
    include: {
      requests: {
        include: {
          player: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              footballMmr: true,
              cricketMmr: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return NextResponse.json({ listing });
}
