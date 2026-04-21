import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/players/search?q=phone_or_email
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q || q.length < 3) return NextResponse.json({ players: [] });

  const players = await prisma.player.findMany({
    where: {
      OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q } },
        { fullName: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, mmr: true, level: true },
    take: 10,
  });

  return NextResponse.json({ players });
}
