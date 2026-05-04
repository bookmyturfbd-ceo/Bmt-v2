'use client';
import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, ChevronRight, Loader2, Trophy, Upload, X,
  Check, Wallet, AlertTriangle
} from 'lucide-react';
import FormatConfigPanel, { defaultConfig } from './FormatConfigPanel';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Props {
  onCancel: () => void;
  onSuccess: () => void;
  /** When true, uses organizer auth endpoint for publish check */
  isOrganizer?: boolean;
  /** Pre-set for organizer mode */
  organizerId?: string;
}

const FORMATS = [
  {
    value: 'KNOCKOUT',
    label: 'Single Elimination',
    emoji: '⚡',
    desc: 'Lose once, you\'re out. Fast & decisive bracket.'
  },
  {
    value: 'DOUBLE_ELIMINATION',
    label: 'Double Elimination',
    emoji: '🔄',
    desc: 'Second chance bracket — fairer, more matches.'
  },
  {
    value: 'LEAGUE',
    label: 'Round Robin',
    emoji: '🔁',
    desc: 'Everyone plays everyone. Best overall record wins.'
  },
  {
    value: 'GROUP_KNOCKOUT',
    label: 'Group Stage + Knockout',
    emoji: '🏟️',
    desc: 'Groups feed into a knockout bracket. FIFA-style.'
  },
];

const TEAM_PRESETS = [4, 8, 16, 32, 64];

