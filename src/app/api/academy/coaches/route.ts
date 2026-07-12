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

// POST: Add coach
export async function POST(req: NextRequest) {
  const { playerId, ownerId } = getAuth(req);
  if (!playerId && !ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { academyId, coachPlayerId, name, title, photoUrl, bio, sortOrder } = body;

    if (!academyId || !name || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isOwner = await checkOwnership(academyId, playerId, ownerId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const coach = await prisma.academyCoach.create({
      data: {
        academyId,
        coachPlayerId: coachPlayerId || null,
        name,
        title,
        photoUrl,
        bio,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0
      }
    });

    return NextResponse.json(coach);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Edit coach
export async function PATCH(req: NextRequest) {
  const { playerId, ownerId } = getAuth(req);
  if (!playerId && !ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, coachPlayerId, name, title, photoUrl, bio, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: 'Coach ID required' }, { status: 400 });
    }

    const coach = await prisma.academyCoach.findUnique({
      where: { id }
    });

    if (!coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
    }

    const isOwner = await checkOwnership(coach.academyId, playerId, ownerId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.academyCoach.update({
      where: { id },
      data: {
        coachPlayerId: coachPlayerId !== undefined ? (coachPlayerId || null) : coach.coachPlayerId,
        name: name !== undefined ? name : coach.name,
        title: title !== undefined ? title : coach.title,
        photoUrl: photoUrl !== undefined ? photoUrl : coach.photoUrl,
        bio: bio !== undefined ? bio : coach.bio,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : coach.sortOrder
      }
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Remove coach
export async function DELETE(req: NextRequest) {
  const { playerId, ownerId } = getAuth(req);
  if (!playerId && !ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Coach ID required' }, { status: 400 });
    }

    const coach = await prisma.academyCoach.findUnique({
      where: { id }
    });

    if (!coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
    }

    const isOwner = await checkOwnership(coach.academyId, playerId, ownerId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.academyCoach.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
