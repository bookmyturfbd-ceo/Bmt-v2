'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  ArrowLeft, Trophy, Users, Calendar, ChevronRight, Loader2,
  Flag, ShieldCheck, Lock, Unlock, Clock, X, MapPin, Zap,
} from 'lucide-react';

// ── helpers ───────────────────────────────────────────────────────────────────
function getRegStatus(t: any): 'open' | 'countdown' | 'closed' {
  const now = Date.now();
  if (t.isRegistrationOpen) return 'open';
  if (t.registrationOpenAt) {
    return new Date(t.registrationOpenAt).getTime() > now ? 'countdown' : 'open';
  }
  if (['REGISTRATION_OPEN', 'ACTIVE'].includes(t.status)) return 'open';
  return 'closed';
}

function useCountdown(target: string | null): string {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setLabel('Opening…'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLabel(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  return label;
}

// ── Registration pill ─────────────────────────────────────────────────────────
function RegPill({ t }: { t: any }) {
  const status = getRegStatus(t);
  const cdLabel = useCountdown(status === 'countdown' ? t.registrationOpenAt : null);

  if (status === 'open') {
    return (
      <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
        <Unlock size={9} /> Open
      </span>
    );
  }
  if (status === 'countdown') {
    return (
      <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 animate-pulse">
        <Clock size={9} /> {cdLabel}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-500">
      <Lock size={9} /> Closed
    </span>
  );
}

// ── Detail modal ──────────────────────────────────────────────────────────────
function TournamentModal({ t, onClose, isBmt }: { t: any; onClose: () => void; isBmt: boolean }) {
  const status = getRegStatus(t);
  const cdLabel = useCountdown(status === 'countdown' ? t.registrationOpenAt : null);
  const accent = isBmt ? 'yellow' : 'violet';

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-zinc-950 border border-white/10 rounded-t-3xl sm:rounded-3xl flex flex-col">
        {/* Banner / header */}
        <div className={`relative h-40 shrink-0 overflow-hidden rounded-t-3xl sm:rounded-t-3xl bg-gradient-to-br ${
          isBmt ? 'from-yellow-900/60 to-zinc-950' : 'from-violet-900/60 to-zinc-950'
        }`}>
          {t.bannerImageUrl && (
            <img src={t.bannerImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 border border-white/10 flex items-center justify-center hover:bg-black/70 transition-colors"
          >
            <X size={16} />
          </button>
          <div className="absolute bottom-4 left-5 right-16">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">
              {t.sport} · {t.formatType?.replace(/_/g, ' ')}
            </p>
            <h2 className="text-xl font-black text-white leading-tight">{t.name}</h2>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-5">
          {/* Registration status hero */}
          {status === 'countdown' && (
            <div className={`rounded-2xl bg-amber-500/10 border border-amber-500/20 p-5 text-center`}>
              <p className="text-xs font-black uppercase tracking-widest text-amber-400/70 mb-2">
                Registration Opens In
              </p>
              <p className="text-4xl font-black text-amber-400 tabular-nums tracking-tight">
                {cdLabel}
              </p>
              <p className="text-xs text-amber-400/50 mt-2 font-bold">
                {new Date(t.registrationOpenAt).toLocaleString()}
              </p>
            </div>
          )}

          {status === 'open' && (
            <button className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm ${
              isBmt
                ? 'bg-yellow-500 text-black hover:brightness-110'
                : 'bg-violet-500 text-white hover:brightness-110'
            } transition-all active:scale-[0.98]`}>
              Join Tournament
            </button>
          )}

          {status === 'closed' && (
            <div className="rounded-2xl bg-zinc-900 border border-white/5 p-4 text-center">
              <Lock size={20} className="text-neutral-600 mx-auto mb-1.5" />
              <p className="text-sm font-black text-neutral-500">Registration Closed</p>
              <p className="text-xs text-neutral-600 mt-0.5 font-bold">The organizer hasn't opened registration yet.</p>
            </div>
          )}

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Teams', value: `${t._count?.registrations || 0} / ${t.maxParticipants}` },
              { label: 'Entry Fee', value: t.entryFee === 0 ? 'Free' : `৳${t.entryFee.toLocaleString()}` },
              { label: 'Prize Pool', value: t.prizePoolTotal > 0 ? `৳${t.prizePoolTotal.toLocaleString()}` : 'Trophy Only' },
              { label: 'Format', value: t.formatType?.replace(/_/g, ' ') },
              ...(t.venue ? [{ label: 'Venue', value: t.venue }] : []),
              ...(t.startDate ? [{ label: 'Starts', value: new Date(t.startDate).toLocaleDateString() }] : []),
            ].map(item => (
              <div key={item.label} className="bg-zinc-900 border border-white/5 rounded-xl p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600 mb-0.5">{item.label}</p>
                <p className="text-sm font-black text-white">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Registered teams */}
          {t._count?.registrations > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3 flex items-center gap-2">
                <Users size={12} /> Registered ({t._count.registrations})
              </p>
              <div className="flex flex-col gap-2">
                {(t.registrations || []).map((r: any, i: number) => (
                  <div key={r.id} className="flex items-center gap-3 bg-zinc-900 border border-white/5 rounded-xl px-4 py-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border ${
                      isBmt ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white truncate">{r.entityId}</p>
                      <p className="text-[10px] text-neutral-500 font-bold">
                        {new Date(r.registeredAt).toLocaleDateString()} · {r.status}
                        {r.entryFeePaid ? ' · ✅ Paid' : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Status badge (for non-registration status) ────────────────────────────────
const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  ACTIVE:       { label: '🔴 Live',     className: 'bg-[#00ff41]/20 text-[#00ff41]' },
  SCHEDULED:    { label: '📅 Scheduled', className: 'bg-yellow-500/20 text-yellow-400' },
  AUCTION_LIVE: { label: '🔨 Auction',  className: 'bg-orange-500/20 text-orange-400' },
};

type OrgTab = 'bmt' | 'open';

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TournamentsPage() {
  const router   = useRouter();
  const pathname = usePathname();

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [orgTab, setOrgTab]           = useState<OrgTab>('bmt');
  const [sport, setSport]             = useState<'all' | 'FOOTBALL' | 'CRICKET'>('all');
  const [selected, setSelected]       = useState<any | null>(null);

  useEffect(() => {
    fetch('/api/arena/tournaments')
      .then(r => r.json())
      .then(data => { if (data.success) setTournaments(data.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const byOrg    = tournaments.filter(t =>
    orgTab === 'bmt' ? t.operatorType === 'PLATFORM' : t.operatorType === 'ORGANIZER'
  );
  const filtered = sport === 'all' ? byOrg : byOrg.filter(t => t.sport === sport);

  const bmtCount  = tournaments.filter(t => t.operatorType === 'PLATFORM').length;
  const openCount = tournaments.filter(t => t.operatorType === 'ORGANIZER').length;
  const isBmt     = orgTab === 'bmt';
  const accent    = isBmt ? 'yellow' : 'violet';

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-white/5 px-4 py-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-black text-xl tracking-tight">Tournaments</h1>
          <p className="text-xs text-[var(--muted)] font-bold">Compete for prizes &amp; MMR</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
          <Trophy size={16} className="text-yellow-400" />
        </div>
      </header>

      <div className="px-4 pt-5 flex flex-col gap-4">

        {/* ── Org Tabs ── */}
        <div className="flex gap-2 bg-zinc-900 border border-white/10 rounded-2xl p-1">
          <button
            onClick={() => setOrgTab('bmt')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
              orgTab === 'bmt'
                ? 'bg-yellow-500 text-black shadow-md'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <Trophy size={15} />
            BMT Official
            {bmtCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${orgTab === 'bmt' ? 'bg-black/20' : 'bg-white/10'}`}>
                {bmtCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setOrgTab('open')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${
              orgTab === 'open'
                ? 'bg-violet-500 text-white shadow-md'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <ShieldCheck size={15} />
            Open Circuit
            {openCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${orgTab === 'open' ? 'bg-white/20' : 'bg-white/10'}`}>
                {openCount}
              </span>
            )}
          </button>
        </div>

        {/* Context blurb */}
        <p className="text-xs text-[var(--muted)] font-bold -mt-1">
          {isBmt
            ? '🏅 Officially organized by BMT — verified prizes & highest integrity.'
            : '🌐 Community-run tournaments organized by verified third-party organizers.'}
        </p>

        {/* ── Sport Filter ── */}
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {(['all', 'FOOTBALL', 'CRICKET'] as const).map(f => (
            <button
              key={f}
              onClick={() => setSport(f)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                sport === f
                  ? isBmt
                    ? 'bg-yellow-500 text-black'
                    : 'bg-violet-500 text-white'
                  : 'bg-zinc-900 border border-white/10 text-[var(--muted)] hover:text-white'
              }`}
            >
              {f === 'all' ? 'All Sports' : f}
            </button>
          ))}
        </div>

        {/* ── Cards ── */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className={`animate-spin w-10 h-10 ${isBmt ? 'text-yellow-400' : 'text-violet-400'}`} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center flex flex-col items-center">
            <Trophy size={56} className="text-neutral-800 mb-4" />
            <h3 className="text-xl font-black text-white mb-2">No Tournaments</h3>
            <p className="text-neutral-500 font-bold text-sm">
              {isBmt
                ? 'BMT has no active events right now. Check back soon!'
                : 'No Open Circuit events yet. Community organizers coming soon!'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map(t => {
              const regStatus = getRegStatus(t);
              const badge = STATUS_BADGE[t.status];
              return (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={`relative w-full rounded-3xl overflow-hidden border ${
                    isBmt ? 'border-yellow-500/20 hover:border-yellow-500/40' : 'border-violet-500/20 hover:border-violet-500/40'
                  } bg-zinc-900 p-5 text-left group transition-all active:scale-[0.99]`}
                >
                  {/* Accent glow */}
                  <div className={`absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l ${
                    isBmt ? 'from-yellow-500/5' : 'from-violet-500/5'
                  } to-transparent pointer-events-none`} />

                  {/* Top row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
                        isBmt
                          ? 'bg-yellow-500/10 border-yellow-500/20'
                          : 'bg-violet-500/10 border-violet-500/20'
                      }`}>
                        {t.bannerImageUrl
                          ? <img src={t.bannerImageUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                          : isBmt
                            ? <Trophy size={22} className="text-yellow-400" />
                            : <ShieldCheck size={22} className="text-violet-400" />
                        }
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <RegPill t={t} />
                          {badge && (
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${badge.className}`}>
                              {badge.label}
                            </span>
                          )}
                        </div>
                        <h3 className={`font-black text-lg text-white leading-tight transition-colors ${
                          isBmt ? 'group-hover:text-yellow-300' : 'group-hover:text-violet-300'
                        }`}>
                          {t.name}
                        </h3>
                        <p className="text-xs text-[var(--muted)] font-bold uppercase tracking-wider mt-0.5">
                          {t.sport} · {t.formatType?.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      size={20}
                      className={`opacity-30 group-hover:opacity-100 transition-all shrink-0 ${
                        isBmt ? 'text-yellow-400' : 'text-violet-400'
                      }`}
                    />
                  </div>

                  {/* Footer row */}
                  <div className="flex items-center gap-5 pt-4 border-t border-white/5 text-xs font-bold text-[var(--muted)]">
                    <div className="flex items-center gap-1.5">
                      <Users size={14} />
                      <span>{t._count?.registrations || 0} / {t.maxParticipants} Teams</span>
                    </div>
                    {t.startDate && (
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} />
                        <span>{new Date(t.startDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {t.prizePoolTotal > 0 && (
                      <div className={`flex items-center gap-1.5 ml-auto ${isBmt ? 'text-yellow-400' : 'text-violet-400'}`}>
                        <Flag size={14} />
                        <span>৳{t.prizePoolTotal.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <TournamentModal
          t={selected}
          isBmt={isBmt}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
