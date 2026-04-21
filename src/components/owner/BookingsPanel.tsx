'use client';
import { useState, useEffect, useCallback } from 'react';
import { getCookie } from '@/lib/cookies';
import { CalendarDays, RefreshCw, Clock, Layers, Banknote, Hash, Building2, ShieldCheck } from 'lucide-react';

interface Turf    { id: string; name: string; ownerId: string; revenueModel?: { type: string; value: number }; }
interface Ground  { id: string; name: string; turfId: string; }
interface Slot    { id: string; turfId: string; groundId: string; startTime: string; endTime: string; price: number; sports?: string[]; }
interface Booking { id: string; slotId: string; turfId?: string; date: string; playerName?: string; price?: number; ownerShare?: number; bmtCut?: number; selectedSport?: string; }

/** Same deterministic match code as the receipt */
function matchCode(id: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[hash % chars.length];
    hash = Math.floor(hash / chars.length) + id.charCodeAt(i % id.length);
  }
  return code;
}

function formatFullDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

export default function BookingsPanel() {
  const [ownerId, setOwnerId]   = useState('');
  const [turfs, setTurfs]       = useState<Turf[]>([]);
  const [grounds, setGrounds]   = useState<Ground[]>([]);
  const [slots, setSlots]       = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const reload = useCallback(async () => {
    setLoading(true);
    const [ts, gs, ss, bs] = await Promise.all([
      fetch('/api/bmt/turfs').then(r => r.json()),
      fetch('/api/bmt/grounds').then(r => r.json()),
      fetch('/api/bmt/slots').then(r => r.json()),
      fetch('/api/bmt/bookings').then(r => r.json()),
    ]);
    setTurfs(Array.isArray(ts) ? ts : []);
    setGrounds(Array.isArray(gs) ? gs : []);
    setSlots(Array.isArray(ss) ? ss : []);
    setBookings(Array.isArray(bs) ? bs : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    setOwnerId(getCookie('bmt_owner_id'));
    reload();
  }, [reload]);

  // Build the 14-day strip
  const dateOptions = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    return {
      iso,
      day:    d.toLocaleDateString('en-US', { weekday: 'short' }),
      date:   d.toLocaleDateString('en-US', { day: '2-digit' }),
      month:  d.toLocaleDateString('en-US', { month: 'short' }),
      isToday: i === 0,
    };
  });

  const selectedDateObj = dateOptions.find(d => d.iso === selectedDate) || dateOptions[0];
  const isToday = selectedDate === dateOptions[0].iso;

  // Get this owner's turfs
  const myTurfs = turfs.filter(t => t.ownerId === ownerId);
  const myTurfIds = new Set(myTurfs.map(t => t.id));

  // Get slots belonging to this owner's turfs
  const mySlots = slots.filter(s => myTurfIds.has(s.turfId));
  const mySlotIds = new Set(mySlots.map(s => s.id));

  // Filter bookings for selected date + this owner's turfs (also match by turfId for old bookings)
  const dayBookings = bookings
    .filter(b => b.date === selectedDate && (
      (b.slotId && mySlotIds.has(b.slotId)) ||
      (b.turfId && myTurfIds.has(b.turfId))
    ))
    .sort((a, b) => {
      const sa = mySlots.find(s => s.id === a.slotId)?.startTime || '';
      const sb = mySlots.find(s => s.id === b.slotId)?.startTime || '';
      return sa.localeCompare(sb);
    });

  // Net income = ownerShare if set, else gross (legacy)
  const getNet = (b: Booking) => {
    if (b.ownerShare !== undefined) return b.ownerShare;
    const slot = mySlots.find(s => s.id === b.slotId);
    const turf = slot ? myTurfs.find(t => t.id === slot.turfId) : (b.turfId ? myTurfs.find(t => t.id === b.turfId) : null);
    const gross = b.price ?? slot?.price ?? 0;
    if (turf?.revenueModel?.type === 'percentage') return Math.round(gross * (1 - turf.revenueModel.value / 100));
    return gross;
  };

  const totalRevenue = dayBookings.reduce((sum, b) => sum + getNet(b), 0);
  const totalGross   = dayBookings.reduce((sum, b) => sum + (b.price ?? mySlots.find(s => s.id === b.slotId)?.price ?? 0), 0);
  const totalBmtCut  = totalGross - totalRevenue;

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Bookings</h2>
          <p className="text-sm text-[var(--muted)] mt-0.5">View all player bookings across your turfs.</p>
        </div>
        <button onClick={reload} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-xs font-bold hover:opacity-80 transition-all disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── Big Date Card ── */}
      <div className="glass-panel border border-[var(--panel-border)] rounded-2xl p-4 flex flex-col gap-0">
        <button
          onClick={() => setShowDatePicker(p => !p)}
          className="w-full flex items-center justify-between group"
        >
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Bookings for</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-black tracking-tight">{selectedDateObj?.day}</span>
              <span className="text-xl font-black text-accent">{selectedDateObj?.date} {selectedDateObj?.month}</span>
              {isToday && (
                <span className="text-[9px] font-black uppercase tracking-widest bg-accent/15 text-accent border border-accent/30 px-2 py-0.5 rounded-full">Today</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--muted)] group-hover:text-foreground transition-colors px-3 py-1.5 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)]">
            <CalendarDays size={12} />
            {showDatePicker ? 'Close' : 'Switch Date'}
          </div>
        </button>

        {showDatePicker && (
          <div className="mt-4 pt-4 border-t border-[var(--panel-border)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-3">Select a date</p>
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar [&::-webkit-scrollbar]:hidden">
              {dateOptions.map(d => (
                <button key={d.iso}
                  onClick={() => { setSelectedDate(d.iso); setShowDatePicker(false); }}
                  className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                    selectedDate === d.iso
                      ? 'bg-accent/15 border-accent/40 text-accent shadow-[0_0_12px_rgba(0,255,0,0.08)]'
                      : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:text-foreground hover:border-white/20'
                  }`}>
                  <span className="text-[9px] uppercase tracking-wider">{d.day}</span>
                  <span className="text-base font-black mt-0.5">{d.date}</span>
                  <span className="text-[9px]">{d.month}</span>
                  {d.isToday && <span className="w-1 h-1 rounded-full bg-accent mt-1" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Stats Summary Card ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel border border-[var(--panel-border)] rounded-2xl p-4 flex flex-col gap-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Total Bookings</p>
          <p className="text-3xl font-black">{loading ? '—' : dayBookings.length}</p>
          <p className="text-[10px] text-[var(--muted)]">{selectedDateObj?.day}, {selectedDateObj?.date} {selectedDateObj?.month}</p>
        </div>
        <div className="glass-panel border border-accent/20 rounded-2xl p-4 flex flex-col gap-1"
          style={{ background: 'linear-gradient(135deg, rgba(0,255,65,0.06), transparent)' }}>
          <p className="text-[9px] font-black uppercase tracking-widest text-accent/60">Net Income</p>
          <p className="text-3xl font-black text-accent">
            {loading ? '—' : `৳${totalRevenue.toLocaleString()}`}
          </p>
          <p className="text-[10px] text-accent/50">
            {totalBmtCut > 0 ? `After ৳${totalBmtCut.toLocaleString()} BMT cut` : 'No cut applied'}
          </p>
        </div>
      </div>

      {/* ── Booking List ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-[var(--muted)]">
          <RefreshCw size={20} className="animate-spin mr-2" /> Loading bookings…
        </div>
      ) : myTurfs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center border border-dashed border-[var(--panel-border)] rounded-2xl">
          <Building2 size={28} className="text-[var(--muted)]" />
          <p className="font-bold">No turfs found</p>
          <p className="text-sm text-[var(--muted)]">Register and get a turf approved first.</p>
        </div>
      ) : dayBookings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center border border-dashed border-[var(--panel-border)] rounded-2xl">
          <CalendarDays size={28} className="text-[var(--muted)]" />
          <p className="font-bold">No bookings for this date</p>
          <p className="text-sm text-[var(--muted)]">No players have reserved a slot on {formatFullDate(selectedDate)}.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {dayBookings.map((booking, idx) => {
            const slot    = mySlots.find(s => s.id === booking.slotId);
            const ground  = slot ? grounds.find(g => g.id === slot.groundId) : null;
            const turf    = slot ? myTurfs.find(t => t.id === slot.turfId) : null;
            const price   = booking.price ?? slot?.price ?? 0;
            const sport   = booking.selectedSport || slot?.sports?.[0] || 'Sport';
            const code    = matchCode(booking.id);

            return (
              <div key={booking.id}
                className="glass-panel border border-[var(--panel-border)] rounded-2xl p-4 flex flex-col gap-3 hover:border-white/15 transition-colors">

                {/* Row 1: Number + Time + Match Code */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {/* Booking number circle */}
                    <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-black text-accent">#{idx + 1}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} className="text-[var(--muted)]" />
                        <span className="text-sm font-black">{slot?.startTime ?? '—'}</span>
                        <span className="text-xs text-[var(--muted)]">→ {slot?.endTime ?? '—'}</span>
                      </div>
                      <p className="text-[10px] text-[var(--muted)] font-semibold mt-0.5">{turf?.name}</p>
                    </div>
                  </div>

                  {/* Match Code */}
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-[var(--muted)]">Match Code</p>
                    <div className="flex gap-1">
                      {code.split('').map((char, i) => (
                        <div key={i}
                          className="w-7 h-8 rounded-md flex items-center justify-center text-sm font-black border border-purple-500/30"
                          style={{ background: 'rgba(168,85,247,0.08)', color: '#c084fc', textShadow: '0 0 8px rgba(192,132,252,0.6)' }}>
                          {char}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row 2: Details */}
                <div className="flex gap-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Layers size={12} className="text-[var(--muted)]" />
                    <span className="text-xs font-bold text-foreground">{ground?.name ?? 'Main Ground'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-[var(--muted)]" />
                    <span className="text-xs font-bold text-foreground">{sport}</span>
                  </div>
                  <div className="flex flex-col items-end ml-auto gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <Banknote size={12} className="text-accent" />
                      <span className="text-xs font-black text-accent">৳{getNet(booking).toLocaleString()}</span>
                    </div>
                    {booking.bmtCut !== undefined && booking.bmtCut > 0 && (
                      <span className="text-[9px] text-[var(--muted)] font-bold">BMT cut: ৳{booking.bmtCut.toLocaleString()}</span>
                    )}
                  </div>
                </div>

                {/* Row 3: Player name + booking ref */}
                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[10px] text-[var(--muted)] font-semibold">
                    {booking.playerName ? `👤 ${booking.playerName}` : '👤 Player'}
                  </span>
                  <span className="text-[9px] font-bold text-[var(--muted)] uppercase tracking-widest">
                    Ref: {booking.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}

        </div>
      )}
    </div>
  );
}
