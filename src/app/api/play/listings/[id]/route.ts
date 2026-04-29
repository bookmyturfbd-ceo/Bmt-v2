import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// DELETE /api/play/listings/[id] — owner removes (deactivates) their listing
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const listing = await prisma.playListing.findUnique({
    where: { id },
    include: { group: true },
  });
  if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (listing.group.ownerId !== playerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.playListing.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ ok: true });
}
