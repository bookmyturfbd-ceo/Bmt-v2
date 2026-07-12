import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function getAuth(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value || null;
  const ownerId = req.cookies.get('bmt_owner_id')?.value || null;
  return { playerId, ownerId };
}

async function checkOwnership(academyId: string, playerId: string | null, ownerId: string | null) {
  const academy = await prisma.academy.findUnique({
    where: { id: academyId }
  });
  if (!academy) return false;
  const isPlayerOwner = playerId && academy.ownerPlayerId === playerId;
  const isOwnerOwner = ownerId && academy.ownerOwnerId === ownerId;
  return !!(isPlayerOwner || isOwnerOwner);
}

// POST: Add media item
export async function POST(req: NextRequest) {
  const { playerId, ownerId } = getAuth(req);
  if (!playerId && !ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { academyId, url, type, sortOrder, caption } = body;

    if (!academyId || !url) {
      return NextResponse.json({ error: 'Missing parameters (academyId, url)' }, { status: 400 });
    }

    const isOwner = await checkOwnership(academyId, playerId, ownerId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const media = await prisma.academyMedia.create({
      data: {
        academyId,
        url,
        type: type || 'PHOTO',
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        caption
      }
    });

    return NextResponse.json(media);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Remove media item
export async function DELETE(req: NextRequest) {
  const { playerId, ownerId } = getAuth(req);
  if (!playerId && !ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Media ID required' }, { status: 400 });
    }

    const media = await prisma.academyMedia.findUnique({
      where: { id }
    });

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    const isOwner = await checkOwnership(media.academyId, playerId, ownerId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.academyMedia.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
