'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Users, ChevronLeft, LogIn, UserPlus, Plus, Loader2,
  Wallet, UserCircle2, Trash2, Edit3, Check, X,
  MapPin, Search, MessageSquare, Bell, Pencil, MessageCircle,
} from 'lucide-react';
import { getCookie } from '@/lib/cookies';
import { getSupabaseClient } from '@/lib/supabaseRealtime';
import { PostListingModal } from '@/components/play/PostListingModal';
import { LookForPlayersTab } from '@/components/play/LookForPlayersTab';
import { GroupRequestsTab } from '@/components/play/GroupRequestsTab';
import { ChatPanel, MyRequestsPanel } from '@/components/play/PlayComponents';

// ─── Guest Gate ────────────────────────────────────────────────────────────────
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
            Create a group, find players, split turf costs — all in one place.
          </p>
        </div>
        <div className="flex flex-col w-full max-w-xs gap-3">
          <a href={`/${locale}/login`} className="w-full py-3.5 rounded-2xl bg-cyan-500 text-black font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_20px_rgba(6,182,212,0.3)]">
            <LogIn size={16} /> Sign In
          </a>
          <a href={`/${locale}/register`} className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
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
  const [playerName, setPlayerName] = useState('');

  useEffect(() => {
    const auth = document.cookie.includes('bmt_auth=');
    const role  = getCookie('bmt_role');
    if (!auth || (role && role !== 'player')) { setIsAuthed(false); return; }
    setIsAuthed(true);
    setPlayerId(getCookie('bmt_player_id') || '');
    setPlayerName(getCookie('bmt_name') || '');
  }, []);

  if (isAuthed === null) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
    </div>
  );
  if (!isAuthed) return <GuestGate locale={locale} />;
  return <PlayApp locale={locale} playerId={playerId} playerName={playerName} router={router} />;
}

