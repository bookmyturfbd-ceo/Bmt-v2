import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all categories (with parent/children structure)
export async function GET() {
  const categories = await prisma.shopCategory.findMany({
    include: { children: { orderBy: { order: 'asc' } } },
    orderBy: { order: 'asc' },
  });
  return NextResponse.json(categories);
}

// POST — create a category
export async function POST(req: NextRequest) {
  const { name, parentId, imageUrl, sizeChartUrl } = await req.json();
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
  const cat = await prisma.shopCategory.create({
    data: { name, slug, parentId: parentId || null, imageUrl: imageUrl || null, sizeChartUrl: sizeChartUrl || null },
  });
  return NextResponse.json(cat);
}

// PATCH — update name / image / size chart
export async function PATCH(req: NextRequest) {
  const { id, name, imageUrl, sizeChartUrl } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const updated = await prisma.shopCategory.update({
    where: { id },
    data: { ...(name && { name }), ...(imageUrl !== undefined && { imageUrl }), ...(sizeChartUrl !== undefined && { sizeChartUrl }) },
  });
  return NextResponse.json(updated);
}

// DELETE — remove a category
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.shopCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
