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
    const { id, status, adminNotes, cvUrl, nidUrl, pictureUrl } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required.' }, { status: 400 });
    }

    const updateData: any = {};

    if (status !== undefined) {
      if (!['PENDING', 'REVIEWED', 'CONTACTED', 'ONBOARDED', 'DECLINED'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status.' }, { status: 400 });
      }
      updateData.status = status;
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }

    if (cvUrl !== undefined) {
      updateData.cvUrl = cvUrl;
    }

    if (nidUrl !== undefined) {
      updateData.nidUrl = nidUrl;
    }

    if (pictureUrl !== undefined) {
      updateData.pictureUrl = pictureUrl;
    }

    const updated = await prisma.joinRequest.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ ok: true, request: updated });
  } catch (err) {
    console.error('[admin join-requests PATCH]', err);
    return NextResponse.json({ error: 'Failed to update request.' }, { status: 500 });
  }
}
