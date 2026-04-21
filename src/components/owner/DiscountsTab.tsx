'use client';
import { useState, useEffect, useCallback } from 'react';
import { getCookie } from '@/lib/cookies';
import {
  Tag, Plus, Trash2, CalendarDays, Clock, Percent, RefreshCw,
  CheckCircle2, X, Sun, Sunset, Moon, Coffee, AlertTriangle
} from 'lucide-react';

interface Turf    { id: string; name: string; ownerId: string; sports?: string[]; }
interface Discount {
  id: string; turfId: string; code: string; type: string; value: number;
  active: boolean; expiresAt?: string | null; createdAt: string;
}

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const TIME_OF_DAY = [
  { key: 'Morning',   label: 'Morning',   range: '06:00–12:00', icon: Sun,    color: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/5' },
  { key: 'Afternoon', label: 'Afternoon', range: '12:00–15:00', icon: Coffee, color: 'text-orange-300 border-orange-300/40 bg-orange-300/5' },
  { key: 'Evening',   label: 'Evening',   range: '15:00–19:00', icon: Sunset, color: 'text-pink-400 border-pink-400/40 bg-pink-400/5' },
  { key: 'Night',     label: 'Night',     range: '19:00–00:00', icon: Moon,   color: 'text-indigo-400 border-indigo-400/40 bg-indigo-400/5' },
];

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];
}

interface Props { turfId: string; turfSports: string[]; turfGrounds: { id: string; name: string }[]; }

