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

// GET: Fetch lead inquiries for managed academy
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
      return NextResponse.json([]);
    }

    const inquiries = await prisma.academyInquiry.findMany({
      where: { academyId: academy.id },
      include: {
        program: { select: { name: true } },
        fromPlayer: { select: { fullName: true, avatarUrl: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(inquiries);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Submit a new inquiry (leads intake)
export async function POST(req: NextRequest) {
  const { playerId } = getAuth(req);
  if (!playerId) {
    return NextResponse.json({ error: 'Unauthorized. Please login to send an inquiry.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { academyId, programId, studentName, studentAge, message, phone } = body;

    if (!academyId || !studentName || !message || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Rate-limiting check: 1 per 24 hours per user per academy
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await prisma.academyInquiry.findFirst({
      where: {
        fromPlayerId: playerId,
        academyId,
        createdAt: { gte: last24h }
      }
    });

    if (existing) {
      return NextResponse.json({
        error: 'You can only send one inquiry to this academy every 24 hours.'
      }, { status: 429 });
    }

    const inquiry = await prisma.academyInquiry.create({
      data: {
        academyId,
        fromPlayerId: playerId,
        programId: programId || null,
        studentName,
        studentAge: studentAge ? parseInt(studentAge) : null,
        message,
        phone
      }
    });

    return NextResponse.json(inquiry);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Update inquiry status (leads update)
export async function PATCH(req: NextRequest) {
  const { playerId, ownerId } = getAuth(req);
  if (!playerId && !ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing required parameters (id, status)' }, { status: 400 });
    }

    const inquiry = await prisma.academyInquiry.findUnique({
      where: { id }
    });

    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 });
    }

    const isOwner = await checkOwnership(inquiry.academyId, playerId, ownerId);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.academyInquiry.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
