'use client';

import { useState } from 'react';
import { ChevronLeft, ShoppingCart, Minus, Plus, Ruler, X, CheckCircle2 } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useCartStore } from '@/store/useCartStore';

export default function ProductDetailClient({ product }: { product: any }) {
  const [selectedSize, setSelectedSize] = useState<any>(product.sizes[0] || null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(product.mainImage);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const cart = useCartStore();

  const allImages = [product.mainImage, ...(product.galleryImages || [])];
  const sizeChartUrl = product.category?.sizeChartUrl || product.category?.parent?.sizeChartUrl;

  const currentPrice = selectedSize ? (selectedSize.salePrice ?? selectedSize.basePrice) : 0;
  const currentBase = selectedSize ? selectedSize.basePrice : 0;
  const hasDiscount = selectedSize && selectedSize.salePrice && selectedSize.salePrice < selectedSize.basePrice;
  const savings = currentBase - currentPrice;

  const handleAddToCart = () => {
    if (!selectedSize) return;
    cart.addItem({
      productId: product.id,
      name: product.name,
      sizeLabel: selectedSize.label,
      price: currentPrice,
      quantity,
      imageUrl: product.mainImage
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
        
        {/* Thumbnails */}
        {allImages.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 hide-scrollbar overflow-x-auto">
            {allImages.map((img, i) => (
              <button key={i} onClick={() => setActiveImage(img)}
                className={`w-14 h-16 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${activeImage === img ? 'border-accent scale-110 shadow-lg' : 'border-white/20 opacity-70 hover:opacity-100'}`}>
                <img src={img} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-5 flex flex-col gap-6 max-w-2xl mx-auto">
        <div className="flex flex-col gap-2">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl sm:text-3xl font-black leading-tight">{product.name}</h1>
          </div>
          
          <div className="flex items-end gap-3 mt-1">
            <p className="text-3xl font-black text-accent flex items-start gap-1">
              <span className="text-lg mt-1">৳</span>{currentPrice.toLocaleString()}
            </p>
            {hasDiscount && (
              <>
                <p className="text-lg text-[var(--muted)] line-through font-semibold mb-1">৳{currentBase.toLocaleString()}</p>
                <span className="bg-accent/20 border border-accent/30 text-accent text-[10px] font-black uppercase px-2 py-1 rounded-md mb-1.5 flex items-center gap-1">
                  Save ৳{savings.toLocaleString()}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Size Selector */}
        {product.sizes.length > 0 && (
          <div className="flex flex-col gap-3 pt-6 border-t border-[var(--panel-border)]">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm uppercase tracking-widest text-[var(--muted)]">Select Size</h3>
              {sizeChartUrl && (
                <button onClick={() => setShowSizeChart(true)} className="flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">
                  <Ruler size={14} /> Size Chart
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
                   <span className="text-red-500 font-black text-xs bg-red-500/10 px-2 py-1 rounded-md">Out of stock</span>
                ) : selectedSize.quantity < 10 ? (
                   <span className="text-orange-400 font-black text-xs bg-orange-400/10 px-2 py-1 rounded-md">Low stock: Only {selectedSize.quantity} left!</span>
                ) : (
                   <span className="text-[var(--muted)] font-bold text-xs bg-white/5 px-2 py-1 rounded-md">In stock: {selectedSize.quantity} units</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Quantity */}
        <div className="flex items-center justify-between pt-6 border-t border-[var(--panel-border)]">
          <h3 className="font-black text-sm uppercase tracking-widest text-[var(--muted)]">Quantity</h3>
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
            <h3 className="font-black text-sm uppercase tracking-widest text-[var(--muted)]">Details</h3>
            <p className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">{product.description}</p>
          </div>
        )}
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 p-4 bg-zinc-950/90 backdrop-blur-xl border-t border-white/10 z-30 flex items-center gap-3 md:justify-center">
        <button onClick={handleAddToCart} disabled={!selectedSize}
          className="flex-1 max-w-sm py-4 rounded-xl border border-accent/40 bg-accent/10 text-accent font-black text-sm hover:bg-accent/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2">
          <ShoppingCart size={18} /> Add to Cart
        </button>
        <button onClick={handleBuyNow} disabled={!selectedSize}
          className="flex-1 max-w-sm py-4 rounded-xl bg-accent text-black font-black text-sm shadow-[0_0_20px_rgba(0,255,65,0.4)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100">
          Buy Now
        </button>
      </div>

      {/* Size Chart Modal */}
      {showSizeChart && sizeChartUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-neutral-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
              <h3 className="font-black flex items-center gap-2"><Ruler size={16} className="text-blue-400" /> Size Chart</h3>
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
