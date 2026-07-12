/**
 * GET /api/bmt/areas
 * Returns all cities (for identity edit home area picker).
 */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const cities = await prisma.city.findMany({
      select: { id: true, name: true, division: { select: { name: true } } },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(cities.map(c => ({ id: c.id, name: c.name, division: c.division?.name })));
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
