import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/play/split-requests
// Returns all PENDING split requests for the current player (they are the member being asked to pay)
export async function GET(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  // Find PlayGroupMember records for this player, then get their pending split requests
  const splitRequests = await prisma.playSplitRequest.findMany({
    where: {
      status: 'PENDING',
      member: { playerId },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      group: true,
      member: {
        include: {
          player: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      },
    },
  });

  // Attach owner info for each group (fetch separately since PlayGroup has no owner relation)
  const ownerIds = [...new Set(splitRequests.map(r => r.group.ownerId))];
  const owners = ownerIds.length
    ? await prisma.player.findMany({
        where: { id: { in: ownerIds } },
        select: { id: true, fullName: true, avatarUrl: true },
      })
    : [];
  const ownerMap = Object.fromEntries(owners.map(o => [o.id, o]));

  const enriched = splitRequests.map(r => ({
    ...r,
    group: { ...r.group, owner: ownerMap[r.group.ownerId] ?? null },
  }));

  return NextResponse.json({ splitRequests: enriched });
}
