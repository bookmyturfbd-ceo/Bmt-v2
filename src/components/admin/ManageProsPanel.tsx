'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  UserCircle2, Sparkles, Check, X,
  Loader2, ChevronDown, ChevronUp, TrendingUp, Banknote, Clock,
  KeyRound, Search, Eye, EyeOff, CheckCircle2, RefreshCw, User, Percent, MapPin
} from 'lucide-react';
import { useApiEntity } from '@/hooks/useApiEntity';
import GenerateInviteCard from './GenerateInviteCard';

type SubTab = 'pros' | 'invite' | 'passwords';

interface Owner { id: string; name: string; email: string; phone: string; joinedAt?: string; contactPerson?: string; password?: string; isCoach?: boolean; }
interface TurfSportEntry { sportId: string; sport: { id: string; name: string }; }
interface Turf  {
  id: string; name: string; ownerId: string; cityId: string; area?: string;
  sports: TurfSportEntry[]; status: string; logoUrl?: string; imageUrls?: string[];
  revenueModel?: { type: 'percentage' | 'monthly'; value: number };
  revenueModelType?: string; revenueModelValue?: number;
  createdAt?: string; isCoachProfile?: boolean; coachType?: string;
}
interface Sport   { id: string; name: string; }
interface City    { id: string; name: string; }
interface Booking { id: string; slotId?: string; turfId?: string; date: string; price?: number; ownerShare?: number; bmtCut?: number; }
interface Slot    { id: string; turfId: string; price: number; }

