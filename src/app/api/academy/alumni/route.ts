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

// GET: Fetch alumni list for an academy (owner dashboard view)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const academyId = searchParams.get('academyId');

  if (!academyId) {
    return NextResponse.json({ error: 'Academy ID required' }, { status: 400 });
  }

  try {
    const alumni = await prisma.academyAlumni.findMany({
      where: { academyId },
      include: {
        player: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
            mmr: true,
            playerCode: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(alumni);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Add new alumnus / Send confirmation request
export async function POST(req: NextRequest) {
  const { playerId, ownerId } = getAuth(req);
  if (!playerId && !ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { academyId, targetPlayerId } = body;

    if (!academyId || !targetPlayerId) {
      return NextResponse.json({ error: 'Missing parameters (academyId, targetPlayerId)' }, { status: 400 });
    }

    const isOwner = await checkOwnership(academyId, playerId, ownerId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if they are already in the list
    const existing = await prisma.academyAlumni.findUnique({
      where: {
        academyId_playerId: {
          academyId,
          playerId: targetPlayerId
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Player already added or invitation pending' }, { status: 409 });
    }

    const alumnus = await prisma.academyAlumni.create({
      data: {
        academyId,
        playerId: targetPlayerId,
        addedBy: 'ACADEMY',
        confirmedByPlayer: false
      }
    });

    return NextResponse.json(alumnus);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Remove alumnus / Cancel invitation
export async function DELETE(req: NextRequest) {
  const { playerId, ownerId } = getAuth(req);
  if (!playerId && !ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Alumni record ID required' }, { status: 400 });
    }

    const alumnus = await prisma.academyAlumni.findUnique({
      where: { id }
    });

    if (!alumnus) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    const isOwner = await checkOwnership(alumnus.academyId, playerId, ownerId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.academyAlumni.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
