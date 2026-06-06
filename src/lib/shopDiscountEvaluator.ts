export interface CartItem {
  productId: string;
  name: string;
  sizeLabel: string;
  price: number; // base price or sale price before category/bulk discounts
  quantity: number;
  imageUrl: string;
  categoryId?: string;
  parentCategoryId?: string | null;
}

export interface DiscountTier {
  minQty: number;
  discountType: 'fixed' | 'flat' | 'percent';
  discountValue: number;
  freeDelivery: boolean;
}

export interface ActiveDiscount {
  id: string;
  name: string;
  categoryScope: string; // "ALL" | "PARENT" | "SUB"
  targetCategoryIds: string[];
  tiers: any; // Can be JSON string or parsed array of DiscountTier
  freeDeliveryThreshold: number | null;
}

export interface EvaluationResult {
  items: Array<CartItem & {
    discountedPrice: number;
    hasDiscount: boolean;
    appliedDiscountName: string | null;
  }>;
  subtotalBeforeDiscount: number;
  subtotalAfterDiscount: number;
  savings: number;
  deliveryCharge: number;
  total: number;
  hasFreeDelivery: boolean;
  appliedDiscountNames: string[];
}

/**
 * Evaluates active discounts against the shopping cart items and delivery charge.
 */
export function evaluateCartDiscounts(
  cartItems: CartItem[],
  baseDeliveryCharge: number,
  activeDiscounts: ActiveDiscount[]
): EvaluationResult {
  let totalSubtotalBeforeDiscount = 0;
  let totalSubtotalAfterDiscount = 0;
  let hasFreeDeliveryRuleMet = false;
  const appliedDiscountNames: string[] = [];

  // Parse discounts tiers if they are stored as JSON strings
  const parsedDiscounts = activeDiscounts.map(d => {
    let parsedTiers: DiscountTier[] = [];
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

  // Calculate discount per cart item
  const itemsWithDiscounts = cartItems.map(item => {
    const itemSubtotalBefore = item.price * item.quantity;
    totalSubtotalBeforeDiscount += itemSubtotalBefore;

    let bestPrice = item.price;
    let appliedDiscountName: string | null = null;
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

        // Find the highest tier that is met by scopeQuantity
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

          // If this discount yields a lower unit price than what we found so far, apply it
          if (calculatedUnitPrice < bestPrice) {
            bestPrice = calculatedUnitPrice;
            appliedDiscountName = discount.name;
            // Record whether this tier grants free delivery
            itemGrantsFreeDelivery = matchingTier.freeDelivery;
          } else if (calculatedUnitPrice === bestPrice && matchingTier.freeDelivery) {
            // Tie breaker: if prices are identical but one grants free delivery, choose it
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

  // Check general free delivery charge thresholds (e.g. subtotal >= 3000 -> free delivery)
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
