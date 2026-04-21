'use client';

import { useCartStore } from '@/store/useCartStore';
import { ShoppingCart, X, Plus, Minus, Trash2 } from 'lucide-react';
import { Link } from '@/i18n/routing';

export default function CartDrawer() {
  const { items, isOpen, setIsOpen, updateQuantity, removeItem, getCartTotal } = useCartStore();

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
            items.map(item => (
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
                    <p className="font-black text-accent text-sm">৳{(item.price * item.quantity).toLocaleString()}</p>
                    
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
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t border-white/10 bg-black/20 flex flex-col gap-4">
            <div className="flex items-center justify-between font-black">
              <span className="text-[var(--muted)]">Subtotal ({items.reduce((s,i)=>s+i.quantity,0)} items)</span>
              <span className="text-xl text-accent">৳{getCartTotal().toLocaleString()}</span>
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
