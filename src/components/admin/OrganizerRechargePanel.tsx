'use client';
import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, X, RefreshCw, Eye, Wallet, History } from 'lucide-react';

interface OrgRechargeRequest {
  id: string;
  organizerId: string;
  amount: number;
  method: string;
  screenshotBase64?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  organizer: { id: string; name: string; email: string };
}

function ScreenshotModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
      <div className="relative z-10 max-w-md w-full">
        <img src={src} alt="Payment proof" className="w-full rounded-2xl border border-white/10 shadow-2xl" />
        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-xl flex items-center justify-center border border-white/10">
          <X size={14} className="text-white" />
        </button>
      </div>
    </div>
  );
}

const METHOD_EMOJI: Record<string, string> = { bkash: '📱', nagad: '📲', bank: '🏦' };

export default function OrganizerRechargePanel() {
  const [tab, setTab]           = useState<'pending' | 'history'>('pending');
  const [requests, setRequests] = useState<OrgRechargeRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/organizers/recharge');
    const d   = await res.json();
    if (d.success) setRequests(d.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    setActionId(id);
    const res = await fetch(`/api/admin/organizers/recharge/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const d = await res.json();
    setActionId(null);
    if (!d.success) {
      alert(`Action failed: ${d.error}`);
      return;
    }
    await load();
  };

  const pending  = requests.filter(r => r.status === 'pending').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const reviewed = requests.filter(r => r.status !== 'pending').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const totalApproved = requests.filter(r => r.status === 'approved').reduce((s, r) => s + r.amount, 0);

  return (
    <>
      {screenshot && <ScreenshotModal src={screenshot} onClose={() => setScreenshot(null)} />}

      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-black">Organizer Wallet Recharges</h2>
            <p className="text-sm text-[var(--muted)] mt-0.5">Review and approve organizer top-up requests.</p>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-xs font-bold hover:opacity-80 disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pending',        value: pending.length,                                              color: 'text-yellow-400' },
            { label: 'Total Approved', value: `৳${totalApproved.toLocaleString()}`,                       color: 'text-accent' },
            { label: 'Rejected',       value: reviewed.filter(r => r.status === 'rejected').length,       color: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="glass-panel border border-[var(--panel-border)] rounded-2xl p-4 flex flex-col gap-1">
              <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">{s.label}</p>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-[var(--panel-border)]">
          {[
            { key: 'pending', icon: Wallet,  label: `Pending (${pending.length})` },
            { key: 'history', icon: History, label: 'History' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-black transition-all ${tab === t.key ? 'bg-accent text-black' : 'text-[var(--muted)] hover:text-white'}`}>
              <t.icon size={12} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── Pending ── */}
        {tab === 'pending' && (
          loading ? (
            <div className="flex items-center justify-center py-16 text-[var(--muted)]">
              <RefreshCw size={16} className="animate-spin mr-2" /> Loading…
            </div>
          ) : pending.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center border border-dashed border-[var(--panel-border)] rounded-2xl">
              <Wallet size={28} className="text-[var(--muted)]" />
              <p className="font-bold">No pending requests</p>
              <p className="text-xs text-[var(--muted)]">All organizer recharge requests have been reviewed.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pending.map(r => (
                <div key={r.id} className="glass-panel border border-[var(--panel-border)] rounded-2xl overflow-hidden">
                  <div className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl">{METHOD_EMOJI[r.method] ?? '💳'}</span>
                      <div className="min-w-0">
                        <p className="font-black text-sm">{r.organizer.name}</p>
                        <p className="text-[10px] text-[var(--muted)] truncate">{r.organizer.email} · {r.method} · {new Date(r.createdAt).toLocaleDateString('en-BD')}</p>
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
              ))}
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
                    {['Organizer', 'Amount', 'Method', 'Status', 'Requested', 'Proof'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[var(--muted)] whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reviewed.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-[var(--muted)]">No history yet.</td></tr>
                  ) : reviewed.map(r => (
                    <tr key={r.id} className="border-b border-[var(--panel-border)] hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <p className="font-bold">{r.organizer.name}</p>
                        <p className="text-[10px] text-[var(--muted)]">{r.organizer.email}</p>
                      </td>
                      <td className="px-4 py-3 font-black text-accent">৳{r.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 capitalize">{METHOD_EMOJI[r.method]} {r.method}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          r.status === 'approved' ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>{r.status}</span>
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
      </div>
    </>
  );
}
