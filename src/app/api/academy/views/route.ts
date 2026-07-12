import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value || null;
  const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

  try {
    const body = await req.json();
    const { academyId } = body;

    if (!academyId) {
      return NextResponse.json({ error: 'Academy ID required' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Deduplicate views: Check if same player or IP viewed this academy today
    const existing = await prisma.academyListingView.findFirst({
      where: {
        academyId,
        viewedAt: { gte: today },
        OR: [
          ...(playerId ? [{ playerId }] : []),
          ...(ipAddress ? [{ ipAddress }] : [])
        ]
      }
    });

    if (!existing) {
      await prisma.academyListingView.create({
        data: {
          academyId,
          playerId,
          ipAddress
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
