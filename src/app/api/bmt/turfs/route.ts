import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const turfs = await prisma.turf.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      division: true,
      city: true,
      sports: { include: { sport: true } },
      amenities: { include: { amenity: true } },
      grounds: { include: { slots: true } }
    }
  });
  return NextResponse.json(turfs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { 
    name, ownerId, divisionId, cityId, area, logoUrl, imageUrls, 
    lat, lng, mapLink, revenueModelType, revenueModelValue,
    status, sportIds, amenityIds 
  } = body;

  if (!name || !ownerId || !divisionId || !cityId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const turf = await prisma.turf.create({
    data: {
      name: name.trim(), 
      ownerId, 
      divisionId, 
      cityId, 
      area: area || null, 
      logoUrl: logoUrl || null, 
      imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
      lat, 
      lng, 
      mapLink, 
      revenueModelType, 
      revenueModelValue,
      status: status || 'pending',
      sports: sportIds ? { create: sportIds.map((id: string) => ({ sportId: id })) } : undefined,
      amenities: amenityIds ? { create: amenityIds.map((id: string) => ({ amenityId: id })) } : undefined
    },
    include: {
      division: true,
      city: true,
      sports: { include: { sport: true } },
      amenities: { include: { amenity: true } },
      grounds: { include: { slots: true } }
    }
  });

  return NextResponse.json(turf, { status: 201 });
}
