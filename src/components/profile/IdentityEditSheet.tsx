'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, ChevronDown, Loader2 } from 'lucide-react';

const POSITIONS = ['GK', 'DEF', 'MID', 'FWD'];
const FEET = ['L', 'R', 'Both'];
const BRACKETS = ['U18', '18-24', '25-34', '35+'];
const POSITION_LABELS: Record<string, string> = { GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', FWD: 'Forward' };
const FOOT_LABELS: Record<string, string> = { L: 'Left', R: 'Right', Both: 'Both' };

interface Area { id: string; name: string; }

interface IdentityEditSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (fields: any) => void;
  initial: {
    fullName: string;
    position?: string | null;
    preferredFoot?: string | null;
    ageBracket?: string | null;
    homeArea?: { id: string; name: string } | null;
  };
}

export function IdentityEditSheet({ isOpen, onClose, onSaved, initial }: IdentityEditSheetProps) {
  const [fullName, setFullName] = useState(initial.fullName);
  const [position, setPosition] = useState<string>(initial.position ?? '');
  const [preferredFoot, setPreferredFoot] = useState<string>(initial.preferredFoot ?? '');
  const [ageBracket, setAgeBracket] = useState<string>(initial.ageBracket ?? '');
  const [homeAreaId, setHomeAreaId] = useState<string>(initial.homeArea?.id ?? '');
  const [homeAreaName, setHomeAreaName] = useState<string>(initial.homeArea?.name ?? '');
  const [areas, setAreas] = useState<Area[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/bmt/areas').then(r => r.json()).then(d => {
        if (Array.isArray(d)) setAreas(d);
        else if (Array.isArray(d.cities)) setAreas(d.cities);
      }).catch(() => {});
    }
  }, [isOpen]);

  async function handleSave() {
    if (!fullName.trim()) { setError('Name is required'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/players/me/identity', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          position: position || null,
          preferredFoot: preferredFoot || null,
          ageBracket: ageBracket || null,
          homeAreaId: homeAreaId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Save failed'); return; }
      onSaved(data.player);
      onClose();
    } catch { setError('Network error'); }
    finally { setSaving(false); }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[91] bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] rounded-t-3xl px-5 pt-4 pb-8 max-w-lg mx-auto"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />

            <div className="flex items-center justify-between mb-5">
              <h2 className="font-black text-lg">Edit Identity</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <X size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pb-2">
              {/* Full Name */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">Full Name</label>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-accent/40"
                  placeholder="Your full name"
                />
              </div>

              {/* Position */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">Position</label>
                <div className="flex gap-2 flex-wrap">
                  {POSITIONS.map(p => (
                    <button
                      key={p}
                      onClick={() => setPosition(position === p ? '' : p)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all ${
                        position === p
                          ? 'bg-accent/20 border-accent/40 text-accent'
                          : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                      }`}
                    >
                      {p} · <span className="opacity-60">{POSITION_LABELS[p]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Foot */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">Preferred Foot</label>
                <div className="flex gap-2">
                  {FEET.map(f => (
                    <button
                      key={f}
                      onClick={() => setPreferredFoot(preferredFoot === f ? '' : f)}
                      className={`flex-1 py-2 rounded-xl border text-xs font-black transition-all ${
                        preferredFoot === f
                          ? 'bg-accent/20 border-accent/40 text-accent'
                          : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                      }`}
                    >
                      {FOOT_LABELS[f]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Bracket */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">Age Bracket <span className="font-normal opacity-50">(optional)</span></label>
                <div className="flex gap-2 flex-wrap">
                  {BRACKETS.map(b => (
                    <button
                      key={b}
                      onClick={() => setAgeBracket(ageBracket === b ? '' : b)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-black transition-all ${
                        ageBracket === b
                          ? 'bg-accent/20 border-accent/40 text-accent'
                          : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Home Area */}
              {areas.length > 0 && (
                <div>
                  <label className="text-[11px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5 block">Home Area</label>
                  <div className="relative">
                    <select
                      value={homeAreaId}
                      onChange={e => {
                        setHomeAreaId(e.target.value);
                        setHomeAreaName(areas.find(a => a.id === e.target.value)?.name ?? '');
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-medium appearance-none focus:outline-none focus:border-accent/40 text-white"
                    >
                      <option value="">— Not set —</option>
                      {areas.map(a => (
                        <option key={a.id} value={a.id} style={{ background: '#111' }}>{a.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
                  </div>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-400 font-medium">{error}</p>
              )}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-5 py-3.5 rounded-2xl bg-accent text-black font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
