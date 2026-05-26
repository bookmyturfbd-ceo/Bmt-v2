import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // TURF_OWNER | PROFESSIONAL | COACH | null

    const where: any = {};
    if (type && ['TURF_OWNER', 'PROFESSIONAL', 'COACH'].includes(type)) {
      where.type = type;
    }

    const requests = await prisma.joinRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(requests);
  } catch (err) {
    console.error('[admin join-requests GET]', err);
    return NextResponse.json({ error: 'Failed to fetch requests.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: 'id and status are required.' }, { status: 400 });
    }

    if (!['PENDING', 'REVIEWED', 'CONTACTED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
    }

    const updated = await prisma.joinRequest.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ ok: true, request: updated });
  } catch (err) {
    console.error('[admin join-requests PATCH]', err);
    return NextResponse.json({ error: 'Failed to update request.' }, { status: 500 });
  }
}
