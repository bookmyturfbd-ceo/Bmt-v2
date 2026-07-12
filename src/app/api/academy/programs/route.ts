import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function getAuth(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value || null;
  const ownerId = req.cookies.get('bmt_owner_id')?.value || null;
  return { playerId, ownerId };
}

// Helper to verify academy ownership
async function checkOwnership(academyId: string, playerId: string | null, ownerId: string | null) {
  const academy = await prisma.academy.findUnique({
    where: { id: academyId }
  });
  if (!academy) return false;
  const isPlayerOwner = playerId && academy.ownerPlayerId === playerId;
  const isOwnerOwner = ownerId && academy.ownerOwnerId === ownerId;
  return !!(isPlayerOwner || isOwnerOwner);
}

// POST: Add new academy program
export async function POST(req: NextRequest) {
  const { playerId, ownerId } = getAuth(req);
  if (!playerId && !ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { academyId, name, sport, ageGroup, scheduleText, monthlyFeeBdt, batchSize, description, sortOrder } = body;

    if (!academyId || !name || !sport || !ageGroup || !scheduleText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const isOwner = await checkOwnership(academyId, playerId, ownerId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const program = await prisma.academyProgram.create({
      data: {
        academyId,
        name,
        sport,
        ageGroup,
        scheduleText,
        monthlyFeeBdt: monthlyFeeBdt ? parseInt(monthlyFeeBdt) : null,
        batchSize: batchSize ? parseInt(batchSize) : null,
        description,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0
      }
    });

    return NextResponse.json(program);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Edit existing academy program
export async function PATCH(req: NextRequest) {
  const { playerId, ownerId } = getAuth(req);
  if (!playerId && !ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, sport, ageGroup, scheduleText, monthlyFeeBdt, batchSize, description, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: 'Program ID required' }, { status: 400 });
    }

    const program = await prisma.academyProgram.findUnique({
      where: { id }
    });

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const isOwner = await checkOwnership(program.academyId, playerId, ownerId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.academyProgram.update({
      where: { id },
      data: {
        name: name !== undefined ? name : program.name,
        sport: sport !== undefined ? sport : program.sport,
        ageGroup: ageGroup !== undefined ? ageGroup : program.ageGroup,
        scheduleText: scheduleText !== undefined ? scheduleText : program.scheduleText,
        monthlyFeeBdt: monthlyFeeBdt !== undefined ? (monthlyFeeBdt ? parseInt(monthlyFeeBdt) : null) : program.monthlyFeeBdt,
        batchSize: batchSize !== undefined ? (batchSize ? parseInt(batchSize) : null) : program.batchSize,
        description: description !== undefined ? description : program.description,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : program.sortOrder
      }
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Remove program
export async function DELETE(req: NextRequest) {
  const { playerId, ownerId } = getAuth(req);
  if (!playerId && !ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Program ID required' }, { status: 400 });
    }

    const program = await prisma.academyProgram.findUnique({
      where: { id }
    });

    if (!program) {
      return NextResponse.json({ error: 'Program not found' }, { status: 404 });
    }

    const isOwner = await checkOwnership(program.academyId, playerId, ownerId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.academyProgram.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
