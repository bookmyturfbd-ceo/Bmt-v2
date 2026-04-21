'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Users, ChevronLeft, LogIn, UserPlus, Search, Plus, X, Loader2,
  Wallet, AlertTriangle, UserCircle2, Trash2, Edit3, Check,
  MapPin, Clock, ChevronRight, Shield
} from 'lucide-react';
import { getCookie } from '@/lib/cookies';

// ─── Guest Gate ───────────────────────────────────────────────────────────────
function GuestGate({ locale }: { locale: string }) {
  return (
    <div className="min-h-screen bg-[#080808] flex flex-col pb-24">
      <header className="px-4 pt-5 pb-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Users size={18} className="text-cyan-400" />
        </div>
        <h1 className="font-black text-xl">Play with Friends</h1>
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 text-center">
        <div className="w-24 h-24 rounded-3xl bg-cyan-500/10 border-2 border-dashed border-cyan-500/30 flex items-center justify-center">
          <Users size={40} className="text-cyan-400/60" />
        </div>
        <div>
          <h2 className="text-2xl font-black">Sign in to play</h2>
          <p className="text-sm text-neutral-500 mt-2 leading-relaxed max-w-[260px] mx-auto">
            Create a group, add friends, split turf costs — all in one place.
          </p>
        </div>
        <div className="flex flex-col w-full max-w-xs gap-3">
          <a
            href={`/${locale}/login`}
            className="w-full py-3.5 rounded-2xl bg-cyan-500 text-black font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_20px_rgba(6,182,212,0.3)]"
          >
            <LogIn size={16} /> Sign In
          </a>
          <a
            href={`/${locale}/register`}
            className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
          >
            <UserPlus size={16} /> Create Account
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PlayPage() {
  const router   = useRouter();
  const pathname = usePathname();
  const locale   = pathname.split('/')[1] || 'en';

  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [playerId, setPlayerId] = useState('');

  useEffect(() => {
    const auth = document.cookie.includes('bmt_auth=');
    const role  = getCookie('bmt_role');
    if (!auth || (role && role !== 'player')) {
      setIsAuthed(false);
      return;
    }
    setIsAuthed(true);
    setPlayerId(getCookie('bmt_player_id') || '');
  }, []);

  // Loading
  if (isAuthed === null) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!isAuthed) return <GuestGate locale={locale} />;

  // Logged in — show main UI
  return <PlayWithFriendsApp locale={locale} playerId={playerId} router={router} />;
}

// ─── Main App (authed) ────────────────────────────────────────────────────────
function PlayWithFriendsApp({ locale, playerId, router }: { locale: string; playerId: string; router: any }) {
  const [tab, setTab] = useState<'group' | 'listings'>('group');

  // Group state
  const [group, setGroup]       = useState<any>(null);
  const [groupLoading, setGroupLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Player search
  const [searchQ, setSearchQ]         = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching]     = useState(false);
  const [adding, setAdding]           = useState<string | null>(null);

  // Split editing
  const [editingSplit, setEditingSplit] = useState<string | null>(null);
  const [splitInput, setSplitInput]     = useState('');

  // Listings
  const [listings, setListings]     = useState<any[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);

  // ── Load my current group ──────────────────────────────────────────────
  const loadGroup = useCallback(async () => {
    setGroupLoading(true);
    try {
      const res = await fetch('/api/play/my');
      if (res.ok) {
        const d = await res.json();
        setGroup(d.group ?? null);
      }
    } catch {}
    setGroupLoading(false);
  }, []);

  // ── Load Listings ──────────────────────────────────────────────────────
  const loadListings = useCallback(async () => {
    setListingsLoading(true);
    try {
      const res = await fetch('/api/play/listings');
      if (res.ok) {
        const d = await res.json();
        setListings(d.listings ?? []);
      }
    } catch {}
    setListingsLoading(false);
  }, []);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  useEffect(() => {
    if (tab === 'listings') loadListings();
  }, [tab, loadListings]);

  // ── Create Group ──────────────────────────────────────────────────────
  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/play/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (res.ok) { const d = await res.json(); setGroup(d.group); }
    } catch {}
    setCreating(false);
  };

  // ── Search Players ────────────────────────────────────────────────────
  const handleSearch = useCallback(async (q: string) => {
    setSearchQ(q);
    if (q.length < 3) { setSearchResults([]); return; }
    setSearching(true);
    const d = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`).then(r => r.json());
    setSearchResults((d.players || []).filter((p: any) => p.id !== playerId));
    setSearching(false);
  }, [playerId]);

  // ── Add Member ────────────────────────────────────────────────────────
  const handleAdd = async (targetPlayerId: string) => {
    if (!group) return;
    setAdding(targetPlayerId);
    const res = await fetch(`/api/play/groups/${group.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_member', playerId: targetPlayerId })
    });
    if (res.ok) { const d = await res.json(); setGroup(d.group); setSearchResults([]); setSearchQ(''); }
    setAdding(null);
  };

  // ── Remove Member ─────────────────────────────────────────────────────
  const handleRemove = async (memberId: string) => {
    if (!group) return;
    const res = await fetch(`/api/play/groups/${group.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_member', memberId })
    });
    if (res.ok) { const d = await res.json(); setGroup(d.group); }
  };

  // ── Save Split ────────────────────────────────────────────────────────
  const handleSaveSplit = async (memberId: string) => {
    if (!group) return;
    const amount = parseFloat(splitInput);
    if (isNaN(amount) || amount < 0) { setEditingSplit(null); return; }
    const res = await fetch(`/api/play/groups/${group.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_split', memberId, amount })
    });
    if (res.ok) { const d = await res.json(); setGroup(d.group); }
    setEditingSplit(null);
  };

  // ── Disband ───────────────────────────────────────────────────────────
  const handleDisband = async () => {
    if (!group || !confirm('Disband this group? This cannot be undone.')) return;
    await fetch(`/api/play/groups/${group.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'disband' })
    });
    setGroup(null);
  };

  const isOwner = group && group.ownerId === playerId;
  const totalSplit = group?.members?.reduce((s: number, m: any) => s + (m.splitAmount || 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-[#080808] text-white pb-28 flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-md border-b border-white/5 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => router.push(`/${locale}/arena`)}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Users size={18} className="text-cyan-400" />
            <h1 className="font-black text-xl">Play with Friends</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white/5 p-1 rounded-2xl">
          {([['group', 'Create Group'], ['listings', 'Look for Players']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2.5 rounded-xl text-[12px] font-black uppercase tracking-wider transition-all ${
                tab === key
                  ? 'bg-cyan-500 text-black shadow-[0_0_16px_rgba(6,182,212,0.4)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Create Group Tab ── */}
      {tab === 'group' && (
        <div className="flex-1 px-4 pt-4">
          {groupLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={28} className="animate-spin text-cyan-400" />
            </div>
          ) : !group ? (
            /* No group — prompt to create */
            <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
              <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 border-2 border-dashed border-cyan-500/30 flex items-center justify-center">
                <Users size={36} className="text-cyan-400/60" />
              </div>
              <div>
                <h2 className="text-xl font-black">No Active Group</h2>
                <p className="text-sm text-neutral-500 mt-1 max-w-[240px] mx-auto">Create a group to add friends and split turf booking costs.</p>
              </div>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-cyan-500 text-black font-black hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50"
              >
                {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                Create Group
              </button>
            </div>
          ) : (
            /* Group exists */
            <div className="flex flex-col gap-4">

              {/* Group header */}
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-black text-sm text-cyan-300">Active Group</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">
                    {group.members?.length ?? 0} members · Total split: ৳{totalSplit}
                  </p>
                </div>
                {isOwner && (
                  <button onClick={handleDisband} className="flex items-center gap-1.5 text-[10px] text-red-400 font-black uppercase border border-red-500/30 px-2.5 py-1.5 rounded-xl hover:bg-red-500/10">
                    <Trash2 size={11} /> Disband
                  </button>
                )}
              </div>

              {/* Member list */}
              <div className="flex flex-col gap-2">
                <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Members</p>
                {group.members?.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/5 rounded-2xl">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                      {m.player?.avatarUrl
                        ? <img src={m.player.avatarUrl} className="w-full h-full object-cover" />
                        : <UserCircle2 size={20} className="text-neutral-500" />}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm truncate">
                        {m.player?.fullName}
                        {m.playerId === group.ownerId && <span className="ml-1.5 text-[8px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full">Owner</span>}
                      </p>
                      {/* Split amount */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <Wallet size={10} className="text-neutral-500" />
                        {isOwner && editingSplit === m.id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-neutral-400">৳</span>
                            <input
                              autoFocus
                              type="number"
                              value={splitInput}
                              onChange={e => setSplitInput(e.target.value)}
                              className="w-20 bg-neutral-800 border border-cyan-500/40 rounded-md px-2 py-0.5 text-xs text-white focus:outline-none"
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveSplit(m.id); if (e.key === 'Escape') setEditingSplit(null); }}
                            />
                            <button onClick={() => handleSaveSplit(m.id)} className="text-cyan-400"><Check size={13} /></button>
                            <button onClick={() => setEditingSplit(null)} className="text-neutral-500"><X size={13} /></button>
                          </div>
                        ) : (
                          <span
                            className={`text-[11px] font-bold ${m.splitAmount > 0 ? 'text-cyan-400' : 'text-neutral-600'} ${isOwner ? 'cursor-pointer hover:text-cyan-300' : ''}`}
                            onClick={() => { if (isOwner) { setEditingSplit(m.id); setSplitInput(String(m.splitAmount || 0)); } }}
                          >
                            ৳{m.splitAmount || 0} split
                            {isOwner && <Edit3 size={9} className="inline ml-1 opacity-50" />}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Remove */}
                    {isOwner && m.playerId !== playerId && (
                      <button onClick={() => handleRemove(m.id)} className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add player search — owner only */}
              {isOwner && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Add Player</p>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    {searching && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 animate-spin" />}
                    <input
                      type="text"
                      placeholder="Search by name or phone..."
                      value={searchQ}
                      onChange={e => handleSearch(e.target.value)}
                      className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-9 pr-9 py-3 text-sm focus:outline-none focus:border-cyan-500/50 text-white placeholder:text-neutral-600"
                    />
                  </div>
                  {searchResults.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {searchResults.map(p => {
                        const alreadyIn = group.members?.some((m: any) => m.playerId === p.id);
                        return (
                          <div key={p.id} className="flex items-center gap-3 p-3 bg-neutral-900 border border-white/5 rounded-xl">
                            <div className="w-9 h-9 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                              {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" /> : <UserCircle2 size={18} className="text-neutral-500" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate">{p.fullName}</p>
                              <p className="text-[9px] text-neutral-500">{p.email}</p>
                            </div>
                            {alreadyIn ? (
                              <span className="text-[10px] text-cyan-400 font-black">In group</span>
                            ) : (
                              <button
                                onClick={() => handleAdd(p.id)}
                                disabled={adding === p.id}
                                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-cyan-500 text-black font-black text-[11px] hover:brightness-110 disabled:opacity-50"
                              >
                                {adding === p.id ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                                Add
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              {isOwner && (
                <div className="flex flex-col gap-3 mt-2">
                  <button
                    onClick={() => router.push(`/${locale}/book?groupId=${group.id}`)}
                    className="w-full py-4 rounded-2xl bg-cyan-500 text-black font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                  >
                    <MapPin size={16} /> Find Turf & Book (Split Cost)
                  </button>
                  <button
                    onClick={() => setTab('listings')}
                    className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 font-black text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
                  >
                    <Search size={16} /> Post "Looking for Players"
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Look for Players Tab ── */}
      {tab === 'listings' && (
        <div className="flex-1 px-4 pt-4">
          {listingsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={28} className="animate-spin text-cyan-400" />
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
              <Users size={40} className="text-neutral-700" />
              <p className="font-black text-neutral-500">No listings yet</p>
              <p className="text-xs text-neutral-700">Create a group and post a listing to find players.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {listings.map((l: any) => (
                <div key={l.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-black text-sm">{l.group?.owner?.fullName ?? 'Unknown'}'s Group</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">{l.sport?.replace('_', ' ')}</p>
                    </div>
                    <span className="text-[10px] font-black bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full">
                      {l.playersNeeded} needed
                    </span>
                  </div>
                  {l.description && <p className="text-xs text-neutral-400">{l.description}</p>}
                  <div className="flex items-center gap-3 text-[10px] text-neutral-500">
                    {l.date && <span className="flex items-center gap-1"><Clock size={9} />{l.date}</span>}
                    {l.timeSlot && <span>{l.timeSlot}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
