'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Wallet, TrendingUp, Clock, Download, Eye, X, Upload,
  CheckCircle2, Loader2, Filter, Calendar, ChevronDown, FileText,
} from 'lucide-react';
import { useApiEntity } from '@/hooks/useApiEntity';
import { uploadFileToCDN } from '@/lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Types ────────────────────────────────────────────────────────────────────
interface Owner  { id: string; name: string; email: string; walletBalance?: number; pendingBmtCut?: number; }
interface Turf   { id: string; name: string; ownerId: string; status: string; revenueModelType?: string; revenueModelValue?: number; }
interface Booking { id: string; turfId: string; price?: number; bmtCut?: number; date: string; }
interface Payout {
  id: string; ownerId: string; ownerName: string; turfName: string;
  amount: number; bmtCut: number; date: string;
  method: 'bank' | 'bkash' | 'cash'; txId: string; proofUrl?: string;
}
interface MonthlyFee {
  id: string; turfId: string; ownerId: string; turfName: string; ownerName: string;
  month: string; amount: number; paid: boolean; paidAt?: string;
}

const METHOD_LABELS: Record<string, string> = {
  bank: 'Bank Transfer', bkash: 'Mobile/bKash', cash: 'Cash',
};

function fmt(n: number) { return 'BDT ' + n.toLocaleString('en-BD'); }

