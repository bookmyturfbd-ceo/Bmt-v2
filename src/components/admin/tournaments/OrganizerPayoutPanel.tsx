'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Banknote, Loader2, RefreshCw, CheckCircle2, Clock,
  Upload, X, Eye, Shield, Trophy, ChevronDown, ChevronRight,
  Users, Filter
} from 'lucide-react';
import { uploadFileToCDN } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────
interface OrgRow {
  organizer: { id: string; name: string; email: string };
  tournaments: {
    id: string; name: string; entryFee: number; status: string;
    payouts: any[]; totalHolding: number; totalCleared: number;
  }[];
  totalHolding: number;
  totalCleared: number;
}

// ── Pay / Clear Modal — mirrors DisburseModal in PayoutsLedgerPanel ───────────
function PayModal({ org, onClose, onDone }: { org: OrgRow; onClose: () => void; onDone: () => void }) {
  const [method, setMethod] = useState<'bank' | 'bkash' | 'cash'>('bkash');
  const [txId, setTxId] = useState('');
  const [proof, setProof] = useState('');
  const [proofName, setProofName] = useState('');
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setProofName(file.name);
    setUploading(true);
    try {
      setProof((await uploadFileToCDN(file, 'tournament-payouts')) ?? '');
    } catch {
      alert('Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const confirm = async () => {
    if (!txId.trim() && !proof) return;
    setSaving(true);
    const res = await fetch('/api/admin/tournament-payouts/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizerId: org.organizer.id,
        proofImageUrl: proof || undefined,
        note: note || txId || undefined,
        method,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.success) {
      setDone(true);
      setTimeout(() => { onDone(); onClose(); }, 1400);
    } else {
      alert(data.error);
    }
  };

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
              <p className="text-sm text-[var(--muted)] mt-1">৳{org.totalHolding.toLocaleString()} cleared for {org.organizer.name}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">Amount credited to organizer wallet.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--panel-border)]">
              <div>
                <h2 className="font-black text-base">Process Organizer Payout</h2>
                <p className="text-xs text-[var(--muted)] mt-0.5">for {org.organizer.name}</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] flex items-center justify-center hover:border-white/20">
                <X size={15} className="text-[var(--muted)]" />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              {/* Amount */}
              <div className="bg-accent/5 border border-accent/25 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-xl font-black text-accent">৳{org.totalHolding.toLocaleString()}</span>
                <span className="text-[10px] font-bold text-accent/60 uppercase tracking-widest">Total Pending Balance</span>
              </div>

              {/* Breakdown by tournament */}
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Breakdown</p>
                {org.tournaments.filter(t => t.totalHolding > 0).map(t => (
                  <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-white/[0.02] border border-white/5 rounded-xl text-xs">
                    <span className="font-bold text-white truncate mr-3">{t.name}</span>
                    <span className="font-black text-accent shrink-0">৳{t.totalHolding.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Payment method */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Payment Method</label>
                <select value={method} onChange={e => setMethod(e.target.value as typeof method)}
                  className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent/50 appearance-none transition-colors">
                  <option value="bkash">📱 Mobile Money / bKash</option>
                  <option value="bank">🏦 Bank Transfer</option>
                  <option value="cash">💵 Cash</option>
                </select>
              </div>

              {/* Tx ID */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Transaction ID / Reference</label>
                <input value={txId} onChange={e => setTxId(e.target.value)}
                  placeholder="e.g. TXN2026050100001"
                  className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-accent/50 placeholder:text-[var(--muted)] transition-colors" />
              </div>

              {/* Proof upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Payment Proof (Screenshot / Receipt)</label>
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  onClick={() => fileRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                    dragging ? 'border-accent bg-accent/8 scale-[1.01]' :
                    proof ? 'border-accent/40 bg-accent/5' :
                    'border-[var(--panel-border)] hover:border-white/25 bg-[var(--panel-bg)]'
                  }`}
                >
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                  {uploading ? (
                    <><Loader2 size={22} className="animate-spin text-accent" /><p className="text-xs text-[var(--muted)]">Uploading…</p></>
                  ) : proof ? (
                    <><CheckCircle2 size={22} className="text-accent" /><p className="text-xs font-bold text-accent truncate max-w-[200px]">{proofName}</p><p className="text-[10px] text-[var(--muted)]">Click to replace</p></>
                  ) : (
                    <><Upload size={22} className="text-[var(--muted)]" /><p className="text-sm font-semibold">Drop file or <span className="text-accent">browse</span></p><p className="text-[11px] text-[var(--muted)]">PNG, JPG, PDF up to 10MB</p></>
                  )}
                </div>
              </div>

              <button onClick={confirm} disabled={saving || uploading || (!txId.trim() && !proof)}
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

// ── Proof Viewer ──────────────────────────────────────────────────────────────
function ProofModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />
      <div className="relative max-w-2xl w-full z-10">
        <img src={url} alt="Proof" className="w-full rounded-2xl border border-white/10 shadow-2xl" />
        <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 bg-black/60 rounded-xl flex items-center justify-center border border-white/10"><X size={16} /></button>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function OrganizerPayoutPanel() {
  const [data, setData]               = useState<OrgRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [payTarget, setPayTarget]     = useState<OrgRow | null>(null);
  const [proofUrl, setProofUrl]       = useState<string | null>(null);
  const [expanded, setExpanded]       = useState<Set<string>>(new Set());
  const [histTab, setHistTab]         = useState<'active' | 'history'>('active');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/tournament-payouts');
    const json = await res.json();
    if (json.success) {
      // Enrich each group with aggregated totals
      setData(json.data.map((g: any) => ({
        organizer: g.organizer,
        tournaments: g.tournaments,
        totalHolding: g.tournaments.reduce((s: number, t: any) => s + t.totalHolding, 0),
        totalCleared: g.tournaments.reduce((s: number, t: any) => s + t.totalCleared, 0),
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => setExpanded(prev => {
    const s = new Set(prev);
    s.has(id) ? s.delete(id) : s.add(id);
    return s;
  });

  const totalUnpaid  = data.reduce((s, r) => s + r.totalHolding, 0);
  const totalCleared = data.reduce((s, r) => s + r.totalCleared, 0);
  const pendingCount = data.filter(r => r.totalHolding > 0).length;

  const activeRows  = data.filter(r => r.totalHolding > 0 || r.tournaments.some(t => t.payouts.length > 0));
  const historyRows = data.filter(r => r.totalCleared > 0);

  return (
    <div className="flex flex-col gap-8">

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3 border border-accent/25 bg-accent/5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent/10 border border-accent/30"><Banknote size={18} className="text-accent" /></div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)]">BMT Holding</p>
            <p className="text-2xl font-black mt-0.5 text-accent">৳{totalUnpaid.toLocaleString()}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">Pending release to organizers</p>
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3 border border-[var(--panel-border)]">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--panel-bg)] border border-[var(--panel-border)]"><CheckCircle2 size={18} className="text-[var(--muted)]" /></div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)]">Total Cleared</p>
            <p className="text-2xl font-black mt-0.5">৳{totalCleared.toLocaleString()}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">Paid out to organizers</p>
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-5 flex flex-col gap-3 border border-[var(--panel-border)]">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--panel-bg)] border border-[var(--panel-border)]"><Clock size={18} className="text-[var(--muted)]" /></div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--muted)]">Pending Payouts</p>
            <p className="text-2xl font-black mt-0.5">{pendingCount}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">Organizers awaiting payment</p>
          </div>
        </div>
      </div>

      {/* ── Tab Switcher ── */}
      <div className="flex items-center gap-2 border-b border-[var(--panel-border)] pb-0">
        {(['active', 'history'] as const).map(tab => (
          <button key={tab} onClick={() => setHistTab(tab)}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-all -mb-px ${
              histTab === tab ? 'border-accent text-accent' : 'border-transparent text-[var(--muted)] hover:text-foreground'
            }`}>
            {tab === 'active' ? 'Active Payouts' : 'Cleared History'}
          </button>
        ))}
        <button onClick={load} disabled={loading} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-xs font-bold hover:opacity-80 transition-all disabled:opacity-50">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── Active Payouts Ledger ── */}
      {histTab === 'active' && (
        loading ? (
          <div className="flex items-center gap-2 py-8 text-[var(--muted)]"><Loader2 size={16} className="animate-spin" /> Loading ledger…</div>
        ) : activeRows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center glass-panel rounded-2xl">
            <Banknote size={36} className="text-[var(--muted)] opacity-30" />
            <p className="font-bold text-[var(--muted)]">No active payout ledger entries</p>
            <p className="text-xs text-[var(--muted)]">Entry fees appear here once players register for paid tournaments.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--panel-border)] glass-panel">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--panel-border)] text-[var(--muted)]">
                  {['Organizer', 'Tournaments', 'Pending Balance', 'Total Cleared', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeRows.map(row => {
                  const isExpanded = expanded.has(row.organizer.id);
                  return (
                    <>
                      <tr
                        key={row.organizer.id}
                        className="border-b border-[var(--panel-border)] last:border-0 hover:bg-[var(--panel-bg)] transition-colors cursor-pointer"
                        onClick={() => toggle(row.organizer.id)}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                              <Shield size={14} className="text-accent" />
                            </div>
                            <div>
                              <p className="font-bold">{row.organizer.name}</p>
                              <p className="text-[11px] text-[var(--muted)]">{row.organizer.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm font-black">{row.tournaments.length}</span>
                          <span className="text-xs text-[var(--muted)] ml-1">tournament{row.tournaments.length !== 1 ? 's' : ''}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`text-base font-black ${row.totalHolding > 0 ? 'text-accent' : 'text-[var(--muted)]'}`}>
                            ৳{row.totalHolding.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-[var(--muted)]">
                          ৳{row.totalCleared.toLocaleString()}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              disabled={row.totalHolding <= 0}
                              onClick={e => { e.stopPropagation(); setPayTarget(row); }}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-black text-xs font-black hover:brightness-110 active:scale-95 transition-all shadow-[0_2px_10px_rgba(0,255,0,0.2)] disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
                            >
                              <Banknote size={13} strokeWidth={2.5} /> Pay
                            </button>
                            {isExpanded ? <ChevronDown size={14} className="text-[var(--muted)]" /> : <ChevronRight size={14} className="text-[var(--muted)]" />}
                          </div>
                        </td>
                      </tr>
                      {/* Expandable breakdown */}
                      {isExpanded && row.tournaments.map(t => (
                        <tr key={t.id} className="bg-black/20 border-b border-white/5 last:border-0">
                          <td className="pl-16 pr-5 py-3" colSpan={5}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <Trophy size={12} className="text-yellow-400 shrink-0" />
                                <div>
                                  <span className="text-sm font-bold text-white">{t.name}</span>
                                  <span className="ml-2 text-[10px] text-[var(--muted)]">
                                    {t.payouts.length} registration{t.payouts.length !== 1 ? 's' : ''} · ৳{t.entryFee} entry
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-xs font-bold shrink-0">
                                {t.totalHolding > 0 && (
                                  <span className="text-yellow-400">🟡 ৳{t.totalHolding.toLocaleString()} holding</span>
                                )}
                                {t.totalCleared > 0 && (
                                  <span className="text-accent">✅ ৳{t.totalCleared.toLocaleString()} cleared</span>
                                )}
                              </div>
                            </div>
                            {/* Registration lines */}
                            <div className="mt-2 flex flex-col gap-1 pl-5">
                              {t.payouts.map((p: any) => (
                                <div key={p.id} className="flex items-center gap-4 text-xs py-0.5">
                                  <span className="text-neutral-300 font-bold w-40 truncate">{p.entityName}</span>
                                  <span className="text-[var(--muted)] uppercase text-[10px]">{p.entityType}</span>
                                  <span className="font-black">৳{p.amount}</span>
                                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase ${p.status === 'HOLDING' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-accent/10 text-accent'}`}>
                                    {p.status}
                                  </span>
                                  {p.proofImageUrl && (
                                    <button onClick={() => setProofUrl(p.proofImageUrl)} className="text-blue-400 text-[9px] font-bold flex items-center gap-0.5 hover:text-blue-300">
                                      <Eye size={9} /> proof
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* ── Cleared History ── */}
      {histTab === 'history' && (
        historyRows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center glass-panel rounded-2xl">
            <Filter size={28} className="text-[var(--muted)] opacity-30" />
            <p className="font-bold text-[var(--muted)]">No cleared payouts yet</p>
            <p className="text-xs text-[var(--muted)]">Cleared organizer payouts will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--panel-border)] glass-panel">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--panel-border)] text-[var(--muted)]">
                  {['Organizer', 'Tournaments', 'Total Cleared', 'Proof'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[11px] font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historyRows.map(row => {
                  const lastProof = row.tournaments.flatMap(t => t.payouts).filter(p => p.proofImageUrl).at(-1);
                  return (
                    <tr key={row.organizer.id} className="border-b border-[var(--panel-border)] last:border-0 hover:bg-[var(--panel-bg)] transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-bold">{row.organizer.name}</p>
                        <p className="text-[11px] text-[var(--muted)]">{row.organizer.email}</p>
                      </td>
                      <td className="px-5 py-4 text-xs text-[var(--muted)]">{row.tournaments.length} tournament{row.tournaments.length !== 1 ? 's' : ''}</td>
                      <td className="px-5 py-4 font-black text-accent">৳{row.totalCleared.toLocaleString()}</td>
                      <td className="px-5 py-4">
                        {lastProof?.proofImageUrl ? (
                          <button onClick={() => setProofUrl(lastProof.proofImageUrl)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--panel-border)] text-[11px] font-bold text-[var(--muted)] hover:border-white/25 hover:text-foreground transition-colors">
                            <Eye size={12} /> View
                          </button>
                        ) : <span className="text-[var(--muted)] text-xs">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Modals */}
      {payTarget && <PayModal org={payTarget} onClose={() => setPayTarget(null)} onDone={load} />}
      {proofUrl  && <ProofModal url={proofUrl} onClose={() => setProofUrl(null)} />}
    </div>
  );
}
