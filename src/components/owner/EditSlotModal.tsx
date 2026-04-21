'use client';
import { useState, useEffect } from 'react';
import { X, Save, Edit3 } from 'lucide-react';

interface Slot {
  id: string; turfId: string; groundId: string; days: string[]; sports: string[];
  startTime: string; endTime: string; price: number; timeCategory?: string;
}

interface EditSlotModalProps {
  open: boolean;
  onClose: () => void;
  slot: Slot | null;
}

export default function EditSlotModal({ open, onClose, slot }: EditSlotModalProps) {
  const [timeCategory, setTimeCategory] = useState<string>('Morning');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [globalSports, setGlobalSports] = useState<{name: string}[]>([]);

  useEffect(() => {
    if (open) {
      fetch('/api/bmt/sports')
        .then(r => r.json())
        .then(d => { setGlobalSports(Array.isArray(d) ? d : []); })
        .catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (slot) {
      setTimeCategory(slot.timeCategory || 'Morning');
      setPrice(slot.price?.toString() || '');
      setSelectedSports(slot.sports || []);
    }
  }, [slot]);

  const toggleSport = (sport: string) => setSelectedSports(prev => prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slot || !price) return;
    
    setSubmitting(true);

    const updatedSlot = {
      ...slot,
      timeCategory,
      price: Number(price),
      sports: selectedSports
    };

    await fetch(`/api/bmt/slots/${slot.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSlot),
    });

    setSubmitting(false);
    onClose();
  };

  if (!open || !slot) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-md glass border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-[0_-20px_60px_rgba(0,0,0,0.6)] z-10 overflow-hidden flex flex-col">
        <div className="h-1 w-full bg-gradient-to-r from-accent/0 via-accent to-accent/0 shrink-0" />

        <div className="p-6 pb-4 flex items-center justify-between border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Edit3 size={18} className="text-accent" /> Edit Slot Settings
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">{slot.startTime} - {slot.endTime}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center hover:bg-white/10 transition-colors">
            <X size={16} className="text-neutral-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {/* Linked Sports */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">Supported Sports (Cross-Blocking)</label>
            <p className="text-[10px] text-neutral-500 mb-1 leading-tight">These sports will share these slots. If a player books 5-a-side, it will automatically block 6-a-side for that specific slot.</p>
            <div className="flex gap-2 flex-wrap">
              {globalSports.map(s => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => toggleSport(s.name)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-black border transition-all ${
                    selectedSports.includes(s.name)
                      ? 'bg-accent border-accent text-black shadow-[0_0_10px_rgba(0,255,0,0.2)]'
                      : 'bg-neutral-900 border-white/8 text-neutral-500 hover:border-neutral-700 hover:text-white'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[1px] w-full bg-white/5" />

          {/* Time Category */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">Shift Category</label>
            <select value={timeCategory} onChange={e => setTimeCategory(e.target.value)}
              className="w-full bg-neutral-950/80 border border-white/8 rounded-xl px-4 py-3 text-sm text-white font-medium outline-none focus:border-accent/50 transition-all cursor-pointer">
              <option value="Morning">Morning</option>
              <option value="Afternoon">Afternoon</option>
              <option value="Evening">Evening</option>
              <option value="Night">Night</option>
            </select>
            <p className="text-[10px] text-neutral-500 mt-1">This will change which section the slot appears under on the turf page.</p>
          </div>

          {/* Price */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">Base Price</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-black text-sm">৳</span>
              <input required type="number" placeholder="2500" value={price} onChange={e => setPrice(e.target.value)}
                className="w-full bg-neutral-950/80 border border-white/8 rounded-xl pl-8 pr-4 py-3 text-sm text-white font-medium outline-none focus:border-accent/50 transition-all placeholder:text-neutral-600" />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 mt-2">
            <button type="button" onClick={onClose}
              className="px-5 py-3 rounded-xl border border-white/8 text-neutral-400 hover:text-white hover:border-white/20 font-bold text-sm transition-all">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-accent text-black font-black text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_4px_15px_rgba(0,255,0,0.2)] flex items-center justify-center gap-2 disabled:opacity-50">
              <Save size={16} className="stroke-[3]" />
              {submitting ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
