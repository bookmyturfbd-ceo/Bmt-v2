'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getCookie } from '@/lib/cookies';
import {
  Lock, Unlock, Download, Eye, EyeOff, KeyRound,
  Banknote, CalendarDays, RefreshCw, FileText, ShieldCheck,
  X, Building2, CalendarCheck2, Wallet, ImageIcon, CheckCircle2,
  ChevronDown, ChevronRight, Loader2,
} from 'lucide-react';

/* ─── Proof Image Modal ─── */
function ProofModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
      <div className="relative z-10 max-w-lg w-full">
        <img src={url} alt="Payment proof" className="w-full rounded-2xl border border-white/10 shadow-2xl" />
        <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 bg-black/60 rounded-xl flex items-center justify-center border border-white/10">
          <X size={16} className="text-white" />
        </button>
      </div>
    </div>
  );
}


/* ─── Types ─── */
interface Slot    { id: string; turfId: string; groundId: string; startTime: string; endTime: string; price: number; sports?: string[]; }
interface Booking { id: string; slotId: string; turfId?: string; date: string; playerName?: string; price?: number; ownerShare?: number; bmtCut?: number; }
interface Turf    { id: string; name: string; ownerId: string; revenueModelType?: string; revenueModelValue?: number; }
interface MonthlyFee { id: string; turfId: string; turfName: string; month: string; amount: number; paid: boolean; paidAt?: string; }
interface Payout  { id: string; ownerId: string; amount: number; bmtCut?: number; date: string; method: string; txId: string; proofUrl?: string; }

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/* ─── Password Gate Modal ─── */
function PasswordModal({ mode, ownerId, onSuccess, onClose }: {
  mode: 'unlock' | 'set' | 'change';
  ownerId: string;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState('');
  const [val, setVal]         = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow]       = useState(false);
  const [error, setError]     = useState('');
  const [busy, setBusy]       = useState(false);
  const inputRef              = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

  const submit = async () => {
    if (busy) return;
    setError('');
    if (mode === 'unlock') {
      setBusy(true);
      const res = await fetch('/api/bmt/finance-lock', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', ownerId, password: val }),
      });
      const data = await res.json();
      setBusy(false);
      if (data.ok) onSuccess();
      else { setError('Incorrect password.'); setVal(''); }
      return;
    }
    if (mode === 'change' && !current) { setError('Enter your current password.'); return; }
    if (val.length < 4) { setError('Password must be at least 4 characters.'); return; }
    if (val !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    const res = await fetch('/api/bmt/finance-lock', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        mode === 'set'
          ? { action: 'set', ownerId, password: val }
          : { action: 'change', ownerId, currentPassword: current, newPassword: val }
      ),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) onSuccess();
    else setError(data.error || 'Failed.');
  };

  const titles = { unlock: 'Finance Locked', set: 'Set Finance Password', change: 'Change Password' };
  const subs   = { unlock: 'Enter your password to access Finance.', set: 'Lock Finance — only you can open it.', change: 'Verify current password, then set a new one.' };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={mode !== 'unlock' ? onClose : undefined} />
      <div className="relative z-10 w-full max-w-xs overflow-hidden rounded-3xl border border-white/10"
        style={{ background: 'linear-gradient(145deg, #0f1a0f, #0a0a0a 50%, #0d1a1a)' }}>
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, #00ff41, transparent)' }} />
        <div className="p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/30 flex items-center justify-center">
              <KeyRound size={22} className="text-accent" />
            </div>
            {mode !== 'unlock' && (
              <button onClick={onClose} className="w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5">
                <X size={14} />
              </button>
            )}
            {mode === 'unlock' && (
              <button onClick={onClose} className="w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5" title="Go back to Manage Slots">
                <X size={14} />
              </button>
            )}
          </div>
          <div>
            <h3 className="text-lg font-black text-white">{titles[mode]}</h3>
            <p className="text-xs text-neutral-400 mt-1">{subs[mode]}</p>
          </div>
          <div className="flex flex-col gap-2.5">
            {mode === 'change' && (
              <input ref={inputRef} type={show ? 'text' : 'password'} value={current} onChange={e => setCurrent(e.target.value)}
                placeholder="Current password…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-accent/50 placeholder:text-neutral-600" />
            )}
            <div className="relative">
              <input ref={mode !== 'change' ? inputRef : undefined} type={show ? 'text' : 'password'} value={val} onChange={e => setVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder={mode === 'unlock' ? 'Enter password' : 'New password…'}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm font-bold text-white outline-none focus:border-accent/50 placeholder:text-neutral-600" />
              <button onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {(mode === 'set' || mode === 'change') && (
              <input type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="Confirm password…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-accent/50 placeholder:text-neutral-600" />
            )}
            {error && <p className="text-xs font-bold text-red-400">{error}</p>}
          </div>
          <button onClick={submit} disabled={busy}
            className="w-full py-3 rounded-2xl bg-accent text-black font-black text-sm hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_20px_rgba(0,255,65,0.2)] disabled:opacity-60">
            {busy ? 'Please wait…' : mode === 'unlock' ? 'Unlock Finance' : 'Save Password'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Remove Lock Modal ─── */
function RemoveLockModal({ ownerId, onConfirm, onClose }: { ownerId: string; onConfirm: () => void; onClose: () => void }) {
  const [pw, setPw]     = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr]   = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (busy) return;
    setBusy(true);
    const res = await fetch('/api/bmt/finance-lock', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove', ownerId, password: pw }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.ok) onConfirm();
    else setErr(data.error || 'Incorrect password.');
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xs overflow-hidden rounded-3xl border border-orange-500/30" style={{ background: '#0a0a0a' }}>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-orange-400">Remove Password Lock</h3>
            <button onClick={onClose}><X size={14} /></button>
          </div>
          <p className="text-xs text-neutral-400">Enter your current password to confirm removal.</p>
          <div className="relative">
            <input type={show ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Current password…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm font-bold text-white outline-none focus:border-orange-500/50 placeholder:text-neutral-600" />
            <button onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
              {show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {err && <p className="text-xs text-red-400 font-bold">{err}</p>}
          <button onClick={submit}
            className="w-full py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 font-black text-sm hover:bg-orange-500/20 transition-colors">
            Confirm Remove
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Day Detail Modal ─── */
function DayDetailModal({ dateStr, bookings, slots, onClose }: {
  dateStr: string; bookings: Booking[]; slots: Slot[]; onClose: () => void;
}) {
  const dayBookings = bookings.filter(b => b.date === dateStr);
  return (
    <div className="fixed inset-0 z-[300] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-xl rounded-t-3xl border-t border-x border-[var(--panel-border)] overflow-hidden glass-panel"
        style={{ maxHeight: '85vh' }}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/25" />
        </div>
        <div className="h-0.5 mx-6 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #00ff41, transparent)' }} />
        <div className="px-5 pt-4 pb-8 overflow-y-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-base text-foreground">Day Breakdown</h3>
              <p className="text-xs text-[var(--muted)]">{new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-xl border border-[var(--panel-border)] flex items-center justify-center hover:bg-[var(--panel-bg-hover)]">
              <X size={14} />
            </button>
          </div>
          {dayBookings.length === 0 ? (
            <p className="text-sm text-center py-8 text-[var(--muted)]">No bookings recorded for this day.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {dayBookings.map((b, i) => {
                const sl = slots.find(s => s.id === b.slotId);
                const net = b.ownerShare ?? b.price ?? sl?.price ?? 0;
                return (
                  <div key={b.id ?? i} className="flex items-center gap-3 p-4 rounded-xl bg-accent/5 border border-accent/10">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-accent/10 border border-accent/20">
                      <span className="text-sm font-black text-accent">#{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-foreground truncate">{b.playerName || 'Player'}</p>
                      <p className="text-xs mt-0.5 text-[var(--muted)]">
                        {sl ? `${sl.startTime} – ${sl.endTime}` : 'Slot not found'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-base font-black text-accent">৳{net.toLocaleString()}</p>
                      {b.bmtCut !== undefined && b.bmtCut > 0 && (
                        <p className="text-[10px] text-[var(--muted)]">BMT: ৳{b.bmtCut.toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl mt-1 bg-accent/8 border border-accent/20">
                <span className="text-xs font-black uppercase tracking-widest text-accent/70">Day Total</span>
                <span className="text-lg font-black text-accent">
                  ৳{dayBookings.reduce((s, b) => {
                    const sl = slots.find(s2 => s2.id === b.slotId);
                    return s + (b.ownerShare ?? b.price ?? sl?.price ?? 0);
                  }, 0).toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main FinancePanel ─── */
export default function FinancePanel() {
  const [unlocked, setUnlocked]   = useState(false);
  const [hasLock, setHasLock]     = useState(false);
  const [showModal, setShowModal] = useState<'unlock' | 'set' | 'change' | 'remove' | null>(null);

  const [turfs, setTurfs]       = useState<Turf[]>([]);
  const [slots, setSlots]       = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [payouts, setPayouts]   = useState<Payout[]>([]);
  const [ownerWallet, setOwnerWallet] = useState<number>(0);
  const [monthlyFees, setMonthlyFees] = useState<MonthlyFee[]>([]);
  const [feesPaying, setFeesPaying] = useState<string | null>(null); // id being processed
  const [loading, setLoading]   = useState(true);
  const [downloading, setDownloading] = useState(false);

  const [showClearance, setShowClearance] = useState(false);
  const [showDayBreak, setShowDayBreak]   = useState(false);
  const [dayDetail, setDayDetail]         = useState<string | null>(null);
  const [proofModal, setProofModal]       = useState<string | null>(null);

  const now = new Date();
  const [selYear, setSelYear]   = useState(() => {
    if (typeof window !== 'undefined') {
       const y = localStorage.getItem('bmt_finance_year');
       if (y) return parseInt(y, 10);
    }
    return now.getFullYear();
  });
  const [selMonth, setSelMonth] = useState(() => {
    if (typeof window !== 'undefined') {
       const m = localStorage.getItem('bmt_finance_month');
       if (m) return parseInt(m, 10);
    }
    return now.getMonth();
  });

  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [conclusions, setConclusions]     = useState<any[]>([]);

  useEffect(() => {
    localStorage.setItem('bmt_finance_year', selYear.toString());
    localStorage.setItem('bmt_finance_month', selMonth.toString());
  }, [selYear, selMonth]);

  const ownerId = getCookie('bmt_owner_id');

  const currentMonth = new Date().toISOString().slice(0, 7);

  const loadFees = useCallback(async () => {
    if (!ownerId) return;
    // generate if not yet created, then fetch
    await fetch('/api/bmt/monthly-fees', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate', month: currentMonth }),
    });
    const data = await fetch(`/api/bmt/monthly-fees?month=${currentMonth}`).then(r => r.json());
    setMonthlyFees(Array.isArray(data) ? data.filter((f: MonthlyFee) => f.turfId && turfs.some((t: Turf) => t.id === f.turfId && t.ownerId === ownerId)) : []);
  }, [ownerId, currentMonth, turfs]);

  const load = useCallback(async () => {
    setLoading(true);
    const [ts, ss, bs, ps, ownersAll, ledgerData] = await Promise.all([
      fetch('/api/bmt/turfs').then(r => r.json()),
      fetch('/api/bmt/slots').then(r => r.json()),
      fetch('/api/bmt/bookings').then(r => r.json()),
      fetch('/api/bmt/payouts').then(r => r.json()),
      fetch('/api/bmt/owners').then(r => r.json()),
      fetch('/api/bmt/ledger').then(r => r.json()),
    ]);
    setTurfs(Array.isArray(ts) ? ts : []);
    setSlots(Array.isArray(ss) ? ss : []);
    setBookings(Array.isArray(bs) ? bs : []);
    setPayouts(Array.isArray(ps) ? ps : []);
    if (ledgerData) {
      setLedgerEntries(Array.isArray(ledgerData.entries) ? ledgerData.entries : []);
      setConclusions(Array.isArray(ledgerData.conclusions) ? ledgerData.conclusions : []);
    }
    const ownerData = Array.isArray(ownersAll) ? ownersAll.find((o: any) => o.id === ownerId) : null;
    setOwnerWallet(ownerData?.walletBalance ?? 0);
    setLoading(false);
  }, [ownerId]);

  // Load fees after turfs are known
  useEffect(() => { if (!loading && turfs.length > 0) loadFees(); }, [loading, turfs, loadFees]);

  useEffect(() => {
    if (!ownerId) { setUnlocked(true); load(); return; }
    fetch(`/api/bmt/finance-lock?ownerId=${ownerId}`)
      .then(r => r.json())
      .then(data => {
        setHasLock(!!data.hasLock);
        if (data.hasLock) setShowModal('unlock');
        else { setUnlocked(true); load(); }
      })
      .catch(() => { setUnlocked(true); load(); });
  }, [load, ownerId]);

  useEffect(() => { if (unlocked) load(); }, [unlocked, load]);

  /* ─── Derived data ─── */
  const myTurfs   = turfs.filter(t => t.ownerId === ownerId);
  const myTurfIds = new Set(myTurfs.map(t => t.id));
  const mySlots   = slots.filter(s => myTurfIds.has(s.turfId));
  const mySlotIds = new Set(mySlots.map(s => s.id));
  const myBookings = bookings.filter(b => {
    if (b.slotId && mySlotIds.has(b.slotId)) return true;
    if (b.turfId && myTurfIds.has(b.turfId)) return true;
    return false;
  });

  /* Revenue = sum of ownerShare if present, else calculate from revenueModel */
  const calcRevenue = (bkgs: Booking[]) => {
    return bkgs.reduce((sum, b) => {
      if (b.ownerShare !== undefined) return sum + b.ownerShare;
      // Legacy / fallback
      const slot  = mySlots.find(s => s.id === b.slotId);
      const turf  = slot
        ? myTurfs.find(t => t.id === slot.turfId)
        : (b.turfId ? myTurfs.find(t => t.id === b.turfId) : null);
      const gross = b.price ?? slot?.price ?? 0;
      if (turf?.revenueModelType === 'percentage' && turf.revenueModelValue) {
        return sum + Math.round(gross * (1 - turf.revenueModelValue / 100));
      }
      return sum + gross;
    }, 0);
  };

  const lifetimeBookings = myBookings.length;
  const lifetimeIncome   = calcRevenue(myBookings);

  /* Wallet / payouts */
  const myPayouts      = payouts.filter(p => p.ownerId === ownerId);
  const clearedHistory = myPayouts.sort((a, b) => b.date.localeCompare(a.date));

  /* Month filter */
  const monthPrefix   = `${selYear}-${String(selMonth + 1).padStart(2, '0')}`;
  const monthBookings = myBookings.filter(b => b.date?.startsWith(monthPrefix));
  const monthTotal    = monthBookings.length;
  const monthIncome   = calcRevenue(monthBookings);

  // --- LEDGER LOGIC ---
  const currentLedgerEntries = ledgerEntries.filter(e => e.month === monthPrefix && e.ownerId === ownerId);
  const currentConclusion = conclusions.find(c => c.month === monthPrefix && c.ownerId === ownerId);

  const totalWalkIn = currentLedgerEntries.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const totalCost = currentLedgerEntries.filter(e => e.type === 'cost').reduce((s, e) => s + e.amount, 0);
  const totalAppIncome = currentConclusion ? currentConclusion.totalAppIncome : monthIncome;
  const netProfit = currentConclusion ? currentConclusion.netProfit : (totalAppIncome + totalWalkIn - totalCost);

  const [ledgerType, setLedgerType] = useState<'cost'|'income'>('cost');
  const [ledgerCat, setLedgerCat] = useState('staff');
  const [ledgerDesc, setLedgerDesc] = useState('');
  const [ledgerAmt, setLedgerAmt] = useState('');
  const [addingLedger, setAddingLedger] = useState(false);
  const [concluding, setConcluding] = useState(false);

  const addLedgerEntry = async () => {
    if (!ledgerDesc || !ledgerAmt) return;
    setAddingLedger(true);
    const body = {
      action: 'addEntry', ownerId, month: monthPrefix,
      type: ledgerType, category: ledgerCat, description: ledgerDesc, amount: Number(ledgerAmt),
    };
    const res = await fetch('/api/bmt/ledger', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if(res.ok) {
       const newEntry = await res.json();
       setLedgerEntries(prev => [...prev, newEntry]);
       setLedgerDesc(''); setLedgerAmt('');
    }
    setAddingLedger(false);
  };

  const deleteLedgerEntry = async (id: string) => {
    const res = await fetch('/api/bmt/ledger', { method: 'DELETE', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action: 'deleteEntry', id}) });
    if(res.ok) setLedgerEntries(prev => prev.filter(e => e.id !== id));
  };

  const concludeMonth = async () => {
    if (!confirm(`Are you sure you want to conclude the P&L for ${MONTH_NAMES[selMonth]} ${selYear}? This will permanently lock the ledger for this month.`)) return;
    setConcluding(true);
    const body = {
      action: 'concludeMonth', ownerId, month: monthPrefix,
      totalAppIncome, totalWalkIn, totalCost, netProfit
    };
    const res = await fetch('/api/bmt/ledger', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if(res.ok) {
      const newConc = await res.json();
      setConclusions(prev => [...prev, newConc]);
    } else {
      alert("Error concluding month.");
    }
    setConcluding(false);
  };
  // --------------------

  const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
  const dayRows = Array.from({ length: daysInMonth }, (_, i) => {
    const day      = i + 1;
    const dateStr  = `${monthPrefix}-${String(day).padStart(2, '0')}`;
    const daybkgs  = monthBookings.filter(b => b.date === dateStr);
    const earned   = calcRevenue(daybkgs);
    return { day, dateStr, count: daybkgs.length, earned };
  }).filter(r => r.count > 0);

  /* PDF */
  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const turfNames = myTurfs.map(t => t.name).join(', ') || 'Your Turf';

      doc.setFillColor(10, 10, 10); doc.rect(0, 0, 210, 297, 'F');
      doc.setTextColor(0, 255, 65); doc.setFontSize(20); doc.setFont('helvetica', 'bold');
      doc.text('BOOK MY TURF', 14, 20);
      doc.setTextColor(200, 200, 200); doc.setFontSize(11);
      doc.text('Monthly Booking & Earnings Report', 14, 28);
      doc.setTextColor(150, 150, 150); doc.setFontSize(9);
      doc.text(`Turf: ${turfNames}`, 14, 36);
      doc.text(`Period: ${MONTH_NAMES[selMonth]} ${selYear}`, 14, 42);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}`, 14, 48);

      doc.setFillColor(20, 40, 20); doc.roundedRect(14, 54, 85, 22, 3, 3, 'F');
      doc.setTextColor(0, 255, 65); doc.setFontSize(8);
      doc.text('TOTAL BOOKINGS', 20, 62); doc.setFontSize(18); doc.text(String(monthTotal), 20, 72);
      doc.setFillColor(20, 40, 20); doc.roundedRect(111, 54, 85, 22, 3, 3, 'F');
      doc.setTextColor(0, 255, 65); doc.setFontSize(8);
      doc.text('NET INCOME (AFTER PLATFORM CUT)', 117, 62);
      doc.setFontSize(18); doc.text(`BDT ${monthIncome.toLocaleString()}`, 117, 72);

      const filteredDays = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dateStr = `${monthPrefix}-${String(day).padStart(2, '0')}`;
        const daybkgs = monthBookings.filter(b => b.date === dateStr);
        return { dateStr, count: daybkgs.length, earned: calcRevenue(daybkgs) };
      }).filter(r => r.count > 0);

      autoTable(doc, {
        startY: 84,
        head: [['Date', 'Bookings', 'Net Earned (BDT)']],
        body: filteredDays.map(r => [r.dateStr, r.count, r.earned.toLocaleString()]),
        styles: { fillColor: [15,15,15], textColor: [200,200,200], fontSize: 9, lineColor: [40,40,40], lineWidth: 0.3 },
        headStyles: { fillColor: [0,40,0], textColor: [0,255,65], fontStyle: 'bold', fontSize: 9 },
        alternateRowStyles: { fillColor: [20,20,20] },
        margin: { left: 14, right: 14 },
      });

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i); doc.setTextColor(80,80,80); doc.setFontSize(7);
        doc.text('bookmyturf.com  •  Confidential', 14, 290);
        doc.text(`Page ${i} of ${pageCount}`, 196, 290, { align: 'right' });
      }
      doc.save(`BMT-Finance-${MONTH_NAMES[selMonth]}-${selYear}.pdf`);
    } catch (e) { console.error(e); alert('PDF generation failed.'); }
    setDownloading(false);
  };

  if (!unlocked) return (
    <>
      {showModal === 'unlock' && <PasswordModal mode="unlock" ownerId={ownerId || ''} onSuccess={() => { setUnlocked(true); setShowModal(null); }} onClose={() => { window.location.href = '/en/dashboard/owner'; }} />}
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <div className="w-16 h-16 rounded-3xl bg-accent/5 border border-accent/20 flex items-center justify-center">
          <Lock size={28} className="text-accent/60" />
        </div>
        <p className="text-lg font-black">Finance is locked</p>
        <button onClick={() => setShowModal('unlock')} className="px-6 py-2.5 rounded-xl bg-accent/10 border border-accent/30 text-accent text-sm font-bold hover:bg-accent/20 transition-colors">
          Unlock Finance
        </button>
      </div>
    </>
  );

  return (
    <>
      {showModal === 'set'    && <PasswordModal mode="set"    ownerId={ownerId || ''} onSuccess={() => { setHasLock(true); setShowModal(null); }} onClose={() => setShowModal(null)} />}
      {showModal === 'change' && <PasswordModal mode="change" ownerId={ownerId || ''} onSuccess={() => { setShowModal(null); }}               onClose={() => setShowModal(null)} />}
      {showModal === 'remove' && <RemoveLockModal ownerId={ownerId || ''} onConfirm={() => { setHasLock(false); setShowModal(null); }} onClose={() => setShowModal(null)} />}
      {dayDetail  && <DayDetailModal dateStr={dayDetail} bookings={myBookings} slots={mySlots} onClose={() => setDayDetail(null)} />}
      {proofModal && <ProofModal url={proofModal} onClose={() => setProofModal(null)} />}

      <div className="flex flex-col gap-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Finance</h2>
            <p className="text-sm text-[var(--muted)] mt-0.5">Earnings, wallet balance, and reports.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {hasLock ? (
              <>
                <button onClick={() => setShowModal('remove')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-xs font-bold text-orange-400 hover:opacity-80 transition-all">
                  <Unlock size={12} /> Remove Lock
                </button>
                <button onClick={() => setShowModal('change')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-xs font-bold hover:opacity-80 transition-all">
                  <KeyRound size={12} /> Change PW
                </button>
              </>
            ) : (
              <button onClick={() => setShowModal('set')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-xs font-bold hover:opacity-80 transition-all">
                <Lock size={12} /> Set Password
              </button>
            )}
            <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-xs font-bold hover:opacity-80 transition-all disabled:opacity-50">
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* ── 1. Lifetime Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="glass-panel border border-[var(--panel-border)] rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Total Turfs</p>
              <Building2 size={14} className="text-blue-400" />
            </div>
            <p className="text-3xl font-black text-blue-400">{loading ? '—' : myTurfs.length}</p>
            <p className="text-[9px] text-[var(--muted)]">All time</p>
          </div>
          <div className="glass-panel border border-[var(--panel-border)] rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Lifetime Bookings</p>
              <CalendarCheck2 size={14} className="text-accent" />
            </div>
            <p className="text-3xl font-black text-accent">{loading ? '—' : lifetimeBookings}</p>
            <p className="text-[9px] text-[var(--muted)]">All turfs</p>
          </div>
          <div className="glass-panel border border-accent/20 rounded-2xl p-4 flex flex-col gap-2"
            style={{ background: 'linear-gradient(135deg, rgba(0,255,65,0.06), transparent)' }}>
            <div className="flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-widest text-accent/60">Lifetime Income</p>
              <Banknote size={14} className="text-accent" />
            </div>
            <p className="text-2xl font-black text-accent leading-tight">{loading ? '—' : `৳${lifetimeIncome.toLocaleString()}`}</p>
            <p className="text-[9px] text-accent/50">After platform cut</p>
          </div>
        </div>

        {/* ── 2. Report Month + Download ── */}
        <div className="glass-panel border border-[var(--panel-border)] rounded-2xl p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-accent" />
            <span className="text-sm font-black">Report Month</span>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))}
              className="flex-1 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-accent/50">
              {MONTH_NAMES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
              className="w-24 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-accent/50">
              {[now.getFullYear() - 1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button onClick={downloadPDF} disabled={downloading || monthTotal === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-black font-black text-xs hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-[0_4px_16px_rgba(0,255,65,0.2)]">
            <Download size={13} className={downloading ? 'animate-bounce' : ''} />
            {downloading ? 'Generating…' : 'Download PDF'}
          </button>
        </div>

        {/* ── 3. Monthly Summary ── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-panel border border-[var(--panel-border)] rounded-2xl p-4 flex flex-col gap-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Bookings in {MONTH_NAMES[selMonth]}</p>
            <p className="text-4xl font-black">{loading ? '—' : monthTotal}</p>
            <p className="text-[10px] text-[var(--muted)]">{selYear}</p>
          </div>
          <div className="glass-panel border border-accent/20 rounded-2xl p-4 flex flex-col gap-1"
            style={{ background: 'linear-gradient(135deg, rgba(0,255,65,0.06), transparent)' }}>
            <p className="text-[9px] font-black uppercase tracking-widest text-accent/60">Earnings in {MONTH_NAMES[selMonth]}</p>
            <p className="text-4xl font-black text-accent">{loading ? '—' : `৳${monthIncome.toLocaleString()}`}</p>
            <p className="text-[10px] text-accent/50">After platform cut · {selYear}</p>
          </div>
        </div>

        {/* ── 4. Current Wallet Balance + Clearance History (collapsible) ── */}
        <div className="glass-panel border border-[var(--panel-border)] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-2 border-b border-[var(--panel-border)]">
            <Wallet size={15} className="text-accent" />
            <span className="font-black text-sm">Current Wallet Balance</span>
            <span className="ml-auto text-[9px] font-bold text-[var(--muted)] uppercase tracking-widest">Pending Disbursement</span>
          </div>
          <div className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-widest mb-1">Available Balance</p>
                <p className={`text-4xl font-black ${ownerWallet > 0 ? 'text-accent' : 'text-[var(--muted)]'}`}>
                  {loading ? '—' : `৳${ownerWallet.toLocaleString()}`}
                </p>
                <p className="text-[10px] text-[var(--muted)] mt-1">Clears when BMT admin disburses payment</p>
              </div>
              {ownerWallet > 0 && (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-accent animate-pulse shadow-[0_0_12px_rgba(0,255,65,0.8)]" />
                  <span className="text-[8px] font-black text-accent uppercase tracking-widest">Pending</span>
                </div>
              )}
            </div>

            {/* Clearance History — collapsible */}
            <button onClick={() => setShowClearance(s => !s)}
              className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[var(--muted)] hover:text-foreground transition-colors">
              {showClearance ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Clearance History
              {clearedHistory.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-accent/10 text-accent border border-accent/20">
                  {clearedHistory.length}
                </span>
              )}
            </button>

            {showClearance && (
              <div className="flex flex-col gap-2">
                {clearedHistory.length === 0 ? (
                  <p className="text-xs text-[var(--muted)] text-center py-4">No clearances yet. Balance will appear here after admin disburses.</p>
                ) : (
                  clearedHistory.map(p => (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5" style={{ background: 'rgba(0,255,65,0.02)' }}>
                      <CheckCircle2 size={14} className="text-accent shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black">৳{p.amount.toLocaleString()} cleared</p>
                        <p className="text-[9px] text-[var(--muted)]">{p.date} · {p.method}</p>
                        <p className="text-[9px] text-[var(--muted)] font-mono truncate">Ref: {p.txId}</p>
                      </div>
                      {p.proofUrl && (
                        <button onClick={() => setProofModal(p.proofUrl!)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/10 border border-accent/20 text-[9px] font-bold text-accent hover:bg-accent/20 transition-colors shrink-0">
                          <ImageIcon size={10} /> Proof
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 5. Day-by-Day Breakdown (collapsible) ── */}
        <div className="glass-panel border border-[var(--panel-border)] rounded-2xl overflow-hidden">
          <button onClick={() => setShowDayBreak(s => !s)}
            className="w-full px-5 py-4 flex items-center gap-2 hover:bg-white/[0.02] transition-colors">
            <ShieldCheck size={15} className="text-accent" />
            <span className="font-black text-sm">Day-by-Day Breakdown</span>
            <span className="ml-2 text-[10px] text-[var(--muted)]">{MONTH_NAMES[selMonth]} {selYear}</span>
            <span className="ml-auto text-[var(--muted)]">
              {showDayBreak ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
          </button>

          {showDayBreak && (
            loading ? (
              <div className="flex items-center justify-center py-10 text-[var(--muted)]">
                <Loader2 size={18} className="animate-spin mr-2" /> Loading…
              </div>
            ) : dayRows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center border-t border-[var(--panel-border)]">
                <FileText size={24} className="text-[var(--muted)]" />
                <p className="font-bold text-[var(--muted)]">No bookings in {MONTH_NAMES[selMonth]} {selYear}</p>
              </div>
            ) : (
              <div className="border-t border-[var(--panel-border)]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--panel-border)]">
                      {['Day', 'Date', 'Bookings', 'Net Earned', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left font-black text-[10px] uppercase tracking-widest text-[var(--muted)]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dayRows.map(r => (
                      <tr key={r.day} onClick={() => setDayDetail(r.dateStr)}
                        className="border-b border-[var(--panel-border)] hover:bg-accent/5 transition-colors cursor-pointer">
                        <td className="px-4 py-3 font-bold text-[var(--muted)]">
                          {new Date(r.dateStr).toLocaleDateString('en-US', { weekday: 'short' })}
                        </td>
                        <td className="px-4 py-3 font-bold">{r.dateStr}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent/10 text-accent font-black text-[10px]">{r.count}</span>
                        </td>
                        <td className="px-4 py-3 font-black text-accent">৳{r.earned.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[var(--muted)]">
                          <ChevronRight size={13} />
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-accent/20 bg-accent/5">
                      <td colSpan={2} className="px-4 py-3 font-black text-[10px] uppercase tracking-widest text-accent">Monthly Total</td>
                      <td className="px-4 py-3 text-center font-black text-accent">{monthTotal}</td>
                      <td className="px-4 py-3 font-black text-accent text-sm">৳{monthIncome.toLocaleString()}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* ── 6. Monthly Platform Fee (monthly-model turfs only) ── */}
        {(() => {
          if (monthlyFees.length === 0) return null;
          const totalFee   = monthlyFees.reduce((s, f) => s + f.amount, 0);
          const unpaidFees = monthlyFees.filter(f => !f.paid);
          const paidFees   = monthlyFees.filter(f => f.paid);
          return (
            <div className="glass-panel border border-blue-500/20 rounded-2xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.04), transparent)' }}>
              <div className="px-5 py-4 flex items-center justify-between border-b border-blue-500/15">
                <div className="flex items-center gap-2">
                  <CalendarDays size={15} className="text-blue-400" />
                  <span className="font-black text-sm">Monthly Platform Fee</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 ml-1">{currentMonth}</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-widest">Total Due</p>
                  <p className={`text-lg font-black ${unpaidFees.length > 0 ? 'text-orange-400' : 'text-blue-400'}`}>৳{totalFee.toLocaleString()}</p>
                </div>
              </div>
              <div className="p-4 flex flex-col gap-2">
                {monthlyFees.map(fee => (
                  <div key={fee.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    fee.paid
                      ? 'border-blue-500/15 bg-blue-500/5 opacity-75'
                      : 'border-orange-500/20 bg-orange-500/5'
                  }`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black truncate">{fee.turfName}</p>
                      <p className="text-[10px] text-[var(--muted)] mt-0.5">
                        {fee.paid
                          ? `✓ Paid ${fee.paidAt ? 'on ' + new Date(fee.paidAt).toLocaleDateString() : ''}`
                          : `Due for ${fee.month} — pending`}
                      </p>
                    </div>
                    <p className={`text-base font-black shrink-0 ${ fee.paid ? 'text-blue-400' : 'text-orange-400'}`}>
                      ৳{fee.amount.toLocaleString()}
                    </p>
                    <button
                      disabled={fee.paid || feesPaying === fee.id}
                      onClick={async () => {
                        setFeesPaying(fee.id);
                        await fetch('/api/bmt/monthly-fees', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'markPaid', id: fee.id }),
                        });
                        await loadFees();
                        setFeesPaying(null);
                      }}
                      className={`shrink-0 text-[10px] font-black px-3 py-2 rounded-xl transition-all active:scale-95 ${
                        fee.paid
                          ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400 cursor-default'
                          : 'bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20'
                      }`}>
                      {feesPaying === fee.id
                        ? '...'
                        : fee.paid ? '✓ Cleared' : 'Mark Paid'}
                    </button>
                  </div>
                ))}
                {unpaidFees.length === 0 && (
                  <p className="text-center text-xs text-blue-400 font-bold py-2">✓ All fees cleared for {currentMonth}</p>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── 6. Monthly Ledger / P&L ── */}
        <div className="mt-8 mb-4">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-px bg-[var(--panel-border)] flex-1" />
            <span className="text-sm font-black uppercase tracking-widest text-[var(--muted)] hover:text-white transition-colors cursor-default">Monthly P&L Ledger</span>
            <div className="h-px bg-[var(--panel-border)] flex-1" />
          </div>

          <div id="ledger-printable-area" className={`glass-panel border ${currentConclusion ? 'border-orange-500/30 bg-orange-500/[0.02]' : 'border-[var(--panel-border)]'} rounded-3xl overflow-hidden p-5 flex flex-col gap-6`}>
            {/* Header: Select Month & Print */}
            <div className="flex items-center justify-between">
              <div>
                <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))} className="bg-transparent text-lg font-black outline-none border-none cursor-pointer hover:opacity-80 transition-opacity appearance-none text-current">
                  {MONTH_NAMES.map((m, i) => <option key={m} value={i} className="text-black bg-white dark:bg-neutral-900 dark:text-white text-sm">{m}</option>)}
                </select>
                <select value={selYear} onChange={e => setSelYear(Number(e.target.value))} className="bg-transparent text-lg font-black outline-none border-none text-accent cursor-pointer ml-2 hover:opacity-80 transition-opacity appearance-none text-current">
                  {[...Array(5)].map((_, i) => { const y = now.getFullYear() - 2 + i; return <option key={y} value={y} className="text-black bg-white dark:bg-neutral-900 dark:text-white text-sm">{y}</option>; })}
                </select>
              </div>
              <button onClick={() => window.print()} className="flex items-center justify-center px-3 h-9 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-border)] hover:opacity-80 transition-opacity">
                <FileText size={14} className="mr-2" /> <span className="text-[10px] font-bold uppercase tracking-wider">Save PDF</span>
              </button>
            </div>

            {/* Hero Auto-Calculation */}
            <div className="p-5 rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-border)]/50 flex flex-col gap-4 relative overflow-hidden">
              {currentConclusion && <div className="absolute top-0 right-0 bg-orange-500 text-black text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl shadow-lg">Concluded</div>}
              <h2 className="text-xl font-black">Net Financials</h2>
              <div className="flex flex-col gap-2 text-sm font-bold">
                <div className="flex items-center gap-2 opacity-80">
                  <span>App Bookings:</span>
                  <span className="font-black">৳{totalAppIncome.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 opacity-80">
                  <span>Walk-in Income:</span>
                  <span className="text-accent">৳{totalWalkIn.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 opacity-80">
                  <span>Operating Costs:</span>
                  <span className="text-red-500">৳{totalCost.toLocaleString()}</span>
                </div>
              </div>
              <div className="h-px bg-[var(--panel-border)] w-full" />
              <div className="flex justify-between items-center">
                <span className="text-sm font-black text-[var(--muted)] uppercase tracking-widest">Final Profit/Loss</span>
                <span className={`text-2xl font-black ${netProfit < 0 ? 'text-red-500' : 'text-accent'}`}>
                  {netProfit < 0 ? '-' : ''}৳{Math.abs(netProfit).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Entries List & Form */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-black tracking-widest uppercase text-[var(--muted)]">Record Entries</h3>
              
              {!currentConclusion && (
                <div className="flex flex-col gap-3 p-4 rounded-xl border-2 border-dashed border-black/20 dark:border-white/20">
                  <div className="flex gap-3">
                    <select value={ledgerType} onChange={e => { setLedgerType(e.target.value as any); setLedgerCat(e.target.value === 'cost' ? 'staff' : 'walk-in'); }} className="bg-transparent border border-black/20 dark:border-white/20 rounded-xl px-3 py-3 text-sm font-bold outline-none flex-1 max-w-[120px] text-current focus:border-accent">
                      <option value="cost" className="text-black bg-white dark:bg-neutral-900 dark:text-white">Cost</option>
                      <option value="income" className="text-black bg-white dark:bg-neutral-900 dark:text-white">Income</option>
                    </select>
                    <select value={ledgerCat} onChange={e => setLedgerCat(e.target.value)} className="bg-transparent border border-black/20 dark:border-white/20 rounded-xl px-3 py-3 text-sm font-bold outline-none flex-1 text-current focus:border-accent">
                      {ledgerType === 'cost' ? (
                        <><option className="text-black bg-white dark:bg-neutral-900 dark:text-white" value="staff">Staff Salary</option><option className="text-black bg-white dark:bg-neutral-900 dark:text-white" value="facility">Facility Cost</option><option className="text-black bg-white dark:bg-neutral-900 dark:text-white" value="other">Other Cost</option></>
                      ) : (
                        <><option className="text-black bg-white dark:bg-neutral-900 dark:text-white" value="walk-in">Walk-in Booking</option><option className="text-black bg-white dark:bg-neutral-900 dark:text-white" value="other">Other Income</option></>
                      )}
                    </select>
                  </div>
                  <div className="flex gap-3">
                    <input type="text" placeholder="Description..." value={ledgerDesc} onChange={e => setLedgerDesc(e.target.value)} className="bg-transparent border border-black/20 dark:border-white/20 rounded-xl px-4 py-3 outline-none flex-1 font-bold text-sm placeholder:font-normal placeholder:text-[var(--muted)] text-current focus:border-accent" />
                    <input type="number" placeholder="Tk" value={ledgerAmt} onChange={e => setLedgerAmt(e.target.value)} onKeyDown={e => e.key === 'Enter' && addLedgerEntry()} className="bg-transparent border border-black/20 dark:border-white/20 rounded-xl px-4 py-3 outline-none w-28 font-black text-sm placeholder:font-normal placeholder:text-[var(--muted)] text-current focus:border-accent" />
                    <button onClick={addLedgerEntry} disabled={addingLedger || !ledgerDesc || !ledgerAmt} className="w-14 items-center justify-center flex bg-accent text-black rounded-xl hover:brightness-110 disabled:opacity-50 transition-all shadow-md">
                      {addingLedger ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={18} />}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 mt-2">
                {currentLedgerEntries.length === 0 ? (
                  <p className="text-xs text-center py-6 text-[var(--muted)] font-bold">No custom entries this month.</p>
                ) : (
                  currentLedgerEntries.map(e => (
                    <div key={e.id} className="flex items-center justify-between p-3 rounded-xl border border-[var(--panel-border)]">
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-black truncate">{e.description} <span className="text-[9px] uppercase tracking-wider text-[var(--muted)] font-bold ml-1 px-1 border border-[var(--panel-border)] rounded">{e.category}</span></span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs font-black ${e.type === 'cost' ? 'text-red-500' : 'text-accent'}`}>{e.type === 'cost' ? '-' : '+'}৳{e.amount.toLocaleString()}</span>
                        {!currentConclusion && (
                          <button onClick={() => deleteLedgerEntry(e.id)} className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-500/10 text-red-500 transition-colors">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Conclude Button */}
            {!currentConclusion && (
              <button onClick={concludeMonth} disabled={concluding} className="mt-4 w-full py-4 rounded-xl border-2 border-orange-500/20 bg-orange-500/10 text-orange-400 font-black text-xs uppercase tracking-widest hover:bg-orange-500/20 active:scale-[0.98] transition-all disabled:opacity-50">
                {concluding ? 'CONCLUDING...' : 'CONCLUDE MONTH'}
              </button>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
