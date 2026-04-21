'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Banknote, RefreshCw, CheckCircle2, Clock, Building2, Upload, X, ImageIcon, Wallet } from 'lucide-react';

interface Owner       { id: string; name?: string; contactPerson?: string; email: string; }
interface Turf        { id: string; name: string; ownerId: string; revenueModel?: 'percentage' | 'monthly'; platformCut?: number; }
interface Slot        { id: string; turfId: string; price: number; }
interface Booking     { id: string; slotId: string; date: string; price?: number; }
interface Disbursement { id: string; ownerId: string; amount: number; status: 'pending' | 'cleared'; clearedAt?: string; proofImageUrl?: string; note?: string; createdAt: string; }

export default function DisbursementsPanel() {
  const [owners, setOwners]           = useState<Owner[]>([]);
  const [turfs, setTurfs]             = useState<Turf[]>([]);
  const [slots, setSlots]             = useState<Slot[]>([]);
  const [bookings, setBookings]       = useState<Booking[]>([]);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [loading, setLoading]         = useState(true);
  const [clearing, setClearing]       = useState<string | null>(null);
  const [proofUrl, setProofUrl]       = useState('');
  const [note, setNote]               = useState('');
  const [showClearFor, setShowClearFor] = useState<string | null>(null); // ownerId

  const load = useCallback(async () => {
    setLoading(true);
    const [os, ts, ss, bs, ds] = await Promise.all([
      fetch('/api/bmt/owners').then(r => r.json()),
      fetch('/api/bmt/turfs').then(r => r.json()),
      fetch('/api/bmt/slots').then(r => r.json()),
      fetch('/api/bmt/bookings').then(r => r.json()),
      fetch('/api/bmt/disbursements').then(r => r.json()),
    ]);
    setOwners(Array.isArray(os) ? os : []);
    setTurfs(Array.isArray(ts) ? ts : []);
    setSlots(Array.isArray(ss) ? ss : []);
    setBookings(Array.isArray(bs) ? bs : []);
    setDisbursements(Array.isArray(ds) ? ds : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Compute pending balance for each owner */
  const ownerBalances = owners.map(owner => {
    const ownerTurfs   = turfs.filter(t => t.ownerId === owner.id);
    const ownerSlotIds = new Set(slots.filter(s => ownerTurfs.some(t => t.id === s.turfId)).map(s => s.id));
    const ownerBookings = bookings.filter(b => ownerSlotIds.has(b.slotId));

    const grossRevenue = ownerBookings.reduce((sum, b) => {
      const slot = slots.find(s => s.id === b.slotId);
      const turf = slot ? ownerTurfs.find(t => t.id === slots.find(s2 => s2.id === b.slotId) ? ownerTurfs.find(t2 => ownerSlotIds.has(b.slotId) && t2.id === ownerTurfs[0]?.id)?.id : '') : null;
      const gross = b.price ?? slot?.price ?? 0;
      // Apply platform cut for percentage model
      const matchTurf = ownerTurfs.find(t => slots.find(s => s.id === b.slotId && s.turfId === t.id));
      if (matchTurf?.revenueModel === 'percentage' && matchTurf.platformCut) {
        return sum + gross * (1 - matchTurf.platformCut / 100);
      }
      return sum + gross;
    }, 0);

    const pendingDisbursements = disbursements.filter(d => d.ownerId === owner.id && d.status === 'pending');
    const clearedTotal = disbursements.filter(d => d.ownerId === owner.id && d.status === 'cleared').reduce((s, d) => s + d.amount, 0);
    const pendingBalance = pendingDisbursements.reduce((s, d) => s + d.amount, 0);
    // Actual uncollected = earned - already disbursed (cleared + pending)
    const totalDisbursed = disbursements.filter(d => d.ownerId === owner.id).reduce((s, d) => s + d.amount, 0);
    const undisbursed = Math.max(0, Math.round(grossRevenue - clearedTotal));

    return {
      owner,
      turfsCount: ownerTurfs.length,
      bookingsCount: ownerBookings.length,
      pendingBalance: undisbursed,
      clearedTotal,
      pendingDisbursements,
    };
  }).filter(ob => ob.turfsCount > 0 || ob.bookingsCount > 0);

  const handleClear = async (ownerId: string, amount: number) => {
    if (!proofUrl.trim() && !note.trim()) {
      alert('Please provide a proof image URL or note.');
      return;
    }
    setClearing(ownerId);
    // Create a cleared disbursement record
    const body = {
      ownerId,
      amount,
      status: 'cleared',
      clearedAt: new Date().toISOString().split('T')[0],
      proofImageUrl: proofUrl.trim() || undefined,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    await fetch('/api/bmt/disbursements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setClearing(null);
    setShowClearFor(null);
    setProofUrl('');
    setNote('');
    await load();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Disbursements</h2>
          <p className="text-sm text-[var(--muted)] mt-0.5">View pending balances and clear payments to turf owners with proof.</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-xs font-bold hover:opacity-80 transition-all disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--muted)]">
          <RefreshCw size={18} className="animate-spin mr-2" /> Loading…
        </div>
      ) : ownerBalances.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center border border-dashed border-[var(--panel-border)] rounded-2xl">
          <Wallet size={28} className="text-[var(--muted)]" />
          <p className="font-bold">No owner balances found</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {ownerBalances.map(({ owner, turfsCount, bookingsCount, pendingBalance, clearedTotal }) => {
            const displayName = owner.name || owner.contactPerson || 'Unnamed Owner';
            const isClearingThis = showClearFor === owner.id;
            return (
              <div key={owner.id} className="glass-panel border border-[var(--panel-border)] rounded-2xl overflow-hidden">
                {/* Owner header */}
                <div className="p-4 flex items-center gap-4 border-b border-[var(--panel-border)]">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                    <Building2 size={16} className="text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm">{displayName}</p>
                    <p className="text-[10px] text-[var(--muted)]">{owner.email} · {turfsCount} turf{turfsCount !== 1 ? 's' : ''} · {bookingsCount} bookings</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">Pending Balance</p>
                    <p className={`text-xl font-black ${pendingBalance > 0 ? 'text-accent' : 'text-[var(--muted)]'}`}>
                      ৳{pendingBalance.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-[var(--muted)]">Cleared: ৳{clearedTotal.toLocaleString()}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 flex flex-col gap-3">
                  {pendingBalance === 0 ? (
                    <div className="flex items-center gap-2 text-[10px] font-bold text-accent/60">
                      <CheckCircle2 size={12} /> No pending balance — all cleared
                    </div>
                  ) : !isClearingThis ? (
                    <button onClick={() => setShowClearFor(owner.id)}
                      className="self-start flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-black font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_12px_rgba(0,255,65,0.2)]">
                      <CheckCircle2 size={13} /> Clear ৳{pendingBalance.toLocaleString()}
                    </button>
                  ) : (
                    <div className="flex flex-col gap-3 p-4 rounded-2xl border border-accent/20 bg-accent/5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-accent">Clearing ৳{pendingBalance.toLocaleString()}</p>
                        <button onClick={() => { setShowClearFor(null); setProofUrl(''); setNote(''); }}>
                          <X size={14} className="text-[var(--muted)]" />
                        </button>
                      </div>
                      <input value={proofUrl} onChange={e => setProofUrl(e.target.value)}
                        placeholder="Proof image URL (bKash/bank screenshot link)…"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-accent/50 placeholder:text-neutral-600" />
                      <input value={note} onChange={e => setNote(e.target.value)}
                        placeholder="Note (optional)…"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-medium outline-none focus:border-accent/50 placeholder:text-neutral-600" />
                      <button onClick={() => handleClear(owner.id, pendingBalance)} disabled={clearing === owner.id}
                        className="self-start flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-black font-black text-xs hover:brightness-110 active:scale-95 transition-all disabled:opacity-60">
                        {clearing === owner.id ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        {clearing === owner.id ? 'Processing…' : 'Confirm & Mark Cleared'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
