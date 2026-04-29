import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const pid = cookieStore.get('bmt_player_id')?.value;
    if (!pid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const reels = await prisma.reel.findMany({
      where: { playerId: pid },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(reels);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