// ─── Profile Approval Modal ───────────────────────────────────────────────────
function ApproveModal({ turf, onClose, onDone }: {
  turf: Turf; onClose: () => void; onDone: () => void;
}) {
  const [saving, setSaving] = useState(false);

  const publish = async () => {
    setSaving(true);
    const res = await fetch(`/api/bmt/turfs/${turf.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'published',
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
        <div className="h-1 w-full bg-gradient-to-r from-blue-500/0 via-blue-500 to-blue-500/0" />
        <div className="p-6 flex flex-col gap-5">
          <div>
            <h2 className="text-lg font-black">Review Professional Profile</h2>
            <p className="text-sm text-[var(--muted)] mt-0.5">
              <span className="font-bold text-foreground">{turf.name}</span> — {turf.coachType}
            </p>
          </div>
          
          <div className="bg-[var(--panel-bg)] rounded-xl p-4 border border-[var(--panel-border)] flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[var(--panel-bg-hover)] flex items-center justify-center shrink-0 overflow-hidden">
              {turf.imageUrls?.[0] ? <img src={turf.imageUrls[0]} alt="profile" className="w-full h-full object-cover" /> : <UserCircle2 size={24} className="text-[var(--muted)]" />}
            </div>
            <div>
              <p className="text-sm font-black">{turf.name}</p>
              <p className="text-xs text-blue-400 font-bold uppercase tracking-widest">{turf.coachType}</p>
              <p className="text-xs text-[var(--muted)] mt-1 flex items-center gap-1"><MapPin size={10} /> {turf.area || 'Unknown Area'}</p>
            </div>
          </div>

          <div className="flex gap-3 mt-2">
            <button onClick={reject} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-sm transition-all disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <X size={15} />}
              Reject
            </button>
            <button onClick={publish} disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500 text-white font-black text-sm hover:brightness-110 transition-all disabled:opacity-40">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={15} strokeWidth={3} />}
              Approve Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Earnings helpers ─────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);

function calcProStats(turfId: string, bookings: Booking[], slots: Slot[]) {
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

// ─── Pro Card ───────────────────────────────────────────────────────────────
function ProCard({ owner, turfs, cities, bookings, slots, onReload }: {
  owner: Owner; turfs: Turf[]; cities: City[];
  bookings: Booking[]; slots: Slot[]; onReload: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [approveTurf, setApproveTurf] = useState<Turf | null>(null);

  const myProfiles = turfs.filter(t => t.ownerId === owner.id && t.isCoachProfile);
  const published = myProfiles.filter(t => t.status === 'published');
  const pending   = myProfiles.filter(t => t.status === 'pending');
  const rejected  = myProfiles.filter(t => t.status === 'rejected');

  const cityName = (id: string) => cities.find(c => c.id === id)?.name ?? '—';

  // Aggregate across all profiles for header stats
  const ownerStats = myProfiles.reduce((acc, t) => {
    const s = calcProStats(t.id, bookings, slots);
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.08)]">
            <span className="text-lg font-black text-blue-500">{owner.name[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-base leading-tight">{owner.name}</h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">{owner.email}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
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

        {/* Stats */}
        <div className="px-5 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Lifetime Earnings', value: ownerStats.lifetimeEarnings, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/8' },
            { label: 'Lifetime BMT Cut', value: ownerStats.lifetimeCut,      icon: Percent,    color: 'text-accent', bg: 'bg-accent/8' },
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

        {/* Profiles list */}
        {expanded && myProfiles.length > 0 && (
          <div className="border-t border-[var(--panel-border)]">
            <div className="px-5 py-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] mb-3">
                Professional Profiles ({myProfiles.length})
              </p>
              <div className="flex flex-col gap-3">
                {myProfiles.map(turf => {
                  const ts = calcProStats(turf.id, bookings, slots);
                  return (
                    <div key={turf.id}
                      className={`rounded-2xl border p-4 ${
                        turf.status === 'pending'   ? 'bg-orange-500/5 border-orange-500/20' :
                        turf.status === 'published' ? 'bg-blue-500/5 border-blue-500/15'         :
                                                      'bg-red-500/5 border-red-500/20'
                      }`}>
                      <div className="flex items-center gap-3">
                        {turf.imageUrls?.[0] ? (
                          <img src={turf.imageUrls[0]} alt={turf.name} className="w-10 h-10 rounded-full object-cover border border-[var(--panel-border)] shrink-0" />
                        ) : (
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                            turf.status === 'published' ? 'bg-blue-500/10' :
                            turf.status === 'pending'   ? 'bg-orange-500/10' : 'bg-red-500/10'
                          }`}>
                            <UserCircle2 size={18} className={
                              turf.status === 'published' ? 'text-blue-500' :
                              turf.status === 'pending'   ? 'text-orange-400' : 'text-red-400'
                            } />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-sm">{turf.name}</p>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${
                              turf.status === 'published' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                              turf.status === 'pending'   ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                              'bg-red-500/10 border-red-500/30 text-red-400'
                            }`}>{turf.status}</span>
                          </div>
                          <p className="text-[11px] font-bold text-blue-400 mt-0.5 tracking-widest uppercase">
                            {turf.coachType}
                          </p>
                          <p className="text-[11px] text-[var(--muted)] mt-0.5 truncate flex items-center gap-1">
                            <MapPin size={10} /> {cityName(turf.cityId)}{turf.area ? ` · ${turf.area}` : ''}
                          </p>
                        </div>
                        {turf.status === 'pending' && (
                          <button onClick={() => setApproveTurf(turf)}
                            className="shrink-0 px-4 py-2 text-xs font-black bg-blue-500 text-white rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-[0_2px_10px_rgba(59,130,246,0.2)]">
                            Review
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {expanded && myProfiles.length === 0 && (
          <div className="border-t border-[var(--panel-border)] px-5 py-4">
            <p className="text-xs text-[var(--muted)] text-center italic">No profiles created yet.</p>
          </div>
        )}
      </div>

      {approveTurf && <ApproveModal turf={approveTurf} onClose={() => setApproveTurf(null)} onDone={onReload} />}
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
          className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium outline-none focus:border-blue-500/50 placeholder:text-neutral-600" />
      </div>
      {filtered.length === 0 ? (
        <div className="py-12 text-center text-[var(--muted)]">
          <UserCircle2 size={28} className="mx-auto mb-3 opacity-40" />
          <p className="font-bold">No coaches found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(owner => {
            const displayName = owner.name || owner.contactPerson || 'Unnamed Coach';
            const isEditing = editing === owner.id;
            const isSaved   = saved   === owner.id;
            return (
              <div key={owner.id} className="glass-panel border border-[var(--panel-border)] rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <UserCircle2 size={15} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="font-black text-sm">{displayName}</p>
                      <p className="text-[10px] text-[var(--muted)]">{owner.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSaved && <span className="text-[10px] font-black text-blue-500 flex items-center gap-1"><CheckCircle2 size={11} /> Saved!</span>}
                    {!isEditing ? (
                      <button onClick={() => { setEditing(owner.id); setNewPw(''); setError(''); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-xs font-bold hover:border-blue-500/40 hover:text-blue-400 transition-all">
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
                        placeholder="New password for this coach…"
                        className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 pr-11 text-sm font-bold outline-none focus:border-blue-500/50 placeholder:text-[var(--muted)]" />
                      <button onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-foreground">
                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {error && <p className="text-xs text-red-400 font-bold">{error}</p>}
                    <button onClick={() => handleSave(owner)} disabled={saving}
                      className="self-start flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-500 text-white font-black text-xs hover:brightness-110 active:scale-95 transition-all disabled:opacity-50">
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
export default function ManageProsPanel() {
  const [subTab, setSubTab] = useState<SubTab>('pros');
  const allOwners = useApiEntity<Owner>('owners');
  const turfs    = useApiEntity<Turf>('turfs');
  const cities   = useApiEntity<City>('cities');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots]       = useState<Slot[]>([]);

  useEffect(() => {
    fetch('/api/bmt/bookings').then(r => r.json()).then(d => setBookings(Array.isArray(d) ? d : []));
    fetch('/api/bmt/slots').then(r => r.json()).then(d => setSlots(Array.isArray(d) ? d : []));
  }, []);

  const loading = allOwners.loading || turfs.loading;
  
  // Filter for coaches only
  const owners = allOwners.items.filter(o => o.isCoach);

  const SUB_TABS = [
    { key: 'pros' as SubTab,      icon: UserCircle2, label: 'Coaches & Pros' },
    { key: 'passwords' as SubTab, icon: KeyRound,    label: 'Reset Passwords' },
    { key: 'invite' as SubTab,    icon: Sparkles,    label: 'Generate Invite' },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Sub-tab bar */}
      <div className="flex gap-2 flex-wrap">
        {SUB_TABS.map(tab => (
          <button key={tab.key} onClick={() => setSubTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
              subTab === tab.key
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:text-foreground'
            }`}>
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Invite tab */}
      {subTab === 'invite' && <div className="max-w-lg"><GenerateInviteCard isCoachInvite={true} /></div>}

      {/* Reset Passwords tab */}
      {subTab === 'passwords' && <ResetPasswordsPanel owners={owners} />}

      {/* Pros tab */}
      {subTab === 'pros' && (
        loading ? (
          <div className="flex items-center gap-2 text-[var(--muted)] text-sm py-8">
            <Loader2 size={16} className="animate-spin" /> Loading pros…
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {owners.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-center glass-panel rounded-3xl">
                <UserCircle2 size={36} className="text-[var(--muted)] opacity-30" />
                <p className="font-bold text-[var(--muted)]">No coaches onboarded yet</p>
                <p className="text-xs text-[var(--muted)]">Switch to "Generate Invite" to invite the first coach.</p>
              </div>
            )}

            {owners.map(owner => (
              <ProCard
                key={owner.id}
                owner={owner}
                turfs={turfs.items}
                cities={cities.items}
                bookings={bookings}
                slots={slots}
                onReload={() => { allOwners.reload(); turfs.reload(); }}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}
