import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/play/my-requests — returns all join requests sent by the current player
export async function GET(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  // Fetch requests with listing + group (no owner relation on PlayGroup; we'll fetch owner separately)
  const requests = await prisma.playJoinRequest.findMany({
    where: { playerId },
    orderBy: { createdAt: 'desc' },
    include: {
      listing: {
        include: {
          group: {
            include: {
              members: { select: { playerId: true } },
            },
          },
        },
      },
    },
  });

  // Collect unique ownerIds and fetch Player records
  const ownerIds = [...new Set(requests.map(r => r.listing?.group?.ownerId).filter(Boolean))] as string[];
  const owners = ownerIds.length
    ? await prisma.player.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, fullName: true, avatarUrl: true },
      })
    : [];
  const ownerMap = Object.fromEntries(owners.map(o => [o.id, o]));

  // Attach owner to each request's group
  const enriched = requests.map(r => ({
    ...r,
    listing: r.listing
      ? {
          ...r.listing,
          group: r.listing.group
            ? { ...r.listing.group, owner: ownerMap[r.listing.group.ownerId] ?? null }
            : null,
        }
      : null,
  }));

  return NextResponse.json({ requests: enriched });
}
