import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const turfs = await prisma.wbtTurf.findMany({
    include: {
      division: { select: { id: true, name: true } },
      city: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ turfs });
}

export async function POST(req: NextRequest) {
  const { name, divisionId, cityId } = await req.json();
  if (!name?.trim() || !divisionId || !cityId)
    return NextResponse.json({ error: 'name, divisionId and cityId are required' }, { status: 400 });
  const turf = await prisma.wbtTurf.create({ data: { name: name.trim(), divisionId, cityId } });
  return NextResponse.json({ turf });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await prisma.wbtTurf.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
