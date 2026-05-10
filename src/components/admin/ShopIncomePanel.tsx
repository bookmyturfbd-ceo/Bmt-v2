'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Loader2, ShoppingBag, TrendingUp, TrendingDown, DollarSign,
  Package, Calendar, BarChart3, ChevronDown, ChevronRight
} from 'lucide-react';

interface OrderItem {
  id: string;
  sizeLabel: string;
  quantity: number;
  price: number;
  product?: {
    name: string;
    mainImage: string;
    productCost: number;
    marketingCost: number;
    category?: { id: string; name: string; parentId: string | null; };
  };
}

interface Order {
  id: string;
  status: string;
  total: number;
  subtotal: number;
  deliveryCharge: number;
  createdAt: string;
  items: OrderItem[];
}

interface SubcategoryStats {
  catId: string;
  catName: string;
  parentId: string | null;
  revenue: number;
  productCost: number;
  marketingCost: number;
  profit: number;
  unitsSold: number;
}

export default function ShopIncomePanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/shop/orders')
      .then(r => r.json())
      .then(d => { setOrders(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'cancelled'), [orders]);
  const todayOrders = useMemo(() => activeOrders.filter(o => o.createdAt.startsWith(todayStr)), [activeOrders, todayStr]);

  // Aggregate by subcategory (parentId !== null) across all active orders
  const subCatStats = useMemo(() => {
    const map: Record<string, SubcategoryStats> = {};
    activeOrders.forEach(order => {
      order.items.forEach(item => {
        const cat = item.product?.category;
        if (!cat) return;
        if (!map[cat.id]) {
          map[cat.id] = {
            catId: cat.id,
            catName: cat.name,
            parentId: cat.parentId,
            revenue: 0, productCost: 0, marketingCost: 0, profit: 0, unitsSold: 0,
          };
        }
        const rev = item.price * item.quantity;
        const pc = (item.product?.productCost ?? 0) * item.quantity;
        const mc = (item.product?.marketingCost ?? 0) * item.quantity;
        map[cat.id].revenue += rev;
        map[cat.id].productCost += pc;
        map[cat.id].marketingCost += mc;
        map[cat.id].profit += rev - pc - mc;
        map[cat.id].unitsSold += item.quantity;
      });
    });
    return Object.values(map);
  }, [activeOrders]);

  const todaySubCatStats = useMemo(() => {
    const map: Record<string, SubcategoryStats> = {};
    todayOrders.forEach(order => {
      order.items.forEach(item => {
        const cat = item.product?.category;
        if (!cat) return;
        if (!map[cat.id]) {
          map[cat.id] = {
            catId: cat.id, catName: cat.name, parentId: cat.parentId,
            revenue: 0, productCost: 0, marketingCost: 0, profit: 0, unitsSold: 0,
          };
        }
        const rev = item.price * item.quantity;
        const pc = (item.product?.productCost ?? 0) * item.quantity;
        const mc = (item.product?.marketingCost ?? 0) * item.quantity;
        map[cat.id].revenue += rev;
        map[cat.id].productCost += pc;
        map[cat.id].marketingCost += mc;
        map[cat.id].profit += rev - pc - mc;
        map[cat.id].unitsSold += item.quantity;
      });
    });
    return Object.values(map);
  }, [todayOrders]);

  // Separate parent categories vs subcategories
  const parentIds = new Set(subCatStats.filter(s => s.parentId !== null).map(s => s.parentId!));
  const parentCats = subCatStats.filter(s => parentIds.has(s.catId) || s.parentId === null);
  const subCats = subCatStats.filter(s => s.parentId !== null);

  // Group subcats under their parent
  const grouped = useMemo(() => {
    const g: Record<string, SubcategoryStats[]> = {};
    subCats.forEach(s => {
      const key = s.parentId ?? '__none__';
      if (!g[key]) g[key] = [];
      g[key].push(s);
    });
    return g;
  }, [subCats]);

  const lifetimeRevenue = activeOrders.reduce((s, o) => s + o.subtotal, 0);
  const todayRevenue = todayOrders.reduce((s, o) => s + o.subtotal, 0);
  const lifetimeCost = subCatStats.reduce((s, c) => s + c.productCost + c.marketingCost, 0);
  const lifetimeProfit = lifetimeRevenue - lifetimeCost;

  if (loading) return <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin text-accent" /></div>;

  // Render all top-level categories (including orphan subcats) with their children
  const allTopLevel = subCatStats.filter(s => s.parentId === null);
  const hasGrouped = subCats.length > 0;

  const renderSubcatRow = (s: SubcategoryStats, today: SubcategoryStats | undefined) => (
    <div key={s.catId} className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-bg)] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpandedCat(expandedCat === s.catId ? null : s.catId)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/3 transition-colors text-left"
      >
        <div className="flex-1 flex items-center gap-2">
          <Package size={15} className="text-accent shrink-0" />
          <span className="font-black text-sm">{s.catName}</span>
          <span className="text-[10px] bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-[var(--muted)]">
            {s.unitsSold} sold
          </span>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] text-[var(--muted)]">Revenue</span>
            <span className="font-black text-sm">৳{s.revenue.toLocaleString()}</span>
          </div>
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] text-[var(--muted)]">Cost</span>
            <span className="font-black text-sm text-red-400">৳{(s.productCost + s.marketingCost).toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-[var(--muted)]">Profit</span>
            <span className={`font-black text-sm ${s.profit >= 0 ? 'text-accent' : 'text-red-400'}`}>৳{s.profit.toLocaleString()}</span>
          </div>
          {expandedCat === s.catId ? <ChevronDown size={14} className="text-[var(--muted)] shrink-0" /> : <ChevronRight size={14} className="text-[var(--muted)] shrink-0" />}
        </div>
      </button>

      {/* Expanded breakdown */}
      {expandedCat === s.catId && (
        <div className="px-4 pb-4 bg-black/20 border-t border-[var(--panel-border)]/50 pt-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <MiniStat label="Total Revenue" value={`৳${s.revenue.toLocaleString()}`} color="text-white" />
            <MiniStat label="Product Cost" value={`৳${s.productCost.toLocaleString()}`} color="text-red-400" />
            <MiniStat label="Marketing Cost" value={`৳${s.marketingCost.toLocaleString()}`} color="text-orange-400" />
            <MiniStat label="Net Profit" value={`৳${s.profit.toLocaleString()}`} color={s.profit >= 0 ? 'text-accent' : 'text-red-400'} />
            <MiniStat label="Units Sold" value={s.unitsSold.toString()} color="text-blue-400" />
          </div>
          {today && (
            <div className="rounded-xl border border-white/10 bg-white/3 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-2 flex items-center gap-1.5">
                <Calendar size={10} /> Today's Performance
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <MiniStat label="Revenue" value={`৳${today.revenue.toLocaleString()}`} color="text-white" small />
                <MiniStat label="Cost" value={`৳${(today.productCost + today.marketingCost).toLocaleString()}`} color="text-red-400" small />
                <MiniStat label="Profit" value={`৳${today.profit.toLocaleString()}`} color={today.profit >= 0 ? 'text-accent' : 'text-red-400'} small />
                <MiniStat label="Units" value={today.unitsSold.toString()} color="text-blue-400" small />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-6">

      {/* ── Top KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Lifetime Revenue" value={`৳${lifetimeRevenue.toLocaleString()}`} sub={`${activeOrders.length} non-cancelled orders`} color="text-accent" bg="bg-accent/10" border="border-accent/20" icon={TrendingUp} />
        <StatCard label="Daily Revenue" value={`৳${todayRevenue.toLocaleString()}`} sub={`${todayOrders.length} orders today`} color="text-emerald-400" bg="bg-emerald-400/10" border="border-emerald-400/20" icon={Calendar} />
        <StatCard label="Total Cost" value={`৳${lifetimeCost.toLocaleString()}`} sub="Product + marketing costs" color="text-red-400" bg="bg-red-400/10" border="border-red-400/20" icon={TrendingDown} />
        <StatCard label="Total Profit" value={`৳${lifetimeProfit.toLocaleString()}`} sub="Revenue minus all costs" color={lifetimeProfit >= 0 ? 'text-yellow-400' : 'text-red-400'} bg="bg-yellow-400/10" border="border-yellow-400/20" icon={DollarSign} />
      </div>

      {/* ── Category breakdown ── */}
      <div className="glass-panel border border-[var(--panel-border)] rounded-3xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--panel-border)] bg-black/20 flex items-center gap-2">
          <BarChart3 size={16} className="text-accent" />
          <h2 className="font-black">Income by Subcategory</h2>
          <span className="text-xs text-[var(--muted)] ml-auto">Click row to expand breakdown</span>
        </div>

        {subCatStats.length === 0 && (
          <div className="flex flex-col items-center justify-center p-16 text-[var(--muted)]">
            <ShoppingBag size={40} className="opacity-20 mb-4" />
            <p className="font-bold">No sales data yet</p>
          </div>
        )}

        <div className="p-4 flex flex-col gap-3">
          {/* Render grouped under parent (greyed parent header) */}
          {Object.keys(grouped).map(parentId => {
            const parentStat = subCatStats.find(s => s.catId === parentId);
            const children = grouped[parentId];
            return (
              <div key={parentId} className="flex flex-col gap-2">
                {parentStat && (
                  <div className="flex items-center gap-2 px-2 py-1 opacity-50">
                    <ShoppingBag size={12} className="text-[var(--muted)]" />
                    <span className="text-[11px] font-black uppercase tracking-widest text-[var(--muted)]">{parentStat.catName}</span>
                    <div className="flex-1 h-px bg-[var(--panel-border)]" />
                  </div>
                )}
                {children.map(s => {
                  const todaySub = todaySubCatStats.find(t => t.catId === s.catId);
                  return renderSubcatRow(s, todaySub);
                })}
              </div>
            );
          })}

          {/* Orphan subcats (parentId is null but no parent in our data) */}
          {subCats.filter(s => !grouped[s.parentId!]).map(s => {
            const todaySub = todaySubCatStats.find(t => t.catId === s.catId);
            return renderSubcatRow(s, todaySub);
          })}

          {/* Top-level cats with no parent */}
          {allTopLevel.map(s => {
            const todaySub = todaySubCatStats.find(t => t.catId === s.catId);
            return renderSubcatRow(s, todaySub);
          })}
        </div>
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

function MiniStat({ label, value, color, small }: { label: string; value: string; color: string; small?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">{label}</p>
      <p className={`font-black ${small ? 'text-sm' : 'text-base'} ${color}`}>{value}</p>
    </div>
  );
}
