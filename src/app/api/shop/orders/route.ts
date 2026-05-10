import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { name, phone, email, address, districtId, paymentMethod, deliveryCharge, subtotal, total, items, playerId } = data;

    const order = await prisma.shopOrder.create({
      data: {
        playerId: playerId || null,
        customerName: name,
        customerPhone: phone,
        customerEmail: email || null,
        address,
        district: districtId,
        paymentMethod,
        deliveryCharge,
        subtotal,
        total,
        status: 'pending',
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            sizeLabel: item.sizeLabel,
            quantity: item.quantity,
            price: item.price
          }))
        }
      }
    });

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
    const order = await prisma.shopOrder.update({ where: { id }, data: { status } });
    return NextResponse.json(order);
  } catch (error: any) {
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
