import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { evaluateCartDiscounts } from '@/lib/shopDiscountEvaluator';

const DHAKA_METRO = ["Dhaka (Metropolitan)"];
const DHAKA_SUBURBS = ["Dhaka (Suburbs - Savar, Keraniganj, etc)", "Gazipur", "Narayanganj"];

function getBaseDeliveryCharge(districtId: string): number {
  if (DHAKA_METRO.includes(districtId)) return 80;
  if (DHAKA_SUBURBS.includes(districtId)) return 120;
  return 150;
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { name, phone, email, address, districtId, paymentMethod, items, playerId } = data;

    // 1. Fetch product records for the items in the order to get category and original price details
    const productIds = items.map((i: any) => i.productId);
    const dbProducts = await prisma.shopProduct.findMany({
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

    const productMap = new Map<string, { categoryId: string; parentId: string | null; sizes: any[] }>();
    dbProducts.forEach(p => {
      productMap.set(p.id, {
        categoryId: p.categoryId,
        parentId: p.category?.parentId || null,
        sizes: p.sizes,
      });
    });

    // Map ordered items to include product category scope and verify the original unit price
    const itemsWithCategories = items.map((item: any) => {
      const details = productMap.get(item.productId);
      let originalPrice = 0;
      if (details) {
        const dbSize = details.sizes.find(s => s.label?.toUpperCase() === item.sizeLabel?.toUpperCase());
        if (dbSize) {
          originalPrice = dbSize.salePrice ?? dbSize.basePrice;
        }
      }
      return {
        productId: item.productId,
        name: item.name || '',
        sizeLabel: item.sizeLabel || '',
        price: originalPrice,
        quantity: Number(item.quantity),
        imageUrl: item.imageUrl || '',
        categoryId: details?.categoryId || '',
        parentCategoryId: details?.parentId || null,
      };
    });

    // 2. Fetch active discounts
    const activeDiscounts = await (prisma as any).shopDiscount.findMany({
      where: { active: true },
    });

    // 3. Resolve base delivery charge and run calculations
    const baseDelivery = getBaseDeliveryCharge(districtId);
    const evaluation = evaluateCartDiscounts(itemsWithCategories, baseDelivery, activeDiscounts);

    // 4. Save order to database using secure server-calculated totals and unit prices
    const order = await prisma.shopOrder.create({
      data: {
        playerId: playerId || null,
        customerName: name,
        customerPhone: phone,
        customerEmail: email || null,
        address,
        district: districtId,
        paymentMethod,
        deliveryCharge: evaluation.deliveryCharge,
        subtotal: evaluation.subtotalAfterDiscount,
        total: evaluation.total,
        status: 'pending',
        items: {
          create: evaluation.items.map((item: any) => ({
            productId: item.productId,
            sizeLabel: item.sizeLabel,
            quantity: item.quantity,
            price: item.discountedPrice
          }))
        }
      }
    });

    // Update stock levels
    await Promise.all(items.map(async (item: any) => {
      const dbSizes = await prisma.shopProductSize.findMany({ where: { productId: item.productId, label: item.sizeLabel } });
      if (dbSizes.length > 0) {
        await prisma.shopProductSize.update({
          where: { id: dbSizes[0].id },
          data: { quantity: Math.max(0, dbSizes[0].quantity - item.quantity) }
        });
      }
    }));

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();

    const existingOrder = await prisma.shopOrder.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const statusChanged = existingOrder.status !== status;

    if (statusChanged) {
      // Transition to cancelled: Restores stock quantity
      if (status === 'cancelled' && existingOrder.status !== 'cancelled') {
        await Promise.all(existingOrder.items.map(async (item: any) => {
          const dbSizes = await prisma.shopProductSize.findMany({
            where: { productId: item.productId, label: item.sizeLabel }
          });
          if (dbSizes.length > 0) {
            await prisma.shopProductSize.update({
              where: { id: dbSizes[0].id },
              data: { quantity: dbSizes[0].quantity + item.quantity }
            });
          }
        }));
      }
      // Transition away from cancelled: Re-deducts stock quantity
      else if (existingOrder.status === 'cancelled' && status !== 'cancelled') {
        await Promise.all(existingOrder.items.map(async (item: any) => {
          const dbSizes = await prisma.shopProductSize.findMany({
            where: { productId: item.productId, label: item.sizeLabel }
          });
          if (dbSizes.length > 0) {
            await prisma.shopProductSize.update({
              where: { id: dbSizes[0].id },
              data: { quantity: Math.max(0, dbSizes[0].quantity - item.quantity) }
            });
          }
        }));
      }
    }

    const order = await prisma.shopOrder.update({ where: { id }, data: { status } });
    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Order status update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get('playerId');

    const orders = await prisma.shopOrder.findMany({
      where: playerId ? { playerId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: {
              select: {
                mainImage: true,
                name: true,
                productCost: true,
                marketingCost: true,
                category: { select: { id: true, name: true, parentId: true } }
              }
            }
          }
        }
      }
    });
    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
