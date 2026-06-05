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

// PATCH — update name / image / size chart / parentId
export async function PATCH(req: NextRequest) {
  const { id, name, imageUrl, sizeChartUrl, parentId } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const updated = await prisma.shopCategory.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(sizeChartUrl !== undefined && { sizeChartUrl }),
      ...(parentId !== undefined && { parentId: parentId || null }),
    },
  });
  return NextResponse.json(updated);
}

// DELETE — remove a category
export async function DELETE(req: NextRequest) {
  try {
    let id;
    try {
      const body = await req.json();
      id = body.id;
    } catch (e) {
      // Body may be stripped in live environment
    }
    if (!id) {
      const { searchParams } = new URL(req.url);
      id = searchParams.get('id');
    }

    if (!id) {
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 });
    }

    // Check if any product in this category has been ordered
    const productsInCategory = await prisma.shopProduct.findMany({
      where: { categoryId: id },
      select: { id: true }
    });
    
    if (productsInCategory.length > 0) {
      const productIds = productsInCategory.map(p => p.id);
      const orderItemsCount = await prisma.shopOrderItem.count({
        where: { productId: { in: productIds } }
      });
      if (orderItemsCount > 0) {
        return NextResponse.json(
          { error: 'Cannot delete category because it contains products linked to customer orders. Please delete/archive those products first.' },
          { status: 400 }
        );
      }
    }

    await prisma.shopCategory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error in DELETE category:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