export default function DiscountsTab({ turfId, turfSports, turfGrounds }: Props) {
  const [discounts, setDiscounts]     = useState<Discount[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [deleteId, setDeleteId]       = useState<string | null>(null);

  // Form state
  const [reason, setReason]           = useState('');
  const [pct, setPct]                 = useState<number>(20);
  const [validFrom, setValidFrom]     = useState('');
  const [validTo, setValidTo]         = useState('');
  const [sport, setSport]             = useState('all');
  const [groundId, setGroundId]       = useState('all');
  const [selDays, setSelDays]         = useState<string[]>([]);
  const [selTimes, setSelTimes]       = useState<string[]>([]);
  const [err, setErr]                 = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetch('/api/bmt/discounts').then(r => r.json()).catch(() => []);
    setDiscounts(Array.isArray(data) ? data.filter((d: Discount) => d.turfId === turfId) : []);
    setLoading(false);
  }, [turfId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    setErr('');
    if (!reason.trim()) { setErr('Please enter a reason / purpose.'); return; }
    if (pct < 1 || pct > 99) { setErr('Discount must be between 1% and 99%.'); return; }
    if (!validFrom || !validTo) { setErr('Please set valid from and valid to dates.'); return; }
    if (validTo < validFrom) { setErr('Valid To must be after Valid From.'); return; }

    setSaving(true);
    await fetch('/api/bmt/discounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        turfId, 
        code: reason.trim(), 
        value: pct,
        expiresAt: validTo ? new Date(validTo).toISOString() : undefined,
        active: true,
        groundId: groundId === 'all' ? null : groundId,
        targetSport: sport === 'all' ? null : sport,
        targetDays: selDays,
        targetTimes: selTimes
      }),
    });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Reset form
    setReason(''); setPct(20); setValidFrom(''); setValidTo('');
    setSport('all'); setGroundId('all'); setSelDays([]); setSelTimes([]);
    load();
  };

  const handleDelete = async (id: string) => {
    await fetch('/api/bmt/discounts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setDeleteId(null);
    load();
  };

  const isExpired = (d: Discount) => d.expiresAt ? new Date(d.expiresAt) < new Date() : false;
  const isActive  = (d: Discount) => !isExpired(d) && d.active;

  return (
    <div className="flex flex-col gap-6">

      {/* Add discount form */}
      <div className="glass-panel border border-[var(--panel-border)] rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--panel-border)]">
          <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
            <Plus size={14} className="text-accent" />
          </div>
          <span className="font-black text-sm">Add Discount</span>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Reason */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Reason / Purpose</label>
            <input value={reason} onChange={e => setReason(e.target.value)}
              placeholder="e.g. New Year offer, Independence Day offer"
              className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-accent/50 placeholder:text-[var(--muted)] transition-colors" />
          </div>

          {/* Discount % */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Discount %</label>
            <div className="flex items-center gap-0">
              <input type="number" min={1} max={99} value={pct} onChange={e => setPct(Number(e.target.value))}
                className="flex-1 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-l-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-accent/50 transition-colors" />
              <div className="px-3 py-2.5 border border-l-0 border-[var(--panel-border)] rounded-r-xl bg-accent/5">
                <Percent size={14} className="text-accent" />
              </div>
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Valid From</label>
              <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)}
                className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-accent/50 transition-colors" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Valid To</label>
              <input type="date" value={validTo} onChange={e => setValidTo(e.target.value)}
                className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-accent/50 transition-colors" />
            </div>
          </div>

          {/* Sport & Ground */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Sport</label>
              <select value={sport} onChange={e => setSport(e.target.value)}
                className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-accent/50 transition-colors">
                <option value="all">All Sports</option>
                {turfSports.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Ground</label>
              <select value={groundId} onChange={e => setGroundId(e.target.value)}
                className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-accent/50 transition-colors">
                <option value="all">All Grounds</option>
                {turfGrounds.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>

          {/* Time of day */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Time of Day <span className="normal-case font-normal text-[var(--muted)]">(leave empty = all times)</span></label>
            <div className="grid grid-cols-2 gap-2">
              {TIME_OF_DAY.map(({ key, label, range, icon: Icon, color }) => (
                <button key={key} onClick={() => setSelTimes(t => toggle(t, key))}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-[1.5px] transition-all text-left ${
                    selTimes.includes(key) ? color : 'border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--muted)] hover:border-white/20'
                  }`}>
                  <Icon size={14} className={selTimes.includes(key) ? '' : 'text-[var(--muted)]'} />
                  <div>
                    <p className="text-xs font-black leading-none">{label}</p>
                    <p className="text-[9px] font-medium opacity-70 leading-none mt-0.5">{range}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Days */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Days <span className="normal-case font-normal text-[var(--muted)]">(leave empty = all days)</span></label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(d => (
                <button key={d} onClick={() => setSelDays(ds => toggle(ds, d))}
                  className={`px-3 py-1.5 rounded-xl border-[1.5px] text-xs font-black transition-all ${
                    selDays.includes(d)
                      ? 'bg-accent/15 border-accent/40 text-accent'
                      : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:border-white/20 hover:text-foreground'
                  }`}>
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {err && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-red-500/30 bg-red-500/5">
              <AlertTriangle size={13} className="text-red-400 shrink-0" />
              <p className="text-xs font-bold text-red-400">{err}</p>
            </div>
          )}

          <button onClick={handleAdd} disabled={saving}
            className="w-full py-3 rounded-2xl bg-accent text-black font-black text-sm hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-[0_4px_20px_rgba(0,255,65,0.2)] flex items-center justify-center gap-2">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : <Tag size={14} />}
            {saved ? 'Discount Added!' : saving ? 'Saving…' : 'Add Discount'}
          </button>
        </div>
      </div>

      {/* Existing discounts */}
      <div className="glass-panel border border-[var(--panel-border)] rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[var(--panel-border)]">
          <Tag size={14} className="text-accent" />
          <span className="font-black text-sm">Active Discounts</span>
          <span className="ml-auto text-[10px] font-bold text-[var(--muted)] uppercase tracking-widest">{discounts.filter(isActive).length} active</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-[var(--muted)]">
            <RefreshCw size={16} className="animate-spin mr-2" /> Loading…
          </div>
        ) : discounts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center px-5">
            <Tag size={24} className="text-[var(--muted)]" />
            <p className="font-bold text-sm">No discounts yet</p>
            <p className="text-xs text-[var(--muted)]">Add your first discount using the form above.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--panel-border)]">
            {discounts.map(d => {
              const expired  = isExpired(d);
              const active   = isActive(d);
              return (
                <div key={d.id} className={`px-5 py-4 flex items-start gap-4 ${expired ? 'opacity-50' : ''}`}>
                  {/* Pct badge */}
                  <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${
                    active ? 'bg-accent/10 border-accent/25 text-accent' : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)]'
                  }`}>
                    <span className="text-lg font-black leading-none">{d.value}</span>
                    <span className="text-[8px] font-black uppercase">{d.type === 'fixed' ? 'TK' : '%'} OFF</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black truncate">{d.code}</p>
                      {expired ? (
                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border border-red-500/30 text-red-400">Expired</span>
                      ) : (
                        <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border border-accent/30 text-accent bg-accent/5">Active</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                      <p className="text-[10px] text-[var(--muted)]"><CalendarDays size={9} className="inline mr-0.5" />Expires: {d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : 'Never'}</p>
                      {/* Optional targeting badges */}
                      {(d as any).groundId && <p className="text-[10px] text-blue-400 font-bold bg-blue-400/10 px-1.5 rounded-md leading-relaxed">Targeted Ground</p>}
                      {(d as any).targetSport && <p className="text-[10px] text-green-400 font-bold bg-green-400/10 px-1.5 rounded-md leading-relaxed">{(d as any).targetSport}</p>}
                      {((d as any).targetDays?.length > 0) && <p className="text-[10px] text-purple-400 font-bold bg-purple-400/10 px-1.5 rounded-md leading-relaxed">Specific Days</p>}
                      {((d as any).targetTimes?.length > 0) && <p className="text-[10px] text-orange-400 font-bold bg-orange-400/10 px-1.5 rounded-md leading-relaxed">Specific Shifts</p>}
                    </div>
                  </div>

                  {deleteId === d.id ? (
                    <div className="flex gap-1.5 shrink-0">
                      <button onClick={() => handleDelete(d.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black hover:bg-red-500/25 transition-colors">
                        Delete
                      </button>
                      <button onClick={() => setDeleteId(null)}
                        className="px-2 py-1.5 rounded-lg border border-[var(--panel-border)] text-[10px] text-[var(--muted)] font-black">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteId(d.id)}
                      className="w-8 h-8 rounded-xl border border-[var(--panel-border)] flex items-center justify-center text-[var(--muted)] hover:text-red-400 hover:border-red-500/30 transition-colors shrink-0">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
