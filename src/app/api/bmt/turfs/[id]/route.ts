import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  
  const turf = await prisma.turf.findUnique({
    where: { id },
    include: {
      division: true,
      city: true,
      sports: { include: { sport: true } },
      amenities: { include: { amenity: true } },
      grounds: { include: { slots: true } }
    }
  });

  if (!turf) return NextResponse.json({ error: 'Turf not found' }, { status: 404 });
  return NextResponse.json(turf);
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const body = await req.json();
  const { id: _id, sportIds, amenityIds, ...patch } = body;

  try {
    const updated = await prisma.turf.update({
      where: { id },
      data: {
        ...patch,
        sports: sportIds ? {
          deleteMany: {},
          create: sportIds.map((sid: string) => ({ sportId: sid }))
        } : undefined,
        amenities: amenityIds ? {
          deleteMany: {},
          create: amenityIds.map((aid: string) => ({ amenityId: aid }))
        } : undefined
      },
      include: {
        division: true,
        city: true,
        sports: { include: { sport: true } },
        amenities: { include: { amenity: true } },
        grounds: { include: { slots: true } }
      }
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update turf' }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  try {
    await prisma.turf.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Turf not found' }, { status: 404 });
  }
}
