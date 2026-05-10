'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Loader2, ShieldCheck, LogOut, Wallet, Trophy, Plus,
  Calendar, Users, Menu, X, CheckCircle2, Clock,
  ChevronRight, Zap, History, RefreshCw, Upload, ChevronLeft,
  Trash2, Lock, Unlock, AlertTriangle
} from 'lucide-react';
import CreateTournamentWizard from '@/components/admin/tournaments/CreateTournamentWizard';

// ── Wallet panel — full recharge flow ───────────────────────────────────────
const METHODS = [
  { key: 'bkash', label: 'bKash',         emoji: '📱' },
  { key: 'nagad', label: 'Nagad',         emoji: '📲' },
  { key: 'bank',  label: 'Bank Transfer', emoji: '🏦' },
] as const;

function OrgWalletPanel({ organizer }: { organizer: any }) {
  const balance = organizer.wallet?.balance ?? 0;
  const txs: any[] = organizer.wallet?.transactions ?? [];
  const charge = organizer.chargePerTournament ?? 0;

  const [view,         setView]         = useState<'overview'|'recharge'|'history'>('overview');
  const [step,         setStep]         = useState<'amount'|'method'|'payment'|'done'>('amount');
  const [amount,       setAmount]       = useState('');
  const [method,       setMethod]       = useState<string|null>(null);
  const [screenshot,   setScreenshot]   = useState('');
  const [scrName,      setScrName]      = useState('');
  const [scrError,     setScrError]     = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [requests,     setRequests]     = useState<any[]>([]);
  const [reqLoading,   setReqLoading]   = useState(false);
  const [bmtMethods,   setBmtMethods]   = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const presets = [500, 1000, 2000, 5000];

  useEffect(() => {
    fetch('/api/bmt/payment-methods').then(r => r.json()).then(d => { if (Array.isArray(d)) setBmtMethods(d); }).catch(() => {});
  }, []);

  const loadRequests = async () => {
    setReqLoading(true);
    const r = await fetch('/api/organizers/me/recharge');
    const d = await r.json();
    if (d.success) setRequests(d.data);
    setReqLoading(false);
  };
  useEffect(() => { if (view === 'history') loadRequests(); }, [view]);

  const handleFile = (file: File) => {
    setScrName(file.name);
    const reader = new FileReader();
    reader.onload = e => setScreenshot(e.target?.result as string ?? '');
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setScrError('');
    if (!screenshot) { setScrError('Screenshot is required.'); return; }
    setSubmitting(true);
    const res = await fetch('/api/organizers/me/recharge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(amount), method, screenshotBase64: screenshot }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (d.success) setStep('done');
    else setScrError(d.error || 'Submission failed.');
  };

  const reset = () => { setStep('amount'); setAmount(''); setMethod(null); setScreenshot(''); setScrName(''); setScrError(''); };
  const activeMethod = bmtMethods.find(m => m.type === method);

  // ── OVERVIEW ──
  if (view === 'overview') return (
    <div className="flex flex-col gap-5">
      <div className="p-6 bg-gradient-to-br from-accent/15 to-black border border-accent/20 rounded-2xl">
        <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-1">Wallet Balance</p>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-black text-accent tabular-nums">৳{balance.toLocaleString()}</span>
          <span className="text-sm font-bold text-neutral-600">BDT</span>
        </div>
        <p className="text-xs text-neutral-500 mt-2">{charge > 0 ? `৳${charge} deducted per tournament published.` : 'No publishing fee set — contact BMT.'}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => { reset(); setView('recharge'); }}
          className="bg-accent/5 border border-accent/20 rounded-2xl p-4 flex flex-col gap-2 text-left hover:bg-accent/10 transition-colors active:scale-95">
          <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center"><Zap size={16} className="text-accent" /></div>
          <p className="text-sm font-black text-white">Recharge</p>
          <p className="text-[10px] text-neutral-500">Top up via bKash, Nagad &amp; Bank</p>
        </button>
        <button onClick={() => setView('history')}
          className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex flex-col gap-2 text-left hover:bg-blue-500/10 transition-colors active:scale-95">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"><History size={16} className="text-blue-400" /></div>
          <p className="text-sm font-black text-white">History</p>
          <p className="text-[10px] text-neutral-500">Recharges &amp; charges</p>
        </button>
      </div>
      {txs.length > 0 && (
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
          <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600 mb-3">Recent Transactions</p>
          <div className="flex flex-col gap-2">
            {txs.slice(0, 5).map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-white">{tx.description || tx.type.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-neutral-600">{new Date(tx.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-sm font-black ${tx.type === 'TOP_UP' ? 'text-accent' : 'text-red-400'}`}>
                  {tx.type === 'TOP_UP' ? '+' : '−'}৳{tx.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ── RECHARGE FLOW ──
  if (view === 'recharge') return (
    <div className="flex flex-col gap-5 max-w-md">
      <button onClick={() => setView('overview')} className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors">
        <ChevronLeft size={14} /> Back to Wallet
      </button>
      <div className="flex items-center justify-between bg-accent/5 border border-accent/15 rounded-xl px-4 py-2.5">
        <p className="text-xs font-bold text-neutral-400">Current Balance</p>
        <p className="text-base font-black text-accent">৳{balance.toLocaleString()}</p>
      </div>

      {step === 'amount' && (
        <div className="flex flex-col gap-4">
          <h3 className="font-black text-lg">Select Amount</h3>
          <div className="grid grid-cols-4 gap-2">
            {presets.map(p => (
              <button key={p} onClick={() => setAmount(String(p))}
                className={`py-3 rounded-2xl text-sm font-black border transition-all ${
                  amount === String(p) ? 'bg-accent text-black border-accent shadow-[0_0_15px_rgba(0,255,65,0.2)]' : 'bg-white/5 border-white/10 hover:border-white/25 text-white'
                }`}>৳{p}</button>
            ))}
          </div>
          <input value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
            placeholder="Custom amount (min ৳100)…"
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-accent/40 placeholder:text-neutral-600 text-white" />
          <button onClick={() => Number(amount) >= 100 && setStep('method')}
            disabled={!amount || Number(amount) < 100}
            className="w-full py-4 rounded-2xl bg-accent text-black font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-40">
            Continue with ৳{amount || '0'} <ChevronRight size={16} />
          </button>
        </div>
      )}

      {step === 'method' && (
        <div className="flex flex-col gap-3">
          <h3 className="font-black text-lg">Payment Method</h3>
          {METHODS.map(m => (
            <button key={m.key} onClick={() => { setMethod(m.key); setStep('payment'); }}
              className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/5 transition-all text-left">
              <span className="text-3xl">{m.emoji}</span>
              <div><p className="font-black text-white">{m.label}</p><p className="text-[10px] text-neutral-500">Send ৳{amount} via {m.label}</p></div>
              <ChevronRight size={14} className="ml-auto text-neutral-500" />
            </button>
          ))}
        </div>
      )}

      {step === 'payment' && (
        <div className="flex flex-col gap-4">
          <h3 className="font-black text-lg">Complete Payment</h3>
          {activeMethod ? (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Send ৳{amount} to this number</p>
              <p className="text-2xl font-black tracking-widest text-white">{activeMethod.number}</p>
              <p className="text-xs text-neutral-500">Account: <span className="font-bold text-white">{activeMethod.accountType}</span></p>
              <p className="text-[10px] text-accent/60 mt-1">After sending, upload your payment screenshot below.</p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-dashed border-white/10 text-center text-sm text-neutral-500">Payment details not configured. Contact BMT Super Admin.</div>
          )}
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Payment Screenshot <span className="text-red-400">*</span></p>
            <div onClick={() => fileRef.current?.click()}
              className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                screenshot ? 'border-accent/40 bg-accent/5' : 'border-white/10 hover:border-white/25 bg-white/[0.02]'
              }`}>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              {screenshot
                ? <><CheckCircle2 size={20} className="text-accent" /><p className="text-xs font-bold text-accent">{scrName}</p><p className="text-[9px] text-neutral-500">Tap to replace</p></>
                : <><Upload size={20} className="text-neutral-500" /><p className="text-sm font-bold text-white">Upload screenshot</p><p className="text-[10px] text-neutral-500">PNG or JPG required</p></>}
            </div>
            {scrError && <p className="text-xs font-bold text-red-400">{scrError}</p>}
          </div>
          <button onClick={handleSubmit} disabled={submitting || !screenshot}
            className="w-full py-4 rounded-2xl bg-accent text-black font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-40">
            {submitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {submitting ? 'Submitting…' : 'Submit Recharge Request'}
          </button>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <CheckCircle2 size={52} className="text-accent" />
          <div>
            <p className="text-xl font-black text-accent">Request Submitted!</p>
            <p className="text-sm text-neutral-500 mt-1">We'll process your ৳{amount} top-up shortly.</p>
          </div>
          <button onClick={() => { setView('history'); reset(); }}
            className="mt-2 text-sm font-black text-white bg-white/5 border border-white/10 px-5 py-2.5 rounded-xl hover:bg-white/10 transition-colors">
            View History
          </button>
        </div>
      )}
    </div>
  );

  // ── HISTORY ──
  return (
    <div className="flex flex-col gap-5">
      <button onClick={() => setView('overview')} className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors">
        <ChevronLeft size={14} /> Back to Wallet
      </button>
      <h3 className="font-black text-lg">Recharge History</h3>
      {reqLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-accent w-8 h-8" /></div>
      ) : requests.length === 0 ? (
        <div className="py-16 text-center flex flex-col items-center">
          <History size={40} className="text-neutral-800 mb-3" />
          <p className="text-neutral-500 font-bold">No recharge requests yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {requests.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{r.method === 'bkash' ? '📱' : r.method === 'nagad' ? '📲' : '🏦'}</span>
                <div>
                  <p className="text-sm font-black text-white">৳{r.amount.toLocaleString()}</p>
                  <p className="text-[10px] text-neutral-500">{new Date(r.createdAt).toLocaleDateString('en-BD')} · {r.method}</p>
                </div>
              </div>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                r.status === 'approved' ? 'bg-accent/10 border-accent/30 text-accent' :
                r.status === 'rejected' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
              }`}>{r.status}</span>
            </div>
          ))}
        </div>
      )}
      {txs.length > 0 && (
        <>
          <h4 className="font-black text-sm text-neutral-400 uppercase tracking-wider mt-2">All Wallet Transactions</h4>
          <div className="flex flex-col gap-2">
            {txs.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-xl">
                <div>
                  <p className="text-sm font-black text-white">{tx.description || tx.type.replace(/_/g, ' ')}</p>
                  <p className="text-[10px] text-neutral-500">{new Date(tx.createdAt).toLocaleDateString('en-BD')}</p>
                </div>
                <span className={`text-sm font-black ${tx.type === 'TOP_UP' ? 'text-accent' : 'text-red-400'}`}>
                  {tx.type === 'TOP_UP' ? '+' : '−'}৳{tx.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Countdown label hook ──────────────────────────────────────────────────────
function useCountdown(target: string | null): string {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setLabel('Open now'); return; }
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

// ── Tournament card ───────────────────────────────────────────────────────────
function TournamentCard({
  t, onClick, onDeleted, onSettingsChanged,
}: {
  t: any;
  onClick: () => void;
  onDeleted: (id: string) => void;
  onSettingsChanged: (updated: any) => void;
}) {
  const statusMap: Record<string, { label: string; cls: string }> = {
    ACTIVE:            { label: 'Live',      cls: 'bg-[#00ff41]/20 text-[#00ff41]' },
    REGISTRATION_OPEN: { label: 'Open',      cls: 'bg-blue-500/20 text-blue-400' },
    DRAFT:             { label: 'Draft',     cls: 'bg-neutral-800 text-neutral-400' },
    COMPLETED:         { label: 'Done',      cls: 'bg-purple-500/20 text-purple-400' },
    CANCELLED:         { label: 'Cancelled', cls: 'bg-red-500/20 text-red-400' },
  };
  const s = statusMap[t.status] ?? { label: t.status.replace(/_/g, ' '), cls: 'bg-neutral-800 text-neutral-400' };

  const [deleting,     setDeleting]     = useState(false);
  const [confirm,      setConfirm]      = useState(false);
  const [savingOpen,   setSavingOpen]   = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [cdInput,      setCdInput]      = useState('');
  const [settingCd,    setSettingCd]    = useState(false);

  const countdownLabel = useCountdown(
    t.registrationOpenAt && new Date(t.registrationOpenAt).getTime() > Date.now()
      ? t.registrationOpenAt
      : null
  );

  const isOpen = t.isRegistrationOpen ||
    (t.registrationOpenAt && new Date(t.registrationOpenAt).getTime() <= Date.now());
  const hasCountdown = !!t.registrationOpenAt;
  const countdownActive = hasCountdown && new Date(t.registrationOpenAt).getTime() > Date.now();
  const hasPaidTeams = (t._count?.registrations ?? 0) > 0 && t.registrations?.some?.((r: any) => r.entryFeePaid);
  const canDelete = (t._count?.registrations ?? 0) === 0;

  const callSettings = async (body: object) => {
    const res = await fetch(`/api/tournaments/${t.id}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await res.json();
    if (d.success) onSettingsChanged(d.data);
    else alert(d.error);
  };

  const handleToggleOpen = async () => {
    setSavingOpen(true);
    await callSettings({ action: isOpen ? 'close' : 'open' });
    setSavingOpen(false);
  };

  const handleSetCountdown = async () => {
    if (!cdInput) return;
    setSettingCd(true);
    await callSettings({ action: 'setCountdown', registrationOpenAt: cdInput });
    setSettingCd(false);
    setShowCountdown(false);
    setCdInput('');
  };

  const handleDelete = async () => {
    setDeleting(true);
    const res = await fetch(`/api/tournaments/${t.id}`, { method: 'DELETE' });
    const d = await res.json();
    if (d.success) onDeleted(t.id);
    else { alert(d.error); setDeleting(false); setConfirm(false); }
  };

  return (
    <div className="bg-black border border-white/5 rounded-2xl overflow-hidden hover:border-accent/20 transition-all">
      {/* Main card */}
      <div
        onClick={onClick}
        className="p-5 cursor-pointer group"
      >
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            {t.bannerImageUrl ? (
              <img src={t.bannerImageUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-neutral-900 flex items-center justify-center text-accent">
                <Trophy size={22} />
              </div>
            )}
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>
        </div>
        <h3 className="text-base font-black text-white group-hover:text-accent transition-colors mb-1 leading-tight">{t.name}</h3>
        <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider mb-4">{t.sport} · {t.formatType?.replace(/_/g, ' ')}</p>
        <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-bold text-neutral-400">
          <div className="flex items-center gap-1.5"><Users size={13} /><span>{t._count?.registrations ?? 0}/{t.maxParticipants}</span></div>
          <div className="flex items-center gap-1.5"><Calendar size={13} /><span>{new Date(t.createdAt).toLocaleDateString()}</span></div>
        </div>
      </div>

      {/* Controls bar */}
      <div className="border-t border-white/5 px-4 py-3 flex items-center gap-2 flex-wrap bg-zinc-950">
        {/* Open/Close toggle */}
        <button
          onClick={handleToggleOpen}
          disabled={savingOpen || (countdownActive)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
            isOpen
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
              : 'bg-neutral-800 border border-white/5 text-neutral-400 hover:text-white'
          } disabled:opacity-40`}
        >
          {savingOpen ? <Loader2 size={11} className="animate-spin" /> : isOpen ? <Unlock size={11} /> : <Lock size={11} />}
          {isOpen ? 'Open' : 'Closed'}
        </button>

        {/* Countdown info / setter */}
        {countdownActive ? (
          <span className="flex items-center gap-1.5 text-xs font-black text-amber-400 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <Clock size={11} /> {countdownLabel}
          </span>
        ) : !hasCountdown ? (
          <button
            onClick={() => setShowCountdown(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider bg-neutral-800 border border-white/5 text-neutral-400 hover:text-white transition-all"
          >
            <Clock size={11} /> Set Countdown
          </button>
        ) : (
          <span className="text-xs text-neutral-500 font-bold px-3">⏳ Countdown elapsed</span>
        )}

        {/* Delete */}
        {canDelete && !confirm && (
          <button
            onClick={() => setConfirm(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
          >
            <Trash2 size={11} /> Delete
          </button>
        )}
        {confirm && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-red-400 font-bold">Are you sure?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 rounded-lg text-xs font-black bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all disabled:opacity-50"
            >
              {deleting ? <Loader2 size={10} className="animate-spin" /> : 'Yes, Delete'}
            </button>
            <button
              onClick={() => setConfirm(false)}
              className="px-3 py-1.5 rounded-lg text-xs font-black bg-neutral-800 text-neutral-400 hover:text-white transition-all"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Countdown setter */}
      {showCountdown && (
        <div className="border-t border-white/5 px-4 py-3 bg-zinc-950 flex items-center gap-2">
          <input
            type="datetime-local"
            value={cdInput}
            onChange={e => setCdInput(e.target.value)}
            className="flex-1 bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-accent/50"
          />
          <button
            onClick={handleSetCountdown}
            disabled={!cdInput || settingCd}
            className="px-4 py-2 rounded-xl bg-accent text-black font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all disabled:opacity-40"
          >
            {settingCd ? <Loader2 size={12} className="animate-spin" /> : 'Set'}
          </button>
          <button onClick={() => setShowCountdown(false)} className="px-2 py-2">
            <X size={14} className="text-neutral-500" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sidebar nav items ─────────────────────────────────────────────────────────
const NAV = [
  { id: 'active', label: 'Active',    icon: Trophy  },
  { id: 'done',   label: 'Completed', icon: CheckCircle2 },
  { id: 'wallet', label: 'Wallet',    icon: Wallet  },
] as const;
type NavId = typeof NAV[number]['id'];

// ── Main dashboard ────────────────────────────────────────────────────────────
export default function OrganizerDashboard() {
  const router   = useRouter();
  const { locale } = useParams() as { locale: string };
  const [loading, setLoading]              = useState(true);
  const [organizer, setOrganizer]          = useState<any>(null);
  const [isCreating, setIsCreating]        = useState(false);
  const [activeNav, setActiveNav]          = useState<NavId>('active');
  const [menuOpen, setMenuOpen]            = useState(false);
  const [localTournaments, setLocalTournaments] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/organizers/me')
      .then(r => r.json())
      .then(d => {
        if (d.success) setOrganizer(d.data);
        else router.push('/organizer/login');
      })
      .catch(() => router.push('/organizer/login'))
      .finally(() => setLoading(false));
  }, [router]);

  // Sync local tournament list whenever organizer data loads/reloads
  useEffect(() => {
    if (organizer) setLocalTournaments(organizer.tournaments ?? []);
  }, [organizer]);

  const handleLogout = () => {
    document.cookie = 'org_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/organizer/login');
  };

  const handleDeleted = (id: string) =>
    setLocalTournaments(prev => prev.filter(t => t.id !== id));

  const handleSettingsChanged = (updated: any) =>
    setLocalTournaments(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-accent w-10 h-10" /></div>;
  if (!organizer) return null;

  // Creation wizard — full-page overlay
  if (isCreating) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <header className="bg-black border-b border-white/5 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
              <ShieldCheck size={18} />
            </div>
            <span className="font-black text-sm uppercase tracking-widest">{organizer.name}</span>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-4 py-8 h-[calc(100vh-4rem)] flex flex-col">
          <CreateTournamentWizard
            isOrganizer
            organizerId={organizer.id}
            onCancel={() => setIsCreating(false)}
            onSuccess={() => { setIsCreating(false); window.location.reload(); }}
          />
        </main>
      </div>
    );
  }

  const active = localTournaments.filter((t: any) => !['COMPLETED', 'CANCELLED'].includes(t.status));
  const done   = localTournaments.filter((t: any) => ['COMPLETED', 'CANCELLED'].includes(t.status));
  const currentList = activeNav === 'active' ? active : activeNav === 'done' ? done : [];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-black text-sm uppercase tracking-widest truncate">{organizer.name}</p>
            <p className="text-[10px] text-neutral-500 font-bold uppercase">Organizer Portal</p>
          </div>
        </div>
        {/* Wallet mini-badge */}
        <div className="mt-3 flex items-center justify-between bg-accent/5 border border-accent/15 rounded-xl px-3 py-2">
          <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Balance</span>
          <span className="text-sm font-black text-accent">৳{(organizer.wallet?.balance ?? 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map(item => {
          const Icon = item.icon;
          const count = item.id === 'active' ? active.length : item.id === 'done' ? done.length : null;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveNav(item.id); setMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all ${
                activeNav === item.id
                  ? 'bg-accent text-black'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              <span className="flex-1 text-left">{item.label}</span>
              {count !== null && count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${activeNav === item.id ? 'bg-black/20' : 'bg-white/10'}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-500 hover:text-red-400 hover:bg-red-500/5 transition-all font-bold text-sm"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex">

      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-64 bg-black border-r border-white/5 shrink-0 flex-col sticky top-0 h-screen">
        <SidebarContent />
      </aside>

      {/* ── Mobile hamburger overlay ─────────────────────────────────────── */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="absolute left-0 top-0 bottom-0 w-72 bg-[#0a0a0a] border-r border-white/5 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <span className="font-black text-sm uppercase tracking-widest">Menu</span>
              <button onClick={() => setMenuOpen(false)} className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1">
              <SidebarContent />
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden bg-black border-b border-white/5 sticky top-0 z-40 px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setMenuOpen(true)}
            className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <Menu size={18} />
          </button>
          <span className="font-black text-sm uppercase tracking-widest">{organizer.name}</span>
          <div className="text-xs font-black text-accent">৳{(organizer.wallet?.balance ?? 0).toLocaleString()}</div>
        </header>

        <main className="flex-1 p-5 md:p-8">
          {/* Section header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-wider">
                {activeNav === 'active' ? 'Active Tournaments' : activeNav === 'done' ? 'Completed Tournaments' : 'Wallet'}
              </h2>
              <p className="text-xs text-neutral-400 font-bold mt-0.5">
                {activeNav === 'active' ? 'Manage and score your live events' :
                 activeNav === 'done'   ? 'Past events you have hosted' :
                 'Your balance and transaction history'}
              </p>
            </div>
            {(activeNav === 'active' || activeNav === 'done') && (
              <button
                onClick={() => setIsCreating(true)}
                className="bg-white text-black font-black uppercase tracking-wider px-4 py-2.5 rounded-xl text-sm hover:bg-accent transition-colors flex items-center gap-2"
              >
                <Plus size={15} /> New
              </button>
            )}
          </div>

          {/* Wallet view */}
          {activeNav === 'wallet' && <OrgWalletPanel organizer={organizer} />}

          {/* Tournament grids */}
          {(activeNav === 'active' || activeNav === 'done') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {currentList.map((t: any) => (
                <TournamentCard
                  key={t.id}
                  t={t}
                  onClick={() => router.push(`/${locale}/organizer/tournaments/${t.id}`)}
                  onDeleted={handleDeleted}
                  onSettingsChanged={handleSettingsChanged}
                />
              ))}
              {currentList.length === 0 && (
                <div className="col-span-full py-24 border border-dashed border-white/10 rounded-2xl text-center flex flex-col items-center">
                  {activeNav === 'done' ? <CheckCircle2 size={48} className="text-neutral-800 mb-4" /> : <Trophy size={48} className="text-neutral-800 mb-4" />}
                  <h3 className="text-xl font-black text-white mb-2">
                    {activeNav === 'active' ? 'No Active Tournaments' : 'No Completed Tournaments'}
                  </h3>
                  <p className="text-neutral-500 font-bold text-sm mb-5">
                    {activeNav === 'active' ? 'Create your first tournament to get started.' : 'Completed events will appear here.'}
                  </p>
                  {activeNav === 'active' && (
                    <button
                      onClick={() => setIsCreating(true)}
                      className="flex items-center gap-2 bg-accent text-black font-black uppercase tracking-wider px-5 py-2.5 rounded-xl text-sm hover:brightness-110 transition-all"
                    >
                      <Plus size={16} /> Create Tournament
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
