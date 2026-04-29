import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const memberInclude = {
  player: { select: { fullName: true, avatarUrl: true } },
};

// POST /api/play/groups — create group with name + sport
export async function POST(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const existing = await prisma.playGroupMember.findFirst({ where: { playerId } });
  if (existing) return NextResponse.json({ error: 'Already in a group' }, { status: 409 });

  const body = await req.json().catch(() => ({}));
  const { name, sport } = body;

  const group = await prisma.playGroup.create({
    data: {
      ownerId: playerId,
      name: name?.trim() || 'My Group',
      sport: sport || null,
      members: { create: { playerId } },
    },
    include: { members: { include: memberInclude } },
  });

  return NextResponse.json({ group });
}
