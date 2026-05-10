import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { badgeId, isShowcased } = await req.json();

  if (!badgeId || typeof isShowcased !== 'boolean') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // Ensure the badge belongs to the player
  const badge = await prisma.playerBadge.findUnique({
    where: { id: badgeId },
  });

  if (!badge || badge.playerId !== id) {
    return NextResponse.json({ error: 'Badge not found or unauthorized' }, { status: 403 });
  }

  if (isShowcased) {
    // Check if player already has 3 showcased badges
    const showcasedCount = await prisma.playerBadge.count({
      where: { playerId: id, isShowcased: true },
    });

    if (showcasedCount >= 3) {
      return NextResponse.json({ error: 'Maximum of 3 badges can be showcased' }, { status: 400 });
    }
  }

  const updatedBadge = await prisma.playerBadge.update({
    where: { id: badgeId },
    data: { isShowcased },
  });

  return NextResponse.json(updatedBadge);
}
