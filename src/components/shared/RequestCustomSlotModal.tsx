'use client';

import { useState } from 'react';
import { X, Sparkles, Calendar, Clock, DollarSign, Send, Loader2, CheckCircle2 } from 'lucide-react';

interface RequestCustomSlotModalProps {
  open: boolean;
  turfId: string;
  coachOwnerId: string;
  coachName: string;
  services?: string[];
  onClose: () => void;
}

export default function RequestCustomSlotModal({
  open,
  turfId,
  coachOwnerId,
  coachName,
  services = [],
  onClose,
}: RequestCustomSlotModalProps) {
  const [preferredDate, setPreferredDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [startTime, setStartTime] = useState('17:00');
  const [endTime, setEndTime] = useState('18:30');
  const [proposedPrice, setProposedPrice] = useState('1500');
  const [serviceName, setServiceName] = useState(services[0] || '1-on-1 Personal Coaching');
  const [notes, setNotes] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerPhone, setPlayerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferredDate || !startTime || !endTime || !proposedPrice) {
      alert('Please fill in all required date, time, and pricing fields.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/bmt/custom-slot-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turfId,
          coachOwnerId,
          preferredDate,
          startTime,
          endTime,
          proposedPrice: Number(proposedPrice),
          notes,
          serviceName,
          playerName,
          playerPhone,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2000);
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to submit request');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting custom slot request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0d0e15] border border-blue-500/20 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative my-auto animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-all"
        >
          <X size={16} />
        </button>

        {success ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-xl font-black text-white">Custom Slot Request Sent!</h3>
            <p className="text-xs text-neutral-400 max-w-xs leading-relaxed">
              {coachName} has been notified of your proposed date, time, and budget offer.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-white/5">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Request Custom Slot</h3>
                <p className="text-xs text-neutral-400">Propose a custom date, time, and budget to {coachName}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-5">
              {/* Service Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Select Service / Specialty
                </label>
                {services.length > 0 ? (
                  <select
                    value={serviceName}
                    onChange={e => setServiceName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50"
                  >
                    {services.map(s => (
                      <option key={s} value={s} className="bg-neutral-900 text-white font-bold">
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={serviceName}
                    onChange={e => setServiceName(e.target.value)}
                    placeholder="e.g. 1-on-1 Personal Training"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50"
                  />
                )}
              </div>

              {/* Preferred Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-1">
                  <Calendar size={12} className="text-blue-400" /> Preferred Date
                </label>
                <input
                  type="date"
                  required
                  value={preferredDate}
                  onChange={e => setPreferredDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50 cursor-pointer"
                />
              </div>

              {/* Time Window */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-1">
                    <Clock size={12} className="text-blue-400" /> Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-1">
                    <Clock size={12} className="text-blue-400" /> End Time
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>

              {/* Proposed Offer / Budget */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-blue-400">
                  Your Proposed Offer / Budget (৳)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 font-bold">৳</span>
                  <input
                    type="number"
                    required
                    value={proposedPrice}
                    onChange={e => setProposedPrice(e.target.value)}
                    placeholder="1500"
                    className="w-full bg-black/40 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Your Name</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={e => setPlayerName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Phone Number</label>
                  <input
                    type="text"
                    value={playerPhone}
                    onChange={e => setPlayerPhone(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-bold text-white outline-none"
                  />
                </div>
              </div>

              {/* Special Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Notes / Location Details
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g., Want 1-on-1 striker drill at Jaff Turf Dhanmondi"
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs font-medium text-white outline-none focus:border-blue-500/50 resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-2xl bg-blue-500 hover:brightness-110 text-white font-black text-sm active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(59,130,246,0.35)] flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Send Custom Slot Request
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
