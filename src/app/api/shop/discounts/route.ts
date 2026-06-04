import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all discounts (for the admin dashboard)
export async function GET() {
  try {
    const discounts = await (prisma as any).shopDiscount.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(discounts);
  } catch (error: any) {
    console.error('Error fetching discounts:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch discounts' }, { status: 500 });
  }
}

// POST — Create a new discount
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, active, categoryScope, targetCategoryIds, tiers, freeDeliveryThreshold } = body;

    if (!name || !categoryScope) {
      return NextResponse.json({ error: 'name and categoryScope are required' }, { status: 400 });
    }

    const discount = await (prisma as any).shopDiscount.create({
      data: {
        name,
        active: active !== undefined ? active : true,
        categoryScope,
        targetCategoryIds: targetCategoryIds || [],
        tiers: tiers || [],
        freeDeliveryThreshold: freeDeliveryThreshold !== undefined ? freeDeliveryThreshold : null,
      },
    });

    return NextResponse.json(discount);
  } catch (error: any) {
    console.error('Error creating discount:', error);
    return NextResponse.json({ error: error.message || 'Failed to create discount' }, { status: 500 });
  }
}

// PATCH — Update an existing discount
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    // Prepare fields to update
    const data: any = {};
    if (updateData.name !== undefined) data.name = updateData.name;
    if (updateData.active !== undefined) data.active = updateData.active;
    if (updateData.categoryScope !== undefined) data.categoryScope = updateData.categoryScope;
    if (updateData.targetCategoryIds !== undefined) data.targetCategoryIds = updateData.targetCategoryIds;
    if (updateData.tiers !== undefined) data.tiers = updateData.tiers;
    if (updateData.freeDeliveryThreshold !== undefined) {
      data.freeDeliveryThreshold = updateData.freeDeliveryThreshold;
    }

    const updated = await (prisma as any).shopDiscount.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating discount:', error);
    return NextResponse.json({ error: error.message || 'Failed to update discount' }, { status: 500 });
  }
}

// DELETE — Remove a discount
export async function DELETE(req: NextRequest) {
  try {
    let id;
    try {
      const body = await req.json();
      id = body.id;
    } catch (e) {
      // Body might not exist if passed via query params
    }

    if (!id) {
      const { searchParams } = new URL(req.url);
      id = searchParams.get('id');
    }

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await (prisma as any).shopDiscount.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error deleting discount:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete discount' }, { status: 500 });
  }
}
