'use client';
import { useState, useEffect, useRef } from 'react';
import { getCookie } from '@/lib/cookies';
import {
  X, Wallet, ChevronRight, ChevronLeft, Upload,
  CheckCircle2, RefreshCw, History, Clock, Banknote,
  Calendar, Swords, Zap,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────
interface PaymentMethod { type: string; number: string; accountType: string; }
interface WalletRequest {
  id: string; playerId: string; amount: number; method: string;
  status: 'pending' | 'approved' | 'rejected'; createdAt: string;
}
interface Booking { id: string; slotId: string; date: string; price?: number; playerId?: string; playerName?: string; source?: string; }
interface Slot    { id: string; turfId: string; startTime: string; endTime: string; price: number; }
interface Turf    { id: string; name: string; }

const METHOD_OPTIONS = [
  { key: 'bkash', label: 'bKash',         emoji: '📱', color: '#E2136E' },
  { key: 'nagad', label: 'Nagad',         emoji: '📲', color: '#FF6B00' },
  { key: 'bank',  label: 'Bank Transfer', emoji: '🏦', color: '#3B82F6' },
] as const;
type RechargeStep = 'home' | 'amount' | 'method' | 'payment';
type HistTab = 'recharge' | 'spending' | 'cm_books';

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function GlobalWalletModal({ onClose }: { onClose: () => void }) {
  // Player identity - resolved inside useEffect to avoid SSR/hydration mismatch
  const [playerId,   setPlayerId]   = useState('');
  const [playerName, setPlayerName] = useState('');

  // Wallet data
  const [balance,    setBalance]    = useState(0);
  const [methods,    setMethods]    = useState<PaymentMethod[]>([]);
  const [walletHist, setWalletHist] = useState<WalletRequest[]>([]);
  const [allBookings,setAllBookings]= useState<Booking[]>([]);
  const [allSlots,   setAllSlots]   = useState<Slot[]>([]);
  const [allTurfs,   setAllTurfs]   = useState<Turf[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Main view
  const [view, setView] = useState<'overview' | 'recharge' | 'history'>('overview');

  // Recharge flow
  const [step,       setStep]       = useState<RechargeStep>('home');
  const [amount,     setAmount]     = useState('');
  const [method,     setMethod]     = useState<typeof METHOD_OPTIONS[number]['key'] | null>(null);
  const [screenshot, setScreenshot] = useState('');
  const [scrName,    setScrName]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scrError,   setScrError]   = useState('');
  const [submitted,  setSubmitted]  = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // History sub-tab
  const [histTab, setHistTab] = useState<HistTab>('recharge');

  // Load data — cookies only available after mount
  useEffect(() => {
    const pid  = getCookie('bmt_player_id');
    const pname = getCookie('bmt_name');
    if (!pid) return;
    setPlayerId(pid);
    setPlayerName(pname);

    Promise.all([
      fetch(`/api/bmt/players/${pid}`).then(r => r.json()),
      fetch('/api/bmt/payment-methods').then(r => r.json()),
      fetch('/api/bmt/wallet-requests').then(r => r.json()),
      fetch('/api/bmt/bookings').then(r => r.json()),
      fetch('/api/bmt/slots').then(r => r.json()),
      fetch('/api/bmt/turfs').then(r => r.json()),
    ]).then(([prof, meths, reqs, books, slots, turfs]) => {
      setBalance(prof?.walletBalance ?? 0);
      setMethods(Array.isArray(meths) ? meths : []);
      setWalletHist(
        (Array.isArray(reqs) ? reqs : [])
          .filter((r: WalletRequest) => r.playerId === pid)
          .sort((a: WalletRequest, b: WalletRequest) => b.createdAt.localeCompare(a.createdAt))
      );
      setAllBookings(Array.isArray(books) ? books : []);
      setAllSlots(Array.isArray(slots) ? slots : []);
      setAllTurfs(Array.isArray(turfs) ? turfs : []);
      setDataLoaded(true);
    });
  }, []); // run once on mount

  const activeMethod = methods.find(m => m.type === method);
  const presets = [1000, 2000, 5000, 10000];

  const handleFile = (file: File) => {
    setScrName(file.name);
    const reader = new FileReader();
    reader.onload = e => setScreenshot(e.target?.result as string ?? '');
    reader.readAsDataURL(file);
  };

  const refreshHistory = async (pid: string) => {
    const r = await fetch('/api/bmt/wallet-requests');
    const d = await r.json();
    setWalletHist(
      (Array.isArray(d) ? d : [])
        .filter((req: WalletRequest) => req.playerId === pid)
        .sort((a: WalletRequest, b: WalletRequest) => b.createdAt.localeCompare(a.createdAt))
    );
  };

  const handleSubmit = async () => {
    setScrError('');
    if (!screenshot) { setScrError('Screenshot is required.'); return; }
    setSubmitting(true);
    await fetch('/api/bmt/wallet-requests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, playerName, amount: Number(amount), method, screenshotBase64: screenshot }),
    });
    await refreshHistory(playerId);
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => { setView('history'); setHistTab('recharge'); setSubmitted(false); setStep('home'); setAmount(''); setMethod(null); setScreenshot(''); }, 1600);
  };

  const back = () => {
    if (step === 'amount')  { setStep('home'); return; }
    if (step === 'method')  { setStep('amount'); return; }
    if (step === 'payment') { setStep('method'); return; }
    setView('overview');
  };

  // Spending derived from allBookings
  const mySpending = allBookings.filter(b => b.playerId === playerId || b.playerName === playerName);
  const turf = mySpending.filter(b => b.source !== 'challenge_market').sort((a, b) => b.date.localeCompare(a.date));
  const cm   = mySpending.filter(b => b.source === 'challenge_market').sort((a, b) => b.date.localeCompare(a.date));
  const turfTotal = turf.reduce((s, b) => { const sl = allSlots.find(sl => sl.id === b.slotId); return s + (b.price ?? sl?.price ?? 0); }, 0);
  const cmTotal   = cm.reduce((s, b)   => { const sl = allSlots.find(sl => sl.id === b.slotId); return s + (b.price ?? sl?.price ?? 0); }, 0);

  // Loading skeleton
  if (!dataLoaded && view === 'overview') {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col justify-end" onClick={onClose}>
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
        <div className="relative z-10 w-full max-w-lg mx-auto rounded-t-3xl border-t border-x border-white/10 flex flex-col items-center justify-center gap-4"
          style={{ height: '88dvh', background: 'linear-gradient(180deg, #0a1209 0%, #07080e 100%)' }}
          onClick={e => e.stopPropagation()}>
          <div className="w-10 h-1 rounded-full bg-white/15 absolute top-3" />
          <div className="w-8 h-8 rounded-full border-2 border-[#00ff41] border-t-transparent animate-spin" />
          <p className="text-xs text-neutral-500 font-bold">Loading wallet…</p>
        </div>
      </div>
    );
  }

  // ── Shared header for sub-views ──
  const SubHeader = ({ title }: { title: string }) => (
    <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-white/5 shrink-0">
      <button onClick={back} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
        <ChevronLeft size={15} className="text-white" />
      </button>
      <p className="font-black text-white text-base">{title}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg mx-auto rounded-t-3xl border-t border-x border-white/10 overflow-hidden flex flex-col"
        style={{ height: '88dvh', background: 'linear-gradient(180deg, #0a1209 0%, #07080e 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        {/* ═══ OVERVIEW VIEW ═══ */}
        {view === 'overview' && (
          <>
            {/* Balance header */}
            <div className="px-5 pt-4 pb-5 flex items-start justify-between shrink-0">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Your Wallet</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-[#00ff41] tabular-nums">৳{balance.toLocaleString()}</span>
                  <span className="text-sm font-bold text-neutral-600">BDT</span>
                </div>
                <p className="text-[10px] text-neutral-600 mt-1">Available balance</p>
              </div>
              <button onClick={onClose} className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors mt-1">
                <X size={15} className="text-neutral-400" />
              </button>
            </div>

            {/* Bento grid */}
            <div className="px-4 flex flex-col gap-3 flex-1 overflow-y-auto pb-8">
              {/* 2 small bento boxes */}
              <div className="grid grid-cols-2 gap-3">
                {/* Recharge */}
                <button
                  onClick={() => setView('recharge')}
                  className="bg-[#00ff41]/5 border border-[#00ff41]/20 rounded-3xl p-5 flex flex-col gap-3 hover:bg-[#00ff41]/10 hover:border-[#00ff41]/40 transition-all active:scale-95 text-left"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/20 flex items-center justify-center">
                    <Zap size={18} className="text-[#00ff41]" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">Recharge</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Top up via bKash, Nagad & Bank</p>
                  </div>
                </button>

                {/* History */}
                <button
                  onClick={() => setView('history')}
                  className="bg-[#3b82f6]/5 border border-[#3b82f6]/20 rounded-3xl p-5 flex flex-col gap-3 hover:bg-[#3b82f6]/10 hover:border-[#3b82f6]/40 transition-all active:scale-95 text-left"
                >
                  <div className="w-10 h-10 rounded-2xl bg-[#3b82f6]/10 border border-[#3b82f6]/20 flex items-center justify-center">
                    <History size={18} className="text-[#3b82f6]" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">History</p>
                    <p className="text-[10px] text-neutral-500 mt-0.5">Recharges, turf & match bookings</p>
                  </div>
                </button>
              </div>

              {/* Recent recharge quick preview */}
              {walletHist.length > 0 && (
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-600 mb-3">Recent Recharges</p>
                  <div className="flex flex-col gap-2">
                    {walletHist.slice(0, 3).map(r => (
                      <div key={r.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{r.method === 'bkash' ? '📱' : r.method === 'nagad' ? '📲' : '🏦'}</span>
                          <div>
                            <p className="text-xs font-black text-white">৳{r.amount.toLocaleString()}</p>
                            <p className="text-[9px] text-neutral-600">{new Date(r.createdAt).toLocaleDateString('en-BD')}</p>
                          </div>
                        </div>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          r.status === 'approved' ? 'bg-[#00ff41]/10 border-[#00ff41]/30 text-[#00ff41]' :
                          r.status === 'rejected' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                          'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  {walletHist.length > 3 && (
                    <button onClick={() => setView('history')} className="mt-3 text-[10px] text-[#3b82f6] font-black underline">
                      View all →
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══ RECHARGE VIEW ═══ */}
        {view === 'recharge' && (
          <>
            <SubHeader title={step === 'home' ? 'Recharge Wallet' : step === 'amount' ? 'Select Amount' : step === 'method' ? 'Payment Method' : 'Complete Payment'} />
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

              {submitted && (
                <div className="flex flex-col items-center gap-4 py-12 text-center animate-in fade-in zoom-in duration-300">
                  <CheckCircle2 size={52} className="text-[#00ff41]" />
                  <div>
                    <p className="text-xl font-black text-[#00ff41]">Request Submitted!</p>
                    <p className="text-sm text-neutral-500 mt-1">We'll process your ৳{amount} recharge shortly.</p>
                  </div>
                </div>
              )}

              {!submitted && step === 'home' && (
                <div className="flex flex-col gap-3">
                  {/* Balance reminder */}
                  <div className="bg-[#00ff41]/5 border border-[#00ff41]/15 rounded-2xl px-4 py-3 flex items-center justify-between">
                    <p className="text-xs font-bold text-neutral-400">Current Balance</p>
                    <p className="text-lg font-black text-[#00ff41]">৳{balance.toLocaleString()}</p>
                  </div>
                  <button onClick={() => setStep('amount')}
                    className="w-full py-4 rounded-2xl bg-[#00ff41] text-black font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_20px_rgba(0,255,65,0.2)]">
                    <Zap size={15} /> Add Money <ChevronRight size={15} />
                  </button>
                  {/* Method preview chips */}
                  <div className="flex gap-2 justify-center mt-1">
                    {METHOD_OPTIONS.map(m => (
                      <div key={m.key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                        <span className="text-sm">{m.emoji}</span>
                        <span className="text-[10px] font-bold text-neutral-400">{m.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!submitted && step === 'amount' && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-4 gap-2">
                    {presets.map(p => (
                      <button key={p} onClick={() => setAmount(String(p))}
                        className={`py-3 rounded-2xl text-sm font-black border transition-all ${amount === String(p) ? 'bg-[#00ff41] text-black border-[#00ff41] shadow-[0_0_15px_rgba(0,255,65,0.2)]' : 'bg-white/5 border-white/10 hover:border-white/25 text-white'}`}>
                        ৳{p}
                      </button>
                    ))}
                  </div>
                  <input value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
                    placeholder="Custom amount (min ৳500)…"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:border-[#00ff41]/40 placeholder:text-neutral-600 text-white" />
                  <button onClick={() => Number(amount) >= 500 && setStep('method')}
                    disabled={!amount || Number(amount) < 500}
                    className="w-full py-4 rounded-2xl bg-[#00ff41] text-black font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40">
                    Continue with ৳{amount || '0'} <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {!submitted && step === 'method' && (
                <div className="flex flex-col gap-3">
                  {METHOD_OPTIONS.map(m => (
                    <button key={m.key} onClick={() => { setMethod(m.key); setStep('payment'); }}
                      className="flex items-center gap-4 p-4 rounded-2xl border border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/5 transition-all text-left">
                      <span className="text-3xl">{m.emoji}</span>
                      <div>
                        <p className="font-black text-white">{m.label}</p>
                        <p className="text-[10px] text-neutral-500">Send ৳{amount} via {m.label}</p>
                      </div>
                      <ChevronRight size={14} className="ml-auto text-neutral-500" />
                    </button>
                  ))}
                </div>
              )}

              {!submitted && step === 'payment' && method && (
                <div className="flex flex-col gap-4">
                  {activeMethod ? (
                    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Send ৳{amount} to this number</p>
                      <p className="text-2xl font-black tracking-widest text-white">{activeMethod.number}</p>
                      <p className="text-xs text-neutral-500">Account: <span className="font-bold text-white">{activeMethod.accountType}</span></p>
                      <p className="text-[10px] text-[#00ff41]/60 mt-1">After sending, upload your payment screenshot below.</p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl border border-dashed border-white/10 text-center text-sm text-neutral-500">Payment details not configured. Contact support.</div>
                  )}

                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Payment Screenshot <span className="text-red-400">*</span></p>
                    <div onClick={() => fileRef.current?.click()}
                      className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${screenshot ? 'border-[#00ff41]/40 bg-[#00ff41]/5' : 'border-white/10 hover:border-white/25 bg-white/[0.02]'}`}>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                      {screenshot
                        ? <><CheckCircle2 size={20} className="text-[#00ff41]" /><p className="text-xs font-bold text-[#00ff41]">{scrName}</p><p className="text-[9px] text-neutral-500">Tap to replace</p></>
                        : <><Upload size={20} className="text-neutral-500" /><p className="text-sm font-bold text-white">Upload screenshot</p><p className="text-[10px] text-neutral-500">PNG or JPG required</p></>}
                    </div>
                    {scrError && <p className="text-xs font-bold text-red-400">{scrError}</p>}
                  </div>

                  <button onClick={handleSubmit} disabled={submitting || !screenshot}
                    className="w-full py-4 rounded-2xl bg-[#00ff41] text-black font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-40">
                    {submitting ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    {submitting ? 'Submitting…' : 'Submit Recharge Request'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══ HISTORY VIEW ═══ */}
        {view === 'history' && (
          <>
            <SubHeader title="Transaction History" />
            {/* Sub-tabs */}
            <div className="flex gap-2 px-4 py-3 border-b border-white/5 shrink-0">
              {([
                { k: 'recharge',  l: '↑ Recharges' },
                { k: 'spending',  l: '⛳ Turf' },
                { k: 'cm_books', l: '⚔️ Matches' },
              ] as {k: HistTab; l: string}[]).map(t => (
                <button key={t.k} onClick={() => setHistTab(t.k)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${histTab === t.k ? 'bg-[#00ff41] text-black' : 'bg-white/5 text-neutral-500 hover:text-white'}`}>
                  {t.l}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {/* Recharge history */}
              {histTab === 'recharge' && (
                walletHist.length === 0
                  ? <div className="py-12 text-center text-neutral-600"><History size={28} className="mx-auto mb-2 opacity-40" /><p className="font-bold">No recharge history</p></div>
                  : walletHist.map(r => (
                    <div key={r.id} className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{r.method === 'bkash' ? '📱' : r.method === 'nagad' ? '📲' : '🏦'}</span>
                        <div>
                          <p className="text-sm font-black text-white">৳{r.amount.toLocaleString()}</p>
                          <p className="text-[10px] text-neutral-600">{new Date(r.createdAt).toLocaleDateString('en-BD')} · {r.method}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        r.status === 'approved' ? 'bg-[#00ff41]/10 border-[#00ff41]/30 text-[#00ff41]' :
                        r.status === 'rejected' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                        'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'}`}>
                        {r.status}
                      </span>
                    </div>
                  ))
              )}

              {/* Turf spending */}
              {histTab === 'spending' && (
                <>
                  <div className="flex items-center justify-between text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1">
                    <span>{turf.length} bookings</span>
                    <span>Total: ৳{turfTotal.toLocaleString()}</span>
                  </div>
                  {turf.length === 0
                    ? <div className="py-12 text-center text-neutral-600"><Calendar size={28} className="mx-auto mb-2 opacity-40" /><p className="font-bold">No turf bookings yet</p></div>
                    : turf.slice(0, 20).map(b => {
                      const sl = allSlots.find(s => s.id === b.slotId);
                      const tf = sl ? allTurfs.find(t => t.id === sl.turfId) : null;
                      const price = b.price ?? sl?.price ?? 0;
                      return (
                        <div key={b.id} className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
                          <div className="min-w-0">
                            <p className="text-xs font-black text-white truncate">{tf?.name || 'Turf Booking'}</p>
                            <p className="text-[10px] text-neutral-600">{b.date} · {sl?.startTime}–{sl?.endTime}</p>
                          </div>
                          <p className="text-sm font-black text-red-400 shrink-0">−৳{price.toLocaleString()}</p>
                        </div>
                      );
                    })
                  }
                </>
              )}

              {/* CM / Match bookings */}
              {histTab === 'cm_books' && (
                <>
                  <div className="flex items-center justify-between text-[10px] font-black text-neutral-600 uppercase tracking-widest mb-1">
                    <span>{cm.length} matches</span>
                    <span>Total: ৳{cmTotal.toLocaleString()}</span>
                  </div>
                  {cm.length === 0
                    ? <div className="py-12 text-center text-neutral-600"><Swords size={28} className="mx-auto mb-2 opacity-40" /><p className="font-bold">No match bookings</p></div>
                    : cm.slice(0, 20).map(b => {
                      const sl = allSlots.find(s => s.id === b.slotId);
                      const tf = sl ? allTurfs.find(t => t.id === sl.turfId) : null;
                      const price = b.price ?? sl?.price ?? 0;
                      return (
                        <div key={b.id} className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-fuchsia-900/10 border border-fuchsia-500/10">
                          <div className="min-w-0">
                            <p className="text-xs font-black text-fuchsia-100 truncate">{tf?.name || 'Challenge Match'}</p>
                            <p className="text-[10px] text-neutral-600">{b.date} · {sl?.startTime}–{sl?.endTime}</p>
                          </div>
                          <p className="text-sm font-black text-fuchsia-400 shrink-0">−৳{price.toLocaleString()}</p>
                        </div>
                      );
                    })
                  }
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
