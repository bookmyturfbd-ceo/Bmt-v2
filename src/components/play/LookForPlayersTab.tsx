'use client';
import { useState, useCallback, useEffect } from 'react';
import { Loader2, Users, Clock, MapPin, Shield, UserCircle2, Trash2 } from 'lucide-react';
import { RankChip } from './PlayComponents';

interface Props {
  playerId: string;
  myGroupOwnerId?: string; // ownerId of my group (if I own one with a listing)
  onRefresh?: () => void;
}

export function LookForPlayersTab({ playerId, onRefresh }: Props) {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [joined, setJoined] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/play/listings');
      if (r.ok) { const d = await r.json(); setListings(d.listings ?? []); }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const join = async (listingId: string) => {
    setJoining(listingId);
    try {
      const r = await fetch('/api/play/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });
      if (r.ok) setJoined(prev => new Set([...prev, listingId]));
    } catch {}
    setJoining(null);
  };

  const remove = async (listingId: string) => {
    setRemoving(listingId);
    try {
      await fetch(`/api/play/listings/${listingId}`, { method: 'DELETE' });
      await load();
      onRefresh?.();
    } catch {}
    setRemoving(null);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-cyan-400" /></div>;

  if (listings.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-20 h-20 rounded-3xl bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center">
        <Users size={36} className="text-neutral-700" />
      </div>
      <p className="font-black text-neutral-500">No listings yet</p>
      <p className="text-xs text-neutral-700">Be the first — post a listing from your group.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {listings.map((l: any) => {
        const isOwn = l.group?.ownerId === playerId;
        const alreadyJoined = joined.has(l.id);
        const sportLabel = l.sport?.replace(/_/g, ' ');

        return (
          <div key={l.id} className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col gap-3">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                  {l.group?.owner?.avatarUrl
                    ? <img src={l.group.owner.avatarUrl} className="w-full h-full object-cover" alt="" />
                    : <UserCircle2 size={18} className="text-neutral-500" />}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-sm truncate">{l.group?.owner?.fullName ?? 'Unknown'}&apos;s Group</p>
                  <p className="text-[10px] text-cyan-400 font-bold mt-0.5">{sportLabel}</p>
                </div>
              </div>
              <span className="shrink-0 text-[11px] font-black bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-2.5 py-1 rounded-full">
                {l.playersNeeded} needed
              </span>
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap gap-2 text-[10px] text-neutral-400">
              {l.date && (
                <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                  <Clock size={9} />{l.date}
                </span>
              )}
              {l.turfName && (
                <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                  <MapPin size={9} />{l.turfName}
                </span>
              )}
              {l.timeSlot && (
                <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
                  {l.timeSlot}
                </span>
              )}
            </div>

            {/* Min rank badges */}
            {(l.minFootballRank || l.minCricketRank) && (
              <div className="flex items-center gap-1.5">
                <Shield size={10} className="text-neutral-500" />
                <span className="text-[9px] text-neutral-500 font-black uppercase tracking-wider">Min Rank:</span>
                {l.minFootballRank && <RankChip label="⚽" mmr={l.minFootballRank} />}
                {l.minCricketRank && <RankChip label="🏏" mmr={l.minCricketRank} />}
              </div>
            )}

            {l.description && <p className="text-xs text-neutral-400 leading-relaxed">{l.description}</p>}

            {/* Action button */}
            {isOwn ? (
              <button onClick={() => remove(l.id)} disabled={removing === l.id}
                className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-black text-[11px] flex items-center justify-center gap-1.5 hover:bg-red-500/20 transition-all disabled:opacity-50">
                {removing === l.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Remove Listing
              </button>
            ) : alreadyJoined ? (
              <div className="w-full py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-black text-[11px] flex items-center justify-center">
                ✓ Request Sent
              </div>
            ) : (
              <button onClick={() => join(l.id)} disabled={joining === l.id}
                className="w-full py-2.5 rounded-xl bg-cyan-500 text-black font-black text-[11px] flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] disabled:opacity-50">
                {joining === l.id ? <Loader2 size={12} className="animate-spin" /> : null}
                Request to Join
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
