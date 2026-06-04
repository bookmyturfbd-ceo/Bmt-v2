import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { evaluateCartDiscounts } from '@/lib/shopDiscountEvaluator';

export async function POST(req: NextRequest) {
  try {
    const { items, deliveryCharge } = await req.json();
    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'items array is required' }, { status: 400 });
    }

    // 1. Fetch product records for the items in the cart to get category information
    const productIds = items.map((i: any) => i.productId);
    const products = await prisma.shopProduct.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        categoryId: true,
        category: {
          select: {
            parentId: true,
          },
        },
        sizes: {
          select: {
            label: true,
            basePrice: true,
            salePrice: true,
          },
        },
      },
    });

    // Map product details into a lookup dictionary
    const productMap = new Map<string, { categoryId: string; parentId: string | null; sizes: any[] }>();
    products.forEach(p => {
      productMap.set(p.id, {
        categoryId: p.categoryId,
        parentId: p.category?.parentId || null,
        sizes: p.sizes,
      });
    });

    // 2. Map cart items to include categories and resolved db prices
    const itemsWithCategories = items.map((item: any) => {
      const details = productMap.get(item.productId);
      
      // Resolve original price from DB based on size label
      let resolvedPrice = Number(item.price);
      if (details) {
        const dbSize = details.sizes.find(s => s.label.toUpperCase() === item.sizeLabel.toUpperCase());
        if (dbSize) {
          resolvedPrice = dbSize.salePrice ?? dbSize.basePrice;
        }
      }

      return {
        productId: item.productId,
        name: item.name || '',
        sizeLabel: item.sizeLabel || '',
        price: resolvedPrice,
        quantity: Number(item.quantity),
        imageUrl: item.imageUrl || '',
        categoryId: details?.categoryId || '',
        parentCategoryId: details?.parentId || null,
      };
    });

    // 3. Fetch active discounts
    const activeDiscounts = await (prisma as any).shopDiscount.findMany({
      where: { active: true },
    });

    // 4. Evaluate discounts
    const evaluation = evaluateCartDiscounts(
      itemsWithCategories,
      Number(deliveryCharge || 0),
      activeDiscounts
    );

    return NextResponse.json(evaluation);
  } catch (error: any) {
    console.error('Error in discount evaluation:', error);
    return NextResponse.json({ error: error.message || 'Evaluation failed' }, { status: 500 });
  }
}
