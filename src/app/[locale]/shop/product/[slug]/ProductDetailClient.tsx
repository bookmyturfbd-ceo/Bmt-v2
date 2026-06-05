'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ShoppingCart, Minus, Plus, Ruler, X, CheckCircle2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useCartStore } from '@/store/useCartStore';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { trackMetaEvent } from '@/lib/meta-pixel';
import { getCookie } from '@/lib/cookies';

export default function ProductDetailClient({ product, activeDiscounts = [] }: { product: any; activeDiscounts?: any[] }) {
  const [selectedSize, setSelectedSize] = useState<any>(product.sizes[0] || null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(product.mainImage);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const cart = useCartStore();
  const t = useTranslations('Shop');

  useEffect(() => {
    const playerId = getCookie('bmt_player_id');
    trackMetaEvent('ViewContent', {
      content_name: product.name,
      content_category: product.category?.name,
      content_ids: [product.id],
      content_type: 'product',
      value: product.sizes[0]?.basePrice || 0,
      currency: 'BDT',
      contents: [{
        id: product.id,
        quantity: 1,
        price: product.sizes[0]?.basePrice || 0,
        item_price: product.sizes[0]?.basePrice || 0
      }]
    }, {
      externalId: playerId || undefined
    });
  }, [product]);

  const allImages = [product.mainImage, ...(product.galleryImages || [])];
  const sizeChartUrl = product.category?.sizeChartUrl || product.category?.parent?.sizeChartUrl;

  const currentPrice = selectedSize ? (selectedSize.salePrice ?? selectedSize.basePrice) : 0;
  const currentBase = selectedSize ? selectedSize.basePrice : 0;
  const hasDiscount = selectedSize && selectedSize.salePrice && selectedSize.salePrice < selectedSize.basePrice;
  const savings = currentBase - currentPrice;

  // Find active discount campaigns matching this product
  const matchingDiscounts = (activeDiscounts || []).filter(discount => {
    let isMatch = false;
    if (discount.categoryScope === 'ALL') {
      isMatch = true;
    } else if (discount.categoryScope === 'PARENT') {
      const parentId = product.category?.parentId;
      isMatch = parentId ? discount.targetCategoryIds.includes(parentId) : false;
    } else if (discount.categoryScope === 'SUB') {
      isMatch = discount.targetCategoryIds.includes(product.categoryId);
    }
    return isMatch;
  }).map(d => {
    let parsedTiers: any[] = [];
    try {
      if (typeof d.tiers === 'string') {
        parsedTiers = JSON.parse(d.tiers);
      } else if (Array.isArray(d.tiers)) {
        parsedTiers = d.tiers;
      }
    } catch (e) {}
    return { ...d, tiers: parsedTiers };
  });

  // Calculate discount for current quantity
  let discountAdjustedPrice = currentPrice;
  let activeTierName = '';
  let activeTierFreeDelivery = false;

  for (const discount of matchingDiscounts) {
    const sortedTiers = [...discount.tiers].sort((a, b) => b.minQty - a.minQty);
    const matchingTier = sortedTiers.find(t => quantity >= t.minQty);
    if (matchingTier) {
      let tierPrice = currentPrice;
      if (matchingTier.discountType === 'fixed') {
        tierPrice = matchingTier.discountValue;
      } else if (matchingTier.discountType === 'flat') {
        tierPrice = Math.max(0, currentPrice - matchingTier.discountValue);
      } else if (matchingTier.discountType === 'percent') {
        tierPrice = Math.max(0, currentPrice * (1 - matchingTier.discountValue / 100));
      }

      if (tierPrice < discountAdjustedPrice) {
        discountAdjustedPrice = tierPrice;
        activeTierName = discount.name;
        activeTierFreeDelivery = matchingTier.freeDelivery;
      } else if (tierPrice === discountAdjustedPrice && matchingTier.freeDelivery) {
        activeTierFreeDelivery = true;
        activeTierName = discount.name;
      }
    }
  }

  const isBulkDiscountApplied = discountAdjustedPrice < currentPrice;

  const handleAddToCart = () => {
    if (!selectedSize) return;
    cart.addItem({
      productId: product.id,
      name: product.name,
      sizeLabel: selectedSize.label,
      price: discountAdjustedPrice,
      quantity,
      imageUrl: product.mainImage
    });

    const playerId = getCookie('bmt_player_id');
    trackMetaEvent('AddToCart', {
      content_name: product.name,
      content_category: product.category?.name,
      content_ids: [product.id],
      content_type: 'product',
      value: discountAdjustedPrice * quantity,
      currency: 'BDT',
      contents: [{
        id: product.id,
        quantity: quantity,
        price: discountAdjustedPrice,
        item_price: discountAdjustedPrice
      }]
    }, {
      externalId: playerId || undefined
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    cart.setIsOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-40">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-white/10 px-4 py-4 flex items-center justify-between">
        <Link href="/shop" className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <span className="font-black text-xs uppercase tracking-widest text-[var(--muted)] truncate max-w-[200px]">
          {product.category?.name}
        </span>
        <button onClick={() => cart.setIsOpen(true)} className="relative w-10 h-10 flex items-center justify-center bg-accent/10 border border-accent/20 text-accent rounded-full hover:bg-accent/20 transition-colors">
          <ShoppingCart size={18} />
          {cart.items.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black flex items-center justify-center rounded-full">
              {cart.items.reduce((acc, i) => acc + i.quantity, 0)}
            </span>
          )}
        </button>
      </header>

      {/* Image Gallery */}
      <div className="w-full aspect-[4/5] md:aspect-[3/4] max-h-[60vh] bg-neutral-900 relative">
        <img src={activeImage} alt={product.name} className="w-full h-full object-cover" />
      </div>

      {/* Thumbnails */}
      {allImages.length > 1 && (
        <div className="w-full py-4 bg-background border-b border-[var(--panel-border)] flex justify-center gap-2.5 px-4 hide-scrollbar overflow-x-auto">
          {allImages.map((img, i) => (
            <button key={i} onClick={() => setActiveImage(img)}
              className={`w-14 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${activeImage === img ? 'border-accent scale-105 shadow-md shadow-accent/25' : 'border-white/10 opacity-70 hover:opacity-100'}`}>
              <img src={img} alt={`${product.name} - image ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Product Info */}
      <div className="p-5 flex flex-col gap-6 max-w-2xl mx-auto">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl sm:text-3xl font-black leading-tight">{product.name}</h1>
          </div>
          
          <div className="flex items-end flex-wrap gap-3 mt-1">
            <p className="text-3xl font-black text-accent flex items-start gap-1">
              <span className="text-lg mt-1">৳</span>{discountAdjustedPrice.toLocaleString()}
            </p>
            {isBulkDiscountApplied && (
              <p className="text-lg text-[var(--muted)] line-through font-semibold mb-1">৳{currentPrice.toLocaleString()}</p>
            )}
            {!isBulkDiscountApplied && hasDiscount && (
              <p className="text-lg text-[var(--muted)] line-through font-semibold mb-1">৳{currentBase.toLocaleString()}</p>
            )}
            {isBulkDiscountApplied && (
              <span className="bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase px-2 py-1 rounded-md mb-1.5 flex items-center gap-1">
                Bulk Discount: Save ৳{(currentPrice - discountAdjustedPrice).toLocaleString()} / item
              </span>
            )}
            {!isBulkDiscountApplied && hasDiscount && (
              <span className="bg-accent/20 border border-accent/30 text-accent text-[10px] font-black uppercase px-2 py-1 rounded-md mb-1.5 flex items-center gap-1">
                {t('save')} ৳{savings.toLocaleString()}
              </span>
            )}
            {activeTierFreeDelivery && (
              <span className="bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase px-2 py-1 rounded-md mb-1.5 flex items-center gap-1">
                🚀 Free Delivery
              </span>
            )}
          </div>
        </div>

        {/* Size Selector */}
        {product.sizes.length > 0 && (
          <div className="flex flex-col gap-3 pt-6 border-t border-[var(--panel-border)]">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-widest text-[var(--muted)]">{t('selectSize')}</h3>
              {sizeChartUrl && (
                <button 
                  onClick={() => setShowSizeChart(true)} 
                  className="flex items-center gap-1.5 text-xs font-black text-accent bg-accent/10 border border-accent/30 px-3 py-1.5 rounded-full hover:bg-accent/20 hover:border-accent active:scale-95 transition-all shadow-[0_0_10px_rgba(0,255,65,0.1)] hover:shadow-[0_0_15px_rgba(0,255,65,0.2)]"
                >
                  <Ruler size={13} className="text-accent" /> 
                  {t('sizeChart')}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {product.sizes.map((s: any) => (
                <button key={s.id} onClick={() => setSelectedSize(s)}
                  className={`min-w-[4rem] px-4 py-3 rounded-xl font-black transition-all ${
                    selectedSize?.id === s.id 
                      ? 'bg-accent text-black border-accent shadow-[0_0_15px_rgba(0,255,65,0.3)]' 
                      : 'bg-[var(--panel-bg)] border-[var(--panel-border)] border text-[var(--muted)] hover:border-white/30 hover:text-foreground'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
            {selectedSize && selectedSize.quantity !== undefined && (
              <div className="mt-1 flex items-center">
                {selectedSize.quantity <= 0 ? (
                   <span className="text-red-500 font-black text-xs bg-red-500/10 px-2 py-1 rounded-md">{t('outOfStock')}</span>
                ) : selectedSize.quantity < 10 ? (
                   <span className="text-orange-400 font-black text-xs bg-orange-400/10 px-2 py-1 rounded-md">{t('lowStock', { count: selectedSize.quantity })}</span>
                ) : (
                   <span className="text-[var(--muted)] font-bold text-xs bg-white/5 px-2 py-1 rounded-md">{t('inStock', { count: selectedSize.quantity })}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bulk Discount Tiers list */}
        {matchingDiscounts.some(d => d.tiers.length > 0) && (
          <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl flex flex-col gap-2.5">
            <h4 className="font-black text-xs uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              🔥 Special Offer Available
            </h4>
            <div className="flex flex-col gap-1.5">
              {matchingDiscounts.flatMap(d => d.tiers).sort((a, b) => a.minQty - b.minQty).map((tier, idx) => {
                const isCurrentTier = quantity >= tier.minQty;
                return (
                  <div key={idx} className={`flex items-center justify-between text-xs py-1.5 px-3 rounded-xl border transition-all ${isCurrentTier ? 'bg-purple-500/15 border-purple-500/40 text-white' : 'bg-black/10 border-white/5 opacity-60 text-[var(--muted)]'}`}>
                    <span className="font-bold">{tier.minQty}+ pieces:</span>
                    <span className="font-black">
                      {tier.discountType === 'fixed' && `৳${tier.discountValue.toLocaleString()} each`}
                      {tier.discountType === 'flat' && `৳${tier.discountValue.toLocaleString()} Off each`}
                      {tier.discountType === 'percent' && `${tier.discountValue}% Off each`}
                      {tier.freeDelivery && <span className="ml-2 text-[9px] bg-blue-500/20 border border-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Free Delivery</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quantity */}
        <div className="flex items-center justify-between pt-6 border-t border-[var(--panel-border)]">
          <h3 className="font-black text-sm uppercase tracking-widest text-[var(--muted)]">{t('quantity')}</h3>
          <div className="flex items-center bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl overflow-hidden">
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="w-12 h-10 flex items-center justify-center text-[var(--muted)] hover:bg-white/5 hover:text-foreground transition-colors">
              <Minus size={16} />
            </button>
            <span className="w-12 text-center font-black text-sm">{quantity}</span>
            <button onClick={() => setQuantity(q => q + 1)} className="w-12 h-10 flex items-center justify-center text-accent hover:bg-white/5 transition-colors">
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div className="pt-6 border-t border-[var(--panel-border)] flex flex-col gap-3">
            <h3 className="font-black text-sm uppercase tracking-widest text-[var(--muted)]">{t('details')}</h3>
            <p className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">{product.description}</p>
          </div>
        )}
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 p-4 bg-zinc-950/90 backdrop-blur-xl border-t border-white/10 z-30 flex items-center gap-3 md:justify-center">
        <button onClick={handleAddToCart} disabled={!selectedSize}
          className="flex-1 max-w-sm py-4 rounded-xl border border-accent/40 bg-accent/10 text-accent font-black text-sm hover:bg-accent/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2">
          <ShoppingCart size={18} /> {t('addToCart')}
        </button>
        <button onClick={handleBuyNow} disabled={!selectedSize}
          className="flex-1 max-w-sm py-4 rounded-xl bg-accent text-black font-black text-sm shadow-[0_0_20px_rgba(0,255,65,0.4)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100">
          {t('buyNow')}
        </button>
      </div>

      {/* Size Chart Modal */}
      {showSizeChart && sizeChartUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
              <h3 className="font-black flex items-center gap-2"><Ruler size={16} className="text-blue-400" /> {t('sizeChart')}</h3>
              <button onClick={() => setShowSizeChart(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              <img src={sizeChartUrl} alt="Size Chart" className="w-full rounded-xl" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
