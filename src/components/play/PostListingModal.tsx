'use client';
import { useState, useEffect } from 'react';
import { X, Plus, Loader2, MapPin, Shield, ChevronRight } from 'lucide-react';
import { TurfPickerModal } from './TurfPickerModal';
import { RankPickerModal } from './RankPickerModal';

interface Props {
  groupId: string;
  onClose: () => void;
  onPosted: () => void;
}

const TIER_LABELS: Record<number, string> = {
  0: 'Bronze', 675: 'Silver', 1350: 'Gold', 2025: 'Platinum', 2700: 'Legend',
};

export function PostListingModal({ groupId, onClose, onPosted }: Props) {
  const [sports, setSports] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    sport: '',
    playersNeeded: '5',
    date: '',
    description: '',
    // turf / slot (from picker)
    turfId: '',
    turfName: '',
    timeSlot: '',
    // rank (from picker)
    minFootballRank: 0,
    minCricketRank: 0,
    footballRankLabel: '',
    cricketRankLabel: '',
  });
  const [posting, setPosting] = useState(false);
  const [showTurf, setShowTurf] = useState(false);
  const [showRankFootball, setShowRankFootball] = useState(false);
  const [showRankCricket, setShowRankCricket] = useState(false);

  useEffect(() => {
    fetch('/api/bmt/sports').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setSports(d);
    }).catch(() => {});
  }, []);

  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handlePost = async () => {
    if (!form.sport || !form.date) return;
    setPosting(true);
    try {
      const res = await fetch('/api/play/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          sport: form.sport,
          playersNeeded: Number(form.playersNeeded) || 1,
          date: form.date,
          turfName: form.turfName || null,
          timeSlot: form.timeSlot || null,
          minFootballRank: form.minFootballRank > 0 ? form.minFootballRank : null,
          minCricketRank: form.minCricketRank > 0 ? form.minCricketRank : null,
          description: form.description || null,
        }),
      });
      if (res.ok) { onPosted(); onClose(); }
    } catch {}
    setPosting(false);
  };

  const inp = 'w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-cyan-500/50 text-white placeholder:text-neutral-600';
  const canPost = form.sport && form.date;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm pb-[72px]" onClick={onClose}>
        <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-t-3xl flex flex-col" style={{ maxHeight: 'calc(90vh - 72px)' }} onClick={e => e.stopPropagation()}>

          {/* Fixed header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5 shrink-0">
            <h2 className="font-black text-lg">Post a Listing</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><X size={16} /></button>
          </div>

          {/* Scrollable fields */}
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">

            {/* Sport */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Sport *</label>
              <select value={form.sport} onChange={e => set('sport', e.target.value)} className={inp + ' appearance-none'}>
                <option value="">Select a sport...</option>
                {sports.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>

            {/* Players needed */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Players Needed *</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => set('playersNeeded', String(Math.max(1, Number(form.playersNeeded) - 1)))}
                  className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-xl text-white hover:bg-white/10">−</button>
                <span className="flex-1 text-center font-black text-2xl">{form.playersNeeded}</span>
                <button type="button" onClick={() => set('playersNeeded', String(Math.min(22, Number(form.playersNeeded) + 1)))}
                  className="w-11 h-11 rounded-xl bg-cyan-500 flex items-center justify-center font-black text-xl text-black hover:brightness-110">+</button>
              </div>
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Date *</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} className={inp} />
            </div>

            {/* Turf picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Turf &amp; Time Slot</label>
              <button type="button" onClick={() => { if (form.date) setShowTurf(true); }}
                className={`flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all ${
                  form.turfName
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-white'
                    : 'bg-neutral-900 border-white/10 text-neutral-500 hover:border-white/20'
                } ${!form.date ? 'opacity-40 cursor-not-allowed' : ''}`}>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className={form.turfName ? 'text-cyan-400' : ''} />
                  {form.turfName ? (
                    <span className="text-sm font-bold">{form.turfName} · {form.timeSlot}</span>
                  ) : (
                    <span className="text-sm">{form.date ? 'Select turf & slot...' : 'Pick a date first'}</span>
                  )}
                </div>
                <ChevronRight size={14} />
              </button>
            </div>

            {/* Min Rank */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Minimum Rank <span className="text-neutral-700">(optional)</span></label>
              <div className="flex gap-2">
                {/* Football */}
                <button type="button" onClick={() => setShowRankFootball(true)}
                  className={`flex-1 flex items-center justify-between px-3 py-3 rounded-xl border transition-all ${
                    form.minFootballRank > 0
                      ? 'bg-yellow-500/10 border-yellow-500/30 text-white'
                      : 'bg-neutral-900 border-white/10 text-neutral-500 hover:border-white/20'
                  }`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">⚽</span>
                    <span className="text-xs font-bold">{form.footballRankLabel || 'Any'}</span>
                  </div>
                  <Shield size={12} className={form.minFootballRank > 0 ? 'text-yellow-400' : ''} />
                </button>
                {/* Cricket */}
                <button type="button" onClick={() => setShowRankCricket(true)}
                  className={`flex-1 flex items-center justify-between px-3 py-3 rounded-xl border transition-all ${
                    form.minCricketRank > 0
                      ? 'bg-cyan-500/10 border-cyan-500/30 text-white'
                      : 'bg-neutral-900 border-white/10 text-neutral-500 hover:border-white/20'
                  }`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">🏏</span>
                    <span className="text-xs font-bold">{form.cricketRankLabel || 'Any'}</span>
                  </div>
                  <Shield size={12} className={form.minCricketRank > 0 ? 'text-cyan-400' : ''} />
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Description <span className="text-neutral-700">(optional)</span></label>
              <textarea rows={2} placeholder="Any extra info for potential players..." value={form.description}
                onChange={e => set('description', e.target.value)}
                className={inp + ' resize-none'} />
            </div>

            {/* Spacer so content isn't hidden under sticky button */}
            <div className="h-2" />
          </div>

          {/* Sticky Post button — always visible, never under nav */}
          <div className="px-5 py-4 border-t border-white/5 bg-[#111] shrink-0">
            <button onClick={handlePost} disabled={posting || !canPost}
              className="w-full py-4 rounded-2xl bg-cyan-500 text-black font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-40">
              {posting ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Post Listing
            </button>
          </div>

        </div>
      </div>

      {/* Nested modals */}
      {showTurf && (
        <div className="fixed inset-0 z-[60]">
          <TurfPickerModal
            date={form.date}
            onSelect={slot => {
              setForm(f => ({
                ...f,
                turfId: slot.turfId,
                turfName: slot.turfName,
                timeSlot: `${slot.startTime} – ${slot.endTime}`,
              }));
              setShowTurf(false);
            }}
            onClose={() => setShowTurf(false)}
          />
        </div>
      )}
      {showRankFootball && (
        <div className="fixed inset-0 z-[60]">
          <RankPickerModal
            sport="football"
            currentMmr={form.minFootballRank}
            onSelect={(mmr, label) => setForm(f => ({ ...f, minFootballRank: mmr, footballRankLabel: label }))}
            onClose={() => setShowRankFootball(false)}
          />
        </div>
      )}
      {showRankCricket && (
        <div className="fixed inset-0 z-[60]">
          <RankPickerModal
            sport="cricket"
            currentMmr={form.minCricketRank}
            onSelect={(mmr, label) => setForm(f => ({ ...f, minCricketRank: mmr, cricketRankLabel: label }))}
            onClose={() => setShowRankCricket(false)}
          />
        </div>
      )}
    </>
  );
}
