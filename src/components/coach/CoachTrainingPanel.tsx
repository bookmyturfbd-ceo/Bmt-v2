'use client';

import { useState, useEffect } from 'react';
import { getCookie } from '@/lib/cookies';
import { 
  UserCircle, CalendarDays, CheckCircle2, XCircle, AlertCircle, 
  CheckSquare, Loader2, Sparkles, Clock, MapPin, Dumbbell, UserCheck, ChevronRight
} from 'lucide-react';
import { useApiEntity } from '@/hooks/useApiEntity';

interface Turf { id: string; name: string; ownerId: string; status: string; isCoachProfile: boolean; coachType: string; }
interface Ground { id: string; turfId: string; name: string; }
interface Slot { id: string; turfId: string; groundId: string; startTime: string; endTime: string; days: string[]; price: number; slotType?: string; }
interface Booking { id: string; turfId: string; slotId: string; date: string; playerId: string; playerName: string; price: number; createdAt: string; }
interface AttendanceRecord { id: string; turfId: string; bookingId: string; playerId: string; date: string; status: string; notes?: string; }

export default function CoachTrainingPanel() {
  const [ownerId, setOwnerId] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const turfsStore = useApiEntity<Turf>('turfs');
  const groundsStore = useApiEntity<Ground>('grounds');
  const slotsStore = useApiEntity<Slot>('slots');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const id = getCookie('bmt_owner_id');
    setOwnerId(id);

    fetch('/api/bmt/bookings')
      .then(r => r.json())
      .then(d => setBookings(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const myProfile = turfsStore.items.find(t => t.ownerId === ownerId);

  useEffect(() => {
    if (myProfile?.id) {
      setLoading(true);
      fetch(`/api/bmt/attendance?turfId=${myProfile.id}&date=${selectedDate}`)
        .then(r => r.json())
        .then(data => {
          setAttendance(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [myProfile?.id, selectedDate]);

  if (turfsStore.loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-[var(--muted)]">
        <Loader2 size={18} className="animate-spin" /> Loading training roster…
      </div>
    );
  }

  if (!myProfile) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center gap-3 border border-dashed border-[var(--panel-border)] rounded-3xl glass-panel">
        <Dumbbell size={32} className="text-[var(--muted)] opacity-50" />
        <p className="font-bold">No Profile Found</p>
        <p className="text-sm text-[var(--muted)] max-w-xs">Please set up your professional profile first before taking training attendance.</p>
      </div>
    );
  }

  // Monthly slots for this coach
  const mySlots = slotsStore.items.filter(s => s.turfId === myProfile.id && s.slotType === 'MONTHLY');
  const mySlotIds = new Set(mySlots.map(s => s.id));

  // Enrolled monthly bookings
  const monthlyBookings = bookings.filter(b => b.turfId === myProfile.id || mySlotIds.has(b.slotId));

  const updateAttendance = async (booking: Booking, status: 'PRESENT' | 'ABSENT' | 'EXCUSED') => {
    setSavingId(booking.id);
    try {
      const res = await fetch('/api/bmt/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turfId: myProfile.id,
          bookingId: booking.id,
          playerId: booking.playerId || 'anonymous',
          date: selectedDate,
          status,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setAttendance(prev => {
          const filtered = prev.filter(a => a.bookingId !== booking.id);
          return [...filtered, data];
        });
      }
    } catch {
      /* silent catch */
    } finally {
      setSavingId(null);
    }
  };

  const markAllPresent = async () => {
    for (const b of monthlyBookings) {
      await updateAttendance(b, 'PRESENT');
    }
  };

  // Stats calculation
  const presentCount = attendance.filter(a => a.status === 'PRESENT').length;
  const absentCount = attendance.filter(a => a.status === 'ABSENT').length;
  const excusedCount = attendance.filter(a => a.status === 'EXCUSED').length;
  const attendanceRate = monthlyBookings.length > 0 ? Math.round((presentCount / monthlyBookings.length) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <CheckSquare size={24} className="text-blue-500" /> Training & Attendance Roster
          </h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Track daily attendance for players and teams enrolled in your monthly coaching packages.
          </p>
        </div>

        {/* Date picker */}
        <div className="flex items-center gap-3 bg-[var(--panel-bg)] p-2 rounded-2xl border border-[var(--panel-border)] shadow-md">
          <CalendarDays size={16} className="text-blue-400 ml-2 shrink-0" />
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer pr-2"
          />
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-[var(--panel-border)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
            <UserCircle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Enrolled Trainees</p>
            <p className="text-lg font-black text-white">{monthlyBookings.length}</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400/80">Present 🟢</p>
            <p className="text-lg font-black text-emerald-400">{presentCount}</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-red-500/20 bg-red-500/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
            <XCircle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-red-400/80">Absent 🔴</p>
            <p className="text-lg font-black text-red-400">{absentCount}</p>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-400/80">Attendance Rate</p>
            <p className="text-lg font-black text-amber-400">{attendanceRate}%</p>
          </div>
        </div>
      </div>

      {/* Quick Batch Actions */}
      {monthlyBookings.length > 0 && (
        <div className="flex items-center justify-between glass-panel p-4 rounded-2xl border border-[var(--panel-border)]">
          <p className="text-xs font-bold text-white flex items-center gap-1.5">
            <UserCheck size={15} className="text-blue-400" /> Quick Daily Attendance Action
          </p>
          <button
            onClick={markAllPresent}
            className="px-4 py-2 rounded-xl bg-blue-500 hover:brightness-110 text-white font-black text-xs transition-all shadow-[0_2px_12px_rgba(59,130,246,0.3)] active:scale-95 flex items-center gap-1.5"
          >
            <Sparkles size={13} /> Mark All Present
          </button>
        </div>
      )}

      {/* Trainees List */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-[var(--muted)]">
          <Loader2 size={24} className="animate-spin text-blue-500" />
          <p className="text-sm font-bold">Loading attendance records…</p>
        </div>
      ) : monthlyBookings.length === 0 ? (
        <div className="py-16 glass-panel border border-dashed border-[var(--panel-border)] rounded-[32px] flex flex-col items-center justify-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[var(--panel-bg)] flex items-center justify-center border border-[var(--panel-border)] shadow-inner">
            <UserCircle size={32} className="text-blue-500 opacity-60" />
          </div>
          <div>
            <p className="text-sm font-black text-white">No Trainees Enrolled</p>
            <p className="text-xs text-[var(--muted)] max-w-sm mt-1 mx-auto">
              When players or teams book your Monthly Coaching slots, they will show up here for daily attendance tracking.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {monthlyBookings.map(booking => {
            const slot = slotsStore.items.find(s => s.id === booking.slotId);
            const ground = groundsStore.items.find(g => g.id === slot?.groundId);
            const attRecord = attendance.find(a => a.bookingId === booking.id);
            const currentStatus = attRecord?.status;

            return (
              <div
                key={booking.id}
                className="glass-panel p-5 rounded-2xl border border-[var(--panel-border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover:border-blue-500/20 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <span className="text-base font-black text-blue-400">
                      {booking.playerName ? booking.playerName[0]?.toUpperCase() : 'P'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-white">{booking.playerName || 'Enrolled Trainee'}</h4>
                    <p className="text-xs font-bold text-blue-400 mt-0.5">{ground?.name || 'Monthly Package'}</p>
                    {slot && (
                      <p className="text-[11px] text-[var(--muted)] font-semibold mt-1 flex items-center gap-2">
                        <Clock size={11} className="text-blue-500/70" />
                        <span>{slot.startTime} - {slot.endTime}</span>
                        {slot.days.length > 0 && <span>({slot.days.join(', ')})</span>}
                      </p>
                    )}
                  </div>
                </div>

                {/* Status Selector */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-white/5">
                  {savingId === booking.id ? (
                    <Loader2 size={16} className="animate-spin text-blue-500 mr-2" />
                  ) : null}

                  <button
                    onClick={() => updateAttendance(booking, 'PRESENT')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all border ${
                      currentStatus === 'PRESENT'
                        ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-black'
                    }`}
                  >
                    Present 🟢
                  </button>

                  <button
                    onClick={() => updateAttendance(booking, 'ABSENT')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all border ${
                      currentStatus === 'ABSENT'
                        ? 'bg-red-500 text-white border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                        : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white'
                    }`}
                  >
                    Absent 🔴
                  </button>

                  <button
                    onClick={() => updateAttendance(booking, 'EXCUSED')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all border ${
                      currentStatus === 'EXCUSED'
                        ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500 hover:text-black'
                    }`}
                  >
                    Excused 🟡
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
