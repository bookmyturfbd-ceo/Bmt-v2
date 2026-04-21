'use client';
import { useEffect, useState } from 'react';
import { Users, Building2, TrendingUp, Wallet, Trophy, ShoppingBag, Briefcase, UserCheck, BadgeDollarSign, CalendarCheck2 } from 'lucide-react';

interface Player  { id: string; joinedAt: string; banStatus?: string; }
interface Turf    { id: string; status: string; }
interface Booking { id: string; slotId: string; price?: number; bmtCut?: number; ownerShare?: number; }
interface Slot    { id: string; price: number; }
interface WalletRequest { id: string; amount: number; status: string; }
interface Owner   { id: string; walletBalance?: number; pendingBmtCut?: number; }
interface MonthlyFee { id: string; amount: number; paid: boolean; }
interface ShopOrder { id: string; total: number; status: string; }
interface ChallengePayment { id: string; amount: number; }

export default function AdminStatsGrid() {
  const [players,     setPlayers]     = useState<Player[]>([]);
  const [turfs,       setTurfs]       = useState<Turf[]>([]);
  const [bookings,    setBookings]    = useState<Booking[]>([]);
  const [slots,       setSlots]       = useState<Slot[]>([]);
  const [wallets,     setWallets]     = useState<WalletRequest[]>([]);
  const [owners,      setOwners]      = useState<Owner[]>([]);
  const [monthlyFees, setMonthlyFees] = useState<MonthlyFee[]>([]);
  const [shopOrders,  setShopOrders]  = useState<ShopOrder[]>([]);
  const [cmPayments,  setCmPayments]  = useState<ChallengePayment[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/bmt/players').then(r => r.json()),
      fetch('/api/bmt/turfs').then(r => r.json()),
      fetch('/api/bmt/bookings').then(r => r.json()),
      fetch('/api/bmt/slots').then(r => r.json()),
      fetch('/api/bmt/wallet-requests').then(r => r.json()),
      fetch('/api/bmt/owners').then(r => r.json()),
      fetch('/api/bmt/monthly-fees').then(r => r.json()),
      fetch('/api/shop/orders').then(r => r.json()),
      fetch('/api/admin/challenge-market').then(r => r.json()).then(d => d.payments ?? []).catch(() => []),
    ]).then(([ps, ts, bs, ss, ws, os, mf, so, cm]) => {
      setPlayers(Array.isArray(ps) ? ps : []);
      setTurfs(Array.isArray(ts) ? ts : []);
      setBookings(Array.isArray(bs) ? bs : []);
      setSlots(Array.isArray(ss) ? ss : []);
      setWallets(Array.isArray(ws) ? ws : []);
      setOwners(Array.isArray(os) ? os : []);
      setMonthlyFees(Array.isArray(mf) ? mf : []);
      setShopOrders(Array.isArray(so) ? so : []);
      setCmPayments(Array.isArray(cm) ? cm : []);
    });
  }, []);

  const today        = new Date().toISOString().split('T')[0];
  const activePlayers = players.filter(p => !p.banStatus || p.banStatus === 'none').length;
  const joinedToday  = players.filter(p => p.joinedAt === today).length;
  const activeTurfs  = turfs.filter(t => t.status === 'published' || t.status === 'approved').length;

  // Gross = sum of all booking prices
  const grossRevenue = bookings.reduce((s, b) => {
    const slot = slots.find(sl => sl.id === b.slotId);
    return s + (b.price ?? slot?.price ?? 0);
  }, 0);

  // BMT profit = sum of pendingBmtCut on all owners (accumulated on each booking)
  // + sum of already disbursed bmtCut (from payouts entity — which we don't load here, keep it simple)
  const pendingBmtCut = owners.reduce((s, o) => s + (o.pendingBmtCut ?? 0), 0);
  // Also sum from booking records (for bookings where bmtCut is stored directly)
  const bmtCutFromBookings = bookings.reduce((s, b) => s + (b.bmtCut ?? 0), 0);
  // Use whichever is non-zero (pendingBmtCut on owners is the authoritative source)
  const bmtProfit    = pendingBmtCut || bmtCutFromBookings;

  const walletRevenue = wallets.filter(w => w.status === 'approved').reduce((s, w) => s + w.amount, 0);

  // Lifetime monthly fee revenue = all paid monthly fee records
  const lifetimeMonthlyRevenue = monthlyFees.filter(f => f.paid).reduce((s, f) => s + f.amount, 0);
  const totalMonthlyFees       = monthlyFees.length;
  const paidMonthlyFees        = monthlyFees.filter(f => f.paid).length;

  const stats = [
    {
      label: 'Active Players',       value: activePlayers.toLocaleString(),
      sub: `+${joinedToday} joined today`,   icon: Users,           color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20',
    },
    {
      label: 'Active Turfs',         value: activeTurfs.toLocaleString(),
      sub: `${turfs.length} total registered`,  icon: Building2,       color: 'text-accent',      bg: 'bg-accent/10',      border: 'border-accent/20',
    },
    {
      label: 'Gross Turf Revenue',   value: `৳${grossRevenue.toLocaleString()}`,
      sub: 'Total before cuts',      icon: TrendingUp,      color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20',
    },
    {
      label: 'BMT Profit (% Cut)',   value: `৳${bmtProfit.toLocaleString()}`,
      sub: 'Booking commission cut', icon: BadgeDollarSign, color: 'text-yellow-400',  bg: 'bg-yellow-400/10',  border: 'border-yellow-400/20',
    },
    {
      label: 'Monthly Fee Revenue',  value: `৳${lifetimeMonthlyRevenue.toLocaleString()}`,
      sub: `${paidMonthlyFees} of ${totalMonthlyFees} fees collected (all-time)`,
      icon: CalendarCheck2,          color: 'text-sky-400',     bg: 'bg-sky-400/10',     border: 'border-sky-400/20',
    },
    {
      label: 'Wallet Recharged',     value: `৳${walletRevenue.toLocaleString()}`,
      sub: `${wallets.filter(w => w.status === 'approved').length} approved`,  icon: Wallet, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20',
    },
    {
      label: 'Challenge Market',     value: `৳${cmPayments.reduce((s, p) => s + p.amount, 0).toLocaleString()}`,
      sub: `${cmPayments.length} subscription payments`,
      icon: Trophy, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20',
    },
    {
      label: 'Shop Revenue',         value: `৳${shopOrders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0).toLocaleString()}`,
      sub: `${shopOrders.filter(o => o.status !== 'cancelled').length} orders`,
      icon: ShoppingBag, color: 'text-pink-400', bg: 'bg-pink-400/10', border: 'border-pink-400/20',
    },
    {
      label: 'Pro Commission',       value: '৳0',
      sub: 'Coming soon',            icon: Briefcase,       color: 'text-cyan-400',    bg: 'bg-cyan-400/10',    border: 'border-cyan-400/20',   placeholder: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(s => {
        const Icon = s.icon;
        return (
          <div key={s.label} className={`glass-panel rounded-2xl p-5 flex flex-col gap-3 border ${s.border} ${'placeholder' in s && s.placeholder ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] leading-tight">{s.label}</p>
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center border ${s.border} shrink-0`}>
                <Icon size={16} className={s.color} />
              </div>
            </div>
            <div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-[var(--muted)] mt-0.5">{s.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
