import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const memberInclude: any = {
  player: { select: { id: true, fullName: true, avatarUrl: true } },
  splitRequests: { where: { status: 'PENDING' }, take: 1, orderBy: { createdAt: 'desc' } },
};

// GET /api/play/my — return caller's current group with requests
export async function GET(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ group: null });

  const membership = await prisma.playGroupMember.findFirst({
    where: { playerId },
    include: {
      group: {
        include: {
          members: { include: memberInclude },
          listings: {
            where: { active: true },
            include: {
              requests: {
                include: {
                  player: { select: { id: true, fullName: true, avatarUrl: true, footballMmr: true, cricketMmr: true } },
                },
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  if (!membership) return NextResponse.json({ group: null });

  return NextResponse.json({ group: membership.group });
}
