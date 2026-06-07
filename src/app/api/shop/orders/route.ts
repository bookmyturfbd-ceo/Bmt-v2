export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { evaluateCartDiscounts } from '@/lib/shopDiscountEvaluator';
import { sendOrder, moveOrder } from '../../../../../telegram-bot';

const DHAKA_METRO = ["Dhaka (Metropolitan)"];
const DHAKA_SUBURBS = ["Dhaka (Suburbs - Savar, Keraniganj, etc)", "Gazipur", "Narayanganj"];

function getBaseDeliveryCharge(districtId: string): number {
  if (DHAKA_METRO.includes(districtId)) return 80;
  if (DHAKA_SUBURBS.includes(districtId)) return 120;
  return 150;
}

// Helper to serialize BigInt fields to String to prevent JSON serialization errors
function serializeOrder(order: any) {
  if (!order) return null;
  return {
    ...order,
    telegramMessageId: order.telegramMessageId ? order.telegramMessageId.toString() : null,
    lastActorTelegramId: order.lastActorTelegramId ? order.lastActorTelegramId.toString() : null,
  };
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { name, phone, email, address, districtId, paymentMethod, items, playerId, firstTouchSource, lastTouchSource } = data;

    // Check for an existing order with status 'new' or 'pending' that matches name, phone, or email
    const conditions: any[] = [
      { customerPhone: phone },
      { customerName: { equals: name, mode: 'insensitive' } }
    ];

    if (email && email.trim()) {
      conditions.push({ customerEmail: { equals: email.trim().toLowerCase(), mode: 'insensitive' } });
    }

    const existingOrder = await prisma.shopOrder.findFirst({
      where: {
        status: { in: ['new', 'pending'] },
        OR: conditions
      },
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    let finalItemsToProcess = [...items];
    if (existingOrder) {
      const combined: { productId: string; sizeLabel: string; quantity: number }[] = existingOrder.items.map(item => ({
        productId: item.productId,
        sizeLabel: item.sizeLabel,
        quantity: item.quantity
      }));

      items.forEach((newItem: any) => {
        const match = combined.find(
          item => item.productId === newItem.productId && item.sizeLabel === newItem.sizeLabel
        );
        if (match) {
          match.quantity += Number(newItem.quantity);
        } else {
          combined.push({
            productId: newItem.productId,
            sizeLabel: newItem.sizeLabel,
            quantity: Number(newItem.quantity)
          });
        }
      });

      finalItemsToProcess = combined;
    }

    // 1. Fetch product records for the items in the order to get category and original price details
    const productIds = finalItemsToProcess.map((i: any) => i.productId);
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
    const itemsWithCategories = finalItemsToProcess.map((item: any) => {
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

    let order;
    if (existingOrder) {
      // 4a. Update the existing order details and subtotal/total
      await prisma.shopOrderItem.deleteMany({
        where: { orderId: existingOrder.id }
      });

      order = await prisma.shopOrder.update({
        where: { id: existingOrder.id },
        data: {
          customerName: name,
          customerEmail: email || null,
          address,
          district: districtId,
          paymentMethod,
          deliveryCharge: evaluation.deliveryCharge,
          subtotal: evaluation.subtotalAfterDiscount,
          total: evaluation.total,
          lastTouchSource: lastTouchSource || null,
          updatedAt: new Date(),
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
    } else {
      // 4b. Save order to database using secure server-calculated totals and unit prices
      order = await prisma.shopOrder.create({
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
          status: 'new', // default to new status for the telegram Kanban board
          firstTouchSource: firstTouchSource || null,
          lastTouchSource: lastTouchSource || null,
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
    }

    // Update stock levels (only for the newly ordered items, i.e. the delta items)
    await Promise.all(items.map(async (item: any) => {
      const dbSizes = await prisma.shopProductSize.findMany({ where: { productId: item.productId, label: item.sizeLabel } });
      if (dbSizes.length > 0) {
        await prisma.shopProductSize.update({
          where: { id: dbSizes[0].id },
          data: { quantity: Math.max(0, dbSizes[0].quantity - item.quantity) }
        });
      }
    }));

    // Send Telegram Notification / Update Kanban Card
    if (existingOrder) {
      await moveOrder(existingOrder.id, 'new', null);
    } else {
      await sendOrder(order);
    }

    if (existingOrder) {
      return NextResponse.json({
        success: true,
        orderId: existingOrder.id,
        eventId: `${existingOrder.id}_merge_${Date.now()}`
      });
    } else {
      return NextResponse.json({
        success: true,
        orderId: order.id
      });
    }
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const data = await req.json();
    const { 
      id, 
      status, 
      customerName, 
      customerPhone, 
      customerEmail, 
      address, 
      district, 
      paymentMethod,
      items // Array of { productId, sizeLabel, quantity }
    } = data;

    if (!id) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // 1. Fetch current order with its items to understand the original state
    const originalOrder = await prisma.shopOrder.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!originalOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const oldIsCanceled = originalOrder.status === 'canceled' || originalOrder.status === 'cancelled';
    const newStatus = status ?? originalOrder.status;
    const newIsCanceled = newStatus === 'canceled' || newStatus === 'cancelled';

    // 2. If editing items
    if (items && Array.isArray(items)) {
      // A. Revert stock levels for original items (only if the order was NOT canceled)
      if (!oldIsCanceled) {
        await Promise.all(originalOrder.items.map(async (item) => {
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

      // B. Resolve base price for new items
      const productIds = items.map((i: any) => i.productId);
      const dbProducts = await prisma.shopProduct.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          mainImage: true,
          categoryId: true,
          category: { select: { parentId: true } },
          sizes: { select: { label: true, basePrice: true, salePrice: true } }
        }
      });

      const productMap = new Map<string, any>();
      dbProducts.forEach(p => {
        productMap.set(p.id, {
          mainImage: p.mainImage,
          categoryId: p.categoryId,
          parentId: p.category?.parentId || null,
          sizes: p.sizes
        });
      });

      const itemsWithCategories = items.map((item: any) => {
        const details = productMap.get(item.productId);
        let originalPrice = 0;
        if (details) {
          const dbSize = details.sizes.find((s: any) => s.label?.toUpperCase() === item.sizeLabel?.toUpperCase());
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
          imageUrl: details?.mainImage || '',
          categoryId: details?.categoryId || '',
          parentCategoryId: details?.parentId || null
        };
      });

      // C. Evaluate discounts & calculate totals
      const activeDiscounts = await (prisma as any).shopDiscount.findMany({
        where: { active: true }
      });
      const resolvedDistrict = district ?? originalOrder.district;
      const baseDelivery = getBaseDeliveryCharge(resolvedDistrict);
      const evaluation = evaluateCartDiscounts(itemsWithCategories, baseDelivery, activeDiscounts);

      // D. Deduct new stock levels (only if the new status is NOT canceled)
      if (!newIsCanceled) {
        await Promise.all(items.map(async (item: any) => {
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

      // E. Update database: delete old items, create new ones with auto-generated cuids, and update order in a single transaction
      await prisma.$transaction([
        prisma.shopOrderItem.deleteMany({
          where: { orderId: id }
        }),
        ...items.map((item: any, idx: number) =>
          prisma.shopOrderItem.create({
            data: {
              orderId: id,
              productId: item.productId,
              sizeLabel: item.sizeLabel,
              quantity: Number(item.quantity),
              price: evaluation.items[idx]?.discountedPrice ?? item.price
            }
          })
        ),
        prisma.shopOrder.update({
          where: { id },
          data: {
            customerName: customerName ?? originalOrder.customerName,
            customerPhone: customerPhone ?? originalOrder.customerPhone,
            customerEmail: customerEmail ?? originalOrder.customerEmail,
            address: address ?? originalOrder.address,
            district: resolvedDistrict,
            paymentMethod: paymentMethod ?? originalOrder.paymentMethod,
            deliveryCharge: evaluation.deliveryCharge,
            subtotal: evaluation.subtotalAfterDiscount,
            total: evaluation.total,
            status: newStatus
          }
        })
      ]);

    } else {
      // If NOT editing items, just status/details update
      // Stock adjustment for simple status transition (if transitioning to/from canceled)
      if (newIsCanceled && !oldIsCanceled) {
        // Revert stock (cancel)
        await Promise.all(originalOrder.items.map(async (item) => {
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
      } else if (oldIsCanceled && !newIsCanceled) {
        // Re-deduct stock (uncancel)
        await Promise.all(originalOrder.items.map(async (item) => {
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

      await prisma.shopOrder.update({
        where: { id },
        data: {
          customerName: customerName ?? originalOrder.customerName,
          customerPhone: customerPhone ?? originalOrder.customerPhone,
          customerEmail: customerEmail ?? originalOrder.customerEmail,
          address: address ?? originalOrder.address,
          district: district ?? originalOrder.district,
          paymentMethod: paymentMethod ?? originalOrder.paymentMethod,
          status: newStatus
        }
      });
    }

    // 3. Move Telegram order card to corresponding topic & trigger updates
    await moveOrder(id, newStatus, null);

    // Fetch updated order to return
    const updatedOrder = await prisma.shopOrder.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                mainImage: true,
                name: true,
                productCost: true,
                marketingCost: true,
                category: { select: { id: true, name: true, parentId: true } },
                sizes: { select: { label: true, basePrice: true, salePrice: true } }
              }
            }
          }
        }
      }
    });

    return NextResponse.json(serializeOrder(updatedOrder));
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
                category: { select: { id: true, name: true, parentId: true } },
                sizes: {
                  select: {
                    label: true,
                    basePrice: true,
                    salePrice: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const serializedOrders = orders.map((o: any) => serializeOrder(o));
    return NextResponse.json(serializedOrders);
  } catch (error: any) {
    console.error('Order get error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
