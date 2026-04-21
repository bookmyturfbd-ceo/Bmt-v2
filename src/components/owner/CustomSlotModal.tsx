'use client';
import { useState, useEffect } from 'react';
import { X, Plus, Layers } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface CustomSlotModalProps {
  open: boolean;
  turfId: string | null;
  groundId: string | null;
  onClose: () => void;
}

export default function CustomSlotModal({ open, turfId, groundId, onClose }: CustomSlotModalProps) {
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [duration, setDuration] = useState<number>(60);
  const [timeCategory, setTimeCategory] = useState<string>('Morning');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [globalSports, setGlobalSports] = useState<{name: string}[]>([]);

  useEffect(() => {
    if (open) {
      fetch('/api/bmt/sports')
        .then(r => r.json())
        .then(d => { setGlobalSports(Array.isArray(d) ? d : []); })
        .catch(() => {});
    }
  }, [open]);

  const toggleDay = (day: string) => setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  const toggleSport = (sport: string) => setSelectedSports(prev => prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]);

  function parseTime(t: string) {
     const [h,m] = t.split(':').map(Number);
     return h * 60 + m;
  }
  function formatTime(mins: number) {
     const h24 = Math.floor(mins / 60) % 24;
     const m = (mins % 60).toString().padStart(2, '0');
     const ampm = h24 >= 12 ? 'PM' : 'AM';
     const h12 = h24 % 12 || 12;
     return `${h12.toString().padStart(2, '0')}:${m} ${ampm}`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turfId || !groundId || selectedSports.length === 0 || !startTime || !endTime || !price || selectedDays.length === 0) return;
    
    setSubmitting(true);

    const startMins = parseTime(startTime);
    let endMins = parseTime(endTime);
    if (endMins <= startMins) {
      endMins += 24 * 60; // handle passing midnight (e.g., 18:00 to 02:00)
    }

    const generatedSlots = [];
    let current = startMins;

    while (current + duration <= endMins) {
      const displayStart = current % (24 * 60);
      const displayEnd = (current + duration - 1) % (24 * 60);

      const startStr = formatTime(displayStart);
      const endStr = formatTime(displayEnd);
      
      generatedSlots.push({
        turfId,
        groundId,
        timeCategory,
        days: selectedDays,
        sports: selectedSports,
        startTime: startStr,
        endTime: endStr,
        price: Number(price),
        createdAt: new Date().toISOString()
      });

      current += duration;
    }

    if (generatedSlots.length === 0) {
      alert('Time window is too short for the selected duration.');
      setSubmitting(false);
      return;
    }

    for (const slot of generatedSlots) {
      await fetch('/api/bmt/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slot),
      });
    }

    setSubmitting(false);
    setSelectedDays([]); setSelectedSports([]); setStartTime(''); setEndTime(''); setPrice('');
    onClose();
  };

  if (!open || !turfId || !groundId) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-xl glass-panel rounded-t-3xl sm:rounded-3xl shadow-[0_-20px_60px_rgba(0,0,0,0.6)] dark:shadow-[0_-20px_60px_rgba(0,0,0,0.6)] z-10 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="h-1 w-full bg-gradient-to-r from-accent/0 via-accent to-accent/0 shrink-0" />

        <div className="p-6 pb-4 flex items-center justify-between border-b border-[var(--panel-border)] shrink-0">
          <div>
            <h2 className="text-lg font-black text-[var(--foreground)] flex items-center gap-2">
              <Layers size={18} className="text-accent" /> Bulk Generate Slots
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">Automate your slot timing & cross-sport rules</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/8 flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors">
            <X size={16} className="text-neutral-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
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
                      : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-white/8 text-[var(--muted)] hover:border-accent hover:text-[var(--foreground)]'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[1px] w-full bg-white/5" />

          {/* Days */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">Weekly Schedule</label>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    selectedDays.includes(day)
                      ? 'bg-accent/15 border-accent/40 text-accent dark:shadow-[inset_0_0_10px_rgba(0,255,0,0.08)]'
                      : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-white/8 text-[var(--muted)] hover:border-accent hover:text-[var(--foreground)]'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Duration */}
            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">Slot Duration</label>
              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  min="30" 
                  step="30"
                  value={duration} 
                  onChange={e => setDuration(Number(e.target.value))}
                  className="w-full bg-white dark:bg-neutral-950/80 border border-neutral-200 dark:border-white/8 rounded-xl px-4 py-1.5 text-sm text-[var(--foreground)] font-black outline-none focus:border-accent/50 transition-all text-center"
                />
                <span className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">Mins</span>
              </div>
            </div>

            {/* Time Category */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">Shift Category</label>
              <select value={timeCategory} onChange={e => setTimeCategory(e.target.value)}
                className="w-full bg-white dark:bg-neutral-950/80 border border-neutral-200 dark:border-white/8 rounded-xl px-4 py-2 text-sm text-[var(--foreground)] font-medium outline-none focus:border-accent/50 transition-all cursor-pointer">
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
              </select>
            </div>
          </div>

          {/* Price */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">Base Price (Per Slot)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-black text-sm">৳</span>
              <input required type="number" placeholder="2500" value={price} onChange={e => setPrice(e.target.value)}
                className="w-full bg-white dark:bg-neutral-950/80 border border-neutral-200 dark:border-white/8 rounded-xl pl-8 pr-4 py-2 text-sm text-[var(--foreground)] font-medium outline-none focus:border-accent/50 transition-all placeholder:text-[var(--muted)]" />
            </div>
          </div>

          {/* Operating Window */}
          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-bold uppercase tracking-widest text-neutral-400">Operating Window</label>
            <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 dark:bg-neutral-950/50 border border-neutral-200 dark:border-white/5 rounded-xl">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-500">From</label>
                <input required type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/8 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] font-medium outline-none focus:border-accent/50 transition-all" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-neutral-500">To</label>
                <input required type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                  className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/8 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] font-medium outline-none focus:border-accent/50 transition-all" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 mt-auto shrink-0">
            <button type="button" onClick={onClose}
              className="px-5 py-3 rounded-xl border border-white/8 text-neutral-400 hover:text-white hover:border-white/20 font-bold text-sm transition-all">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-accent text-black font-black text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-[0_4px_15px_rgba(0,255,0,0.2)] flex items-center justify-center gap-2 disabled:opacity-50">
              <Plus size={16} className="stroke-[3]" />
              {submitting ? 'Generating...' : 'Generate Slots Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
