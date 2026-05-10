'use client';
import { useState, useEffect, useCallback } from 'react';
import { getCookie } from '@/lib/cookies';
import { CalendarCheck2, Banknote, Building2, RefreshCw } from 'lucide-react';

export default function OwnerStatsGrid() {
  const [lifetimeBookings, setLifetimeBookings] = useState<number | null>(null);
  const [lifetimeIncome, setLifetimeIncome]     = useState<number | null>(null);
  const [activeTurfs, setActiveTurfs]           = useState<number | null>(null);
  const [loading, setLoading]                   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const ownerId = getCookie('bmt_owner_id');
    const [ts, ss, bs] = await Promise.all([
      fetch('/api/bmt/turfs').then(r => r.json()),
      fetch('/api/bmt/slots').then(r => r.json()),
      fetch('/api/bmt/bookings').then(r => r.json()),
    ]);
    const turfs    = Array.isArray(ts) ? ts : [];
    const slots    = Array.isArray(ss) ? ss : [];
    const bookings = Array.isArray(bs) ? bs : [];

    const myTurfs   = turfs.filter((t: any) => t.ownerId === ownerId);
    const myTurfIds = new Set(myTurfs.map((t: any) => t.id));
    const mySlots   = slots.filter((s: any) => myTurfIds.has(s.turfId));
    const mySlotIds = new Set(mySlots.map((s: any) => s.id));
    const myBkgs    = bookings.filter((b: any) => mySlotIds.has(b.slotId));

    const income = myBkgs.reduce((sum: number, b: any) => {
      const slot = mySlots.find((s: any) => s.id === b.slotId);
      return sum + (b.price ?? slot?.price ?? 0);
    }, 0);

    setActiveTurfs(myTurfs.length);
    setLifetimeBookings(myBkgs.length);
    setLifetimeIncome(income);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmtNum = (n: number | null) => n === null ? '—' : n.toLocaleString();

  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Overview</h2>
          <p className="text-sm text-[var(--muted)] mt-0.5">Lifetime stats across all your turfs.</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-xs font-bold hover:opacity-80 transition-all disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active Turfs */}
        <div className="glass-panel border border-[var(--panel-border)] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Active Turfs</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Building2 size={15} className="text-blue-400" />
            </div>
          </div>
          <span className="text-4xl font-black text-blue-400 leading-none">
            {loading ? <span className="w-12 h-9 rounded-lg bg-white/5 animate-pulse inline-block" /> : fmtNum(activeTurfs)}
          </span>
          <p className="text-[10px] text-[var(--muted)]">Published & approved</p>
        </div>

        {/* Lifetime Bookings */}
        <div className="glass-panel border border-[var(--panel-border)] rounded-2xl p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Lifetime Bookings</span>
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
              <CalendarCheck2 size={15} className="text-accent" />
            </div>
          </div>
          <span className="text-4xl font-black text-accent leading-none">
            {loading ? <span className="w-12 h-9 rounded-lg bg-white/5 animate-pulse inline-block" /> : fmtNum(lifetimeBookings)}
          </span>
          <p className="text-[10px] text-[var(--muted)]">All time, all turfs</p>
        </div>

        {/* Lifetime Income */}
        <div className="glass-panel border border-accent/20 rounded-2xl p-5 flex flex-col gap-3"
          style={{ background: 'linear-gradient(135deg, rgba(0,255,65,0.06), transparent)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-accent/60">Lifetime Income</span>
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
              <Banknote size={15} className="text-accent" />
            </div>
          </div>
          <span className="text-4xl font-black text-accent leading-none">
            {loading
              ? <span className="w-20 h-9 rounded-lg bg-accent/10 animate-pulse inline-block" />
              : `৳${fmtNum(lifetimeIncome)}`}
          </span>
          <p className="text-[10px] text-accent/50">Paid & confirmed</p>
        </div>
      </div>
    </div>
  );
}
