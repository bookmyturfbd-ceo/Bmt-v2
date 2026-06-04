'use client';

import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/useCartStore';
import { ShoppingCart, X, Plus, Minus, Trash2, Loader2 } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, getCartTotal } = useCartStore();
  const [evaluatedCart, setEvaluatedCart] = useState<any>(null);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    if (!isOpen || items.length === 0) {
      setEvaluatedCart(null);
      return;
    }

    let active = true;
    const fetchDiscount = async () => {
      setCalculating(true);
      try {
        const res = await fetch('/api/shop/discounts/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map(item => ({
              productId: item.productId,
              name: item.name,
              sizeLabel: item.sizeLabel,
              price: item.price,
              quantity: item.quantity,
              imageUrl: item.imageUrl
            })),
            deliveryCharge: 0
          })
        });
        if (res.ok && active) {
          const data = await res.json();
          setEvaluatedCart(data);
        }
      } catch (err) {
        console.error('Error evaluating cart discounts:', err);
      } finally {
        if (active) setCalculating(false);
      }
    };

    fetchDiscount();
    return () => {
      active = false;
    };
  }, [items, isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-in fade-in"
        onClick={() => setIsOpen(false)}
      />
      
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-neutral-900 border-l border-white/10 z-[101] flex flex-col shadow-2xl animate-in slide-in-from-right">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
          <h2 className="font-black text-lg flex items-center gap-2"><ShoppingCart size={18} className="text-accent" /> Your Cart</h2>
          <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--muted)]">
              <ShoppingCart size={40} className="opacity-20" />
              <p className="font-bold text-sm">Cart is empty</p>
              <button onClick={() => setIsOpen(false)} className="mt-4 text-accent text-xs font-black uppercase hover:underline">Continue Shopping</button>
            </div>
          ) : (
            items.map(item => {
              const evaluatedItem = evaluatedCart?.items?.find(
                (ei: any) => ei.productId === item.productId && ei.sizeLabel?.toUpperCase() === item.sizeLabel?.toUpperCase()
              );
              const hasItemDiscount = evaluatedItem?.hasDiscount;
              const displayPrice = evaluatedItem ? evaluatedItem.discountedPrice : item.price;

              return (
                <div key={item.id} className="flex gap-3 bg-[var(--panel-bg)] border border-[var(--panel-border)] p-3 rounded-2xl">
                  <img src={item.imageUrl} alt={item.name} className="w-16 h-20 object-cover rounded-xl bg-black shrink-0" />
                  <div className="flex flex-col flex-1 gap-1">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-bold text-sm leading-tight line-clamp-2 pr-2">{item.name}</p>
                      <button onClick={() => removeItem(item.id)} className="text-[var(--muted)] p-1 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="text-[10px] text-[var(--muted)] font-black uppercase tracking-wider bg-white/5 w-fit px-2 py-0.5 rounded">Size: {item.sizeLabel}</p>
                    
                    <div className="mt-auto pt-2 flex items-end justify-between">
                      <div className="flex flex-col items-start gap-0.5">
                        <p className="font-black text-accent text-sm">৳{(displayPrice * item.quantity).toLocaleString()}</p>
                        {hasItemDiscount && (
                          <p className="text-[10px] text-[var(--muted)] line-through">৳{(item.price * item.quantity).toLocaleString()}</p>
                        )}
                        {evaluatedItem?.appliedDiscountName && (
                          <span className="text-[8px] bg-purple-500/15 border border-purple-500/35 text-purple-300 px-1.5 py-0.5 rounded font-black mt-0.5">
                            {evaluatedItem.appliedDiscountName}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 bg-black/40 border border-[var(--panel-border)] rounded-lg p-0.5">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center text-[var(--muted)] hover:text-white transition-colors">
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center text-[var(--muted)] hover:text-white transition-colors">
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t border-white/10 bg-black/20 flex flex-col gap-4">
            {evaluatedCart?.hasFreeDelivery && (
              <div className="text-[10px] text-center text-blue-400 font-bold bg-blue-500/10 border border-blue-500/25 py-2 rounded-xl animate-pulse">
                🎉 Unlocked FREE Delivery!
              </div>
            )}
            <div className="flex items-center justify-between font-black">
              <span className="text-[var(--muted)]">Subtotal ({items.reduce((s,i)=>s+i.quantity,0)} items)</span>
              <div className="flex flex-col items-end">
                {evaluatedCart && evaluatedCart.savings > 0 ? (
                  <>
                    <span className="text-xl text-accent">৳{evaluatedCart.subtotalAfterDiscount.toLocaleString()}</span>
                    <span className="text-xs text-[var(--muted)] line-through">৳{evaluatedCart.subtotalBeforeDiscount.toLocaleString()}</span>
                    <span className="text-[9px] bg-accent/15 border border-accent/25 text-accent px-1.5 py-0.5 rounded font-black mt-1">
                      Saved ৳{evaluatedCart.savings.toLocaleString()}!
                    </span>
                  </>
                ) : (
                  <span className="text-xl text-accent">
                    {calculating ? (
                      <Loader2 size={16} className="animate-spin text-accent" />
                    ) : (
                      `৳${getCartTotal().toLocaleString()}`
                    )}
                  </span>
                )}
              </div>
            </div>
            <Link href="/shop/checkout" onClick={() => setIsOpen(false)}
              className="w-full py-4 rounded-xl bg-accent text-black font-black text-sm shadow-[0_0_20px_rgba(0,255,65,0.3)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center">
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