// ── Disburse Modal ───────────────────────────────────────────────────────────
function DisburseModal({ owner, turf, balance, onClose, onDone }: {
  owner: Owner; turf?: Turf; balance: number; onClose: () => void; onDone: () => void;
}) {
  const [method,  setMethod]  = useState<'bank' | 'bkash' | 'cash'>('bank');
  const [txId,    setTxId]    = useState('');
  const [proof,   setProof]   = useState('');
  const [proofName, setProofName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [done,    setDone]    = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setProofName(file.name);
    setSaving(true);
    try {
      setProof(await uploadFileToCDN(file, 'payouts'));
    } catch (err) {
      alert("Upload failed. Make sure the 'bmt-public' bucket exists in your Supabase dashboard.");
    } finally {
      setSaving(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const confirm = async () => {
    // Must provide either a transaction ID or upload a proof image
    if (!txId.trim() && !proof) return;
    setSaving(true);
    // bmtCut was already tracked on owner.pendingBmtCut at booking time — use it directly
    const bmtCut = owner.pendingBmtCut ?? 0;

    await fetch('/api/bmt/payouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerId: owner.id, ownerName: owner.name,
        turfName: turf?.name ?? '—',
        amount: balance, bmtCut,
        date: new Date().toISOString().split('T')[0],
        method, txId, proofUrl: proof,
      }),
    });

    // Clear owner wallet + pendingBmtCut
    await fetch(`/api/bmt/owners/${owner.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ walletBalance: 0, pendingBmtCut: 0 }),
    });

    setSaving(false); setDone(true);
    setTimeout(() => { onDone(); onClose(); }, 1400);
  };;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg glass-panel rounded-3xl border border-[var(--panel-border)] shadow-2xl z-10 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-accent/0 via-accent to-accent/0" />

        {done ? (
          <div className="flex flex-col items-center gap-4 p-10 text-center">
            <CheckCircle2 size={48} className="text-accent" />
            <div>
              <h3 className="text-xl font-black text-accent">Payout Confirmed!</h3>
              <p className="text-sm text-[var(--muted)] mt-1">Balance cleared for {owner.name}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--panel-border)]">
              <div>
                <h2 className="font-black text-base">Process Payout</h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">for {owner.name}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] flex items-center justify-center hover:border-white/20">
                <X size={15} className="text-[var(--muted)]" />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              {/* Amount (read-only) */}
              <div className="flex flex-col gap-1.5">
                <label className="field-label">Amount to Clear</label>
                <div className="bg-accent/5 border border-accent/25 rounded-xl px-4 py-3 flex items-center justify-between">
                  <span className="text-xl font-black text-accent">{fmt(balance)}</span>
                  <span className="text-[10px] font-bold text-accent/60 uppercase tracking-widest">Unpaid Balance</span>
                </div>
              </div>

              {/* Payment method */}
              <div className="flex flex-col gap-1.5">
                <label className="field-label">Payment Method</label>
                <div className="relative">
                  <select value={method} onChange={e => setMethod(e.target.value as typeof method)}
                    className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent/50 appearance-none pr-10 transition-colors">
                    <option value="bank" className="bg-neutral-900">🏦 Bank Transfer</option>
                    <option value="bkash" className="bg-neutral-900">📱 Mobile Money / bKash</option>
                    <option value="cash" className="bg-neutral-900">💵 Cash</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none" />
                </div>
              </div>

              {/* Transaction ID */}
              <div className="flex flex-col gap-1.5">
                <label className="field-label">Transaction ID / Reference</label>
                <input value={txId} onChange={e => setTxId(e.target.value)}
                  placeholder="e.g. TXN2026041001234"
                  className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent/50 placeholder:text-[var(--muted)] transition-colors" />
              </div>

              {/* File upload zone */}
              <div className="flex flex-col gap-1.5">
                <label className="field-label">Payment Proof (Receipt / Screenshot)</label>
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                    dragging
                      ? 'border-accent bg-accent/8 scale-[1.01]'
                      : proof
                      ? 'border-accent/40 bg-accent/5'
                      : 'border-[var(--panel-border)] hover:border-white/25 bg-[var(--panel-bg)]'
                  }`}>
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  {proof ? (
                    <>
                      <CheckCircle2 size={22} className="text-accent" />
                      <p className="text-xs font-bold text-accent truncate max-w-[200px]">{proofName}</p>
                      <p className="text-[10px] text-[var(--muted)]">Click to replace</p>
                    </>
                  ) : (
                    <>
                      <Upload size={22} className="text-[var(--muted)]" />
                      <p className="text-sm font-semibold">Drop file here or <span className="text-accent">browse</span></p>
                      <p className="text-[11px] text-[var(--muted)]">PNG, JPG, PDF up to 10 MB</p>
                    </>
                  )}
                </div>
              </div>

              {/* Confirm */}
              <button onClick={confirm} disabled={saving || (!txId.trim() && !proof)}
                className="w-full py-3.5 rounded-xl bg-accent text-black font-black text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(0,255,0,0.2)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-1">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} strokeWidth={3} />}
                {saving ? 'Processing…' : 'Confirm & Clear Balance'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Proof Viewer Modal ───────────────────────────────────────────────────────
function ProofModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
      <div className="relative max-w-2xl w-full z-10">
        <img src={url} alt="Payment proof" className="w-full rounded-2xl border border-white/10 shadow-2xl" />
        <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 bg-black/60 rounded-xl flex items-center justify-center border border-white/10">
          <X size={16} className="text-white" />
        </button>
      </div>
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent, onClick }: {
  icon: typeof Wallet; label: string; value: string; sub?: string; accent?: boolean; onClick?: () => void;
}) {
  return (
    <div onClick={onClick} className={`glass-panel rounded-2xl p-5 flex flex-col gap-3 border ${accent ? 'border-accent/25 bg-accent/5' : 'border-[var(--panel-border)]'} ${onClick ? 'cursor-pointer hover:border-accent/40 active:scale-[0.98] transition-all' : ''}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? 'bg-accent/10 border border-accent/30' : 'bg-[var(--panel-bg)] border border-[var(--panel-border)]'}`}>
        <Icon size={18} className={accent ? 'text-accent' : 'text-[var(--muted)]'} />
      </div>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)]">{label}</p>
        <p className={`text-2xl font-black mt-0.5 ${accent ? 'text-accent' : ''}`}>{value}</p>
        {sub && <p className="text-xs text-[var(--muted)] mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────
function RevBadge({ turf }: { turf?: Turf }) {
  if (!turf?.revenueModelType) return <span className="text-[10px] text-[var(--muted)]">—</span>;
  const pct = turf.revenueModelType === 'percentage';
  return (
    <span className={`text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${
      pct ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-blue-500/10 border-blue-500/30 text-blue-400'
    }`}>
      {pct ? `${turf.revenueModelValue}% Cut` : `৳${turf.revenueModelValue}/mo`}
    </span>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function PayoutsLedgerPanel() {
  const owners  = useApiEntity<Owner>('owners');
  const turfs   = useApiEntity<Turf>('turfs');
  const payouts = useApiEntity<Payout>('payouts');
  const bookings = useApiEntity<Booking>('bookings');

  const [disburseTarget, setDisburseTarget] = useState<{ owner: Owner; turf?: Turf; balance: number } | null>(null);
  const [proofUrl,   setProofUrl]   = useState<string | null>(null);
  const [histTab,    setHistTab]    = useState<'active' | 'history'>('active');
  const [dateFilter, setDateFilter] = useState('');
  const [showRevModal, setShowRevModal] = useState(false);
  const [revModalTab, setRevModalTab] = useState<'percentage' | 'monthly'>('percentage');
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Monthly fees state
  const [monthlyFees, setMonthlyFees] = useState<MonthlyFee[]>([]);
  const [feesLoading, setFeesLoading] = useState(false);

  const loadMonthlyFees = useCallback(async () => {
    setFeesLoading(true);
    // Auto-generate fees for current month (idempotent), then fetch
    await fetch('/api/bmt/monthly-fees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate', month: currentMonth }),
    });
    const data = await fetch(`/api/bmt/monthly-fees?month=${currentMonth}`).then(r => r.json());
    setMonthlyFees(Array.isArray(data) ? data : []);
    setFeesLoading(false);
  }, [currentMonth]);

  useEffect(() => { loadMonthlyFees(); }, [loadMonthlyFees]);

  // Enrich owners with their published turf & balance
  const ledger = owners.items.map(owner => {
    const myTurfs    = turfs.items.filter(t => t.ownerId === owner.id && t.status === 'published');
    const primaryTurf = myTurfs[0];
    const balance    = owner.walletBalance ?? 0;
    return { owner, turf: primaryTurf, balance };
  }).filter(r => r.turf); // only show owners with at least one turf

  // Stats
  const totalUnpaid       = owners.items.reduce((s, o) => s + (o.walletBalance ?? 0), 0);
  const todayDate         = new Date().toISOString().split('T')[0];
  // BMT cut = sum of bmtCut across all bookings ever made
  const realizedBmtCut    = bookings.items.reduce((s, b) => s + (b.bmtCut ?? 0), 0);
  const pendingCount      = owners.items.filter(o => (o.walletBalance ?? 0) > 0).length;

  // 30-day daily breakdown — calculated from actual bookings data
  // bmtCut on each booking = revenue already collected by BMT at payment time
  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  });
  // Use payouts history for the 30-day breakdown (disbursement dates)
  const daily30 = days30.map(date => ({
    date,
    revenue: payouts.items.filter(p => p.date === date).reduce((s, p) => s + (p.bmtCut ?? 0), 0),
    turfs: [...new Set(payouts.items.filter(p => p.date === date).map(p => p.turfName))].length,
  }));
  const total30 = daily30.reduce((s, d) => s + d.revenue, 0);

  // Today's bookings grouped by turf
  const todayBookings = bookings.items.filter(b => b.date === todayDate);
  const todayByTurf = turfs.items
    .map(t => {
      const tb = todayBookings.filter(b => b.turfId === t.id);
      return {
        turfName: t.name,
        bookingCount: tb.length,
        bmtCut: tb.reduce((s, b) => s + (b.bmtCut ?? 0), 0),
        ownerShare: tb.reduce((s, b) => s + ((b.price ?? 0) - (b.bmtCut ?? 0)), 0),
        gross: tb.reduce((s, b) => s + (b.price ?? 0), 0),
      };
    })
    .filter(r => r.bookingCount > 0);
  const todayTotalCut   = todayByTurf.reduce((s, r) => s + r.bmtCut, 0);
  const todayTotalGross = todayByTurf.reduce((s, r) => s + r.gross, 0);

  // Total BMT collected = sum of all bmtCut on bookings
  const totalBmtCollected = realizedBmtCut;

  const generatePDF = () => {
    const doc = new jsPDF();
    const [year, monthNum] = reportMonth.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });

    doc.setFontSize(16);
    doc.text(`Book My Turf — Financial Report [${monthName}]`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    // Real payout data for the month
    const monthPayouts = payouts.items.filter(p => p.date.startsWith(reportMonth));

    const tableData = monthPayouts.map(p => [
      p.date,
      p.ownerName || '—',
      p.turfName || '—',
      `৳${p.amount?.toLocaleString() || '0'}`,
      `৳${p.bmtCut?.toLocaleString() || '0'}`,
      p.method || '—',
    ]);

    const totalBMT = monthPayouts.reduce((sum, p) => sum + (p.bmtCut ?? 0), 0);
    const totalAmount = monthPayouts.reduce((sum, p) => sum + (p.amount ?? 0), 0);

    autoTable(doc, {
      startY: 34,
      head: [['Date', 'Owner', 'Turf', 'Amount Cleared', 'BMT Commission', 'Method']],
      body: tableData.length ? tableData : [['No payouts this month', '', '', '', '', '']],
      foot: [['', '', 'Totals:', `৳${totalAmount.toLocaleString()}`, `৳${totalBMT.toLocaleString()}`, '']],
      theme: 'striped',
      headStyles: { fillColor: [0, 200, 0], textColor: [0, 0, 0] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    });

    doc.save(`BMT_Financial_Report_${monthName.replace(' ', '_')}.pdf`);
  };

  // Filtered history
  const history = payouts.items
    .filter(p => !dateFilter || p.date === dateFilter)
    .sort((a, b) => b.date.localeCompare(a.date));

  const loading = owners.loading || turfs.loading || payouts.loading || bookings.loading;

  const reload = () => { owners.reload(); turfs.reload(); payouts.reload(); bookings.reload(); };

  return (
    <div className="flex flex-col gap-8">

      {/* ── Stats Row ── */}
      {(() => {
        const mTotal   = monthlyFees.reduce((s, f) => s + f.amount, 0);
        const mPaid    = monthlyFees.filter(f => f.paid).reduce((s, f) => s + f.amount, 0);
        const mPending = monthlyFees.filter(f => !f.paid).length;
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard icon={Wallet} label="Owner Unpaid Balance" value={fmt(totalUnpaid)} sub="Net share owed to owners (after BMT cut)" accent />
            <StatCard
              icon={TrendingUp}
              label="BMT Revenue (% Cut)"
              value={fmt(totalBmtCollected)}
              sub="Booking commissions — click to view today's breakdown"
              onClick={() => { setRevModalTab('percentage'); setShowRevModal(true); }}
            />
            <StatCard
              icon={Calendar}
              label={`Monthly Fees (${currentMonth})`}
              value={fmt(mTotal)}
              sub={feesLoading ? 'Loading…' : `${mPending} pending · ${fmt(mPaid)} paid — click to manage`}
              onClick={() => { setRevModalTab('monthly'); setShowRevModal(true); }}
            />
            <StatCard icon={Clock} label="Pending Disbursements" value={`${pendingCount}`} sub="Owners awaiting payout" />
          </div>
        );
      })()}

      {/* ── BMT Revenue Modal (Tabbed) ── */}
      {showRevModal && (() => {
        const monthlyTotal    = monthlyFees.reduce((s, f) => s + f.amount, 0);
        const monthlyPaid     = monthlyFees.filter(f => f.paid).reduce((s, f) => s + f.amount, 0);
        const monthlyUnpaid   = monthlyTotal - monthlyPaid;

        const downloadPctPDF = async () => {
          const { default: D } = await import('jspdf');
          const { default: AT } = await import('jspdf-autotable');
          const doc = new D();
          doc.setTextColor(0, 160, 40); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
          doc.text('Book My Turf - BMT Revenue Report (% Cut)', 14, 20);
          doc.setTextColor(100, 100, 100); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
          doc.text(`Date: ${todayDate}`, 14, 28);
          doc.text(`Total Cut: ${fmt(todayTotalCut)}  |  Gross: ${fmt(todayTotalGross)}`, 14, 35);
          AT(doc, {
            startY: 42,
            head: [['Turf', 'Bookings', 'Gross (BDT)', 'BMT Cut (BDT)', 'Owner Share (BDT)']],
            body: todayByTurf.length
              ? todayByTurf.map(r => [r.turfName, r.bookingCount, fmt(r.gross), fmt(r.bmtCut), fmt(r.ownerShare)])
              : [['No bookings today', '', '', '', '']],
            foot: [['TOTAL', todayByTurf.reduce((s,r)=>s+r.bookingCount,0), fmt(todayTotalGross), fmt(todayTotalCut), fmt(todayByTurf.reduce((s,r)=>s+r.ownerShare,0))]],
            theme: 'striped',
            headStyles: { fillColor: [0, 160, 40], textColor: [255, 255, 255], fontStyle: 'bold' },
            footStyles: { fillColor: [230, 255, 230], textColor: [0, 80, 0], fontStyle: 'bold' },
          });
          doc.save(`BMT-PercentageCut-${todayDate}.pdf`);
        };

        const downloadMonthlyPDF = async () => {
          const { default: D } = await import('jspdf');
          const { default: AT } = await import('jspdf-autotable');
          const doc = new D();
          doc.setTextColor(59, 130, 246); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
          doc.text('Book My Turf - Monthly Fee Report', 14, 20);
          doc.setTextColor(100, 100, 100); doc.setFontSize(10); doc.setFont('helvetica', 'normal');
          doc.text(`Month: ${currentMonth}`, 14, 28);
          doc.text(`Total: ${fmt(monthlyTotal)}  |  Paid: ${fmt(monthlyPaid)}  |  Pending: ${fmt(monthlyUnpaid)}`, 14, 35);
          AT(doc, {
            startY: 42,
            head: [['Turf', 'Owner', 'Monthly Fee (BDT)', 'Status', 'Paid On']],
            body: monthlyFees.length
              ? monthlyFees.map(f => [f.turfName, f.ownerName, fmt(f.amount), f.paid ? 'PAID' : 'PENDING', f.paidAt ? new Date(f.paidAt).toLocaleDateString() : '—'])
              : [['No monthly turfs this month', '', '', '', '']],
            foot: [['TOTAL', '', fmt(monthlyTotal), `${monthlyFees.filter(f=>f.paid).length}/${monthlyFees.length} paid`, '']],
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
            footStyles: { fillColor: [219, 234, 254], textColor: [29, 78, 216], fontStyle: 'bold' },
          });
          doc.save(`BMT-MonthlyFees-${currentMonth}.pdf`);
        };

        return (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setShowRevModal(false)} />
            <div className="relative z-10 w-full max-w-2xl glass-panel border border-[var(--panel-border)] rounded-3xl overflow-hidden flex flex-col max-h-[88vh]">

              {/* Header */}
              <div className="px-5 py-4 border-b border-[var(--panel-border)] flex items-center justify-between shrink-0">
                <h3 className="font-black text-base">BMT Revenue Breakdown</h3>
                <button onClick={() => setShowRevModal(false)} className="w-8 h-8 rounded-xl border border-[var(--panel-border)] flex items-center justify-center hover:bg-white/5">
                  <X size={14} />
                </button>
              </div>

              {/* Tab switcher */}
              <div className="flex gap-0 border-b border-[var(--panel-border)] shrink-0">
                <button onClick={() => setRevModalTab('percentage')}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${revModalTab === 'percentage' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-[var(--muted)] hover:text-foreground'}`}>
                  📊 % Cut — Today
                </button>
                <button onClick={() => setRevModalTab('monthly')}
                  className={`flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all ${revModalTab === 'monthly' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/5' : 'text-[var(--muted)] hover:text-foreground'}`}>
                  📅 Monthly Fees — {currentMonth}
                </button>
              </div>

              {/* ── % Cut Tab ── */}
              {revModalTab === 'percentage' && (
                <>
                  <div className="px-5 py-3 flex items-center justify-between shrink-0 border-b border-[var(--panel-border)]">
                    <p className="text-xs text-[var(--muted)]">
                      {todayDate} &nbsp;·&nbsp; Cut: <span className="text-accent font-black">{fmt(todayTotalCut)}</span>
                      &nbsp;/&nbsp; Gross: <span className="font-black">{fmt(todayTotalGross)}</span>
                    </p>
                    <button onClick={downloadPctPDF}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-black text-xs font-black hover:brightness-110 active:scale-95 transition-all shadow-[0_2px_12px_rgba(0,255,65,0.2)]">
                      <Download size={12} strokeWidth={3} /> Download PDF
                    </button>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {todayByTurf.length === 0 ? (
                      <div className="flex flex-col items-center gap-3 py-16 text-center">
                        <TrendingUp size={32} className="text-[var(--muted)] opacity-30" />
                        <p className="font-bold text-[var(--muted)]">No bookings from % turfs today</p>
                        <p className="text-xs text-[var(--muted)]">Revenue appears once players book slots.</p>
                      </div>
                    ) : (
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-[var(--panel-bg)]">
                          <tr className="border-b border-[var(--panel-border)]">
                            {['Turf', 'Bookings', 'Gross', 'BMT Cut', 'Owner Share'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {todayByTurf.map((r, i) => (
                            <tr key={i} className="border-b border-[var(--panel-border)] hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-3 font-bold">{r.turfName}</td>
                              <td className="px-4 py-3"><span className="text-blue-400 font-black">{r.bookingCount}</span></td>
                              <td className="px-4 py-3 font-semibold">{fmt(r.gross)}</td>
                              <td className="px-4 py-3"><span className="text-accent font-black">{fmt(r.bmtCut)}</span></td>
                              <td className="px-4 py-3 text-[var(--muted)]">{fmt(r.ownerShare)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-accent/30 bg-accent/5">
                            <td className="px-4 py-3 font-black text-[10px] uppercase tracking-widest text-accent">Daily Total</td>
                            <td className="px-4 py-3 font-black text-blue-400">{todayByTurf.reduce((s,r)=>s+r.bookingCount,0)}</td>
                            <td className="px-4 py-3 font-black">{fmt(todayTotalGross)}</td>
                            <td className="px-4 py-3 font-black text-accent">{fmt(todayTotalCut)}</td>
                            <td className="px-4 py-3 font-black text-[var(--muted)]">{fmt(todayByTurf.reduce((s,r)=>s+r.ownerShare,0))}</td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                </>
              )}

              {/* ── Monthly Fees Tab ── */}
              {revModalTab === 'monthly' && (
                <>
                  <div className="px-5 py-3 flex items-center justify-between shrink-0 border-b border-[var(--panel-border)]">
                    <div className="flex gap-4 text-xs">
                      <span className="text-[var(--muted)]">Total: <span className="font-black text-foreground">{fmt(monthlyTotal)}</span></span>
                      <span className="text-[var(--muted)]">Paid: <span className="font-black text-blue-400">{fmt(monthlyPaid)}</span></span>
                      <span className="text-[var(--muted)]">Pending: <span className="font-black text-orange-400">{fmt(monthlyUnpaid)}</span></span>
                    </div>
                    <button onClick={downloadMonthlyPDF}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500 text-white text-xs font-black hover:brightness-110 active:scale-95 transition-all shadow-[0_2px_12px_rgba(59,130,246,0.3)]">
                      <Download size={12} strokeWidth={3} /> Download PDF
                    </button>
                  </div>
                  <div className="overflow-y-auto flex-1">
                    {feesLoading ? (
                      <div className="flex items-center gap-2 py-16 justify-center text-[var(--muted)]"><Loader2 size={16} className="animate-spin" /> Loading…</div>
                    ) : monthlyFees.length === 0 ? (
                      <div className="flex flex-col items-center gap-3 py-16 text-center">
                        <Calendar size={32} className="text-[var(--muted)] opacity-30" />
                        <p className="font-bold text-[var(--muted)]">No monthly fee turfs this month</p>
                        <p className="text-xs text-[var(--muted)]">Fees are generated for all published turfs on the monthly model.</p>
                      </div>
                    ) : (
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-[var(--panel-bg)]">
                          <tr className="border-b border-[var(--panel-border)]">
                            {['Turf', 'Owner', 'Monthly Fee', 'Status', 'Action'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {monthlyFees.map(fee => (
                            <tr key={fee.id} className={`border-b border-[var(--panel-border)] hover:bg-white/[0.02] transition-colors ${fee.paid ? 'opacity-70' : ''}`}>
                              <td className="px-4 py-3 font-bold">{fee.turfName}</td>
                              <td className="px-4 py-3 text-[var(--muted)]">{fee.ownerName}</td>
                              <td className="px-4 py-3 font-black">{fmt(fee.amount)}</td>
                              <td className="px-4 py-3">
                                {fee.paid
                                  ? <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 uppercase tracking-wide">✓ Paid</span>
                                  : <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 uppercase tracking-wide">Pending</span>
                                }
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={async () => {
                                    await fetch('/api/bmt/monthly-fees', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ action: fee.paid ? 'markUnpaid' : 'markPaid', id: fee.id }),
                                    });
                                    loadMonthlyFees();
                                  }}
                                  className={`text-[10px] font-black px-3 py-1.5 rounded-lg transition-all active:scale-95 ${
                                    fee.paid
                                      ? 'bg-white/5 border border-white/10 text-[var(--muted)] hover:border-white/20'
                                      : 'bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20'
                                  }`}>
                                  {fee.paid ? 'Mark Unpaid' : 'Mark Paid'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-blue-500/30 bg-blue-500/5">
                            <td className="px-4 py-3 font-black text-[10px] uppercase tracking-widest text-blue-400" colSpan={2}>Monthly Total</td>
                            <td className="px-4 py-3 font-black text-foreground">{fmt(monthlyTotal)}</td>
                            <td className="px-4 py-3 font-black text-blue-400">{monthlyFees.filter(f=>f.paid).length}/{monthlyFees.length} paid</td>
                            <td />
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                </>
              )}

            </div>
          </div>
        );
      })()}


      {/* ── Reports & Exports Card ── */}
      <div className="glass-panel p-5 rounded-2xl border border-[var(--panel-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black flex items-center gap-2"><FileText size={18} className="text-accent" /> Monthly Financial Report</h3>
          <p className="text-xs text-[var(--muted)] mt-1">Generate a comprehensive PDF ledger for accounting and records.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input 
            type="month" 
            value={reportMonth} 
            onChange={e => setReportMonth(e.target.value)}
            className="flex-1 sm:w-40 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent/50 transition-colors"
          />
          <button 
            onClick={generatePDF}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-black font-black text-sm hover:brightness-110 active:scale-95 transition-all shadow-[0_2px_15px_rgba(0,255,0,0.2)] shrink-0">
            <Download size={16} strokeWidth={3} /> Download PDF
          </button>
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div className="flex items-center gap-2 border-b border-[var(--panel-border)] pb-0">
        {(['active', 'history'] as const).map(tab => (
          <button key={tab} onClick={() => setHistTab(tab)}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all -mb-px ${
              histTab === tab
                ? 'border-accent text-accent'
                : 'border-transparent text-[var(--muted)] hover:text-foreground'
            }`}>
            {tab === 'active' ? 'Active Payouts' : 'Cleared History'}
          </button>
        ))}
      </div>

      {/* ── Active Ledger ── */}
      {histTab === 'active' && (
        loading ? (
          <div className="flex items-center gap-2 py-8 text-[var(--muted)]"><Loader2 size={16} className="animate-spin" /> Loading ledger…</div>
        ) : ledger.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center glass-panel rounded-2xl">
            <Wallet size={36} className="text-[var(--muted)] opacity-30" />
            <p className="font-bold text-[var(--muted)]">No active ledger entries</p>
            <p className="text-xs text-[var(--muted)]">Earnings will appear here once turfs go live.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--panel-border)] glass-panel">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--panel-border)] text-[var(--muted)]">
                  {['Owner / Turf', 'Revenue Model', 'Unpaid Balance', 'Last Payout', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ledger.map(({ owner, turf, balance }) => {
                  const lastPayout = payouts.items
                    .filter(p => p.ownerId === owner.id)
                    .sort((a, b) => b.date.localeCompare(a.date))[0];
                  return (
                    <tr key={owner.id} className="border-b border-[var(--panel-border)] last:border-0 hover:bg-[var(--panel-bg)] transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-bold">{owner.name}</p>
                        <p className="text-xs text-accent/80 mt-0.5">{turf?.name ?? '—'}</p>
                        <p className="text-[11px] text-[var(--muted)]">{owner.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <RevBadge turf={turf} />
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-base font-black ${balance > 0 ? 'text-accent' : 'text-[var(--muted)]'}`}>
                          {fmt(balance)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-[var(--muted)]">
                        {lastPayout?.date ?? 'Never'}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          disabled={balance <= 0}
                          onClick={() => setDisburseTarget({ owner, turf, balance })}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-black text-xs font-black hover:brightness-110 active:scale-95 transition-all shadow-[0_2px_10px_rgba(0,255,0,0.2)] disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none">
                          <Download size={13} strokeWidth={2.5} />
                          Disburse
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Cleared History ── */}
      {histTab === 'history' && (
        <div className="flex flex-col gap-4">
          {/* Date filter */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-accent/50 transition-colors" />
            </div>
            {dateFilter && (
              <button onClick={() => setDateFilter('')}
                className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-foreground transition-colors">
                <X size={12} /> Clear
              </button>
            )}
            <span className="text-xs text-[var(--muted)] ml-auto">{history.length} record(s)</span>
          </div>

          {history.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center glass-panel rounded-2xl">
              <Filter size={28} className="text-[var(--muted)] opacity-30" />
              <p className="font-bold text-[var(--muted)]">No payout history yet</p>
              <p className="text-xs text-[var(--muted)]">Cleared payouts will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[var(--panel-border)] glass-panel">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--panel-border)] text-[var(--muted)]">
                    {['Date', 'Owner', 'Turf', 'Amount Cleared', 'BMT Cut', 'Method', 'Tx Ref', 'Proof'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map(p => (
                    <tr key={p.id} className="border-b border-[var(--panel-border)] last:border-0 hover:bg-[var(--panel-bg)] transition-colors">
                      <td className="px-5 py-3.5 text-xs font-semibold whitespace-nowrap">{p.date}</td>
                      <td className="px-5 py-3.5 font-bold">{p.ownerName}</td>
                      <td className="px-5 py-3.5 text-xs text-[var(--muted)]">{p.turfName}</td>
                      <td className="px-5 py-3.5 font-black text-accent">{fmt(p.amount)}</td>
                      <td className="px-5 py-3.5 text-xs font-bold text-emerald-400">{fmt(p.bmtCut)}</td>
                      <td className="px-5 py-3.5 text-xs">{METHOD_LABELS[p.method] ?? p.method}</td>
                      <td className="px-5 py-3.5 text-xs font-mono text-[var(--muted)] max-w-[120px] truncate">{p.txId}</td>
                      <td className="px-5 py-3.5">
                        {p.proofUrl ? (
                          <button onClick={() => setProofUrl(p.proofUrl!)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--panel-border)] text-[11px] font-bold text-[var(--muted)] hover:border-white/25 hover:text-foreground transition-colors">
                            <Eye size={12} /> View
                          </button>
                        ) : <span className="text-[var(--muted)] text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {disburseTarget && (
        <DisburseModal
          owner={disburseTarget.owner}
          turf={disburseTarget.turf}
          balance={disburseTarget.balance}
          onClose={() => setDisburseTarget(null)}
          onDone={reload}
        />
      )}
      {proofUrl && <ProofModal url={proofUrl} onClose={() => setProofUrl(null)} />}

      <style>{`
        .field-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); }
      `}</style>
    </div>
  );
}
