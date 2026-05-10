'use client';
import { useState, useEffect } from 'react';
import { X, Loader2, MapPin, ChevronLeft, CheckCircle2 } from 'lucide-react';

interface SelectedSlot {
  slotId: string;
  turfId: string;
  turfName: string;
  startTime: string;
  endTime: string;
  price: number;
  groundName: string;
}

interface Props {
  date: string; // 'YYYY-MM-DD'
  onSelect: (slot: SelectedSlot) => void;
  onClose: () => void;
}

export function TurfPickerModal({ date, onSelect, onClose }: Props) {
  const [turfs, setTurfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTurf, setSelectedTurf] = useState<any>(null);
  const [grounds, setGrounds] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [pickedSlot, setPickedSlot] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/bmt/turfs')
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : d.turfs ?? [];
        setTurfs(list.filter((t: any) => t.status === 'published'));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const selectTurf = async (turf: any) => {
    setSelectedTurf(turf);
    setSlotsLoading(true);
    setGrounds([]);
    try {
      const url = `/api/play/group-slots?turfId=${turf.id}${date ? `&date=${date}` : ''}`;
      const r = await fetch(url);
      if (r.ok) { const d = await r.json(); setGrounds(d.grounds ?? []); }
    } catch {}
    setSlotsLoading(false);
  };

  const handleSlotClick = (slot: any, ground: any) => {
    if (slot.isBooked || slot.status === 'booked') return;
    setPickedSlot(slot.id);
    setTimeout(() => {
      onSelect({
        slotId: slot.id,
        turfId: selectedTurf.id,
        turfName: selectedTurf.name,
        startTime: slot.startTime,
        endTime: slot.endTime,
        price: slot.price,
        groundName: ground.name,
      });
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm pb-[72px]" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-[#111] border border-white/10 rounded-t-3xl flex flex-col"
        style={{ maxHeight: 'calc(85vh - 72px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3 border-b border-white/5 shrink-0">
          {selectedTurf && (
            <button onClick={() => { setSelectedTurf(null); setGrounds([]); }}
              className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
              <ChevronLeft size={16} />
            </button>
          )}
          <div className="flex-1">
            <h2 className="font-black text-base">{selectedTurf ? selectedTurf.name : 'Select Turf'}</h2>
            {selectedTurf && date && <p className="text-[10px] text-neutral-500 mt-0.5">{date} · Tap a slot to select</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-cyan-400" /></div>
          ) : !selectedTurf ? (
            /* Turf grid */
            turfs.length === 0 ? (
              <p className="text-center text-neutral-500 py-12 text-sm">No published turfs yet</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {turfs.map(t => (
                  <button key={t.id} onClick={() => selectTurf(t)}
                    className="p-3 rounded-2xl bg-white/[0.04] border border-white/8 text-left hover:bg-white/[0.08] hover:border-cyan-500/30 active:scale-95 transition-all flex flex-col gap-2">
                    {t.logoUrl ? (
                      <img src={t.logoUrl} className="w-full h-16 object-contain rounded-xl" alt={t.name} />
                    ) : (
                      <div className="w-full h-16 rounded-xl bg-white/5 flex items-center justify-center">
                        <MapPin size={22} className="text-cyan-400/60" />
                      </div>
                    )}
                    <div>
                      <p className="font-black text-sm leading-tight">{t.name}</p>
                      {t.area && <p className="text-[10px] text-neutral-500 mt-0.5">{t.area}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )
          ) : slotsLoading ? (
            <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-cyan-400" /></div>
          ) : grounds.length === 0 ? (
            <p className="text-center text-neutral-500 py-12 text-sm">No slots configured for this turf</p>
          ) : (
            /* Slots by ground */
            <div className="flex flex-col gap-5">
              {grounds.map((g: any) => (
                <div key={g.id}>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">{g.name}</p>
                  <div className="flex flex-col gap-2">
                    {g.slots.map((s: any) => {
                      const booked = s.isBooked || s.status === 'booked';
                      const picked = pickedSlot === s.id;
                      return (
                        <button key={s.id} onClick={() => handleSlotClick(s, g)} disabled={booked}
                          className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                            picked
                              ? 'bg-cyan-500 border-cyan-500 text-black'
                              : booked
                              ? 'bg-white/[0.02] border-white/5 opacity-40 cursor-not-allowed'
                              : 'bg-white/[0.04] border-white/8 hover:border-cyan-500/40 hover:bg-white/[0.08] active:scale-[0.98]'
                          }`}>
                          <div className="flex items-center gap-2">
                            {picked && <CheckCircle2 size={14} />}
                            <span className="font-black text-sm">{s.startTime} – {s.endTime}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold opacity-70">৳{s.price}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                              booked ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                            }`}>
                              {booked ? 'BOOKED' : 'OPEN'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
