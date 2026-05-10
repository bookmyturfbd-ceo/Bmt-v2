import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/interact/wbt/turfs?divisionId=xxx&cityId=xxx&q=search
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const divisionId = searchParams.get('divisionId') || undefined;
  const cityId     = searchParams.get('cityId')     || undefined;
  const q          = searchParams.get('q')          || undefined;

  const turfs = await prisma.wbtTurf.findMany({
    where: {
      ...(divisionId ? { divisionId } : {}),
      ...(cityId     ? { cityId }     : {}),
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
    },
    include: {
      division: { select: { id: true, name: true } },
      city:     { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ turfs });
}
