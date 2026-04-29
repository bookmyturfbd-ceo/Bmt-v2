import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST /api/play/listings — owner posts a "looking for players" listing for their group
export async function POST(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const body = await req.json();
  const {
    groupId, sport, playersNeeded, description,
    date, timeSlot, turfName, minFootballRank, minCricketRank,
  } = body;

  if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 });

  // Verify caller is owner of the group
  const group = await prisma.playGroup.findUnique({ where: { id: groupId } });
  if (!group || group.ownerId !== playerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Deactivate any existing active listing for this group first (one at a time)
  await prisma.playListing.updateMany({
    where: { groupId, active: true },
    data: { active: false },
  });

  const listing = await prisma.playListing.create({
    data: {
      groupId,
      sport: sport || null,
      playersNeeded: Number(playersNeeded) || 1,
      description: description || null,
      date: date || null,
      timeSlot: timeSlot || null,
      turfName: turfName || null,
      minFootballRank: minFootballRank ? Number(minFootballRank) : null,
      minCricketRank: minCricketRank ? Number(minCricketRank) : null,
    },
  });

  return NextResponse.json({ listing });
}

// GET /api/play/listings — all active listings, enriched with owner info
export async function GET(_req: NextRequest) {
  const listings = await prisma.playListing.findMany({
    where: { active: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      group: {
        include: {
          members: {
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
          },
        },
      },
    },
  });

  const enriched = listings.map((l) => ({
    ...l,
    group: {
      ...l.group,
      owner: l.group.members.find((m) => m.playerId === l.group.ownerId)?.player ?? null,
    },
  }));

  return NextResponse.json({ listings: enriched });
}
