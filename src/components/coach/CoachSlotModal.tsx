'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Sparkles, CalendarDays, DollarSign } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface Slot {
  id: string;
  turfId: string;
  groundId: string;
  startTime: string;
  endTime: string;
  timeCategory?: string;
  days: string[];
  sports: string[];
  price: number;
  slotType?: string;
  admissionFee?: number;
  monthlyFee?: number;
  pricingType?: string;
}

interface CoachSlotModalProps {
  open: boolean;
  turfId: string | null;
  groundId: string | null;
  editingSlot?: Slot | null;
  onClose: () => void;
}

export default function CoachSlotModal({
  open,
  turfId,
  groundId,
  editingSlot,
  onClose,
}: CoachSlotModalProps) {
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);
  const [pricingType, setPricingType] = useState<'PACKAGE' | 'MONTHLY'>('PACKAGE');
  const [price, setPrice] = useState('1500');
  const [admissionFee, setAdmissionFee] = useState('500');
  const [monthlyFee, setMonthlyFee] = useState('2000');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:30');
  const [timeCategory, setTimeCategory] = useState<string>('Morning');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingSlot) {
      setSelectedDays(editingSlot.days || []);
      setPricingType((editingSlot.pricingType as any) === 'MONTHLY' || editingSlot.slotType === 'MONTHLY' ? 'MONTHLY' : 'PACKAGE');
      setPrice(editingSlot.price ? String(editingSlot.price) : '1500');
      setAdmissionFee(editingSlot.admissionFee ? String(editingSlot.admissionFee) : '500');
      setMonthlyFee(editingSlot.monthlyFee ? String(editingSlot.monthlyFee) : '2000');
      setStartTime(editingSlot.startTime || '09:00');
      setEndTime(editingSlot.endTime || '10:30');
      setTimeCategory(editingSlot.timeCategory || 'Morning');
    } else {
      setSelectedDays(['Mon', 'Wed', 'Fri']);
      setPricingType('PACKAGE');
      setPrice('1500');
      setAdmissionFee('500');
      setMonthlyFee('2000');
      setStartTime('09:00');
      setEndTime('10:30');
      setTimeCategory('Morning');
    }
  }, [editingSlot, open]);

  if (!open) return null;

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const selectAllDays = () => setSelectedDays([...DAYS]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turfId || !groundId || selectedDays.length === 0 || !startTime || !endTime) {
      alert('Please fill in all required fields and select at least one day.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        turfId,
        groundId,
        startTime,
        endTime,
        timeCategory,
        slotType: pricingType === 'MONTHLY' ? 'MONTHLY' : 'ONE_ON_ONE',
        pricingType,
        days: selectedDays,
        sports: ['General Training'],
        price: pricingType === 'MONTHLY' ? Number(monthlyFee || 0) : Number(price || 0),
        admissionFee: pricingType === 'MONTHLY' ? Number(admissionFee || 0) : 0,
        monthlyFee: pricingType === 'MONTHLY' ? Number(monthlyFee || 0) : 0,
      };

      if (editingSlot) {
        await fetch(`/api/bmt/slots/${editingSlot.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/bmt/slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save availability slot');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0f1117] border border-white/10 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative my-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">
                {editingSlot ? 'Edit Pro Availability' : 'Add Pro Availability Slot'}
              </h3>
              <p className="text-xs text-neutral-400">Configure pricing and weekly schedule</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-5">
          {/* Pricing Model Selector */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Pricing & Service Format
            </label>
            <div className="grid grid-cols-2 gap-3 p-1 bg-white/5 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setPricingType('PACKAGE')}
                className={`py-3 rounded-xl text-xs font-black transition-all flex flex-col items-center gap-1 ${
                  pricingType === 'PACKAGE'
                    ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span>Package / 1-on-1</span>
                <span className="text-[9px] opacity-70 font-semibold">Per Session / Package Fee</span>
              </button>
              <button
                type="button"
                onClick={() => setPricingType('MONTHLY')}
                className={`py-3 rounded-xl text-xs font-black transition-all flex flex-col items-center gap-1 ${
                  pricingType === 'MONTHLY'
                    ? 'bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span>Monthly Subscription</span>
                <span className="text-[9px] opacity-70 font-semibold">Admission + Monthly Fee</span>
              </button>
            </div>
          </div>

          {/* Pricing Inputs */}
          {pricingType === 'MONTHLY' ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  One-time Admission Fee (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">৳</span>
                  <input
                    type="number"
                    required
                    value={admissionFee}
                    onChange={e => setAdmissionFee(e.target.value)}
                    placeholder="500"
                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  Monthly Fee (৳ / Month)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">৳</span>
                  <input
                    type="number"
                    required
                    value={monthlyFee}
                    onChange={e => setMonthlyFee(e.target.value)}
                    placeholder="2000"
                    className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                Package / Session Price (৳)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">৳</span>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="1500"
                  className="w-full bg-black/30 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50"
                />
              </div>
            </div>
          )}

          {/* Time Window */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Start Time
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                End Time
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50"
              />
            </div>
          </div>

          {/* Weekly Days */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Active Weekly Days
              </label>
              <button
                type="button"
                onClick={selectAllDays}
                className="text-[10px] text-blue-400 font-bold hover:underline uppercase tracking-wider"
              >
                Select All
              </button>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {DAYS.map(day => {
                const active = selectedDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                      active
                        ? 'bg-blue-500 text-white border border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                        : 'bg-white/5 border border-white/10 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-2xl bg-blue-500 hover:brightness-110 text-white font-black text-sm active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(59,130,246,0.35)] flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {editingSlot ? 'Update Availability' : 'Save Availability Slot'}
          </button>
        </form>
      </div>
    </div>
  );
}
