import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reels = await prisma.reel.findMany({
      where: { status: 'ready' },
      orderBy: { createdAt: 'desc' },
      include: {
        player: {
          select: { id: true, fullName: true, avatarUrl: true }
        }
      },
      take: 20
    });
    return NextResponse.json(reels);
  } catch (error: any) {
    console.error("Fetch Reels Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
