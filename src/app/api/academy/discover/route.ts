import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const revalidate = 0;

// Feature flag — set ACADEMY_DISCOVERY_ENABLED=true in .env when ready to go live
const DISCOVERY_ENABLED = process.env.ACADEMY_DISCOVERY_ENABLED === 'true';

export async function GET(req: NextRequest) {
  if (!DISCOVERY_ENABLED) {
    return NextResponse.json({ enabled: false, academies: [] });
  }

  const { searchParams } = new URL(req.url);
  const sport = searchParams.get('sport') || '';
  const area = searchParams.get('area') || '';
  const ageGroup = searchParams.get('ageGroup') || '';
  const q = searchParams.get('q') || '';

  const where: any = {
    status: 'PUBLISHED',
  };

  if (sport) {
    where.sport = { has: sport };
  }

  if (area) {
    where.area = { contains: area, mode: 'insensitive' };
  }

  if (q) {
    where.name = { contains: q, mode: 'insensitive' };
  }

  // Age group filter via programs junction
  const programFilter = ageGroup
    ? { some: { ageGroup: { contains: ageGroup, mode: 'insensitive' as const } } }
    : undefined;

  if (programFilter) {
    where.programs = programFilter;
  }

  try {
    const academies = await prisma.academy.findMany({
      where,
      orderBy: [
        { featured: 'desc' },
        { verificationStatus: 'asc' }, // VERIFIED sorts before UNVERIFIED lexicographically reversed handled below
        { createdAt: 'desc' }
      ],
      include: {
        media: { orderBy: { sortOrder: 'asc' }, take: 1 },
        programs: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, name: true, ageGroup: true, monthlyFeeBdt: true }
        },
        _count: { select: { programs: true } }
      }
    });

    // Sort: featured first, then verified, then newest
    const sorted = academies.sort((a: any, b: any) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      const aVerified = a.verificationStatus === 'VERIFIED' ? 0 : 1;
      const bVerified = b.verificationStatus === 'VERIFIED' ? 0 : 1;
      if (aVerified !== bVerified) return aVerified - bVerified;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({ enabled: true, academies: sorted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