// ─── Play App ─────────────────────────────────────────────────────────────────
function PlayApp({ locale, playerId, playerName, router }: { locale: string; playerId: string; playerName: string; router: any }) {
  const [mainTab, setMainTab] = useState<'group' | 'find'>('group');
  const [subTab, setSubTab]   = useState<'members' | 'chat' | 'requests'>('members');

  // My requests panel (for players who sent join requests)
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [myRequestCount, setMyRequestCount] = useState(0);

  // Load my-requests count on mount (join requests + pending payment requests)


  // Group state
  const [group, setGroup]               = useState<any>(null);
  const [groupLoading, setGroupLoading] = useState(true);
  const [creating, setCreating]         = useState(false);

  // Group name editing
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput]     = useState('');
  const [savingName, setSavingName]   = useState(false);

  // Player search
  const [searchQ, setSearchQ]               = useState('');
  const [searchResults, setSearchResults]   = useState<any[]>([]);
  const [searching, setSearching]           = useState(false);
  const [adding, setAdding]                 = useState<string | null>(null);

  // Split editing
  const [editingSplit, setEditingSplit] = useState<string | null>(null);
  const [splitInput, setSplitInput]     = useState('');
  // memberIds that have a pending split request (owner sent cost, awaiting player acceptance)
  const [splitPendingSet, setSplitPendingSet] = useState<Set<string>>(new Set());

  // Listing modal
  const [showListingModal, setShowListingModal] = useState(false);

  // ── Load group ───────────────────────────────────────────────────────────
  const loadGroup = useCallback(async () => {
    setGroupLoading(true);
    try {
      const res = await fetch('/api/play/my');
      if (res.ok) { const d = await res.json(); setGroup(d.group ?? null); }
    } catch {}
    setGroupLoading(false);
  }, []);

  useEffect(() => { loadGroup(); }, [loadGroup]);

  // Fetch player requests counts
  const fetchMyRequests = useCallback(async () => {
    Promise.all([
      fetch('/api/play/my-requests').then(r => r.json()).catch(() => ({ requests: [] })),
      fetch('/api/play/split-requests').then(r => r.json()).catch(() => ({ splitRequests: [] })),
    ]).then(([joinData, splitData]) => {
      setMyRequestCount((joinData.requests ?? []).length + (splitData.splitRequests ?? []).length);
    });
  }, []);

  useEffect(() => {
    if (playerId) fetchMyRequests();
  }, [playerId, fetchMyRequests]);

  // ── Listen for Group Booking Redirect ──
  useEffect(() => {
    if (!group?.id) return;
    const supabase = getSupabaseClient();
    const ch = supabase.channel(`play-group:${group.id}`);
    ch.on('broadcast', { event: 'group_booked' }, (payload) => {
      // Navigate all members (including owner) to bookings history
      router.push(`/${locale}/book?tab=history`);
    }).subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [group?.id, locale, router]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/play/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      if (res.ok) { const d = await res.json(); setGroup(d.group); }
    } catch {}
    setCreating(false);
  };

  const handleRename = async () => {
    if (!group || !nameInput.trim()) { setEditingName(false); return; }
    setSavingName(true);
    const res = await fetch(`/api/play/groups/${group.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'rename', name: nameInput.trim() }),
    });
    if (res.ok) { const d = await res.json(); setGroup(d.group); }
    setEditingName(false);
    setSavingName(false);
  };

  const handleSearch = useCallback(async (q: string) => {
    setSearchQ(q);
    if (q.length < 3) { setSearchResults([]); return; }
    setSearching(true);
    const d = await fetch(`/api/players/search?q=${encodeURIComponent(q)}`).then(r => r.json());
    setSearchResults((d.players || []).filter((p: any) => p.id !== playerId));
    setSearching(false);
  }, [playerId]);

  const handleAdd = async (targetId: string) => {
    if (!group) return;
    setAdding(targetId);
    const res = await fetch(`/api/play/groups/${group.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_member', playerId: targetId }),
    });
    if (res.ok) { const d = await res.json(); setGroup(d.group); setSearchResults([]); setSearchQ(''); }
    setAdding(null);
  };

  const handleRemove = async (memberId: string) => {
    if (!group) return;
    const res = await fetch(`/api/play/groups/${group.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_member', memberId }),
    });
    if (res.ok) { const d = await res.json(); setGroup(d.group); }
  };

  const handleSaveSplit = async (memberId: string) => {
    if (!group) return;
    const amount = parseFloat(splitInput);
    if (isNaN(amount) || amount < 0) { setEditingSplit(null); return; }
    const res = await fetch(`/api/play/groups/${group.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_split', memberId, amount }),
    });
    if (res.ok) {
      const d = await res.json();
      setGroup(d.group);
      if (!d.immediate) {
        // Payment request was sent — track this member as pending
        setSplitPendingSet(prev => new Set([...prev, memberId]));
      }
    }
    setEditingSplit(null);
  };

  const handleDisband = async () => {
    if (!group || !confirm('Disband this group? This cannot be undone.')) return;
    await fetch(`/api/play/groups/${group.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'disband' }),
    });
    setGroup(null);
  };

  const isOwner = group && group.ownerId === playerId;
  const totalSplit = group?.members?.reduce((s: number, m: any) => s + (m.splitAmount || 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-[#080808] text-white pb-32 flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-md border-b border-white/5 px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.push(`/${locale}/arena`)}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Users size={18} className="text-cyan-400 shrink-0" />
            <h1 className="font-black text-xl truncate">Play with Friends</h1>
          </div>
          {/* Requested button — shows when player has sent any requests */}
          {myRequestCount > 0 && (
            <button
              onClick={() => setShowMyRequests(true)}
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 font-black text-[11px] hover:bg-white/10 active:scale-95 transition-all shrink-0"
            >
              <MessageCircle size={13} className="text-cyan-400" />
              <span>Requested</span>
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-cyan-500 text-black text-[9px] font-black flex items-center justify-center">
                {myRequestCount > 9 ? '9+' : myRequestCount}
              </span>
            </button>
          )}
        </div>

        {/* 2 main tabs */}
        <div className="flex gap-1.5 bg-white/5 p-1 rounded-2xl">
          {([['group', 'My Group'], ['find', 'Find Players']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setMainTab(k)}
              className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                mainTab === k ? 'bg-cyan-500 text-black shadow-[0_0_16px_rgba(6,182,212,0.4)]' : 'text-neutral-400 hover:text-white'
              }`}>{l}</button>
          ))}
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 px-4 pt-4">

        {/* ══ MY GROUP ══ */}
        {mainTab === 'group' && (
          groupLoading ? (
            <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-cyan-400" /></div>
          ) : !group ? (
            // No group
            <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
              <div className="w-20 h-20 rounded-3xl bg-cyan-500/10 border-2 border-dashed border-cyan-500/30 flex items-center justify-center">
                <Users size={36} className="text-cyan-400/60" />
              </div>
              <div>
                <h2 className="text-xl font-black">No Active Group</h2>
                <p className="text-sm text-neutral-500 mt-1 max-w-[240px] mx-auto">Create a group to add friends, chat, and split turf costs.</p>
              </div>
              <button onClick={handleCreate} disabled={creating}
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-cyan-500 text-black font-black hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50">
                {creating ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Create Group
              </button>
            </div>
          ) : (
            // Group exists
            <div className="flex flex-col gap-4">

              {/* Group header card */}
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {editingName ? (
                      <div className="flex items-center gap-2">
                        <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditingName(false); }}
                          className="flex-1 bg-neutral-900 border border-cyan-500/50 rounded-lg px-3 py-1.5 text-sm font-black text-white focus:outline-none" />
                        <button onClick={handleRename} disabled={savingName} className="text-cyan-400"><Check size={16} /></button>
                        <button onClick={() => setEditingName(false)} className="text-neutral-500"><X size={16} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="font-black text-sm text-cyan-300 truncate">{group.name || 'My Group'}</p>
                        {isOwner && (
                          <button onClick={() => { setNameInput(group.name || ''); setEditingName(true); }}
                            className="text-neutral-500 hover:text-cyan-400 transition-colors">
                            <Pencil size={11} />
                          </button>
                        )}
                      </div>
                    )}
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      {group.members?.length ?? 0} members · Total split: ৳{totalSplit}
                    </p>
                  </div>
                  {isOwner && (
                    <button onClick={handleDisband} className="flex items-center gap-1.5 text-[10px] text-red-400 font-black uppercase border border-red-500/30 px-2.5 py-1.5 rounded-xl hover:bg-red-500/10 shrink-0">
                      <Trash2 size={11} /> Disband
                    </button>
                  )}
                </div>
              </div>

              {/* Sub-tab pills — Requests only shown to owner */}
              <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl">
                {([
                  ['members', 'Members', Users],
                  ['chat',    'Group Chat', MessageSquare],
                  ...(isOwner ? [['requests', 'Requests', Bell]] as const : []),
                ] as const).map(([k, l, Icon]) => (
                  <button key={k} onClick={() => setSubTab(k as any)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      subTab === k ? 'bg-cyan-500 text-black' : 'text-neutral-400 hover:text-white'
                    }`}>
                    <Icon size={11} />{l}
                  </button>
                ))}
              </div>

              {/* ── Members sub-tab ── */}
              {subTab === 'members' && (
                <div className="flex flex-col gap-3">
                  {/* Member list */}
                  <div className="flex flex-col gap-2">
                    {group.members?.map((m: any) => {
                      const hasPendingSplit = splitPendingSet.has(m.id) || m.splitRequests?.length > 0;
                      return (
                        <div key={m.id} className={`flex items-center gap-3 p-3 border rounded-2xl transition-colors ${
                          hasPendingSplit && m.playerId !== playerId
                            ? 'bg-yellow-500/5 border-yellow-500/20'
                            : 'bg-white/[0.03] border-white/5'
                        }`}>
                          <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                            {m.player?.avatarUrl ? <img src={m.player.avatarUrl} className="w-full h-full object-cover" alt="" /> : <UserCircle2 size={20} className="text-neutral-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-sm truncate">
                              {m.player?.fullName}
                              {m.playerId === group.ownerId && <span className="ml-1.5 text-[8px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full">Owner</span>}
                              {hasPendingSplit && m.playerId !== playerId && (
                                <span className="ml-1.5 text-[8px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">⏳ Awaiting payment</span>
                              )}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Wallet size={10} className="text-neutral-500" />
                              {isOwner && editingSplit === m.id ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] text-neutral-400">৳</span>
                                  <input autoFocus type="number" value={splitInput} onChange={e => setSplitInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleSaveSplit(m.id); if (e.key === 'Escape') setEditingSplit(null); }}
                                    className="w-20 bg-neutral-800 border border-cyan-500/40 rounded-md px-2 py-0.5 text-xs text-white focus:outline-none" />
                                  <button onClick={() => handleSaveSplit(m.id)} className="text-cyan-400"><Check size={13} /></button>
                                  <button onClick={() => setEditingSplit(null)} className="text-neutral-500"><X size={13} /></button>
                                </div>
                              ) : (
                                <span
                                  onClick={() => { if (isOwner) { setEditingSplit(m.id); setSplitInput(String(m.splitAmount || 0)); } }}
                                  className={`text-[11px] font-bold ${m.splitAmount > 0 ? 'text-cyan-400' : 'text-neutral-600'} ${isOwner ? 'cursor-pointer hover:text-cyan-300' : ''}`}>
                                  ৳{m.splitAmount || 0} split{isOwner && <Edit3 size={9} className="inline ml-1 opacity-50" />}
                                </span>
                              )}
                            </div>
                          </div>
                          {isOwner && m.playerId !== playerId && (
                            <button onClick={() => handleRemove(m.id)} className="w-7 h-7 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500/20">
                              <X size={13} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add player — owner only */}
                  {isOwner && (
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] text-neutral-500 font-black uppercase tracking-widest">Add Player</p>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                        {searching && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 animate-spin" />}
                        <input type="text" placeholder="Search by name or phone..." value={searchQ} onChange={e => handleSearch(e.target.value)}
                          className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-9 pr-9 py-3 text-sm focus:outline-none focus:border-cyan-500/50 text-white placeholder:text-neutral-600" />
                      </div>
                      {searchResults.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          {searchResults.map(p => {
                            const alreadyIn = group.members?.some((m: any) => m.playerId === p.id);
                            return (
                              <div key={p.id} className="flex items-center gap-3 p-3 bg-neutral-900 border border-white/5 rounded-xl">
                                <div className="w-9 h-9 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                                  {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" alt="" /> : <UserCircle2 size={18} className="text-neutral-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold truncate">{p.fullName}</p>
                                  <p className="text-[9px] text-neutral-500">{p.email}</p>
                                </div>
                                {alreadyIn ? (
                                  <span className="text-[10px] text-cyan-400 font-black">In group</span>
                                ) : (
                                  <button onClick={() => handleAdd(p.id)} disabled={adding === p.id}
                                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-cyan-500 text-black font-black text-[11px] hover:brightness-110 disabled:opacity-50">
                                    {adding === p.id ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Book turf */}
                  {isOwner && (
                    <button onClick={() => router.push(`/${locale}/book?groupId=${group.id}`)}
                      className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 font-black text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-all mt-1">
                      <MapPin size={16} /> Find Turf &amp; Book (Split Cost)
                    </button>
                  )}
                </div>
              )}

              {/* ── Chat sub-tab ── */}
              {subTab === 'chat' && (
                <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden" style={{ height: '60vh' }}>
                  <ChatPanel
                    channel={`play-group:${group.id}`}
                    fetchUrl={`/api/play/groups/${group.id}/chat`}
                    postUrl={`/api/play/groups/${group.id}/chat`}
                    myId={playerId}
                    myName={playerName}
                  />
                </div>
              )}

              {/* ── Requests sub-tab (owner only) ── */}
              {subTab === 'requests' && isOwner && (
                <GroupRequestsTab
                  playerId={playerId}
                  playerName={playerName}
                  groupMembers={group.members ?? []}
                  onMemberAdded={() => { loadGroup(); }}
                />
              )}

            </div>
          )
        )}

        {/* ══ FIND PLAYERS ══ */}
        {mainTab === 'find' && (
          <LookForPlayersTab playerId={playerId} />
        )}
      </div>

      {/* ── Post Listing FAB ── visible only on My Group > Members for owners ── */}
      {mainTab === 'group' && subTab === 'members' && isOwner && (
        <div className="fixed bottom-[76px] right-4 z-40">
          <button onClick={() => setShowListingModal(true)}
            className="relative flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-cyan-400 text-black font-black text-sm shadow-[0_0_24px_rgba(6,182,212,0.5)] hover:brightness-110 active:scale-95 transition-all">
            <span className="absolute inset-0 rounded-2xl bg-cyan-400/30 animate-ping pointer-events-none" style={{ animationDuration: '2s' }} />
            <Bell size={15} /> Post a Listing
          </button>
        </div>
      )}

      {/* ── Post Listing Modal ── */}
      {showListingModal && group && (
        <PostListingModal
          groupId={group.id}
          onClose={() => setShowListingModal(false)}
          onPosted={() => { setShowListingModal(false); loadGroup(); }}
        />
      )}

      {/* ── My Requests Panel ── */}
      {showMyRequests && (
        <MyRequestsPanel
          myId={playerId}
          myName={playerName}
          onClose={() => setShowMyRequests(false)}
        />
      )}
    </div>
  );
}
