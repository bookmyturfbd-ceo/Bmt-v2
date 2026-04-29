'use client';
import { useState, useCallback, useEffect } from 'react';
import { Loader2, UserCircle2, Check, X, MessageCircle, UserPlus } from 'lucide-react';
import { RankChip, DmModal } from './PlayComponents';

interface Props {
  playerId: string;
  playerName: string;
  groupMembers: any[];          // PlayGroupMember[] from parent — used to detect already-added players
  onMemberAdded: () => void;   // called after promote so parent refreshes group state
}

export function GroupRequestsTab({ playerId, playerName, groupMembers, onMemberAdded }: Props) {
  const [subTab, setSubTab] = useState<'pending' | 'accepted'>('pending');
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [dmRequest, setDmRequest] = useState<any>(null);
  const [promoting, setPromoting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/play/my-listing');
      if (r.ok) { const d = await r.json(); setListing(d.listing ?? null); }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (reqId: string, status: 'ACCEPTED' | 'REJECTED') => {
    setActing(reqId);
    await fetch(`/api/play/requests/${reqId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await load();
    setActing(null);
  };

  const promote = async (reqId: string) => {
    setPromoting(reqId);
    await fetch(`/api/play/requests/${reqId}/promote`, { method: 'POST' });
    // Reload this tab's listing data AND tell parent to refresh group members
    await load();
    onMemberAdded();
    setPromoting(null);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-cyan-400" /></div>;

  if (!listing) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
        <MessageCircle size={28} className="text-neutral-700" />
      </div>
      <p className="font-black text-neutral-500">No active listing</p>
      <p className="text-xs text-neutral-700">Post a listing first so players can request to join.</p>
    </div>
  );

  const pending  = listing.requests?.filter((r: any) => r.status === 'PENDING') ?? [];
  // In the accepted list, only show players NOT already in the group
  const accepted = listing.requests?.filter((r: any) => {
    if (r.status !== 'ACCEPTED') return false;
    return !groupMembers.some((m: any) => m.playerId === r.playerId);
  }) ?? [];
  // Separately track already-added ones so owner knows they're done
  const alreadyAdded = listing.requests?.filter((r: any) => {
    if (r.status !== 'ACCEPTED') return false;
    return groupMembers.some((m: any) => m.playerId === r.playerId);
  }) ?? [];

  const current = subTab === 'pending' ? pending : accepted;

  return (
    <div className="flex flex-col gap-4">
      {/* Listing summary */}
      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-3 flex items-center justify-between">
        <div>
          <p className="font-black text-sm text-cyan-300">{listing.sport} · {listing.date}</p>
          <p className="text-[10px] text-neutral-500 mt-0.5">{listing.turfName || 'No turf set'} · {listing.playersNeeded} still needed</p>
        </div>
        <span className="text-[10px] font-black bg-white/5 border border-white/10 px-2 py-1 rounded-full text-neutral-400">
          {pending.length} pending · {accepted.length} accepted
        </span>
      </div>

      {/* Already-added notice */}
      {alreadyAdded.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center px-1">
          <span className="text-[10px] text-neutral-500">Added to group:</span>
          {alreadyAdded.map((r: any) => (
            <span key={r.id} className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full">
              ✓ {r.player?.fullName}
            </span>
          ))}
        </div>
      )}

      {/* Sub tabs */}
      <div className="flex gap-2 bg-white/5 p-1 rounded-xl">
        {(['pending', 'accepted'] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all ${subTab === t ? 'bg-cyan-500 text-black' : 'text-neutral-400 hover:text-white'}`}>
            {t} {t === 'pending' ? `(${pending.length})` : `(${accepted.length})`}
          </button>
        ))}
      </div>

      {current.length === 0 ? (
        <div className="flex flex-col items-center py-10 gap-2 text-center">
          <p className="text-neutral-600 text-sm font-black">No {subTab} requests</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {current.map((req: any) => (
            <div key={req.id} className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                {req.player?.avatarUrl ? <img src={req.player.avatarUrl} className="w-full h-full object-cover" alt="" /> : <UserCircle2 size={20} className="text-neutral-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm truncate">{req.player?.fullName}</p>
                <div className="flex gap-1 mt-0.5 flex-wrap">
                  {req.player?.footballMmr && <RankChip label="⚽" mmr={req.player.footballMmr} />}
                  {req.player?.cricketMmr && <RankChip label="🏏" mmr={req.player.cricketMmr} />}
                </div>
              </div>
              {subTab === 'pending' ? (
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => act(req.id, 'ACCEPTED')} disabled={acting === req.id}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500 text-black font-black text-[10px] hover:brightness-110 disabled:opacity-50">
                    {acting === req.id ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Accept
                  </button>
                  <button onClick={() => act(req.id, 'REJECTED')} disabled={acting === req.id}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-black text-[10px] hover:bg-red-500/30">
                    <X size={10} /> Reject
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => setDmRequest(req)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 font-black text-[10px] hover:bg-white/10">
                    <MessageCircle size={10} /> Chat
                  </button>
                  <button onClick={() => promote(req.id)} disabled={promoting === req.id}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500 text-black font-black text-[10px] hover:brightness-110 disabled:opacity-50">
                    {promoting === req.id ? <Loader2 size={10} className="animate-spin" /> : <UserPlus size={10} />} Add
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {dmRequest && (
        <DmModal
          request={dmRequest}
          myId={playerId}
          myName={playerName}
          isOwner={true}
          onClose={() => setDmRequest(null)}
          onPromote={() => { load(); onMemberAdded(); setDmRequest(null); }}
        />
      )}
    </div>
  );
}
