import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const revalidate = 0;

function getAuth(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value || null;
  const ownerId = req.cookies.get('bmt_owner_id')?.value || null;
  return { playerId, ownerId };
}

export async function GET(req: NextRequest) {
  const { playerId, ownerId } = getAuth(req);
  if (!playerId && !ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const academy = await prisma.academy.findFirst({
      where: {
        OR: [
          ...(playerId ? [{ ownerPlayerId: playerId }] : []),
          ...(ownerId ? [{ ownerOwnerId: ownerId }] : [])
        ]
      }
    });

    if (!academy) {
      return NextResponse.json({
        viewsThisWeek: 0,
        viewsThisMonth: 0,
        inquiriesThisMonth: 0,
        enrolledCount: 0
      });
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [viewsWeek, viewsMonth, inquiriesMonth, enrolled] = await Promise.all([
      prisma.academyListingView.count({
        where: { academyId: academy.id, viewedAt: { gte: sevenDaysAgo } }
      }),
      prisma.academyListingView.count({
        where: { academyId: academy.id, viewedAt: { gte: thirtyDaysAgo } }
      }),
      prisma.academyInquiry.count({
        where: { academyId: academy.id, createdAt: { gte: thirtyDaysAgo } }
      }),
      prisma.academyInquiry.count({
        where: { academyId: academy.id, status: 'ENROLLED' }
      })
    ]);

    return NextResponse.json({
      viewsThisWeek: viewsWeek,
      viewsThisMonth: viewsMonth,
      inquiriesThisMonth: inquiriesMonth,
      enrolledCount: enrolled
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
