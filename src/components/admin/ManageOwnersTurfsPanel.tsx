'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Sparkles, Percent, CalendarDays, Check, X,
  Loader2, ChevronDown, ChevronUp, TrendingUp, Banknote, Clock,
  KeyRound, Search, Eye, EyeOff, CheckCircle2, RefreshCw, User,
} from 'lucide-react';
import { useApiEntity } from '@/hooks/useApiEntity';
import GenerateInviteCard from './GenerateInviteCard';

type SubTab = 'owners' | 'invite' | 'passwords';

interface Owner { id: string; name: string; email: string; phone: string; joinedAt?: string; contactPerson?: string; password?: string; }
interface TurfSportEntry { sportId: string; sport: { id: string; name: string }; }
interface Turf  {
  id: string; name: string; ownerId: string; cityId: string; area?: string;
  sports: TurfSportEntry[]; status: string; logoUrl?: string;
  revenueModel?: { type: 'percentage' | 'monthly'; value: number };
  revenueModelType?: string; revenueModelValue?: number;
  createdAt?: string;
}
interface Sport   { id: string; name: string; }
interface City    { id: string; name: string; }
interface Booking { id: string; slotId?: string; turfId?: string; date: string; price?: number; ownerShare?: number; bmtCut?: number; }
interface Slot    { id: string; turfId: string; price: number; }

