'use client';
import { useState, useEffect, useCallback } from 'react';
import { Users, Search, RefreshCw, Shield, Ban, CheckCircle2, X, Eye, ChevronDown, AlertTriangle } from 'lucide-react';

interface Player {
  id: string; fullName: string; email: string; phone: string; joinedAt: string;
  walletBalance?: number; banStatus?: 'none' | 'soft' | 'perma'; banUntil?: string;
  avatarBase64?: string;
}
interface WalletRequest { id: string; playerId: string; amount: number; status: string; }
interface Booking { id: string; slotId: string; price?: number; playerName?: string; playerId?: string; }
interface Slot { id: string; price: number; }

export default function PlayersPanel() {
  const [players, setPlayers]   = useState<Player[]>([]);
  const [walletReqs, setWalletReqs] = useState<WalletRequest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots]       = useState<Slot[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [banDays, setBanDays]   = useState<Record<string, string>>({});
  const [actionId, setActionId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'soft' | 'perma'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const [ps, wr, bs, ss] = await Promise.all([
      fetch('/api/bmt/players').then(r => r.json()),
      fetch('/api/bmt/wallet-requests').then(r => r.json()),
      fetch('/api/bmt/bookings').then(r => r.json()),
      fetch('/api/bmt/slots').then(r => r.json()),
    ]);
    setPlayers(Array.isArray(ps) ? ps : []);
    setWalletReqs(Array.isArray(wr) ? wr : []);
    setBookings(Array.isArray(bs) ? bs : []);
    setSlots(Array.isArray(ss) ? ss : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const playerStats = (p: Player) => {
    const recharged = walletReqs
      .filter(r => r.playerId === p.id && r.status === 'approved')
      .reduce((s, r) => s + r.amount, 0);
    const spent = bookings
      .filter(b => b.playerId === p.id || b.playerName === p.fullName)
      .reduce((s, b) => {
        const slot = slots.find(sl => sl.id === b.slotId);
        return s + (b.price ?? slot?.price ?? 0);
      }, 0);
    return { recharged, spent };
  };

  const applyBan = async (id: string, banStatus: 'soft' | 'perma' | 'none') => {
    setActionId(id);
    const now = new Date();
    const patch: any = { banStatus };
    if (banStatus === 'soft') {
      const days = parseInt(banDays[id] || '3');
      now.setDate(now.getDate() + days);
      patch.banUntil = now.toISOString();
    } else {
      patch.banUntil = undefined;
    }
    await fetch(`/api/bmt/players/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    setActionId(null);
    await load();
  };

  const today = new Date().toISOString().split('T')[0];

  const filtered = players
    .filter(p => {
      const q = search.toLowerCase();
      return p.fullName.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
    })
    .filter(p => {
      if (filterStatus === 'active') return !p.banStatus || p.banStatus === 'none';
      if (filterStatus === 'soft') return p.banStatus === 'soft';
      if (filterStatus === 'perma') return p.banStatus === 'perma';
      return true;
    })
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));

  const statusBadge = (p: Player) => {
    if (p.banStatus === 'perma') return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400">Perma Banned</span>;
    if (p.banStatus === 'soft' && p.banUntil && new Date(p.banUntil) > new Date()) return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400">Soft Ban</span>;
    return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent">Active</span>;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black">Players</h2>
          <p className="text-sm text-[var(--muted)] mt-0.5">Manage all registered players, bans, and activity.</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-xs font-bold hover:opacity-80 disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Players',  value: players.length,  color: 'text-blue-400' },
          { label: 'Joined Today',   value: players.filter(p => p.joinedAt === today).length, color: 'text-accent' },
          { label: 'Soft Banned',    value: players.filter(p => p.banStatus === 'soft').length, color: 'text-orange-400' },
          { label: 'Perma Banned',   value: players.filter(p => p.banStatus === 'perma').length, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="glass-panel border border-[var(--panel-border)] rounded-2xl p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">{s.label}</p>
            <p className={`text-3xl font-black mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
            className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:border-accent/50 placeholder:text-[var(--muted)] transition-colors" />
        </div>
        <div className="flex gap-2">
          {([['all', 'All'], ['active', 'Active'], ['soft', 'Soft Ban'], ['perma', 'Perma']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilterStatus(k)}
              className={`px-3 py-2 rounded-xl text-xs font-black border transition-all ${filterStatus === k ? 'bg-accent text-black border-accent' : 'border-[var(--panel-border)] text-[var(--muted)] hover:text-white'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Players Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-[var(--muted)]"><RefreshCw size={16} className="animate-spin mr-2" /> Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center border border-dashed border-[var(--panel-border)] rounded-2xl">
          <Users size={28} className="text-[var(--muted)]" />
          <p className="font-bold text-[var(--muted)]">No players found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(p => {
            const { recharged, spent } = playerStats(p);
            const isExp = expanded === p.id;
            const isBanned = p.banStatus === 'soft' || p.banStatus === 'perma';
            return (
              <div key={p.id} className={`glass-panel border rounded-2xl overflow-hidden transition-colors ${p.banStatus === 'perma' ? 'border-red-500/20' : p.banStatus === 'soft' ? 'border-orange-500/20' : 'border-[var(--panel-border)]'}`}>
                {/* Row */}
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                      {p.avatarBase64
                        ? <img src={p.avatarBase64} alt="avatar" className="w-full h-full object-cover" />
                        : <span className="text-sm font-black text-accent">{p.fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}</span>}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-sm truncate">{p.fullName}</p>
                        {statusBadge(p)}
                      </div>
                      <p className="text-[10px] text-[var(--muted)] truncate">{p.email}</p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 shrink-0 text-right">
                    <div><p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Joined</p><p className="text-xs font-bold">{p.joinedAt}</p></div>
                    <div><p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Recharged</p><p className="text-xs font-black text-accent">৳{recharged.toLocaleString()}</p></div>
                    <div><p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Spent</p><p className="text-xs font-black text-blue-400">৳{spent.toLocaleString()}</p></div>
                  </div>
                  <button onClick={() => setExpanded(isExp ? null : p.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--panel-border)] text-xs font-bold text-[var(--muted)] hover:text-white hover:border-white/20 transition-all shrink-0">
                    Actions <ChevronDown size={13} className={`transition-transform ${isExp ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* Expanded actions */}
                {isExp && (
                  <div className="border-t border-[var(--panel-border)] p-4 flex flex-col gap-3 bg-black/20">
                    {/* Mobile stats */}
                    <div className="flex sm:hidden gap-4 text-sm">
                      <div><p className="text-[9px] text-[var(--muted)] font-black uppercase tracking-widest">Joined</p><p className="font-bold">{p.joinedAt}</p></div>
                      <div><p className="text-[9px] text-[var(--muted)] font-black uppercase tracking-widest">Recharged</p><p className="font-black text-accent">৳{recharged.toLocaleString()}</p></div>
                      <div><p className="text-[9px] text-[var(--muted)] font-black uppercase tracking-widest">Spent</p><p className="font-black text-blue-400">৳{spent.toLocaleString()}</p></div>
                    </div>

                    {/* Ban controls */}
                    {p.banStatus !== 'perma' && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] w-full">Soft Ban (auto-unban after X days)</p>
                        <input type="number" min={1} max={365} value={banDays[p.id] || '3'} onChange={e => setBanDays(d => ({ ...d, [p.id]: e.target.value }))}
                          className="w-20 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-orange-500/50 text-center" />
                        <span className="text-xs text-[var(--muted)]">days</span>
                        <button onClick={() => applyBan(p.id, 'soft')} disabled={actionId === p.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-black hover:bg-orange-500/20 transition-colors disabled:opacity-50">
                          {actionId === p.id ? <RefreshCw size={11} className="animate-spin" /> : <Shield size={11} />} Soft Ban
                        </button>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {isBanned && (
                        <button onClick={() => applyBan(p.id, 'none')} disabled={actionId === p.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs font-black hover:bg-accent/20 transition-colors disabled:opacity-50">
                          {actionId === p.id ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Remove Ban
                        </button>
                      )}
                      {p.banStatus !== 'perma' && (
                        <button onClick={() => { if (confirm(`Permanently ban ${p.fullName}? This cannot be undone easily.`)) applyBan(p.id, 'perma'); }}
                          disabled={actionId === p.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-black hover:bg-red-500/20 transition-colors disabled:opacity-50">
                          <Ban size={11} /> Perma Ban
                        </button>
                      )}
                      {p.banStatus === 'perma' && (
                        <button onClick={() => applyBan(p.id, 'none')} disabled={actionId === p.id}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent text-xs font-black hover:bg-accent/20 transition-colors">
                          <CheckCircle2 size={11} /> Lift Perma Ban
                        </button>
                      )}
                    </div>

                    {p.banStatus === 'soft' && p.banUntil && (
                      <p className="text-[10px] text-orange-400/80">Soft ban expires: <strong>{new Date(p.banUntil).toLocaleDateString('en-BD')}</strong></p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
