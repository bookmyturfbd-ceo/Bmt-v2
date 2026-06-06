'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Loader2, Package, MapPin, Phone, Banknote, User, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, TrendingUp, Calendar, ChevronLeft, ChevronRight,
  Clock, Truck, ShoppingBag, Mail, FolderOpen, Tag, ArrowLeft, ListFilter,
  PieChart
} from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  new:        'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  ready:      'bg-blue-500/20 text-blue-400 border-blue-500/30',
  on_the_way: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  delivered:  'bg-accent/20 text-accent border-accent/30',
  canceled:   'bg-red-500/20 text-red-400 border-red-500/30',
  exchange:   'bg-orange-500/20 text-orange-400 border-orange-500/30',
  returned:   'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
};

const TRANSITIONS: Record<string, { label: string; status: string; style: string }[]> = {
  new: [
    { label: 'Start Preparing 👨‍🍳', status: 'ready', style: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20' },
    { label: 'Cancel ❌', status: 'canceled', style: 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' }
  ],
  ready: [
    { label: 'Dispatch 🚚', status: 'on_the_way', style: 'bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20' },
    { label: 'Cancel ❌', status: 'canceled', style: 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' }
  ],
  on_the_way: [
    { label: 'Mark Delivered ✅', status: 'delivered', style: 'bg-accent/10 border-accent/20 text-accent hover:bg-accent/20' },
    { label: 'Cancel ❌', status: 'canceled', style: 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' }
  ],
  delivered: [
    { label: 'Exchange Requested 🔄', status: 'exchange', style: 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20' },
    { label: 'Returned ↩️', status: 'returned', style: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400 hover:bg-zinc-500/20' }
  ]
};

export default function ShopOrdersPanel() {
  const [orders, setOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [historyDayOffset, setHistoryDayOffset] = useState(0); // 0=today, 1=yesterday, etc.
  const [activeTab, setActiveTab] = useState<'list' | 'ratio'>('list');
  const [selectedParentCategoryId, setSelectedParentCategoryId] = useState<string | null>(null);
  const [ratioStatusFilter, setRatioStatusFilter] = useState<string>('active'); // active = new + ready

  const load = async () => {
    setLoading(true);
    try {
      const [ordersData, categoriesData] = await Promise.all([
        fetch('/api/shop/orders').then(r => r.json()),
        fetch('/api/shop/categories').then(r => r.json())
      ]);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (err) {
      console.error('Failed to load shop order panel data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const categoriesMap = useMemo(() => {
    const map = new Map<string, any>();
    categories.forEach(c => map.set(c.id, c));
    return map;
  }, [categories]);

  const ratioData = useMemo(() => {
    const filteredOrders = orders.filter(o => {
      if (o.status === 'canceled' || o.status === 'cancelled') return false;
      if (ratioStatusFilter === 'new') return o.status === 'new';
      if (ratioStatusFilter === 'ready') return o.status === 'ready';
      if (ratioStatusFilter === 'active') return o.status === 'new' || o.status === 'ready';
      if (ratioStatusFilter === 'all_active') return o.status === 'new' || o.status === 'ready' || o.status === 'on_the_way';
      return true; // 'all' (excluding cancelled)
    });

    const parentMap: Record<string, {
      id: string;
      name: string;
      totalQty: number;
      subCategories: Record<string, {
        id: string;
        name: string;
        totalQty: number;
        products: Record<string, {
          id: string;
          name: string;
          mainImage: string;
          totalQty: number;
          sizes: Record<string, number>;
        }>
      }>
    }> = {};

    // Pre-populate parent categories
    categories.forEach(c => {
      if (!c.parentId) {
        parentMap[c.id] = {
          id: c.id,
          name: c.name,
          totalQty: 0,
          subCategories: {}
        };
      }
    });

    filteredOrders.forEach(order => {
      (order.items || []).forEach((item: any) => {
        const product = item.product;
        if (!product) return;

        const category = product.category;
        if (!category) return;

        const qty = item.quantity || 0;
        const sizeLabel = item.sizeLabel || 'Unknown';

        let parentId = category.parentId;
        let parentName = '';
        let subId = category.id;
        let subName = category.name;

        if (parentId) {
          parentName = categoriesMap.get(parentId)?.name || 'Other Parent';
        } else {
          parentId = category.id;
          parentName = category.name;
          subId = 'direct';
          subName = 'General';
        }

        // Initialize parent if it wasn't pre-populated (e.g. category not in main list)
        if (!parentMap[parentId]) {
          parentMap[parentId] = {
            id: parentId,
            name: parentName,
            totalQty: 0,
            subCategories: {}
          };
        }
        parentMap[parentId].totalQty += qty;

        // Initialize subcategory
        if (!parentMap[parentId].subCategories[subId]) {
          parentMap[parentId].subCategories[subId] = {
            id: subId,
            name: subName,
            totalQty: 0,
            products: {}
          };
        }
        parentMap[parentId].subCategories[subId].totalQty += qty;

        // Initialize product
        const productId = item.productId;
        if (!parentMap[parentId].subCategories[subId].products[productId]) {
          parentMap[parentId].subCategories[subId].products[productId] = {
            id: productId,
            name: product.name || 'Product',
            mainImage: product.mainImage || '',
            totalQty: 0,
            sizes: {}
          };
        }
        parentMap[parentId].subCategories[subId].products[productId].totalQty += qty;

        // Add size quantity
        parentMap[parentId].subCategories[subId].products[productId].sizes[sizeLabel] = 
          (parentMap[parentId].subCategories[subId].products[productId].sizes[sizeLabel] || 0) + qty;
      });
    });

    // Convert into sorted arrays
    const parentList = Object.values(parentMap).map(parent => {
      const subCategoriesList = Object.values(parent.subCategories).map(sub => {
        const productsList = Object.values(sub.products).map(prod => {
          const sizesList = Object.entries(prod.sizes).map(([label, qty]) => ({
            label,
            qty,
            ratio: prod.totalQty > 0 ? (qty / prod.totalQty) : 0
          })).sort((a, b) => b.qty - a.qty);

          return {
            ...prod,
            sizes: sizesList,
            ratioInSub: sub.totalQty > 0 ? (prod.totalQty / sub.totalQty) : 0
          };
        }).sort((a, b) => b.totalQty - a.totalQty);

        return {
          ...sub,
          products: productsList,
          ratioInParent: parent.totalQty > 0 ? (sub.totalQty / parent.totalQty) : 0
        };
      }).sort((a, b) => b.totalQty - a.totalQty);

      return {
        ...parent,
        subCategories: subCategoriesList
      };
    }).sort((a, b) => b.totalQty - a.totalQty);

    return parentList;
  }, [orders, categoriesMap, ratioStatusFilter, categories]);

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
  const viewRevenue = viewOrders.filter(o => o.status !== 'canceled' && o.status !== 'cancelled').reduce((s: number, o: any) => s + (o.total ?? 0), 0);
  const viewCount = viewOrders.filter(o => o.status !== 'canceled' && o.status !== 'cancelled').length;

  const todayOrders = byDay[todayStr] ?? [];
  const todayRevenue = todayOrders.filter(o => o.status !== 'canceled' && o.status !== 'cancelled').reduce((s: number, o: any) => s + (o.total ?? 0), 0);
  const lifetimeRevenue = orders.filter(o => o.status !== 'canceled' && o.status !== 'cancelled').reduce((s: number, o: any) => s + (o.total ?? 0), 0);

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-accent" /></div>;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Tab Switcher ── */}
      <div className="flex gap-2 p-1.5 bg-[var(--panel-bg)] rounded-2xl border border-[var(--panel-border)] w-fit shrink-0">
        <button
          onClick={() => {
            setActiveTab('list');
            setSelectedParentCategoryId(null);
          }}
          className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
            activeTab === 'list' ? 'bg-accent text-black shadow-md' : 'text-[var(--muted)] hover:text-foreground'
          }`}
        >
          📋 Orders List
        </button>
        <button
          onClick={() => setActiveTab('ratio')}
          className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all ${
            activeTab === 'ratio' ? 'bg-accent text-black shadow-md' : 'text-[var(--muted)] hover:text-foreground'
          }`}
        >
          📊 Order Ratio
        </button>
      </div>

      {activeTab === 'list' ? (
        <>
          {/* ── Stats Row ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Lifetime Revenue" value={`৳${lifetimeRevenue.toLocaleString()}`} sub={`${orders.length} total orders`} color="text-accent" bg="bg-accent/10" border="border-accent/20" icon={TrendingUp} />
            <StatCard label="Today's Revenue" value={`৳${todayRevenue.toLocaleString()}`} sub={`${todayOrders.filter(o => o.status !== 'canceled' && o.status !== 'cancelled').length} orders today`} color="text-emerald-400" bg="bg-emerald-400/10" border="border-emerald-400/20" icon={Calendar} />
            <StatCard label="Pending Orders" value={orders.filter(o => o.status === 'new' || o.status === 'pending').length.toString()} sub="Awaiting action" color="text-yellow-400" bg="bg-yellow-400/10" border="border-yellow-400/20" icon={Clock} />
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
                            {TRANSITIONS[order.status]?.map(t => (
                              <button key={t.status} onClick={() => updateStatus(order.id, t.status)} disabled={isUpdating}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all disabled:opacity-40 flex items-center gap-1.5 ${t.style}`}>
                                {isUpdating ? <Loader2 size={12} className="animate-spin" /> : null}
                                {t.label}
                              </button>
                            ))}
                            {(!TRANSITIONS[order.status] || TRANSITIONS[order.status].length === 0) && (
                              <span className="text-xs text-[var(--muted)] italic font-bold">Terminal status ({order.status}) - No transitions available</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* ── Ratio Aggregation View ── */
        <div className="flex flex-col gap-6">
          {/* Header & Filter Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg md:text-2xl font-black">Order Ratio Analysis</h2>
              <p className="text-sm text-[var(--muted)]">Style demand breakdown to optimize production.</p>
            </div>
            <div className="flex items-center gap-2 bg-[var(--panel-bg)] border border-[var(--panel-border)] px-4 py-2.5 rounded-2xl shrink-0">
              <ListFilter size={15} className="text-accent" />
              <span className="text-xs font-bold text-[var(--muted)]">Status Filter:</span>
              <select
                value={ratioStatusFilter}
                onChange={e => setRatioStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-black outline-none border-none cursor-pointer pr-4 text-white"
              >
                <option value="active" className="bg-[#121212] text-white">Active (New + Ready)</option>
                <option value="new" className="bg-[#121212] text-white">New Only</option>
                <option value="ready" className="bg-[#121212] text-white">Ready Only</option>
                <option value="all_active" className="bg-[#121212] text-white">All Active (New + Ready + Dispatch)</option>
                <option value="all" className="bg-[#121212] text-white">All Orders (excl. Cancelled)</option>
              </select>
            </div>
          </div>

          {selectedParentCategoryId === null ? (
            /* Parent Categories List */
            <div className="flex flex-col gap-4">
              <div className="px-1"><h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Parent Categories</h3></div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ratioData.map(parent => (
                  <button
                    key={parent.id}
                    onClick={() => setSelectedParentCategoryId(parent.id)}
                    className="glass-panel border border-[var(--panel-border)] hover:border-accent/40 rounded-3xl p-5 text-left flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                        <FolderOpen className="text-accent" size={20} />
                      </div>
                      <div>
                        <h4 className="font-black text-base text-white group-hover:text-accent transition-colors">{parent.name}</h4>
                        <p className="text-xs text-[var(--muted)] font-bold">{parent.totalQty} items ordered</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-[var(--muted)] group-hover:text-accent transition-colors" />
                  </button>
                ))}
                {ratioData.length === 0 && (
                  <p className="text-sm text-[var(--muted)] italic col-span-full text-center py-10">No categories found.</p>
                )}
              </div>
            </div>
          ) : (() => {
            const parentCat = ratioData.find(p => p.id === selectedParentCategoryId);
            if (!parentCat) return null;

            return (
              <div className="flex flex-col gap-6">
                {/* Back & Breadcrumb Row */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <button
                    onClick={() => setSelectedParentCategoryId(null)}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--panel-bg)] hover:bg-[var(--panel-bg-hover)] border border-[var(--panel-border)] text-xs font-bold text-white hover:text-accent rounded-xl transition-all"
                  >
                    <ArrowLeft size={14} /> Back to Categories
                  </button>
                  <div className="flex items-center gap-2">
                    <PieChart size={16} className="text-accent" />
                    <span className="text-sm font-black text-white">{parentCat.name}</span>
                    <span className="text-xs text-[var(--muted)] font-bold">({parentCat.totalQty} pcs total)</span>
                  </div>
                </div>

                {/* Subcategories Ratio Detail */}
                <div className="flex flex-col gap-6">
                  {parentCat.subCategories.map((sub: any) => (
                    <div key={sub.id} className="glass-panel border border-[var(--panel-border)] rounded-3xl p-5 md:p-6 flex flex-col gap-5 bg-black/10">
                      {/* Subcategory Header */}
                      <div className="flex items-center justify-between border-b border-[var(--panel-border)]/50 pb-3">
                        <div className="flex items-center gap-2">
                          <Tag size={15} className="text-purple-400" />
                          <h3 className="font-black text-base md:text-lg text-white">{sub.name}</h3>
                        </div>
                        <span className="text-xs font-black bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-full">
                          {sub.totalQty} pcs ({Math.round(sub.ratioInParent * 100)}% of parent)
                        </span>
                      </div>

                      {/* Products List under this subcategory */}
                      <div className="flex flex-col gap-6 divide-y divide-[var(--panel-border)]/30">
                        {sub.products.map((prod: any, pIdx: number) => (
                          <div key={prod.id} className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${pIdx > 0 ? 'pt-5' : ''}`}>
                            {/* Product Info & Thumbnail */}
                            <div className="flex items-center gap-4 min-w-[240px] max-w-md">
                              {prod.mainImage ? (
                                <img src={prod.mainImage} alt={prod.name} className="w-12 h-14 rounded-xl object-cover bg-neutral-900 border border-white/10 shrink-0" />
                              ) : (
                                <div className="w-12 h-14 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-center shrink-0">
                                  <ShoppingBag size={16} className="text-[var(--muted)]" />
                                </div>
                              )}
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-sm text-white line-clamp-2">{prod.name}</span>
                                <span className="text-xs text-[var(--muted)] font-bold">
                                  Total: {prod.totalQty} pcs ({Math.round(prod.ratioInSub * 100)}% of subcategory)
                                </span>
                              </div>
                            </div>

                            {/* Sizes breakdown with progress bars */}
                            <div className="flex flex-col gap-2 flex-1 max-w-xl">
                              {prod.sizes.map((size: any) => (
                                <div key={size.label} className="flex items-center gap-3">
                                  <span className="font-mono text-xs text-[var(--muted)] w-8 text-right font-black">{size.label}</span>
                                  <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${size.ratio * 100}%` }}></div>
                                  </div>
                                  <span className="text-xs font-black text-white w-12 text-right">{size.qty} pcs</span>
                                  <span className="text-[10px] text-[var(--muted)] w-10 text-right">({Math.round(size.ratio * 100)}%)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {sub.products.length === 0 && (
                          <p className="text-sm text-[var(--muted)] italic">No products ordered in this subcategory.</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {parentCat.subCategories.length === 0 && (
                    <div className="glass-panel border border-[var(--panel-border)] rounded-3xl p-10 text-center">
                      <p className="text-sm text-[var(--muted)] italic">No orders found for this category under the selected filter status.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
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
