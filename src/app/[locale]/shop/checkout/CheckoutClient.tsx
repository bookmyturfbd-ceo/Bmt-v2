'use client';

import { useState, useEffect } from 'react';

import { ChevronLeft, Truck, PackageCheck, MapPin, CreditCard, Banknote, Loader2, CheckCircle2, ShoppingCart, ChevronDown, Search } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';

const DHAKA_METRO = ["Dhaka (Metropolitan)"];
const DHAKA_SUBURBS = ["Dhaka (Suburbs - Savar, Keraniganj, etc)", "Gazipur", "Narayanganj"];
const OTHERS = [
  "Bagerhat", "Bandarban", "Barguna", "Barishal", "Bhola", "Bogura", "Brahmanbaria", 
  "Chandpur", "Chattogram", "Chuadanga", "Cox's Bazar", "Cumilla", "Dinajpur", "Faridpur", "Feni", "Gaibandha", 
  "Gopalganj", "Habiganj", "Jamalpur", "Jashore", "Jhalokati", "Jhenaidah", 
  "Joypurhat", "Khagrachhari", "Khulna", "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur", 
  "Lalmonirhat", "Madaripur", "Magura", "Manikganj", "Meherpur", "Moulvibazar", "Munshiganj", 
  "Mymensingh", "Naogaon", "Narail", "Narsingdi", "Natore", "Netrokona", 
  "Nilphamari", "Noakhali", "Pabna", "Panchagarh", "Patuakhali", "Pirojpur", "Rajbari", 
  "Rajshahi", "Rangamati", "Rangpur", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj", 
  "Sunamganj", "Sylhet", "Tangail", "Thakurgaon"
].sort();

const BD_DISTRICTS = [
  ...DHAKA_METRO,
  ...DHAKA_SUBURBS,
  ...OTHERS
].map(name => {
  let charge = 150;
  if (DHAKA_METRO.includes(name)) charge = 80;
  else if (DHAKA_SUBURBS.includes(name)) charge = 120;
  return { id: name, name, charge };
});