const inputCls = 'w-full bg-neutral-900 border border-white/10 rounded-xl p-3 font-bold text-white focus:border-accent focus:outline-none transition-colors placeholder:text-neutral-600';
const labelCls = 'block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2';

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  const steps = ['Basic Info', 'Format', 'Review'];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((s, i) => {
        const idx = i + 1;
        const done = step > idx;
        const active = step === idx;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={`flex items-center gap-2 shrink-0`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                done ? 'bg-accent text-black' : active ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-500'
              }`}>
                {done ? <Check size={14} strokeWidth={3} /> : idx}
              </div>
              <span className={`text-xs font-black uppercase tracking-wider ${active ? 'text-white' : 'text-neutral-500'}`}>{s}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-px mx-3 ${done ? 'bg-accent' : 'bg-white/10'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────
export default function CreateTournamentWizard({ onCancel, onSuccess, isOrganizer = false, organizerId }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [turfs, setTurfs] = useState<any[]>([]);
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [publishCheck, setPublishCheck] = useState<any>(null);
  const [publishLoading, setPublishLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    bannerImageUrl: '',
    sport: 'FOOTBALL',
    venueId: '',
    maxParticipants: 16,
    prizePoolTotal: 0,
    entryFee: 0,
    startDate: '',
    endDate: '',
    startTime: '',
    formatType: 'KNOCKOUT',
    registrationType: 'TEAM',
    auctionEnabled: false,
    operatorType: isOrganizer ? 'ORGANIZER' : 'PLATFORM',
    operatorId: organizerId || 'super_admin',
  });
  const [formatConfig, setFormatConfig] = useState<Record<string, any>>(
    () => defaultConfig('KNOCKOUT', 16)
  );

  // Load turfs + organizers (admin only)
  useEffect(() => {
    fetch('/api/admin/wbt/turfs').then(r => r.json()).then(d => setTurfs(d.turfs || []));
    if (!isOrganizer) {
      fetch('/api/organizers').then(r => r.json()).then(d => { if (d.success) setOrganizers(d.data); });
    }
  }, [isOrganizer]);

  // Load publish check when reaching step 3
  useEffect(() => {
    if (step !== 3) return;
    setPublishLoading(true);
    const endpoint = isOrganizer ? '/api/organizers/me' : null;
    if (!endpoint) {
      setPublishCheck({ isSuperAdmin: true });
      setPublishLoading(false);
      return;
    }
    fetch(endpoint).then(r => r.json()).then(d => {
      if (d.success) {
        setPublishCheck({
          chargePerTournament: d.data.chargePerTournament ?? 0,
          walletBalance: d.data.wallet?.balance ?? 0,
        });
      }
      setPublishLoading(false);
    });
  }, [step, isOrganizer]);

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  // Re-initialise format config when format or team count changes
  const prevFormat = useRef(form.formatType);
  const handleFormatChange = (newFormat: string) => {
    set('formatType', newFormat);
    if (newFormat !== prevFormat.current) {
      setFormatConfig(defaultConfig(newFormat, form.maxParticipants));
      prevFormat.current = newFormat;
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/upload/tournament-logo', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) set('bannerImageUrl', data.url);
      else alert('Upload failed: ' + data.error);
    } catch { alert('Upload failed.'); }
    finally { setUploadingLogo(false); }
  };

  const venueLabel = () => {
    const t = turfs.find(t => t.id === form.venueId);
    return t ? `${t.name} — ${t.city.name}, ${t.division.name}` : '';
  };

  const handlePublish = async () => {
    setSaving(true);
    setConfirmOpen(false);
    try {
      const payload = {
        ...form,
        maxParticipants: Number(form.maxParticipants),
        prizePoolTotal: Number(form.prizePoolTotal),
        entryFee: Number(form.entryFee),
        venue: venueLabel() || null,
        prizeType: form.prizePoolTotal > 0 ? 'REAL_MONEY' : 'TROPHY_ONLY',
        formatConfig,
      };
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess();
      } else {
        alert(data.error);
      }
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  const canGoNext1 = form.name.trim() && form.startDate && form.endDate && form.maxParticipants > 0;

  // ── Publish button state ──────────────────────────────────────────────────
  let publishDisabled = false;
  let publishMsg = '';
  if (publishLoading) {
    publishDisabled = true;
  } else if (publishCheck && !publishCheck.isSuperAdmin) {
    const charge = publishCheck.chargePerTournament ?? 0;
    const bal = publishCheck.walletBalance ?? 0;
    if (charge === 0) {
      publishDisabled = true;
      publishMsg = 'Publishing amount is not set. Please contact BMT.';
    } else if (bal < charge) {
      publishDisabled = true;
      publishMsg = `Insufficient balance — need ৳${charge}, have ৳${bal}.`;
    }
  }

  const triggerPublish = () => {
    if (publishCheck?.isSuperAdmin || (publishCheck?.chargePerTournament ?? 0) === 0) {
      handlePublish();
    } else {
      setConfirmOpen(true);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2 shrink-0">
        <button
          onClick={step === 1 ? onCancel : () => setStep(s => s - 1)}
          className="p-2 bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h3 className="text-xl font-black uppercase tracking-wider">Create Tournament</h3>
          <p className="text-xs text-neutral-400 font-bold">Fill in details to launch your event</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <div className="max-w-2xl py-4">
          <StepBar step={step} />

          {/* ── STEP 1: Basic Info ─────────────────────────────────────────── */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Admin: Operator picker */}
              {!isOrganizer && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Operator</label>
                    <select
                      value={form.operatorType}
                      onChange={e => {
                        set('operatorType', e.target.value);
                        set('operatorId', e.target.value === 'PLATFORM' ? 'super_admin' : '');
                      }}
                      className={inputCls}
                    >
                      <option value="PLATFORM">BMT Official</option>
                      <option value="ORGANIZER">External Organizer</option>
                    </select>
                  </div>
                  {form.operatorType === 'ORGANIZER' && (
                    <div>
                      <label className={labelCls}>Select Organizer</label>
                      <select
                        value={form.operatorId}
                        onChange={e => set('operatorId', e.target.value)}
                        className={inputCls}
                      >
                        <option value="">Choose organizer…</option>
                        {organizers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Name */}
              <div>
                <label className={labelCls}>Tournament Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dhaka Winter Cup 2026"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Logo upload */}
              <div>
                <label className={labelCls}>Logo / Banner</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="relative w-full h-36 rounded-xl border-2 border-dashed border-white/10 hover:border-accent/50 transition-colors cursor-pointer flex items-center justify-center overflow-hidden bg-neutral-900 group"
                >
                  {form.bannerImageUrl ? (
                    <>
                      <img src={form.bannerImageUrl} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-xs font-black uppercase tracking-widest text-white">Change</span>
                      </div>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); set('bannerImageUrl', ''); }}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center z-10"
                      >
                        <X size={12} />
                      </button>
                    </>
                  ) : uploadingLogo ? (
                    <Loader2 size={28} className="animate-spin text-accent" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-neutral-500">
                      <Upload size={24} />
                      <span className="text-xs font-bold">Click to upload logo/banner</span>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>

              {/* Sport */}
              <div>
                <label className={labelCls}>Sport</label>
                <div className="flex gap-3">
                  {['FOOTBALL', 'CRICKET'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => set('sport', s)}
                      className={`flex-1 py-3 rounded-xl font-black uppercase text-sm tracking-wider transition-all ${
                        form.sport === s ? 'bg-accent text-black' : 'bg-neutral-900 border border-white/10 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {s === 'FOOTBALL' ? '⚽ Football' : '🏏 Cricket'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Venue */}
              <div>
                <label className={labelCls}>Venue</label>
                <select value={form.venueId} onChange={e => set('venueId', e.target.value)} className={inputCls}>
                  <option value="">Select venue (optional)</option>
                  {turfs.map(t => (
                    <option key={t.id} value={t.id}>{t.name} — {t.city.name}, {t.division.name}</option>
                  ))}
                </select>
              </div>

              {/* Total Teams */}
              <div>
                <label className={labelCls}>Total Teams</label>
                <div className="flex gap-2 mb-2">
                  {TEAM_PRESETS.map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set('maxParticipants', n)}
                      className={`flex-1 py-2 rounded-lg font-black text-sm transition-all ${
                        form.maxParticipants === n ? 'bg-accent text-black' : 'bg-neutral-900 border border-white/10 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={2}
                  value={form.maxParticipants}
                  onChange={e => set('maxParticipants', parseInt(e.target.value) || 0)}
                  className={inputCls}
                  placeholder="Or enter custom number"
                />
              </div>

              {/* Prize + Entry Fee */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Prize Money (৳)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-black">৳</span>
                    <input type="number" min={0} value={form.prizePoolTotal} onChange={e => set('prizePoolTotal', parseInt(e.target.value) || 0)} className={inputCls + ' pl-7'} placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Entry Fee (৳)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-black">৳</span>
                    <input type="number" min={0} value={form.entryFee} onChange={e => set('entryFee', parseInt(e.target.value) || 0)} className={inputCls + ' pl-7'} placeholder="0" />
                  </div>
                </div>
              </div>

              {/* Dates + Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Start Date</label>
                  <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>End Date</label>
                  <input type="date" value={form.endDate} min={form.startDate} onChange={e => set('endDate', e.target.value)} className={inputCls} />
                </div>
              </div>
              <div className="max-w-xs">
                <label className={labelCls}>Start Time</label>
                <input type="time" value={form.startTime} onChange={e => set('startTime', e.target.value)} className={inputCls} />
              </div>

              <button
                disabled={!canGoNext1}
                onClick={() => setStep(2)}
                className="mt-4 bg-white text-black font-black uppercase tracking-wider px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next: Format <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* ── STEP 2: Format ─────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Tournament Format</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {FORMATS.map(f => (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => handleFormatChange(f.value)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        form.formatType === f.value
                          ? 'border-accent bg-accent/10 shadow-[0_0_20px_rgba(0,255,65,0.1)]'
                          : 'border-white/10 bg-neutral-900 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{f.emoji}</span>
                        {form.formatType === f.value && <Check size={16} className="text-accent" strokeWidth={3} />}
                      </div>
                      <p className="font-black text-sm text-white">{f.label}</p>
                      <p className="text-xs text-neutral-400 mt-1 font-medium">{f.desc}</p>
                    </button>
                  ))}
                </div>

              <FormatConfigPanel
                formatType={form.formatType}
                teams={form.maxParticipants}
                config={formatConfig}
                onChange={setFormatConfig}
              />
              </div>

              {/* Registration type */}
              <div>
                <label className={labelCls}>Registration Type</label>
                <div className="flex gap-3">
                  {[['TEAM', '🛡️ Teams Register'], ['PLAYER', '👤 Individual Players']].map(([v, l]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => set('registrationType', v)}
                      className={`flex-1 py-3 rounded-xl font-black text-sm tracking-wider transition-all ${
                        form.registrationType === v ? 'bg-accent text-black' : 'bg-neutral-900 border border-white/10 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {form.registrationType === 'PLAYER' && (
                <label className="flex items-center gap-3 bg-neutral-900 p-4 rounded-xl border border-white/5 cursor-pointer hover:border-accent/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.auctionEnabled}
                    onChange={e => set('auctionEnabled', e.target.checked)}
                    className="w-5 h-5 accent-[#00ff41]"
                  />
                  <div>
                    <p className="font-black text-sm">Enable Player Auction</p>
                    <p className="text-xs text-neutral-400 mt-0.5">Captains bid on players using virtual budget</p>
                  </div>
                </label>
              )}

              <button
                onClick={() => setStep(3)}
                className="mt-4 bg-white text-black font-black uppercase tracking-wider px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-accent transition-colors"
              >
                Review & Publish <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* ── STEP 3: Review & Publish ───────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Summary card */}
              <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden">
                {form.bannerImageUrl && (
                  <div className="w-full h-36 overflow-hidden">
                    <img src={form.bannerImageUrl} alt="Banner" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xl font-black text-white">{form.name}</h4>
                      <p className="text-xs text-neutral-400 font-bold uppercase tracking-wider">{form.sport} · {FORMATS.find(f => f.value === form.formatType)?.label}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-full bg-neutral-800 text-neutral-400">DRAFT</span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-3 border-t border-white/5 text-xs font-bold">
                    {[
                      ['Teams', `${form.maxParticipants}`],
                      ['Format', FORMATS.find(f => f.value === form.formatType)?.label ?? form.formatType],
                      ['Registration', form.registrationType === 'TEAM' ? 'Team-based' : 'Individual'],
                      ['Entry Fee', form.entryFee > 0 ? `৳ ${form.entryFee}` : 'Free'],
                      ['Prize Pool', form.prizePoolTotal > 0 ? `৳ ${form.prizePoolTotal}` : '—'],
                      ['Venue', venueLabel() || 'Not set'],
                      ['Start', form.startDate ? `${form.startDate}${form.startTime ? ' at ' + form.startTime : ''}` : '—'],
                      ['End', form.endDate || '—'],
                    ].map(([k, v]) => (
                      <div key={k}>
                        <p className="text-neutral-500 uppercase tracking-widest text-[10px]">{k}</p>
                        <p className="text-white mt-0.5 truncate">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Publish status */}
              {publishLoading ? (
                <div className="flex items-center gap-3 text-neutral-400 text-sm font-bold">
                  <Loader2 size={16} className="animate-spin" /> Checking wallet…
                </div>
              ) : publishMsg ? (
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300 font-bold">{publishMsg}</p>
                </div>
              ) : publishCheck && !publishCheck.isSuperAdmin && publishCheck.chargePerTournament > 0 ? (
                <div className="flex items-start gap-3 bg-accent/10 border border-accent/20 rounded-xl p-4">
                  <Wallet size={18} className="text-accent shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-white">Publishing Fee: ৳{publishCheck.chargePerTournament}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">Will be deducted from your wallet (Balance: ৳{publishCheck.walletBalance})</p>
                  </div>
                </div>
              ) : null}

              <button
                disabled={publishDisabled || saving}
                onClick={triggerPublish}
                className="w-full bg-accent text-black font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <><Trophy size={18} /> Create Tournament</>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Confirm dialog ────────────────────────────────────────────────────── */}
      {confirmOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                <Wallet size={20} />
              </div>
              <h3 className="text-lg font-black uppercase tracking-wider">Confirm Publishing</h3>
            </div>
            <p className="text-sm text-neutral-300 mb-6">
              Publishing <span className="text-white font-black">"{form.name}"</span> will deduct{' '}
              <span className="text-accent font-black">৳{publishCheck?.chargePerTournament}</span> from your wallet.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmOpen(false)} className="flex-1 py-3 rounded-xl hover:bg-white/5 transition-colors font-bold text-neutral-400 uppercase text-sm tracking-wider">
                Cancel
              </button>
              <button onClick={handlePublish} disabled={saving} className="flex-1 bg-accent text-black font-black uppercase tracking-wider py-3 rounded-xl hover:bg-white transition-colors flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : 'Confirm & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