// ─── Revenue Approval Modal ───────────────────────────────────────────────────
function ApproveModal({ turf, sports: allSports, onClose, onDone }: {
  turf: Turf; sports: Sport[]; onClose: () => void; onDone: () => void;
}) {
  const [type, setType]       = useState<'percentage' | 'monthly'>('percentage');
  const [value, setValue]     = useState('');
  const [saving, setSaving]   = useState(false);
  const [selSports, setSelSports] = useState<string[]>(
    (turf.sports ?? []).map(s => s.sportId)
  );

  const exampleSlot = 5000;
  const preview = type === 'percentage' && value
    ? `From a ৳${exampleSlot} booking you earn ৳${Math.round(exampleSlot * +value / 100)}`
    : type === 'monthly' && value
    ? `You earn ৳${value} per month, regardless of bookings`
    : null;

  const publish = async () => {
    if (!value || +value <= 0) return;
    setSaving(true);
    const res = await fetch(`/api/bmt/turfs/${turf.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'published',
        revenueModelType: type,
        revenueModelValue: +value,
        sportIds: selSports,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert('Failed to publish: ' + (err.error || 'Server error'));
      setSaving(false); return;
    }
    setSaving(false); onDone(); onClose();
  };

  const reject = async () => {
    setSaving(true);
    await fetch(`/api/bmt/turfs/${turf.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'rejected' }),
    });
    setSaving(false); onDone(); onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md glass-panel rounded-3xl border border-[var(--panel-border)] shadow-2xl z-10 overflow-hidden">
        <div className="h-1 w-full bg-gradient-to-r from-accent/0 via-accent to-accent/0" />
        <div className="p-6 flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-black">Review Turf Request</h2>
            <p className="text-sm text-[var(--muted)] mt-0.5">
              <span className="font-bold text-foreground">{turf.name}</span> — set a revenue model to publish
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(['percentage', 'monthly'] as const).map(t => (
              <button key={t} onClick={() => { setType(t); setValue(''); }}
                className={`flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all ${
                  type === t
                    ? t === 'percentage'
                      ? 'bg-accent/10 border-accent text-accent'
                      : 'bg-blue-500/10 border-blue-500 text-blue-400'
                    : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:border-white/20'
                }`}>
                {t === 'percentage' ? <Percent size={22} /> : <CalendarDays size={22} />}
                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-wide">{t === 'percentage' ? '% per Booking' : 'Monthly Flat'}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">{t === 'percentage' ? 'Cut from each booking' : 'Fixed fee monthly'}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)]">
              {type === 'percentage' ? 'Your cut (%)' : 'Monthly fee (৳)'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] font-black">
                {type === 'percentage' ? '%' : '৳'}
              </span>
              <input type="number" value={value} onChange={e => setValue(e.target.value)}
                placeholder={type === 'percentage' ? 'e.g. 15' : 'e.g. 5000'}
                className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl pl-9 pr-4 py-3 text-sm font-bold outline-none focus:border-accent/50 placeholder:text-[var(--muted)] transition-colors"
              />
            </div>
            {preview && (
              <div className="mt-1 px-4 py-2.5 bg-accent/5 border border-accent/20 rounded-xl text-xs font-semibold text-accent">
                💡 {preview}
              </div>
            )}
          </div>

          {/* Sport selector */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)]">Sports at this Turf</label>
            <div className="flex flex-wrap gap-2">
              {allSports.map(s => {
                const on = selSports.includes(s.id);
                return (
                  <button key={s.id} type="button"
                    onClick={() => setSelSports(prev => on ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all ${
                      on ? 'bg-accent/15 border-accent/40 text-accent' : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:border-accent/30'
                    }`}>
                    {s.name}
                  </button>
                );
              })}
            </div>
            {selSports.length === 0 && <p className="text-[10px] text-orange-400">⚠ No sports selected — turf won't appear in sport filters</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={reject} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-sm transition-all disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <X size={15} />}
              Reject
            </button>
            <button onClick={publish} disabled={saving || !value || +value <= 0}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-black font-black text-sm hover:brightness-110 transition-all disabled:opacity-40">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} strokeWidth={3} />}
              Publish Turf
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Earnings helpers ─────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);

function calcTurfStats(turfId: string, bookings: Booking[], slots: Slot[]) {
  const turfBookings = bookings.filter(b => b.turfId === turfId || slots.find(s => s.id === b.slotId && s.turfId === turfId));
  const todayBookings = turfBookings.filter(b => b.date === today);

  const ownerEarning = (b: Booking) => {
    if (b.ownerShare !== undefined) return b.ownerShare;
    const slot = slots.find(s => s.id === b.slotId);
    return b.price ?? slot?.price ?? 0;
  };
  const bmtCut = (b: Booking) => b.bmtCut ?? 0;

  return {
    lifetimeEarnings: turfBookings.reduce((s, b) => s + ownerEarning(b), 0),
    lifetimeCut:      turfBookings.reduce((s, b) => s + bmtCut(b), 0),
    todayEarnings:    todayBookings.reduce((s, b) => s + ownerEarning(b), 0),
    todayCut:         todayBookings.reduce((s, b) => s + bmtCut(b), 0),
  };
}

// ─── Owner Card ───────────────────────────────────────────────────────────────
function OwnerCard({ owner, turfs, sports, cities, bookings, slots, onReload }: {
  owner: Owner; turfs: Turf[]; sports: Sport[]; cities: City[];
  bookings: Booking[]; slots: Slot[]; onReload: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [approveTurf, setApproveTurf] = useState<Turf | null>(null);

  const myTurfs   = turfs.filter(t => t.ownerId === owner.id);
  const published = myTurfs.filter(t => t.status === 'published');
  const pending   = myTurfs.filter(t => t.status === 'pending');
  const rejected  = myTurfs.filter(t => t.status === 'rejected');

  const sportNames = (turfSports: TurfSportEntry[]) =>
    (turfSports ?? []).map(ts => ts.sport?.name ?? ts.sportId).join(' · ') || '—';
  const cityName = (id: string) => cities.find(c => c.id === id)?.name ?? '—';

  // Aggregate across all turfs for header stats
  const ownerStats = myTurfs.reduce((acc, t) => {
    const s = calcTurfStats(t.id, bookings, slots);
    return {
      lifetimeEarnings: acc.lifetimeEarnings + s.lifetimeEarnings,
      lifetimeCut:      acc.lifetimeCut      + s.lifetimeCut,
      todayEarnings:    acc.todayEarnings    + s.todayEarnings,
      todayCut:         acc.todayCut         + s.todayCut,
    };
  }, { lifetimeEarnings: 0, lifetimeCut: 0, todayEarnings: 0, todayCut: 0 });

  return (
    <>
      <div className="glass-panel rounded-3xl border border-[var(--panel-border)] overflow-hidden shadow-lg">
        {/* Card Header */}
        <div className="p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(0,255,0,0.08)]">
            <span className="text-lg font-black text-accent">{owner.name[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-base leading-tight">{owner.name}</h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">{owner.email}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/8 border border-accent/20 text-accent">
                {published.length} Live
              </span>
              {pending.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/25 text-orange-400">
                  {pending.length} Pending Review
                </span>
              )}
              {rejected.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/25 text-red-400">
                  {rejected.length} Rejected
                </span>
              )}
              {owner.joinedAt && <span className="text-[10px] text-[var(--muted)]">Joined {owner.joinedAt}</span>}
            </div>
          </div>
          <button onClick={() => setExpanded(e => !e)}
            className="w-8 h-8 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] flex items-center justify-center shrink-0 hover:border-white/20 transition-colors">
            {expanded ? <ChevronUp size={14} className="text-[var(--muted)]" /> : <ChevronDown size={14} className="text-[var(--muted)]" />}
          </button>
        </div>

        {/* Owner-level Stats (4 columns) */}
        <div className="px-5 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Lifetime Earnings', value: ownerStats.lifetimeEarnings, icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/8' },
            { label: 'Lifetime BMT Cut', value: ownerStats.lifetimeCut,      icon: Percent,    color: 'text-blue-400', bg: 'bg-blue-500/8' },
            { label: "Today's Earnings", value: ownerStats.todayEarnings,    icon: Clock,      color: 'text-green-400', bg: 'bg-green-500/8' },
            { label: "Today's BMT Cut",  value: ownerStats.todayCut,         icon: Banknote,   color: 'text-orange-400', bg: 'bg-orange-500/8' },
          ].map(s => (
            <div key={s.label} className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-2xl p-3.5 flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon size={14} className={s.color} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)] leading-tight">{s.label}</p>
                <p className={`text-sm font-black ${s.color}`}>৳{s.value.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Turfs list */}
        {expanded && myTurfs.length > 0 && (
          <div className="border-t border-[var(--panel-border)]">
            <div className="px-5 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-3">
                Turfs ({myTurfs.length})
              </p>
              <div className="flex flex-col gap-3">
                {myTurfs.map(turf => {
                  const ts = calcTurfStats(turf.id, bookings, slots);
                  return (
                    <div key={turf.id}
                      className={`rounded-2xl border p-4 ${
                        turf.status === 'pending'   ? 'bg-orange-500/5 border-orange-500/20' :
                        turf.status === 'published' ? 'bg-accent/5 border-accent/15'         :
                                                      'bg-red-500/5 border-red-500/20'
                      }`}>
                      <div className="flex items-center gap-3">
                        {turf.logoUrl ? (
                          <img src={turf.logoUrl} alt={turf.name} className="w-10 h-10 rounded-xl object-cover border border-[var(--panel-border)] shrink-0" />
                        ) : (
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            turf.status === 'published' ? 'bg-accent/10' :
                            turf.status === 'pending'   ? 'bg-orange-500/10' : 'bg-red-500/10'
                          }`}>
                            <Building2 size={18} className={
                              turf.status === 'published' ? 'text-accent' :
                              turf.status === 'pending'   ? 'text-orange-400' : 'text-red-400'
                            } />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm">{turf.name}</p>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${
                              turf.status === 'published' ? 'bg-accent/10 border-accent/30 text-accent' :
                              turf.status === 'pending'   ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                              'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}>{turf.status}</span>
                          </div>
                          <p className="text-[11px] text-[var(--muted)] mt-0.5">
                            {cityName(turf.cityId)}{turf.area ? ` · ${turf.area}` : ''}
                          </p>
                          <p className="text-[11px] text-[var(--muted)] truncate">{sportNames(turf.sports)}</p>
                          {turf.status === 'published' && (turf.revenueModelType || turf.revenueModel) && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <Banknote size={11} className="text-accent" />
                              <span className="text-[10px] font-bold text-accent">
                                {(turf.revenueModelType ?? turf.revenueModel?.type) === 'percentage'
                                  ? `${turf.revenueModelValue ?? turf.revenueModel?.value}% per booking`
                                  : `৳${(turf.revenueModelValue ?? turf.revenueModel?.value ?? 0).toLocaleString()}/month`}
                              </span>
                            </div>
                          )}
                        </div>
                        {turf.status === 'pending' && (
                          <button onClick={() => setApproveTurf(turf)}
                            className="shrink-0 px-4 py-2 text-xs font-black bg-accent text-black rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-[0_2px_10px_rgba(0,255,0,0.2)]">
                            Review
                          </button>
                        )}
                      </div>
                      {/* Per-turf 4-stat row */}
                      {turf.status === 'published' && (
                        <div className="mt-3 grid grid-cols-4 gap-2">
                          {[
                            { label: 'Lifetime Earn', value: ts.lifetimeEarnings, color: 'text-accent' },
                            { label: 'Lifetime Cut',  value: ts.lifetimeCut,      color: 'text-blue-400' },
                            { label: "Today Earn",    value: ts.todayEarnings,    color: 'text-green-400' },
                            { label: "Today Cut",     value: ts.todayCut,         color: 'text-orange-400' },
                          ].map(s => (
                            <div key={s.label} className="bg-[var(--panel-bg)]/60 rounded-xl p-2.5 border border-[var(--panel-border)]/60">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">{s.label}</p>
                              <p className={`text-xs font-black ${s.color}`}>৳{s.value.toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {expanded && myTurfs.length === 0 && (
          <div className="border-t border-[var(--panel-border)] px-5 py-4">
            <p className="text-xs text-[var(--muted)] text-center italic">No turfs created yet.</p>
          </div>
        )}
      </div>

      {approveTurf && <ApproveModal turf={approveTurf} sports={sports} onClose={() => setApproveTurf(null)} onDone={onReload} />}
    </>
  );
}

// ─── Reset Passwords Sub-panel ────────────────────────────────────────────────
function ResetPasswordsPanel({ owners }: { owners: Owner[] }) {
  const [search, setSearch]     = useState('');
  const [editing, setEditing]   = useState<string | null>(null);
  const [newPw, setNewPw]       = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState<string | null>(null);
  const [error, setError]       = useState('');

  const filtered = owners.filter(o => {
    const name  = (o.name || o.contactPerson || '').toLowerCase();
    const email = o.email.toLowerCase();
    const q = search.toLowerCase();
    return name.includes(q) || email.includes(q);
  }).sort((a, b) => (a.name || a.contactPerson || a.email).localeCompare(b.name || b.contactPerson || b.email));

  const handleSave = async (owner: Owner) => {
    setError('');
    if (newPw.trim().length < 4) { setError('Password must be at least 4 characters.'); return; }
    setSaving(true);
    await fetch(`/api/bmt/owners/${owner.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPw.trim() }),
    });
    setSaving(false);
    setSaved(owner.id);
    setEditing(null);
    setNewPw('');
    setTimeout(() => setSaved(null), 2500);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium outline-none focus:border-accent/50 placeholder:text-neutral-600" />
      </div>
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-[var(--muted)]">
          <User size={28} className="mx-auto mb-3 opacity-40" />
          <p className="font-bold">No owners found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(owner => {
            const displayName = owner.name || owner.contactPerson || 'Unnamed Owner';
            const isEditing = editing === owner.id;
            const isSaved   = saved   === owner.id;
            return (
              <div key={owner.id} className="glass-panel border border-[var(--panel-border)] rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                      <User size={15} className="text-accent" />
                    </div>
                    <div>
                      <p className="font-black text-sm">{displayName}</p>
                      <p className="text-[10px] text-[var(--muted)]">{owner.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSaved && <span className="text-[10px] font-black text-accent flex items-center gap-1"><CheckCircle2 size={11} /> Saved!</span>}
                    {!isEditing ? (
                      <button onClick={() => { setEditing(owner.id); setNewPw(''); setError(''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-xs font-bold hover:border-accent/40 hover:text-accent transition-all">
                        <KeyRound size={11} /> Reset Password
                      </button>
                    ) : (
                      <button onClick={() => { setEditing(null); setNewPw(''); setError(''); }}
                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold hover:bg-white/10 transition-all">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
                {isEditing && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-[var(--panel-border)]">
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={newPw}
                        onChange={e => setNewPw(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSave(owner)}
                        placeholder="New password for this owner…"
                        className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 pr-11 text-sm font-bold outline-none focus:border-accent/50 placeholder:text-[var(--muted)]" />
                      <button onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-foreground">
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {error && <p className="text-xs text-red-400 font-bold">{error}</p>}
                    <button onClick={() => handleSave(owner)} disabled={saving}
                      className="self-start flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-black font-black text-xs hover:brightness-110 active:scale-95 transition-all disabled:opacity-50">
                      {saving ? <RefreshCw size={11} className="animate-spin" /> : <KeyRound size={11} />}
                      {saving ? 'Saving…' : 'Set New Password'}
                    </button>
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

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ManageOwnersTurfsPanel() {
  const [subTab, setSubTab] = useState<SubTab>('owners');
  const owners   = useApiEntity<Owner>('owners');
  const turfs    = useApiEntity<Turf>('turfs');
  const sports   = useApiEntity<Sport>('sports');
  const cities   = useApiEntity<City>('cities');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots]       = useState<Slot[]>([]);

  useEffect(() => {
    fetch('/api/bmt/bookings').then(r => r.json()).then(d => setBookings(Array.isArray(d) ? d : []));
    fetch('/api/bmt/slots').then(r => r.json()).then(d => setSlots(Array.isArray(d) ? d : []));
  }, []);

  const loading = owners.loading || turfs.loading;
  const knownOwnerIds = new Set(owners.items.map(o => o.id));
  const orphaned      = turfs.items.filter(t => !knownOwnerIds.has(t.ownerId));

  const SUB_TABS = [
    { key: 'owners' as SubTab,    icon: Building2, label: 'Owners & Turfs' },
    { key: 'passwords' as SubTab, icon: KeyRound,  label: 'Reset Passwords' },
    { key: 'invite' as SubTab,    icon: Sparkles,  label: 'Generate Invite' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Sub-tab bar */}
      <div className="flex gap-2 flex-wrap">
        {SUB_TABS.map(tab => (
          <button key={tab.key} onClick={() => setSubTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
              subTab === tab.key
                ? 'bg-accent/15 border-accent/40 text-accent'
                : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:text-foreground'
            }`}>
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invite tab */}
      {subTab === 'invite' && <div className="max-w-lg"><GenerateInviteCard /></div>}

      {/* Reset Passwords tab */}
      {subTab === 'passwords' && <ResetPasswordsPanel owners={owners.items} />}

      {/* Owners tab */}
      {subTab === 'owners' && (
        loading ? (
          <div className="flex items-center gap-2 text-[var(--muted)] text-sm py-8">
            <Loader2 size={16} className="animate-spin" /> Loading owners…
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {owners.items.length === 0 && orphaned.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-center glass-panel rounded-3xl">
                <Building2 size={36} className="text-[var(--muted)] opacity-30" />
                <p className="font-bold text-[var(--muted)]">No owners onboarded yet</p>
                <p className="text-xs text-[var(--muted)]">Switch to "Generate Invite" to invite the first turf owner.</p>
              </div>
            )}

            {owners.items.map(owner => (
              <OwnerCard
                key={owner.id}
                owner={owner}
                turfs={turfs.items}
                sports={sports.items}
                cities={cities.items}
                bookings={bookings}
                slots={slots}
                onReload={() => { owners.reload(); turfs.reload(); }}
              />
            ))}

            {orphaned.length > 0 && (
              <div className="glass-panel rounded-3xl border border-red-500/20 p-5">
                <p className="text-xs font-black uppercase tracking-widest text-red-400 mb-3">⚠ Unlinked Turfs ({orphaned.length})</p>
                <p className="text-xs text-[var(--muted)] mb-3">These turfs were submitted before proper identity linking was set up.</p>
                {orphaned.map(turf => (
                  <div key={turf.id} className="flex items-center gap-3 bg-[var(--panel-bg)] rounded-xl px-4 py-3 border border-[var(--panel-border)]">
                    <Building2 size={16} className="text-red-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{turf.name}</p>
                      <p className="text-[11px] text-[var(--muted)] font-mono">ownerId: {turf.ownerId}</p>
                    </div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400">
                      {turf.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
