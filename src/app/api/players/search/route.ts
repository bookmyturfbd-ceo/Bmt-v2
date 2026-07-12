import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const revalidate = 0;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '';
  const playerId = req.cookies.get('bmt_player_id')?.value;
  
  if (!playerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const players = await prisma.player.findMany({
      where: {
        OR: [
          { fullName: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { playerCode: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        mmr: true,
        playerCode: true
      },
      take: 10
    });

    return NextResponse.json(players);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
