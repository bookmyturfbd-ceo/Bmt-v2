'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Send, X, UserCircle2, Check, UserPlus, ChevronLeft, MessageCircle, Clock, Users, BadgeDollarSign } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabaseRealtime';

// ─── Rank chip ────────────────────────────────────────────────────────────────
export function RankChip({ label, mmr }: { label: string; mmr: number }) {
  const color = mmr >= 1400 ? 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10'
    : mmr >= 1200 ? 'text-purple-400 border-purple-400/30 bg-purple-400/10'
    : mmr >= 1100 ? 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10'
    : 'text-neutral-400 border-white/10 bg-white/5';
  return (
    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${color}`}>
      {label} {mmr}
    </span>
  );
}

// ─── Chat panel (shared) ───────────────────────────────────────────────────────
interface ChatMsg { id: string; playerId: string; message: string; createdAt: string; player: { id: string; fullName: string; avatarUrl: string | null } }

interface ChatPanelProps {
  channel: string;        // supabase channel name
  fetchUrl: string;       // GET url for history
  postUrl: string;        // POST url to send
  myId: string;
  myName: string;
}

export function ChatPanel({ channel, fetchUrl, postUrl, myId, myName }: ChatPanelProps) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Stable channel ref — created once, reused for both listen and broadcast
  const chRef = useRef<any>(null);

  // Load history
  useEffect(() => {
    fetch(fetchUrl).then(r => r.json()).then(d => setMsgs(d.messages ?? []));
  }, [fetchUrl]);

  // Subscribe once — self:true so sender also receives via broadcast (no duplicate optimistic)
  useEffect(() => {
    const client = getSupabaseClient();
    const seenIds = new Set<string>();
    const ch = client.channel(channel, { config: { broadcast: { self: true } } });
    chRef.current = ch;
    ch.on('broadcast', { event: 'msg' }, ({ payload }: any) => {
      if (!payload?.id) return;
      if (seenIds.has(payload.id)) return;
      seenIds.add(payload.id);
      setMsgs(prev => prev.some(m => m.id === payload.id) ? prev : [...prev, payload]);
    }).subscribe();
    return () => {
      chRef.current = null;
      client.removeChannel(ch);
    };
  }, [channel]);

  // Scroll to bottom
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const msgText = text.trim();
    setText('');
    try {
      const res = await fetch(postUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msgText }),
      });
      if (res.ok && chRef.current) {
        const d = await res.json();
        // Broadcast on the same persistent channel — no new channel, no race condition
        await chRef.current.send({ type: 'broadcast', event: 'msg', payload: d.message });
      }
    } catch {}
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-3">
        {msgs.length === 0 && <p className="text-center text-neutral-600 text-xs pt-8">No messages yet. Say hi!</p>}
        {msgs.map(m => {
          const mine = m.playerId === myId;
          return (
            <div key={m.id} className={`flex gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-neutral-800 shrink-0 overflow-hidden flex items-center justify-center">
                {m.player?.avatarUrl ? <img src={m.player.avatarUrl} className="w-full h-full object-cover" /> : <UserCircle2 size={14} className="text-neutral-500" />}
              </div>
              <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${mine ? 'bg-cyan-500 text-black rounded-tr-sm' : 'bg-white/5 border border-white/8 rounded-tl-sm'}`}>
                {!mine && <p className="text-[9px] font-black text-neutral-400 mb-0.5">{m.player?.fullName}</p>}
                {m.message}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {/* pb-20 ensures send bar clears the global BottomNav */}
      <div className="flex gap-2 p-3 pb-20 border-t border-white/5 bg-[#080808]">
        <input
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a message..."
          className="flex-1 bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-500/50 text-white placeholder:text-neutral-600"
        />
        <button onClick={send} disabled={sending || !text.trim()}
          className="w-10 h-10 rounded-xl bg-cyan-500 text-black flex items-center justify-center disabled:opacity-40 hover:brightness-110">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}

// ─── DM Modal ────────────────────────────────────────────────────────────────
interface DmModalProps {
  request: any;
  myId: string;
  myName: string;
  isOwner: boolean;
  onClose: () => void;
  onPromote: () => void;
}

export function DmModal({ request, myId, myName, isOwner, onClose, onPromote }: DmModalProps) {
  const [promoting, setPromoting] = useState(false);

  const handlePromote = async () => {
    setPromoting(true);
    await fetch(`/api/play/requests/${request.id}/promote`, { method: 'POST' });
    setPromoting(false);
    onPromote();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#080808]">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/5">
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><X size={16} /></button>
        <div className="flex-1">
          <p className="font-black text-sm">{request.player?.fullName}</p>
          <p className="text-[10px] text-neutral-500">DM Chat</p>
        </div>
        {isOwner && (
          <button onClick={handlePromote} disabled={promoting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500 text-black font-black text-[11px] hover:brightness-110 disabled:opacity-50">
            {promoting ? <Loader2 size={12} className="animate-spin" /> : <UserPlus size={12} />}
            Add to Group
          </button>
        )}
      </div>
      {/* flex-1 + overflow-hidden, ChatPanel internal pb-20 clears BottomNav */}
      <div className="flex-1 overflow-hidden">
        <ChatPanel
          channel={`play-dm:${request.id}`}
          fetchUrl={`/api/play/requests/${request.id}/chat`}
          postUrl={`/api/play/requests/${request.id}/chat`}
          myId={myId}
          myName={myName}
        />
      </div>
    </div>
  );
}

// ─── My Requests Panel ────────────────────────────────────────────────────────
// Shows a player's own sent requests. Accepted ones show a Chat button that
// opens DmModal (as the requester side). If promoted to group member, the
// group appears automatically on the My Group tab on next load.
interface MyRequestsPanelProps {
  myId: string;
  myName: string;
  onClose: () => void;
}

export function MyRequestsPanel({ myId, myName, onClose }: MyRequestsPanelProps) {
  const [requests, setRequests] = useState<any[]>([]);
  const [splitRequests, setSplitRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openChat, setOpenChat] = useState<any>(null);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rJoin, rSplit] = await Promise.all([
        fetch('/api/play/my-requests'),
        fetch('/api/play/split-requests'),
      ]);
      if (rJoin.ok) { const d = await rJoin.json(); setRequests(d.requests ?? []); }
      if (rSplit.ok) { const d = await rSplit.json(); setSplitRequests(d.splitRequests ?? []); }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const actOnSplit = async (id: string, action: 'accept' | 'reject') => {
    setActing(id);
    await fetch(`/api/play/split-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    await load();
    setActing(null);
  };

  const accepted = requests.filter(r => r.status === 'ACCEPTED');
  const pending  = requests.filter(r => r.status === 'PENDING');
  const rejected = requests.filter(r => r.status === 'REJECTED');

  // If a DM chat is open, render it full-screen on top
  if (openChat) {
    return (
      <DmModal
        request={openChat}
        myId={myId}
        myName={myName}
        isOwner={false}
        onClose={() => setOpenChat(null)}
        onPromote={() => { load(); setOpenChat(null); }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#080808]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/5 sticky top-0 bg-[#080808]/95 backdrop-blur-md">
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1">
          <p className="font-black text-sm">My Requests</p>
          <p className="text-[10px] text-neutral-500">{requests.length} requests · {splitRequests.length} payment{splitRequests.length !== 1 ? 's' : ''} pending</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4 flex flex-col gap-5">
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 size={28} className="animate-spin text-cyan-400" />
          </div>
        )}

        {!loading && requests.length === 0 && splitRequests.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Users size={28} className="text-neutral-700" />
            </div>
            <p className="font-black text-neutral-500">No requests yet</p>
            <p className="text-xs text-neutral-700">Find a listing and request to join!</p>
          </div>
        )}

        {/* ── Payment Requests (split cost allocation from owner) ── */}
        {splitRequests.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest flex items-center gap-1">
              <BadgeDollarSign size={11} /> Payment Requests
            </p>
            {splitRequests.map(sr => {
              const owner = sr.group?.owner;
              return (
                <div key={sr.id} className="p-3 rounded-2xl bg-yellow-500/[0.06] border border-yellow-500/20 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                    {owner?.avatarUrl
                      ? <img src={owner.avatarUrl} className="w-full h-full object-cover" alt="" />
                      : <UserCircle2 size={20} className="text-neutral-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate">{owner?.fullName ?? 'Group Owner'}</p>
                    <p className="text-[10px] text-neutral-400 mt-0.5">{sr.group?.name ?? 'Group'} wants you to pay</p>
                    <p className="text-sm font-black text-yellow-400 mt-0.5">৳{sr.amount}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => actOnSplit(sr.id, 'accept')} disabled={acting === sr.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500 text-black font-black text-[10px] hover:brightness-110 disabled:opacity-50">
                      {acting === sr.id ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Accept
                    </button>
                    <button onClick={() => actOnSplit(sr.id, 'reject')} disabled={acting === sr.id}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-black text-[10px] hover:bg-red-500/30 disabled:opacity-50">
                      <X size={10} /> Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Accepted ── */}
        {accepted.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Accepted — Chat with owner</p>
            {accepted.map(req => {
              const owner = req.listing?.group?.owner;
              const isMember = req.listing?.group?.members?.some((m: any) => m.playerId === myId);
              return (
                <div key={req.id} className="p-3 rounded-2xl bg-cyan-500/[0.06] border border-cyan-500/20 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                    {owner?.avatarUrl
                      ? <img src={owner.avatarUrl} className="w-full h-full object-cover" alt="" />
                      : <UserCircle2 size={20} className="text-neutral-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate">{owner?.fullName ?? 'Group Owner'}</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      {req.listing?.sport?.replace(/_/g, ' ')} · {req.listing?.date ?? ''}
                    </p>
                    {isMember && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-black text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-1.5 py-0.5 rounded-full">
                        ✓ Added to Group
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setOpenChat({ ...req, player: owner })}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500 text-black font-black text-[11px] hover:brightness-110 active:scale-95 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] shrink-0">
                    <MessageCircle size={11} /> Chat
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pending ── */}
        {pending.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Pending</p>
            {pending.map(req => {
              const owner = req.listing?.group?.owner;
              return (
                <div key={req.id} className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                    {owner?.avatarUrl
                      ? <img src={owner.avatarUrl} className="w-full h-full object-cover" alt="" />
                      : <UserCircle2 size={20} className="text-neutral-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate">{owner?.fullName ?? 'Group Owner'}</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      {req.listing?.sport?.replace(/_/g, ' ')} · {req.listing?.date ?? ''}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] font-black text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-2 py-1 rounded-full shrink-0">
                    <Clock size={9} /> Pending
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Rejected ── */}
        {rejected.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-black text-red-400/70 uppercase tracking-widest">Declined</p>
            {rejected.map(req => {
              const owner = req.listing?.group?.owner;
              return (
                <div key={req.id} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3 opacity-60">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                    {owner?.avatarUrl
                      ? <img src={owner.avatarUrl} className="w-full h-full object-cover" alt="" />
                      : <UserCircle2 size={20} className="text-neutral-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm truncate">{owner?.fullName ?? 'Group Owner'}</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">
                      {req.listing?.sport?.replace(/_/g, ' ')} · {req.listing?.date ?? ''}
                    </p>
                  </div>
                  <span className="text-[10px] font-black text-red-400 shrink-0">Declined</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
