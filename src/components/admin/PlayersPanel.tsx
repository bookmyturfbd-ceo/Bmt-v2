'use client';
import { useState, useEffect, useCallback } from 'react';
import { Users, Search, RefreshCw, Shield, Ban, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface PlayerWithStats {
  id: string; fullName: string; email: string; phone: string; joinedAt: string;
  walletBalance?: number; banStatus?: 'none' | 'soft' | 'perma'; banUntil?: string;
  avatarUrl?: string;
  recharged: number;
  spent: number;
}

export default function PlayersPanel() {
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'soft' | 'perma'>('all');
  
  const [expanded, setExpanded] = useState<string | null>(null);
  const [banDays, setBanDays]   = useState<Record<string, string>>({});
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/players?page=${page}&limit=20&search=${encodeURIComponent(search)}&status=${filterStatus}`);
      const d = await res.json();
      if (d.data) {
        setPlayers(d.data);
        setTotalPages(d.totalPages || 1);
        setTotalPlayers(d.total || 0);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [page, search, filterStatus]);

  useEffect(() => {
    // Debounce search
    const t = setTimeout(() => { load(); }, 300);
    return () => clearTimeout(t);
  }, [load]);

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [search, filterStatus]);

  const applyBan = async (id: string, banStatus: 'soft' | 'perma' | 'none') => {
    setActionId(id);
    const now = new Date();
    const patch: any = { banStatus };
    if (banStatus === 'soft') {
      const days = parseInt(banDays[id] || '3');
      now.setDate(now.getDate() + days);
      patch.banUntil = now.toISOString();
    } else {
      patch.banUntil = null;
    }
    await fetch(`/api/bmt/players/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    setActionId(null);
    await load();
  };

  const statusBadge = (p: PlayerWithStats) => {
    if (p.banStatus === 'perma') return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400">Perma Banned</span>;
    if (p.banStatus === 'soft' && p.banUntil && new Date(p.banUntil) > new Date()) return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400">Soft Ban</span>;
    return <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-accent/10 border border-accent/30 text-accent">Active</span>;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black">Players ({totalPlayers})</h2>
          <p className="text-sm text-[var(--muted)] mt-0.5">Manage all registered players, bans, and activity.</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-xs font-bold hover:opacity-80 disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email or phone…"
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
      {loading && players.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-[var(--muted)]"><RefreshCw size={16} className="animate-spin mr-2" /> Loading…</div>
      ) : players.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center border border-dashed border-[var(--panel-border)] rounded-2xl">
          <Users size={28} className="text-[var(--muted)]" />
          <p className="font-bold text-[var(--muted)]">No players found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {players.map(p => {
            const isExp = expanded === p.id;
            const isBanned = p.banStatus === 'soft' || p.banStatus === 'perma';
            return (
              <div key={p.id} className={`glass-panel border rounded-2xl overflow-hidden transition-colors ${p.banStatus === 'perma' ? 'border-red-500/20' : p.banStatus === 'soft' ? 'border-orange-500/20' : 'border-[var(--panel-border)]'}`}>
                {/* Row */}
                <div className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                      {p.avatarUrl
                        ? <img src={p.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        : <span className="text-sm font-black text-accent">{p.fullName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}</span>}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-sm truncate">{p.fullName}</p>
                        {statusBadge(p)}
                      </div>
                      <p className="text-[10px] text-[var(--muted)] truncate">{p.email}</p>
                      <p className="text-[10px] text-[var(--muted)] truncate">{p.phone}</p>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 shrink-0 text-right">
                    <div><p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Joined</p><p className="text-xs font-bold">{new Date(p.joinedAt).toLocaleDateString()}</p></div>
                    <div><p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Recharged</p><p className="text-xs font-black text-accent">৳{p.recharged.toLocaleString()}</p></div>
                    <div><p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Spent</p><p className="text-xs font-black text-blue-400">৳{p.spent.toLocaleString()}</p></div>
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
                      <div><p className="text-[9px] text-[var(--muted)] font-black uppercase tracking-widest">Joined</p><p className="font-bold">{new Date(p.joinedAt).toLocaleDateString()}</p></div>
                      <div><p className="text-[9px] text-[var(--muted)] font-black uppercase tracking-widest">Recharged</p><p className="font-black text-accent">৳{p.recharged.toLocaleString()}</p></div>
                      <div><p className="text-[9px] text-[var(--muted)] font-black uppercase tracking-widest">Spent</p><p className="font-black text-blue-400">৳{p.spent.toLocaleString()}</p></div>
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 border-t border-[var(--panel-border)] pt-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--panel-border)] text-xs font-bold text-[var(--muted)] hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button 
              disabled={page === totalPages} 
              onClick={() => setPage(p => p + 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--panel-border)] text-xs font-bold text-[var(--muted)] hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
