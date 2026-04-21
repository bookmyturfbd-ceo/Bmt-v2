'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Loader2, Package, MapPin, Phone, Banknote, User, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, TrendingUp, Calendar, ChevronLeft, ChevronRight,
  Clock, Truck, ShoppingBag, Mail
} from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  pending:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  shipped:   'bg-purple-500/20 text-purple-400 border-purple-500/30',
  delivered: 'bg-accent/20 text-accent border-accent/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export default function ShopOrdersPanel() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [historyDayOffset, setHistoryDayOffset] = useState(0); // 0=today, 1=yesterday, etc.

  const load = async () => {
    setLoading(true);
    const data = await fetch('/api/shop/orders').then(r => r.json());
    setOrders(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    await fetch('/api/shop/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    await load();
    setUpdatingId(null);
  };

  // Group orders by calendar date string YYYY-MM-DD
  const byDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    orders.forEach(o => {
      const day = new Date(o.createdAt).toISOString().split('T')[0];
      if (!map[day]) map[day] = [];
      map[day].push(o);
    });
    return map;
  }, [orders]);

  const sortedDays = useMemo(() => Object.keys(byDay).sort((a, b) => b.localeCompare(a)), [byDay]);

  // Daily revenue stats card
  const todayStr = new Date().toISOString().split('T')[0];
  const viewDay = sortedDays[historyDayOffset] ?? todayStr;
  const viewOrders = byDay[viewDay] ?? [];
  const viewRevenue = viewOrders.filter(o => o.status !== 'cancelled').reduce((s: number, o: any) => s + (o.total ?? 0), 0);
  const viewCount = viewOrders.filter(o => o.status !== 'cancelled').length;

  const todayOrders = byDay[todayStr] ?? [];
  const todayRevenue = todayOrders.filter(o => o.status !== 'cancelled').reduce((s: number, o: any) => s + (o.total ?? 0), 0);
  const lifetimeRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s: number, o: any) => s + (o.total ?? 0), 0);

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-accent" /></div>;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Lifetime Revenue" value={`৳${lifetimeRevenue.toLocaleString()}`} sub={`${orders.length} total orders`} color="text-accent" bg="bg-accent/10" border="border-accent/20" icon={TrendingUp} />
        <StatCard label="Today's Revenue" value={`৳${todayRevenue.toLocaleString()}`} sub={`${todayOrders.filter(o => o.status !== 'cancelled').length} orders today`} color="text-emerald-400" bg="bg-emerald-400/10" border="border-emerald-400/20" icon={Calendar} />
        <StatCard label="Pending Orders" value={orders.filter(o => o.status === 'pending').length.toString()} sub="Awaiting action" color="text-yellow-400" bg="bg-yellow-400/10" border="border-yellow-400/20" icon={Clock} />
        <StatCard label="Delivered" value={orders.filter(o => o.status === 'delivered').length.toString()} sub="Completed orders" color="text-blue-400" bg="bg-blue-400/10" border="border-blue-400/20" icon={Truck} />
      </div>

      {/* ── Daily Revenue History ── */}
      <div className="glass-panel border border-[var(--panel-border)] rounded-3xl p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-accent" />
            <h2 className="font-black">Daily Revenue</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setHistoryDayOffset(d => d + 1)} disabled={historyDayOffset >= sortedDays.length - 1}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 disabled:opacity-30 transition-colors">
              <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-bold min-w-[110px] text-center">
              {historyDayOffset === 0 ? 'Today' : historyDayOffset === 1 ? 'Yesterday' : viewDay}
            </span>
            <button onClick={() => setHistoryDayOffset(d => Math.max(0, d - 1))} disabled={historyDayOffset === 0}
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 disabled:opacity-30 transition-colors">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-2xl p-4 flex flex-col gap-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Revenue</p>
            <p className="text-2xl font-black text-accent">৳{viewRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-2xl p-4 flex flex-col gap-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Orders</p>
            <p className="text-2xl font-black text-white">{viewCount}</p>
            <p className="text-[10px] text-[var(--muted)]">{viewOrders.filter(o => o.status === 'cancelled').length} cancelled</p>
          </div>
        </div>

        {/* Mini order list for selected day */}
        {viewOrders.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Orders on this day</p>
            {viewOrders.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between px-3 py-2 bg-[var(--panel-bg)] rounded-xl border border-[var(--panel-border)] text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[var(--muted)]">#{o.id.slice(0, 6).toUpperCase()}</span>
                  <span className="font-bold truncate max-w-[120px]">{o.customerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${STATUS_STYLES[o.status] ?? STATUS_STYLES.pending}`}>{o.status}</span>
                  <span className="font-black text-accent text-sm">৳{o.total.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── All Orders — Compact Rows ── */}
      <div className="glass-panel border border-[var(--panel-border)] rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--panel-border)] flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className="text-accent" />
            <h2 className="font-black">All Orders ({orders.length})</h2>
          </div>
          <button onClick={load} className="text-xs text-[var(--muted)] hover:text-foreground transition-colors font-bold">Refresh</button>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-[var(--muted)]">
            <Package size={40} className="opacity-20 mb-4" />
            <p className="font-bold">No orders yet</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--panel-border)]">
            {orders.map(order => {
              const isExpanded = expandedId === order.id;
              const isUpdating = updatingId === order.id;
              return (
                <div key={order.id}>
                  {/* Single-line row */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/3 transition-colors text-left"
                  >
                    <span className="font-mono text-xs text-[var(--muted)] w-16 shrink-0">#{order.id.slice(0, 6).toUpperCase()}</span>
                    <span className="font-bold text-sm flex-1 truncate">{order.customerName}</span>
                    <span className="text-xs text-[var(--muted)] hidden sm:block w-24 shrink-0 truncate">{order.district}</span>
                    <span className="text-xs text-[var(--muted)] hidden md:block w-32 shrink-0">{new Date(order.createdAt).toLocaleDateString()}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border shrink-0 ${STATUS_STYLES[order.status] ?? STATUS_STYLES.pending}`}>
                      {order.status}
                    </span>
                    <span className="font-black text-accent text-sm w-20 text-right shrink-0">৳{order.total.toLocaleString()}</span>
                    {isExpanded ? <ChevronUp size={14} className="shrink-0 text-[var(--muted)]" /> : <ChevronDown size={14} className="shrink-0 text-[var(--muted)]" />}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-5 pb-5 bg-black/20 flex flex-col gap-4 border-t border-[var(--panel-border)]/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                        {/* Customer info */}
                        <div className="flex flex-col gap-2 text-sm">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-1">Customer</p>
                          <div className="flex items-center gap-2"><User size={13} className="text-[var(--muted)]" /><span className="font-bold">{order.customerName}</span></div>
                          <div className="flex items-center gap-2"><Phone size={13} className="text-[var(--muted)]" /><span>{order.customerPhone}</span></div>
                          {order.customerEmail && <div className="flex items-center gap-2"><Mail size={13} className="text-[var(--muted)]" /><span>{order.customerEmail}</span></div>}
                          <div className="flex items-start gap-2"><MapPin size={13} className="text-[var(--muted)] mt-0.5 shrink-0" /><span className="text-xs">{order.address}, <span className="font-black text-[var(--muted)]">{order.district}</span></span></div>
                          <div className="flex items-center gap-2"><Banknote size={13} className="text-[var(--muted)]" /><span className="uppercase text-xs font-black text-accent bg-accent/10 px-2 rounded border border-accent/20">{order.paymentMethod}</span></div>
                        </div>

                        {/* Items */}
                        <div className="flex flex-col gap-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-1">Items ({order.items.length})</p>
                          <div className="flex flex-col gap-2 max-h-40 overflow-y-auto hide-scrollbar">
                            {order.items.map((item: any) => (
                              <div key={item.id} className="flex items-center gap-2">
                                {item.product?.mainImage && <img src={item.product.mainImage} className="w-9 h-10 rounded-lg object-cover bg-neutral-900 border border-white/10 shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-xs truncate">{item.product?.name ?? 'Product'}</p>
                                  <p className="text-[10px] text-[var(--muted)]">Size: {item.sizeLabel} × {item.quantity}</p>
                                </div>
                                <p className="font-black text-sm shrink-0">৳{(item.price * item.quantity).toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between text-xs text-[var(--muted)] border-t border-[var(--panel-border)] pt-2 mt-1">
                            <span>Subtotal: ৳{order.subtotal?.toLocaleString()}</span>
                            <span>Delivery: ৳{order.deliveryCharge?.toLocaleString()}</span>
                            <span className="font-black text-accent">Total: ৳{order.total?.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status actions */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--panel-border)]/50">
                        {['confirmed', 'shipped', 'delivered', 'cancelled'].map(s => (
                          <button key={s} onClick={() => updateStatus(order.id, s)} disabled={order.status === s || isUpdating}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all disabled:opacity-40 flex items-center gap-1.5 ${
                              s === 'cancelled' ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                              : s === 'delivered' ? 'bg-accent/10 border-accent/20 text-accent hover:bg-accent/20'
                              : 'bg-white/5 border-white/10 text-[var(--muted)] hover:bg-white/10 hover:text-white'
                            }`}>
                            {isUpdating ? <Loader2 size={12} className="animate-spin" /> : null}
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                            {order.status === s && <CheckCircle2 size={12} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, bg, border, icon: Icon }: {
  label: string; value: string; sub: string; color: string; bg: string; border: string; icon: any;
}) {
  return (
    <div className={`glass-panel rounded-2xl p-4 flex flex-col gap-2 border ${border}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] leading-tight">{label}</p>
        <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center border ${border} shrink-0`}>
          <Icon size={14} className={color} />
        </div>
      </div>
      <p className={`text-xl font-black ${color}`}>{value}</p>
      <p className="text-[10px] text-[var(--muted)]">{sub}</p>
    </div>
  );
}
