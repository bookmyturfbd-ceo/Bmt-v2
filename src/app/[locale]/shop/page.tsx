'use client';
import { useState, useEffect, useRef } from 'react';
import { Loader2, ChevronLeft, ChevronRight, ShoppingBag, ShoppingCart } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useCartStore } from '@/store/useCartStore';

interface Slide { id: string; imageUrl: string; ctaText?: string; ctaLink?: string; }
interface Settings { autoSlide: boolean; intervalMs: number; slideType: string; }
interface Category { id: string; name: string; parentId: string | null; children?: Category[]; }
interface Product { id: string; name: string; slug: string; mainImage: string; sizes: any[]; categoryId: string; }

export default function ShopFrontPage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [settings, setSettings] = useState<Settings>({ autoSlide: true, intervalMs: 3500, slideType: 'auto' });
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const cart = useCartStore();

  useEffect(() => {
    Promise.all([
      fetch('/api/shop/carousel').then(r => r.json()),
      fetch('/api/shop/categories').then(r => r.json()),
      fetch('/api/shop/products?status=active').then(r => r.json()),
    ]).then(([carRes, cats, prods]) => {
      setSlides(carRes.slides?.filter((s: any) => s.active) || []);
      setSettings(carRes.settings || { autoSlide: true, intervalMs: 3500, slideType: 'auto' });
      setCategories(cats || []);
      setProducts(prods || []);
      setLoading(false);
    });
  }, []);

  const leafCategories = categories.filter(c => !c.children?.length);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="relative">
          <img 
            src="/bmt-spinner.png" 
            alt="Loading..." 
            className="h-20 w-20 object-contain drop-shadow-[0_0_15px_rgba(0,255,65,0.4)]" 
            style={{ 
              animation: 'spin 0.8s linear infinite',
              transformOrigin: 'center center'
            }}
          />
          <div className="absolute inset-0 bg-accent/20 blur-[20px] rounded-full scale-110 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-white/5 py-4 px-4 flex items-center justify-between">
        <h1 className="text-xl font-black flex items-center gap-2"><ShoppingBag size={20} className="text-accent" /> BMT Shop</h1>
        <button onClick={() => cart.setIsOpen(true)} className="relative w-10 h-10 rounded-full bg-neutral-900 border border-white/5 flex items-center justify-center hover:bg-neutral-800 transition-colors">
          <ShoppingCart size={18} className="text-white" />
          {cart.items.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-black text-[10px] font-black flex items-center justify-center rounded-full animate-in zoom-in">
              {cart.items.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          )}
        </button>
      </header>

      {/* Carousel */}
      {slides.length > 0 && settings.slideType !== 'none' && (
        <HeroCarousel slides={slides} settings={settings} />
      )}

      {/* Categories block rendering */}
      <div className="flex flex-col gap-10 mt-6 px-4">
        {products.length === 0 ? (
          <div className="text-center text-[var(--muted)] py-20 font-bold">No products available at the moment.</div>
        ) : (
          leafCategories.map(cat => {
            const catProducts = products.filter(p => p.categoryId === cat.id);
            if (catProducts.length === 0) return null;
            const parentCat = categories.find(c => c.id === cat.parentId);

            return (
              <div key={cat.id} className="flex flex-col gap-3 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    {parentCat && (
                      <span className="text-[10px] font-black uppercase bg-white/5 flex text-[var(--muted)] px-2 py-0.5 rounded-full border border-white/5 opacity-70">
                        {parentCat.name}
                      </span>
                    )}
                    <h2 className="text-lg font-black leading-none">{cat.name}</h2>
                    <span className="text-[10px] font-bold text-[var(--muted)] bg-neutral-900 px-2.5 py-0.5 rounded-md border border-white/5">
                      {catProducts.length} Product{catProducts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <button className="text-xs font-bold text-accent hover:underline shrink-0">View All</button>
                </div>
                <ProductCarousel products={catProducts} />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Hero Carousel ───────────────────────────────────────────────────────────
function HeroCarousel({ slides, settings }: { slides: Slide[]; settings: Settings }) {
  const [current, setCurrent] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settings.autoSlide || slides.length <= 1) return;
    const int = setInterval(() => {
      if (!scrollRef.current) return;
      const tW = scrollRef.current.clientWidth;
      const cL = scrollRef.current.scrollLeft;
      const idx = Math.round(cL / tW);
      const nextIdx = (idx + 1) % slides.length;
      scrollRef.current.scrollTo({ left: nextIdx * tW, behavior: 'smooth' });
    }, settings.intervalMs);
    return () => clearInterval(int);
  }, [slides.length, settings]);

  const snapScroll = (e: any) => {
    if (!scrollRef.current) return;
    const idx = Math.round(e.target.scrollLeft / scrollRef.current.clientWidth);
    if (idx !== current) setCurrent(idx);
  };

  const manualScrollTo = (idx: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ left: idx * scrollRef.current.clientWidth, behavior: 'smooth' });
    setCurrent(idx);
  };

  return (
    <div className="relative w-full aspect-[16/9] md:aspect-[21/9] max-h-[500px] bg-neutral-900 overflow-hidden shrink-0 group mt-4">
      <div ref={scrollRef} onScroll={snapScroll} className="flex w-full h-full overflow-x-auto snap-x snap-mandatory hide-scrollbar">
        {slides.map((s, i) => (
          <div key={s.id} className="w-full h-full shrink-0 snap-center relative">
            <img src={s.imageUrl} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-6">
              {s.ctaText && (
                <Link href={s.ctaLink || '#'} className="px-6 py-2.5 bg-accent text-black font-black rounded-xl hover:brightness-110 active:scale-95 transition-all text-sm shadow-xl">
                  {s.ctaText}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {settings.slideType === 'thumb' && slides.length > 1 && (
        <>
          <button onClick={() => manualScrollTo((current - 1 + slides.length) % slides.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-black/80"><ChevronLeft size={18} /></button>
          <button onClick={() => manualScrollTo((current + 1) % slides.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white hover:bg-black/80"><ChevronRight size={18} /></button>
        </>
      )}

      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 bg-black/30 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/10">
          {slides.map((_, i) => (
            <button key={i} onClick={() => manualScrollTo(i)} className={`h-1.5 rounded-full transition-all ${current === i ? 'w-4 bg-accent' : 'w-1.5 bg-white/40 hover:bg-white/70'}`} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Product Carousel ────────────────────────────────────────────────────────
function ProductCarousel({ products }: { products: Product[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const scroll = (dir: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({ left: dir === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative group/carousel">
      {/* Scroll Buttons (Desktop view) */}
      {products.length > 2 && (
        <>
          <button onClick={() => scroll('left')} className="absolute left-0 top-[40%] text-white -translate-y-1/2 -ml-4 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hidden md:flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-20 hover:bg-black"><ChevronLeft size={18} /></button>
          <button onClick={() => scroll('right')} className="absolute right-0 top-[40%] text-white -translate-y-1/2 -mr-4 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 hidden md:flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-20 hover:bg-black"><ChevronRight size={18} /></button>
        </>
      )}

      <div ref={scrollRef} className="flex gap-4 overflow-x-auto hide-scrollbar pb-6 snap-x snap-mandatory mx-[-1rem] px-4 scroll-smooth">
        {products.map(p => {
          const prices = p.sizes.map(s => s.salePrice ?? s.basePrice);
          const minPrice = Math.min(...prices);
          const basePrices = p.sizes.map(s => s.basePrice);
          const minBase = Math.min(...basePrices);
          const hasDiscount = minPrice < minBase;
          const savings = minBase - minPrice;

          return (
            <Link key={p.id} href={`/shop/product/${p.slug}`} className="w-36 sm:w-48 shrink-0 snap-end group">
              <div className="w-full aspect-[2/3] bg-neutral-900 rounded-2xl overflow-hidden mb-3 border border-white/5 group-hover:border-accent/40 transition-colors relative">
                <img src={p.mainImage} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                {hasDiscount && (
                  <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1.5">
                    <span className="bg-red-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg border border-red-400">Sale</span>
                  </div>
                )}
              </div>
              <h3 className="font-bold text-sm leading-tight text-white/90 group-hover:text-accent transition-colors line-clamp-2 pr-2">{p.name}</h3>
              <div className="mt-1.5 flex flex-col items-start gap-1">
                <p className="font-black text-accent flex items-end gap-1.5">
                  ৳{minPrice.toLocaleString()}
                  {hasDiscount && <span className="text-[10px] text-[var(--muted)] line-through font-semibold mb-0.5">৳{minBase.toLocaleString()}</span>}
                </p>
                {hasDiscount && (
                  <span className="bg-accent/15 border border-accent/20 text-accent text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                    Save ৳{savings.toLocaleString()}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
