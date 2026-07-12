import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, accept } = body;

    if (!id) {
      return NextResponse.json({ error: 'Alumni record ID required' }, { status: 400 });
    }

    const record = await prisma.academyAlumni.findUnique({
      where: { id }
    });

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    if (record.playerId !== playerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (accept) {
      const updated = await prisma.academyAlumni.update({
        where: { id },
        data: { confirmedByPlayer: true }
      });
      return NextResponse.json({ success: true, updated });
    } else {
      await prisma.academyAlumni.delete({
        where: { id }
      });
      return NextResponse.json({ success: true, deleted: true });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
