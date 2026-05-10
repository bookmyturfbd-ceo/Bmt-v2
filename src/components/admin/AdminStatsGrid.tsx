'use client';
import { useEffect, useState } from 'react';
import { Users, Building2, TrendingUp, Wallet, Trophy, ShoppingBag, Briefcase, UserCheck, BadgeDollarSign, CalendarCheck2 } from 'lucide-react';

export default function AdminStatsGrid() {
  const [statsData, setStatsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => {
        setStatsData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load stats', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className="h-32 glass-panel rounded-2xl bg-[var(--panel-bg)] opacity-50" />
        ))}
      </div>
    );
  }

  const {
    activePlayers = 0,
    joinedToday = 0,
    totalTurfs = 0,
    activeTurfs = 0,
    grossRevenue = 0,
    bmtProfit = 0,
    walletRevenue = 0,
    walletApprovedCount = 0,
    lifetimeMonthlyRevenue = 0,
    totalMonthlyFees = 0,
    paidMonthlyFees = 0,
    shopOrdersRevenue = 0,
    shopOrdersCount = 0,
    cmPaymentsRevenue = 0,
    cmPaymentsCount = 0
  } = statsData || {};

  const stats = [
    {
      label: 'Active Players',       value: activePlayers.toLocaleString(),
      sub: `+${joinedToday} joined today`,   icon: Users,           color: 'text-blue-400',    bg: 'bg-blue-400/10',    border: 'border-blue-400/20',
    },
    {
      label: 'Active Turfs',         value: activeTurfs.toLocaleString(),
      sub: `${totalTurfs} total registered`,  icon: Building2,       color: 'text-accent',      bg: 'bg-accent/10',      border: 'border-accent/20',
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
      sub: `${walletApprovedCount} approved`,  icon: Wallet, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20',
    },
    {
      label: 'Challenge Market',     value: `৳${cmPaymentsRevenue.toLocaleString()}`,
      sub: `${cmPaymentsCount} subscription payments`,
      icon: Trophy, color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20',
    },
    {
      label: 'Shop Revenue',         value: `৳${shopOrdersRevenue.toLocaleString()}`,
      sub: `${shopOrdersCount} orders`,
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
