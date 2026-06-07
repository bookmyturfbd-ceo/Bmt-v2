require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function evaluateCartDiscounts(cartItems, baseDeliveryCharge, activeDiscounts) {
  let totalSubtotalBeforeDiscount = 0;
  let totalSubtotalAfterDiscount = 0;
  let hasFreeDeliveryRuleMet = false;
  const appliedDiscountNames = [];

  const parsedDiscounts = activeDiscounts.map(d => {
    let parsedTiers = [];
    try {
      if (typeof d.tiers === 'string') {
        parsedTiers = JSON.parse(d.tiers);
      } else if (Array.isArray(d.tiers)) {
        parsedTiers = d.tiers;
      }
    } catch (e) {
      console.error('Failed to parse tiers for discount', d.id, e);
    }
    return {
      ...d,
      tiers: parsedTiers
    };
  });

  const itemsWithDiscounts = cartItems.map(item => {
    const itemSubtotalBefore = item.price * item.quantity;
    totalSubtotalBeforeDiscount += itemSubtotalBefore;

    let bestPrice = item.price;
    let appliedDiscountName = null;
    let itemGrantsFreeDelivery = false;

    for (const discount of parsedDiscounts) {
      let isMatch = false;

      if (discount.categoryScope === 'ALL') {
        isMatch = true;
      } else if (discount.categoryScope === 'PARENT') {
        const parentId = item.parentCategoryId;
        isMatch = parentId ? discount.targetCategoryIds.includes(parentId) : false;
      } else if (discount.categoryScope === 'SUB') {
        isMatch = item.categoryId ? discount.targetCategoryIds.includes(item.categoryId) : false;
      }

      if (isMatch) {
        // Calculate total quantity of items in the cart that match this discount's scope
        const scopeQuantity = cartItems.reduce((sum, cartItem) => {
          let itemMatchesDiscount = false;
          if (discount.categoryScope === 'ALL') {
            itemMatchesDiscount = true;
          } else if (discount.categoryScope === 'PARENT') {
            const pId = cartItem.parentCategoryId;
            itemMatchesDiscount = pId ? discount.targetCategoryIds.includes(pId) : false;
          } else if (discount.categoryScope === 'SUB') {
            itemMatchesDiscount = cartItem.categoryId ? discount.targetCategoryIds.includes(cartItem.categoryId) : false;
          }
          return sum + (itemMatchesDiscount ? cartItem.quantity : 0);
        }, 0);

        const sortedTiers = [...discount.tiers].sort((a, b) => b.minQty - a.minQty);
        const matchingTier = sortedTiers.find(t => scopeQuantity >= t.minQty);

        if (matchingTier) {
          let calculatedUnitPrice = item.price;

          if (matchingTier.discountType === 'fixed') {
            calculatedUnitPrice = matchingTier.discountValue;
          } else if (matchingTier.discountType === 'flat') {
            calculatedUnitPrice = Math.max(0, item.price - matchingTier.discountValue);
          } else if (matchingTier.discountType === 'percent') {
            calculatedUnitPrice = Math.max(0, item.price * (1 - matchingTier.discountValue / 100));
          }

          if (calculatedUnitPrice < bestPrice) {
            bestPrice = calculatedUnitPrice;
            appliedDiscountName = discount.name;
            itemGrantsFreeDelivery = matchingTier.freeDelivery;
          } else if (calculatedUnitPrice === bestPrice && matchingTier.freeDelivery) {
            itemGrantsFreeDelivery = true;
            appliedDiscountName = discount.name;
          }
        }
      }
    }

    if (itemGrantsFreeDelivery) {
      hasFreeDeliveryRuleMet = true;
    }

    if (appliedDiscountName && !appliedDiscountNames.includes(appliedDiscountName)) {
      appliedDiscountNames.push(appliedDiscountName);
    }

    const itemSubtotalAfter = bestPrice * item.quantity;
    totalSubtotalAfterDiscount += itemSubtotalAfter;

    return {
      ...item,
      discountedPrice: bestPrice,
      hasDiscount: bestPrice < item.price,
      appliedDiscountName
    };
  });

  for (const discount of parsedDiscounts) {
    if (discount.freeDeliveryThreshold !== null && discount.freeDeliveryThreshold !== undefined) {
      if (totalSubtotalAfterDiscount >= discount.freeDeliveryThreshold) {
        hasFreeDeliveryRuleMet = true;
        if (!appliedDiscountNames.includes(discount.name)) {
          appliedDiscountNames.push(discount.name);
        }
      }
    }
  }

  const finalDeliveryCharge = hasFreeDeliveryRuleMet ? 0 : baseDeliveryCharge;
  const finalTotal = totalSubtotalAfterDiscount + finalDeliveryCharge;

  return {
    items: itemsWithDiscounts,
    subtotalBeforeDiscount: totalSubtotalBeforeDiscount,
    subtotalAfterDiscount: totalSubtotalAfterDiscount,
    savings: totalSubtotalBeforeDiscount - totalSubtotalAfterDiscount,
    deliveryCharge: finalDeliveryCharge,
    total: finalTotal,
    hasFreeDelivery: hasFreeDeliveryRuleMet,
    appliedDiscountNames
  };
}