export default function CheckoutClient() {
  const router = useRouter();
  const cart = useCartStore();
  
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', districtId: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<'cod'|'wallet'>('cod');
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  
  const [districtSearch, setDistrictSearch] = useState('');
  const [showDistricts, setShowDistricts] = useState(false);

  useEffect(() => { 
    setMounted(true); 
    setIsGuest(!document.cookie.includes('bmt_player_id='));
  }, []);

  if (!mounted) return null;
  if (cart.items.length === 0 && !success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <ShoppingCart size={40} className="text-[var(--muted)] opacity-50 mb-4" />
        <h2 className="font-black text-xl mb-2">Cart is Empty</h2>
        <Link href="/shop" className="text-accent underline text-sm font-bold">Return to Shop</Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
        <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={32} className="text-accent" />
        </div>
        <h2 className="font-black text-2xl mb-2 text-center text-accent">Order Placed Successfully!</h2>
        <p className="text-[var(--muted)] mb-8 text-center text-sm max-w-sm">
          Thank you for your purchase. We will contact you at {form.phone} soon regarding delivery.
        </p>

        {isGuest && (
          <div className="mb-8 p-5 bg-white/5 border border-white/10 rounded-2xl max-w-sm w-full flex flex-col items-center text-center gap-3 animate-in slide-in-from-bottom-4">
            <h3 className="font-black text-sm">Track your orders easily</h3>
            <p className="text-xs text-[var(--muted)] leading-relaxed">Create an account to track your order status and manage your purchases from your profile.</p>
            <div className="flex gap-2 w-full mt-2">
              <Link href="/register" className="flex-1 py-2.5 rounded-xl bg-accent text-black font-black text-xs hover:brightness-110 transition-colors">Sign Up</Link>
              <Link href="/login" className="flex-1 py-2.5 rounded-xl bg-white/10 text-white font-black text-xs hover:bg-white/20 transition-colors">Login</Link>
            </div>
          </div>
        )}

        <Link href="/shop" className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${isGuest ? 'text-[var(--muted)] hover:text-white hover:bg-white/5' : 'bg-accent text-black hover:brightness-110 shadow-[0_0_20px_rgba(0,255,65,0.2)]'}`}>
          Continue Shopping
        </Link>
      </div>
    );
  }

  const selectedZone = BD_DISTRICTS.find(z => z.id === form.districtId);
  const actualDeliveryCharge = selectedZone?.charge || 0;
  const subtotal = cart.getCartTotal();
  const total = subtotal + actualDeliveryCharge;

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.address || !form.districtId) {
      alert("Please fill in all required fields."); return;
    }
    
    // Get player id if available
    const playerId = document.cookie.split('; ').find(row => row.startsWith('bmt_player_id='))?.split('=')[1] || null;

    setPlacing(true);
    try {
      const res = await fetch('/api/shop/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          playerId,
          paymentMethod,
          items: cart.items,
          deliveryCharge: actualDeliveryCharge,
          subtotal,
          total
        })
      });

      if (!res.ok) throw new Error(await res.text());
      cart.clearCart();
      setSuccess(true);
      window.scrollTo(0,0);
    } catch(err: any) {
      alert("Failed to place order: " + err.message);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-white/10 px-4 py-4 flex items-center gap-3">
        <Link href="/shop" className="w-10 h-10 flex items-center justify-center bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors shrink-0">
          <ChevronLeft size={20} />
        </Link>
        <h1 className="font-black text-lg">Checkout</h1>
      </header>

      <form onSubmit={placeOrder} className="p-4 flex flex-col lg:flex-row gap-6 max-w-5xl mx-auto">
        <div className="flex-1 flex flex-col gap-6">
          {/* Delivery Info */}
          <div className="glass-panel border border-[var(--panel-border)] rounded-3xl p-5 flex flex-col gap-4 relative z-20">
            <h2 className="font-black flex items-center gap-2"><MapPin size={18} className="text-accent" /> Delivery Address</h2>
            
            <input required autoComplete="name" placeholder="Full Name *" value={form.name} onChange={e=>setForm({...form, name: e.target.value})}
              className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-3 outline-none focus:border-accent text-sm" />
            <input required type="tel" autoComplete="tel" placeholder="Phone Number *" value={form.phone} onChange={e=>setForm({...form, phone: e.target.value})}
              className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-3 outline-none focus:border-accent text-sm" />
            <input type="email" autoComplete="email" placeholder="Email (Optional)" value={form.email} onChange={e=>setForm({...form, email: e.target.value})}
              className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-3 outline-none focus:border-accent text-sm" />
            
            <div className="relative z-30">
              <button 
                type="button" 
                onClick={() => setShowDistricts(!showDistricts)}
                className={`w-full bg-[var(--panel-bg)] border rounded-xl px-4 py-3 outline-none text-sm transition-all shadow-sm flex items-center justify-between ${form.districtId ? 'border-accent/40 text-accent font-bold ring-2 ring-accent/10' : 'border-[var(--panel-border)] hover:border-white/20'}`}
              >
                <div className="flex flex-col text-left">
                  {form.districtId ? (
                    <>
                      <span>{selectedZone?.name}</span>
                      <span className="text-[10px] text-[var(--muted)] hover:opacity-80">Delivery: ৳{selectedZone?.charge}</span>
                    </>
                  ) : (
                    <span className="text-[var(--muted)]">Select District Zone *</span>
                  )}
                </div>
                <ChevronDown size={18} className={`text-[var(--muted)] transition-transform duration-300 ${showDistricts ? 'rotate-180' : ''}`} />
              </button>
              
              {showDistricts && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDistricts(false)} />
                  <div className="absolute top-full left-0 right-0 mt-2 max-h-72 overflow-y-auto bg-zinc-900 border border-white/10 rounded-2xl z-50 shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col hide-scrollbar backdrop-blur-xl pb-2">
                    {/* Sticky Search bar */}
                    <div className="sticky top-0 bg-zinc-900/95 backdrop-blur z-20 p-2 pb-2 border-b border-white/10">
                      <div className="relative flex items-center">
                        <Search size={14} className="absolute left-3 text-[var(--muted)] pointer-events-none" />
                        <input 
                          type="text"
                          autoFocus
                          placeholder="Type to search..."
                          value={districtSearch}
                          onChange={e => setDistrictSearch(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 outline-none text-sm focus:border-accent/50 text-white"
                        />
                      </div>
                    </div>
                    
                    {/* List */}
                    <div className="flex flex-col gap-1 px-2 pt-2">
                      {BD_DISTRICTS.filter(d => d.name.toLowerCase().includes(districtSearch.toLowerCase())).map(z => (
                        <button type="button" key={z.id} onClick={() => {
                          setForm({ ...form, districtId: z.id });
                          setDistrictSearch('');
                          setShowDistricts(false);
                        }} className={`text-left px-3 py-3 rounded-xl text-sm transition-all flex items-center justify-between group ${form.districtId === z.id ? 'bg-accent/10 text-accent font-bold' : 'hover:bg-white/5 text-foreground'}`}>
                          <span>{z.name}</span>
                          <div className={`flex items-center gap-2 ${form.districtId === z.id ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`}>
                            <span className="text-[11px] bg-black/40 px-2 py-0.5 rounded-md font-bold">৳{z.charge}</span>
                            {form.districtId === z.id && <CheckCircle2 size={16} className="text-accent" />}
                          </div>
                        </button>
                      ))}
                      {BD_DISTRICTS.filter(d => d.name.toLowerCase().includes(districtSearch.toLowerCase())).length === 0 && (
                        <div className="py-8 flex flex-col items-center justify-center text-center gap-2">
                          <MapPin size={24} className="text-[var(--muted)] opacity-50" />
                          <p className="text-sm font-bold text-[var(--muted)]">No valid district found</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            <textarea required autoComplete="street-address" placeholder="Full Address (House, Road, Area) *" value={form.address} onChange={e=>setForm({...form, address: e.target.value})}
              rows={3} className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-3 outline-none focus:border-accent text-sm resize-none" />
          </div>

          {/* Payment Method */}
          <div className="glass-panel border border-[var(--panel-border)] rounded-3xl p-5 flex flex-col gap-4">
            <h2 className="font-black flex items-center gap-2"><CreditCard size={18} className="text-blue-400" /> Payment Method</h2>
            
            <label className={`relative flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'cod' ? 'border-accent bg-accent/5' : 'border-[var(--panel-border)] hover:border-white/20'}`}>
              <div className="mt-1">
                <Banknote size={24} className={paymentMethod === 'cod' ? 'text-accent' : 'text-[var(--muted)]'} />
              </div>
              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-black text-white">Cash on Delivery</span>
                  <span className="bg-accent/20 text-accent text-[9px] px-2 py-0.5 rounded uppercase font-black tracking-widest">Popular</span>
                </div>
                <span className="text-xs text-[var(--muted)] mt-1">Pay with cash upon receiving your order.</span>
              </div>
              <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="hidden" />
            </label>

            {!isGuest && (
              <label className={`relative flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'wallet' ? 'border-accent bg-accent/5' : 'border-[var(--panel-border)] hover:border-white/20'}`}>
                <div className="mt-1">
                  <CreditCard size={24} className={paymentMethod === 'wallet' ? 'text-blue-400' : 'text-[var(--muted)]'} />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="font-black text-white">BMT Wallet Balance</span>
                  <span className="text-xs text-[var(--muted)] mt-1">Deduct directly from your player wallet.</span>
                </div>
                <input type="radio" name="payment" value="wallet" checked={paymentMethod === 'wallet'} onChange={() => setPaymentMethod('wallet')} className="hidden" />
              </label>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-4">
          <div className="glass-panel border border-[var(--panel-border)] rounded-3xl p-5 flex flex-col gap-4 sticky top-24">
            <h2 className="font-black flex items-center gap-2"><PackageCheck size={18} className="text-purple-400" /> Order Summary</h2>
            
            <div className="flex flex-col gap-3 max-h-[30vh] overflow-y-auto pr-2 hide-scrollbar">
              {cart.items.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <img src={item.imageUrl} className="w-12 h-12 object-cover rounded-md bg-neutral-900 border border-white/5" />
                  <div className="flex flex-col flex-1 min-w-0">
                    <p className="font-bold text-xs truncate">{item.name}</p>
                    <p className="text-[10px] text-[var(--muted)] pr-2">Size: {item.sizeLabel} <span className="text-white/60 mx-1">x</span> {item.quantity}</p>
                  </div>
                  <p className="font-black text-sm text-right shrink-0">৳{(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>

            <div className="h-px bg-[var(--panel-border)] w-full my-1" />

            <div className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><span className="text-[var(--muted)]">Subtotal ({cart.items.reduce((s,i)=>s+i.quantity,0)} items)</span><span className="font-bold">৳{subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)] flex items-center gap-1"><Truck size={14} /> Delivery Base</span>
                <span className="font-bold transition-all">{actualDeliveryCharge > 0 ? `৳${actualDeliveryCharge}` : 'Select Zone'}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-[var(--panel-border)]">
              <span className="font-black uppercase tracking-wider text-sm">Total</span>
              <span className="font-black text-accent text-2xl">৳{total.toLocaleString()}</span>
            </div>

            <button type="submit" disabled={placing}
              className="mt-2 w-full py-4 rounded-xl bg-accent text-black font-black text-sm shadow-[0_0_20px_rgba(0,255,65,0.2)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {placing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Place Order
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
