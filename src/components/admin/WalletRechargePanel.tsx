'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle2, X, RefreshCw, Eye, Wallet, Settings2, History, Download, TrendingUp } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface WalletRequest {
  id: string; playerId: string; playerName: string;
  amount: number; method: string; screenshotBase64?: string;
  status: 'pending' | 'approved' | 'rejected'; createdAt: string; reviewedAt?: string;
}
interface PaymentMethod { id?: string; type: string; number: string; accountType: string; }

const METHOD_CONFIG = [
  { key: 'bkash', label: 'bKash',        emoji: '📱' },
  { key: 'nagad', label: 'Nagad',        emoji: '📲' },
  { key: 'bank',  label: 'Bank Transfer', emoji: '🏦' },
] as const;

function ScreenshotModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
      <div className="relative z-10 max-w-md w-full">
        <img src={src} alt="Payment proof" className="w-full rounded-2xl border border-white/10 shadow-2xl" />
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-xl flex items-center justify-center border border-white/10"><X size={14} className="text-white" /></button>
      </div>
    </div>
  );
}

// ── 30-Day Revenue Modal ──────────────────────────────────────────────────────
function RevenueModal({ requests, onClose }: { requests: WalletRequest[]; onClose: () => void }) {
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));

  const approved = requests.filter(r => r.status === 'approved');

  // Last 30 days breakdown
  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  });

  const dailyData = days30.map(date => {
    const dayReqs = approved.filter(r => r.createdAt.startsWith(date));
    return { date, amount: dayReqs.reduce((s, r) => s + r.amount, 0), count: dayReqs.length };
  });

  const total30 = dailyData.reduce((s, d) => s + d.amount, 0);

  const downloadPDF = () => {
    const doc = new jsPDF();
    const [year, monthNum] = reportMonth.split('-');
    const monthName = new Date(parseInt(year), parseInt(monthNum) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    doc.setFontSize(16);
    doc.text(`BMT Wallet Recharge Report — ${monthName}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);

    const monthlyApproved = approved.filter(r => r.createdAt.startsWith(reportMonth));
    const tableData = monthlyApproved.map(r => [
      r.playerName, r.method, `৳${r.amount.toLocaleString()}`,
      new Date(r.createdAt).toLocaleDateString(),
    ]);

    const totalAmount = monthlyApproved.reduce((s, r) => s + r.amount, 0);

    autoTable(doc, {
      startY: 34,
      head: [['Player', 'Method', 'Amount', 'Date']],
      body: tableData,
      foot: [['', `${monthlyApproved.length} recharges`, `৳${totalAmount.toLocaleString()}`, '']],
      theme: 'striped',
      headStyles: { fillColor: [0, 200, 0], textColor: [0, 0, 0] },
      footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
    });

    doc.save(`BMT_Wallet_Recharge_${monthName.replace(' ', '_')}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg glass-panel border border-[var(--panel-border)] rounded-3xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="h-0.5" style={{ background: 'linear-gradient(90deg, transparent, #00ff41, transparent)' }} />
        <div className="px-5 py-4 border-b border-[var(--panel-border)] flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-black text-base">Wallet Revenue — Last 30 Days</h3>
            <p className="text-xs text-[var(--muted)]">Total: <span className="text-accent font-black">৳{total30.toLocaleString()}</span></p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl border border-[var(--panel-border)] flex items-center justify-center hover:bg-white/5"><X size={14} /></button>
        </div>

        {/* PDF report download */}
        <div className="px-5 py-3 border-b border-[var(--panel-border)] flex items-center gap-3 shrink-0 bg-black/20">
          <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)}
            className="flex-1 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 text-sm outline-none focus:border-accent/50" />
          <button onClick={downloadPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-black font-black text-xs hover:brightness-110 active:scale-95 transition-all">
            <Download size={12} /> Download PDF
          </button>
        </div>

        {/* Daily breakdown */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[var(--panel-bg)]">
              <tr className="border-b border-[var(--panel-border)]">
                {['Date', 'Players', 'Revenue'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dailyData.slice().reverse().map(d => (
                <tr key={d.date} className={`border-b border-[var(--panel-border)] hover:bg-white/[0.02] ${d.date === new Date().toISOString().split('T')[0] ? 'bg-accent/5 border-accent/20' : ''}`}>
                  <td className="px-4 py-3 font-semibold">{d.date} {d.date === new Date().toISOString().split('T')[0] && <span className="ml-1 text-[9px] text-accent font-black uppercase">Today</span>}</td>
                  <td className="px-4 py-3">{d.count > 0 ? <span className="font-black text-blue-400">{d.count}</span> : <span className="text-[var(--muted)]">—</span>}</td>
                  <td className="px-4 py-3">{d.amount > 0 ? <span className="font-black text-accent">৳{d.amount.toLocaleString()}</span> : <span className="text-[var(--muted)]">৳0</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function WalletRechargePanel() {
  const [tab, setTab]             = useState<'settings' | 'requests' | 'history'>('requests');
  const [methods, setMethods]     = useState<Record<string, PaymentMethod>>({});
  const [requests, setRequests]   = useState<WalletRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [actionId, setActionId]   = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [activeMethodTab, setActiveMethodTab] = useState<'bkash' | 'nagad' | 'bank'>('bkash');
  const [editMethod, setEditMethod] = useState({ number: '', accountType: '' });
  const [showRevModal, setShowRevModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [ms, rs] = await Promise.all([
      fetch('/api/bmt/payment-methods').then(r => r.json()),
      fetch('/api/bmt/wallet-requests').then(r => r.json()),
    ]);
    const mByType: Record<string, PaymentMethod> = {};
    if (Array.isArray(ms)) ms.forEach((m: PaymentMethod) => { mByType[m.type] = m; });
    setMethods(mByType);
    setRequests(Array.isArray(rs) ? rs : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const m = methods[activeMethodTab];
    setEditMethod({ number: m?.number || '', accountType: m?.accountType || '' });
  }, [activeMethodTab, methods]);

  const saveMethod = async () => {
    setSaving(true);
    await fetch('/api/bmt/payment-methods', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: activeMethodTab, ...editMethod }),
    });
    setSaving(false);
    await load();
  };

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    setActionId(id);
    await fetch(`/api/bmt/wallet-requests/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setActionId(null);
    await load();
  };

  const today    = new Date().toISOString().split('T')[0];
  const approved = requests.filter(r => r.status === 'approved');
  const todayRev = approved.filter(r => r.createdAt.startsWith(today)).reduce((s, r) => s + r.amount, 0);
  const todayCount = approved.filter(r => r.createdAt.startsWith(today)).length;
  const pending  = requests.filter(r => r.status === 'pending').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const reviewed = requests.filter(r => r.status !== 'pending').sort((a, b) => (b.reviewedAt || '').localeCompare(a.reviewedAt || ''));

  return (
    <>
      {screenshot && <ScreenshotModal src={screenshot} onClose={() => setScreenshot(null)} />}
      {showRevModal && <RevenueModal requests={requests} onClose={() => setShowRevModal(false)} />}

      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-black">Wallet Recharge</h2>
            <p className="text-sm text-[var(--muted)] mt-0.5">Configure payment methods and approve player recharge requests.</p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-xs font-bold hover:opacity-80 disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Today's Revenue — clickable */}
          <button onClick={() => setShowRevModal(true)}
            className="glass-panel border border-accent/25 bg-accent/5 rounded-2xl p-4 flex flex-col gap-1 text-left hover:border-accent/50 active:scale-[0.98] transition-all col-span-2 sm:col-span-1 cursor-pointer">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Today's Revenue</p>
              <TrendingUp size={13} className="text-accent" />
            </div>
            <p className="text-2xl font-black text-accent">৳{todayRev.toLocaleString()}</p>
            <p className="text-[10px] text-[var(--muted)]">{todayCount} player{todayCount !== 1 ? 's' : ''} · Click for 30-day</p>
          </button>
          {[
            { label: 'Pending',  value: pending.length,  color: 'text-yellow-400' },
            { label: 'Approved', value: reviewed.filter(r => r.status === 'approved').length, color: 'text-accent' },
            { label: 'Rejected', value: reviewed.filter(r => r.status === 'rejected').length, color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="glass-panel border border-[var(--panel-border)] rounded-2xl p-4 flex flex-col gap-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">{s.label}</p>
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-[var(--panel-border)]">
          {[
            { key: 'requests', icon: Wallet,   label: 'Pending Requests' },
            { key: 'history',  icon: History,  label: 'History' },
            { key: 'settings', icon: Settings2, label: 'Payment Setup' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black transition-all ${tab === t.key ? 'bg-accent text-black' : 'text-[var(--muted)] hover:text-white'}`}>
              <t.icon size={12} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── Pending Requests ── */}
        {tab === 'requests' && (
          loading ? (
            <div className="flex items-center justify-center py-16 text-[var(--muted)]"><RefreshCw size={16} className="animate-spin mr-2" /> Loading…</div>
          ) : pending.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center border border-dashed border-[var(--panel-border)] rounded-2xl">
              <Wallet size={28} className="text-[var(--muted)]" /><p className="font-bold">No pending requests</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pending.map(r => {
                const m = METHOD_CONFIG.find(mc => mc.key === r.method);
                return (
                  <div key={r.id} className="glass-panel border border-[var(--panel-border)] rounded-2xl overflow-hidden">
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-2xl">{m?.emoji || '💳'}</span>
                        <div className="min-w-0">
                          <p className="font-black text-sm">{r.playerName}</p>
                          <p className="text-[10px] text-[var(--muted)]">{m?.label} · {new Date(r.createdAt).toLocaleDateString('en-BD')}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-black text-accent">৳{r.amount.toLocaleString()}</p>
                        <span className="text-[9px] font-black text-yellow-400 uppercase tracking-widest">Pending</span>
                      </div>
                    </div>
                    <div className="border-t border-[var(--panel-border)] px-4 py-3 flex items-center gap-3">
                      {r.screenshotBase64 && (
                        <button onClick={() => setScreenshot(r.screenshotBase64!)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--panel-border)] text-xs font-bold hover:border-white/20 transition-colors">
                          <Eye size={12} /> View Proof
                        </button>
                      )}
                      <button onClick={() => handleAction(r.id, 'approved')} disabled={actionId === r.id}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-accent text-black text-xs font-black hover:brightness-110 active:scale-95 transition-all disabled:opacity-50">
                        {actionId === r.id ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Approve
                      </button>
                      <button onClick={() => handleAction(r.id, 'rejected')} disabled={actionId === r.id}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-black hover:bg-red-500/20 transition-colors">
                        <X size={11} /> Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── History ── */}
        {tab === 'history' && (
          <div className="glass-panel border border-[var(--panel-border)] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--panel-border)]">
                    {['Player', 'Amount', 'Method', 'Status', 'Requested', 'Proof'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[var(--muted)] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reviewed.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--muted)]">No history yet.</td></tr>
                  ) : reviewed.map(r => (
                    <tr key={r.id} className="border-b border-[var(--panel-border)] hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-bold">{r.playerName}</td>
                      <td className="px-4 py-3 font-black text-accent">৳{r.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 capitalize">{r.method}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${r.status === 'approved' ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)]">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        {r.screenshotBase64 ? (
                          <button onClick={() => setScreenshot(r.screenshotBase64!)} className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--panel-border)] text-[9px] font-bold hover:border-white/20">
                            <Eye size={10} /> View
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Payment Setup ── */}
        {tab === 'settings' && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              {METHOD_CONFIG.map(m => (
                <button key={m.key} onClick={() => setActiveMethodTab(m.key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black border transition-all ${activeMethodTab === m.key ? 'border-accent/40 bg-accent/10 text-accent' : 'border-[var(--panel-border)] text-[var(--muted)] hover:text-white'}`}>
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
            <div className="glass-panel border border-[var(--panel-border)] rounded-2xl p-5 flex flex-col gap-4">
              <h3 className="font-black text-sm">{METHOD_CONFIG.find(m => m.key === activeMethodTab)?.emoji} {METHOD_CONFIG.find(m => m.key === activeMethodTab)?.label} Details</h3>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] block mb-1.5">{activeMethodTab === 'bank' ? 'Account Number' : 'Phone Number'}</label>
                  <input value={editMethod.number} onChange={e => setEditMethod(m => ({ ...m, number: e.target.value }))}
                    placeholder={activeMethodTab === 'bank' ? 'e.g. 1234567890123456' : '01XXXXXXXXX'}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-accent/50" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] block mb-1.5">Account Type</label>
                  <input value={editMethod.accountType} onChange={e => setEditMethod(m => ({ ...m, accountType: e.target.value }))}
                    placeholder={activeMethodTab === 'bank' ? 'e.g. Current, Savings' : 'e.g. Personal, Merchant'}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-accent/50" />
                </div>
                <button onClick={saveMethod} disabled={saving}
                  className="self-start flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-black font-black text-xs hover:brightness-110 active:scale-95 transition-all disabled:opacity-50">
                  {saving ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  {saving ? 'Saving…' : 'Save Payment Details'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