async function main() {
  console.log('Starting order discount patch...');
  
  // 1. Fetch active discounts
  const activeDiscounts = await prisma.shopDiscount.findMany({
    where: { active: true }
  });
  console.log(`Loaded ${activeDiscounts.length} active discounts.`);

  // 2. Fetch all orders (excluding cancelled) with items and products
  const orders = await prisma.shopOrder.findMany({
    where: {
      NOT: {
        status: { in: ['canceled', 'cancelled'] }
      }
    },
    include: {
      items: {
        include: {
          product: {
            include: {
              category: true,
              sizes: true
            }
          }
        }
      }
    }
  });
  console.log(`Loaded ${orders.length} orders to inspect.`);

  let updatedCount = 0;

  for (const order of orders) {
    const itemsWithCategories = order.items.map(item => {
      const product = item.product;
      const category = product?.category;
      
      // Resolve original price from product sizes DB
      let resolvedPrice = item.price; // fallback to saved price
      if (product && product.sizes) {
        const dbSize = product.sizes.find(s => s.label.toUpperCase() === item.sizeLabel.toUpperCase());
        if (dbSize) {
          resolvedPrice = dbSize.salePrice ?? dbSize.basePrice;
        }
      }

      return {
        id: item.id, // save database item ID for updates
        productId: item.productId,
        name: product?.name || '',
        sizeLabel: item.sizeLabel || '',
        price: resolvedPrice,
        quantity: item.quantity,
        imageUrl: product?.mainImage || '',
        categoryId: product?.categoryId || '',
        parentCategoryId: category?.parentId || null
      };
    });

    // Base delivery charge mapping
    let baseDelivery = 150;
    const district = order.district || '';
    if (district.includes('Dhaka (Metropolitan)')) {
      baseDelivery = 80;
    } else if (
      district.includes('Dhaka (Suburbs') ||
      district.includes('Gazipur') ||
      district.includes('Narayanganj')
    ) {
      baseDelivery = 120;
    }

    const evaluation = evaluateCartDiscounts(itemsWithCategories, baseDelivery, activeDiscounts);

    let needsUpdate = false;
    const itemUpdates = [];

    // Check if item prices changed
    for (const calcItem of evaluation.items) {
      const dbItem = order.items.find(i => i.id === calcItem.id);
      if (dbItem && Math.abs(dbItem.price - calcItem.discountedPrice) > 0.01) {
        needsUpdate = true;
        itemUpdates.push({
          id: calcItem.id,
          name: calcItem.name,
          oldPrice: dbItem.price,
          newPrice: calcItem.discountedPrice
        });
      }
    }

    // Check if order totals changed
    const subtotalDiff = Math.abs(order.subtotal - evaluation.subtotalAfterDiscount) > 0.01;
    const deliveryDiff = Math.abs(order.deliveryCharge - evaluation.deliveryCharge) > 0.01;
    const totalDiff = Math.abs(order.total - evaluation.total) > 0.01;

    if (subtotalDiff || deliveryDiff || totalDiff) {
      needsUpdate = true;
    }

    if (needsUpdate) {
      console.log(`\n--------------------------------------------------`);
      console.log(`Order ID: ${order.id} (#BMT-${order.id.slice(0, 8).toUpperCase()})`);
      console.log(`Customer: ${order.customerName} (${order.customerPhone})`);
      console.log(`Status: ${order.status} | Date: ${order.createdAt.toISOString()}`);
      
      if (itemUpdates.length > 0) {
        console.log(`Item Price Changes:`);
        itemUpdates.forEach(u => {
          console.log(`  - ${u.name}: ৳${u.oldPrice} -> ৳${u.newPrice}`);
        });
      }
      
      if (subtotalDiff) console.log(`Subtotal: ৳${order.subtotal} -> ৳${evaluation.subtotalAfterDiscount}`);
      if (deliveryDiff) console.log(`Delivery Charge: ৳${order.deliveryCharge} -> ৳${evaluation.deliveryCharge}`);
      if (totalDiff) console.log(`Total: ৳${order.total} -> ৳${evaluation.total}`);

      // Perform DB updates
      // 1. Update order items
      for (const calcItem of evaluation.items) {
        await prisma.shopOrderItem.update({
          where: { id: calcItem.id },
          data: { price: calcItem.discountedPrice }
        });
      }

      // 2. Update order totals
      await prisma.shopOrder.update({
        where: { id: order.id },
        data: {
          subtotal: evaluation.subtotalAfterDiscount,
          deliveryCharge: evaluation.deliveryCharge,
          total: evaluation.total
        }
      });

      console.log(`STATUS: Updated successfully.`);
      updatedCount++;
    }
  }

  console.log(`\n==================================================`);
  console.log(`Patch completed. Corrected and updated ${updatedCount} orders.`);
}

main()
  .catch(e => {
    console.error('Error during patch:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
