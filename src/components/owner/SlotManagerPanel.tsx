'use client';
import { useState, useEffect, useCallback } from 'react';
import { getCookie } from '@/lib/cookies';
import { 
  Clock, Building2, AlertTriangle, CheckCircle2, CalendarDays,
  UserCheck, Wrench, ChevronDown, RefreshCw, Layers, Tag
} from 'lucide-react';
import DiscountsTab from './DiscountsTab';

interface Turf  { id: string; name: string; ownerId: string; sports?: string[]; }
interface Ground { id: string; name: string; turfId: string; }
interface Slot {
  id: string; turfId: string; groundId: string;
  startTime: string; endTime: string;
  timeCategory: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
  days: string[];
  price: number;
  status?: 'available' | 'walkin' | 'maintenance' | 'booked';
}

type SlotStatus = 'available' | 'walkin' | 'maintenance';
type DisplayStatus = SlotStatus | 'booked'; // 'booked' is read-only, set by player bookings

const STATUS_CONFIG: Record<DisplayStatus, { label: string; icon: React.ElementType; cls: string; dot: string; }> = {
  available:   { label: 'Available',   icon: CheckCircle2, cls: 'text-accent border-accent/40 bg-accent/10',              dot: 'bg-accent' },
  walkin:      { label: 'Walk-in',     icon: UserCheck,    cls: 'text-blue-400 border-blue-400/40 bg-blue-400/10',        dot: 'bg-blue-400' },
  maintenance: { label: 'Maintenance', icon: Wrench,       cls: 'text-orange-400 border-orange-400/40 bg-orange-400/10',  dot: 'bg-orange-400' },
  booked:      { label: 'Booked',      icon: CheckCircle2, cls: 'text-purple-400 border-purple-400/40 bg-purple-400/10',  dot: 'bg-purple-400' },
};

const TIME_CATEGORY_COLOR: Record<string, string> = {
  Morning:   'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  Afternoon: 'text-orange-300 bg-orange-300/10 border-orange-300/30',
  Evening:   'text-pink-400  bg-pink-400/10  border-pink-400/30',
  Night:     'text-indigo-400 bg-indigo-400/10 border-indigo-400/30',
};

const TIME_CATEGORY_EMOJI: Record<string, string> = {
  Morning: '☀️', Afternoon: '🌤️', Evening: '🌅', Night: '🌙'
};

function formatTime(t: string) { return t; }

/** Same algorithm as BookingReceipt — derives 4-char visual match code from booking ID */
function matchCode(id: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[hash % chars.length];
    hash = Math.floor(hash / chars.length) + id.charCodeAt(i % id.length);
  }
  return code;
}

export default function SlotManagerPanel() {
  const [ownerId, setOwnerId]       = useState('');
  const [turfs, setTurfs]           = useState<Turf[]>([]);
  const [grounds, setGrounds]       = useState<Ground[]>([]);
  const [slots, setSlots]           = useState<Slot[]>([]);
  const [activeTurfId, setActiveTurfId] = useState<string>('');
  const [activeGroundId, setActiveGroundId] = useState<string>('');
  const [saving, setSaving]         = useState<Record<string, boolean>>({});
  const [updated, setUpdated]       = useState<Record<string, boolean>>({});
  const [loading, setLoading]       = useState(true);
  const [bookings, setBookings]     = useState<{slotId: string; date: string}[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activeTab, setActiveTab]   = useState<'slots' | 'discounts'>('slots');

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
    const id = getCookie('bmt_owner_id');
    setOwnerId(id);
    reload();
  }, [reload]);

  // Auto-select first owned turf
  const myTurfs = turfs.filter(t => t.ownerId === ownerId);
  useEffect(() => {
    if (myTurfs.length > 0 && !activeTurfId) {
      setActiveTurfId(myTurfs[0].id);
    }
  }, [myTurfs.length, activeTurfId]);

  // Auto-select first ground for active turf
  const turfGrounds = grounds.filter(g => g.turfId === activeTurfId);
  useEffect(() => {
    if (turfGrounds.length > 0) {
      setActiveGroundId(turfGrounds[0].id);
    } else {
      setActiveGroundId('');
    }
  }, [activeTurfId, turfGrounds.length]);

  const visibleSlots = slots
    .filter(s => s.turfId === activeTurfId && (activeGroundId ? s.groundId === activeGroundId : true))
    .sort((a, b) => {
      const order = ['Morning', 'Afternoon', 'Evening', 'Night'];
      const catDiff = order.indexOf(a.timeCategory) - order.indexOf(b.timeCategory);
      if (catDiff !== 0) return catDiff;
      return a.startTime.localeCompare(b.startTime);
    });

  const grouped = visibleSlots.reduce<Record<string, Slot[]>>((acc, s) => {
    const cat = s.timeCategory || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const updateStatus = async (slotId: string, status: SlotStatus) => {
    setSaving(prev => ({ ...prev, [slotId]: true }));
    await fetch(`/api/bmt/slots/${slotId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, status } : s));
    setSaving(prev => ({ ...prev, [slotId]: false }));
    setUpdated(prev => ({ ...prev, [slotId]: true }));
    setTimeout(() => setUpdated(prev => ({ ...prev, [slotId]: false })), 1500);
  };

  // Compute next 14 days for the quick date switcher
  const dateOptions = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const isToday = i === 0;
    return {
      iso,
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.toLocaleDateString('en-US', { day: '2-digit' }),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      isToday,
    };
  });

  const selectedDateObj = dateOptions.find(d => d.iso === selectedDate) || dateOptions[0];
  const isToday = selectedDate === dateOptions[0].iso;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Manage Slots</h2>
          <p className="text-sm text-[var(--muted)] mt-0.5">Control slot availability — changes reflect instantly on the player app.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tab switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)]">
            <button onClick={() => setActiveTab('slots')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                activeTab === 'slots' ? 'bg-accent/15 text-accent border border-accent/30' : 'text-[var(--muted)] hover:text-foreground'
              }`}>
              <Clock size={12} /> Slots
            </button>
            <button onClick={() => setActiveTab('discounts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                activeTab === 'discounts' ? 'bg-accent/15 text-accent border border-accent/30' : 'text-[var(--muted)] hover:text-foreground'
              }`}>
              <Tag size={12} /> Discounts
            </button>
          </div>
          <button onClick={reload} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] text-xs font-bold hover:opacity-80 transition-all disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Discounts tab */}
      {activeTab === 'discounts' && (() => {
        const t = myTurfs.find(t => t.id === activeTurfId) as any;
        const mappedGlobalSports = (t?.sports || []).map((ts: any) => ts?.sport?.name);
        const mappedSlotSports = slots.filter(s => s.turfId === activeTurfId).flatMap(s => s.sports || []);
        const uniqueSports = Array.from(new Set([...mappedGlobalSports, ...mappedSlotSports])).filter(Boolean);
        
        return (
          <DiscountsTab
            turfId={activeTurfId}
            turfSports={uniqueSports}
            turfGrounds={turfGrounds}
          />
        );
      })()}

      {/* Slots content — only shown when activeTab === 'slots' */}
      {activeTab === 'slots' && (
      <>

      {/* Date Picker */}
      <div className="glass-panel border border-[var(--panel-border)] rounded-2xl p-4 flex flex-col gap-0">
        {/* Big current date — click to expand */}
        <button
          onClick={() => setShowDatePicker(p => !p)}
          className="w-full flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Viewing slots for</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl font-black tracking-tight">
                  {selectedDateObj?.day}
                </span>
                <span className="text-xl font-black text-accent">
                  {selectedDateObj?.date} {selectedDateObj?.month}
                </span>
                {isToday && (
                  <span className="text-[9px] font-black uppercase tracking-widest bg-accent/15 text-accent border border-accent/30 px-2 py-0.5 rounded-full">Today</span>
                )}
              </div>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-[10px] font-bold text-[var(--muted)] group-hover:text-foreground transition-colors px-3 py-1.5 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)]`}>
            <CalendarDays size={12} />
            {showDatePicker ? 'Close' : 'Switch Date'}
          </div>
        </button>

        {/* Future date strip */}
        {showDatePicker && (
          <div className="mt-4 pt-4 border-t border-[var(--panel-border)]">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-3">Select a date to view bookings</p>
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar [&::-webkit-scrollbar]:hidden">
              {dateOptions.map(d => (
                <button
                  key={d.iso}
                  onClick={() => { setSelectedDate(d.iso); setShowDatePicker(false); }}
                  className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                    selectedDate === d.iso
                      ? 'bg-accent/15 border-accent/40 text-accent shadow-[0_0_12px_rgba(0,255,0,0.08)]'
                      : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:text-foreground hover:border-white/20'
                  }`}
                >
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

      {/* Legend — only owner-controllable statuses */}
      <div className="flex flex-wrap gap-2">
        {(['available', 'walkin', 'maintenance', 'booked'] as DisplayStatus[]).map(key => {
          const cfg = STATUS_CONFIG[key];
          return (
            <span key={key} className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border ${cfg.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
              {key === 'booked' && <span className="opacity-60 ml-0.5">(Player)</span>}
            </span>
          );
        })}
      </div>

      {/* Turf Tabs */}
      {myTurfs.length === 0 && !loading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Building2 size={32} className="text-[var(--muted)]" />
          <p className="font-bold">No turfs found</p>
          <p className="text-sm text-[var(--muted)]">Create and get a turf approved first.</p>
        </div>
      ) : (
        <>
          {/* Turf selector */}
          <div className="flex gap-2 flex-wrap">
            {myTurfs.map(t => (
              <button key={t.id} onClick={() => setActiveTurfId(t.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  activeTurfId === t.id
                    ? 'bg-accent/15 border-accent/40 text-accent'
                    : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:text-foreground'
                }`}>
                <Building2 size={12} className="inline mr-1.5 -mt-0.5" />{t.name}
              </button>
            ))}
          </div>

          {/* Ground selector */}
          {turfGrounds.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setActiveGroundId('')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                  activeGroundId === ''
                    ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                    : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:text-foreground'
                }`}>
                <Layers size={11} /> All Grounds
              </button>
              {turfGrounds.map(g => (
                <button key={g.id} onClick={() => setActiveGroundId(g.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    activeGroundId === g.id
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-400'
                      : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:text-foreground'
                  }`}>
                  {g.name}
                </button>
              ))}
            </div>
          )}

          {/* Slot Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-[var(--muted)]">
              <RefreshCw size={20} className="animate-spin mr-2" /> Loading slots…
            </div>
          ) : visibleSlots.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center border border-dashed border-[var(--panel-border)] rounded-2xl">
              <Clock size={28} className="text-[var(--muted)]" />
              <p className="font-bold">No slots configured</p>
              <p className="text-sm text-[var(--muted)]">Add slots via My Turfs → ground slot manager.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {['Morning', 'Afternoon', 'Evening', 'Night'].map(cat => {
                const catSlots = grouped[cat];
                if (!catSlots || catSlots.length === 0) return null;
                return (
                  <div key={cat}>
                    {/* Category Header */}
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border mb-4 ${TIME_CATEGORY_COLOR[cat] || 'text-[var(--muted)] bg-[var(--panel-bg)] border-[var(--panel-border)]'}`}>
                      {TIME_CATEGORY_EMOJI[cat]} {cat}
                      <span className="opacity-60">· {catSlots.length} slots</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {catSlots.map(slot => {
                        const ownerStatus: SlotStatus = (['available','walkin','maintenance'].includes(slot.status as string) ? slot.status : 'available') as SlotStatus;
                        // Check if a player has booked this slot for the selected date
                        const playerBooking = bookings.find(b => b.slotId === slot.id && b.date === selectedDate);
                        const isPlayerBooked = !!playerBooking;
                        const code = playerBooking ? matchCode(playerBooking.id) : null;
                        const displayStatus: DisplayStatus = isPlayerBooked ? 'booked' : ownerStatus;
                        const cfg = STATUS_CONFIG[displayStatus];
                        const ground = grounds.find(g => g.id === slot.groundId);
                        const isLocked = isPlayerBooked || saving[slot.id];
                        return (
                          <div key={slot.id}
                            className={`glass-panel border rounded-2xl p-4 flex flex-col gap-3 transition-all ${
                              updated[slot.id] ? 'border-accent/60 shadow-[0_0_15px_rgba(0,255,0,0.08)]' : 'border-[var(--panel-border)]'
                            }`}>
                            {/* Time */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Clock size={14} className="text-[var(--muted)]" />
                                <span className="text-sm font-black">{slot.startTime}</span>
                                <span className="text-xs text-[var(--muted)]">→ {slot.endTime}</span>
                              </div>
                              {updated[slot.id] && (
                                <span className="text-[9px] font-black text-accent uppercase tracking-widest animate-pulse">Saved!</span>
                              )}
                            </div>

                            {/* Ground + Days */}
                            <div className="flex flex-col gap-1">
                              {ground && (
                                <span className="text-[10px] font-bold text-[var(--muted)] flex items-center gap-1">
                                  <Layers size={10} /> {ground.name}
                                </span>
                              )}
                              <div className="flex gap-1 flex-wrap">
                                {slot.days.map(d => (
                                  <span key={d} className="text-[9px] font-bold bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-md">{d}</span>
                                ))}
                              </div>
                            </div>

                            {/* Price */}
                            <div className="text-xs font-bold text-accent">৳ {slot.price?.toLocaleString()}</div>

                            {/* Status badge */}
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border ${cfg.cls}`}>
                              <cfg.icon size={11} />
                              {cfg.label}
                              {isPlayerBooked && <span className="ml-auto opacity-60 text-[9px]">Player booked</span>}
                            </div>

                            {/* Dropdown — locked when player has booked */}
                            {isPlayerBooked ? (
                              <div className="w-full px-3 py-2 rounded-xl bg-purple-500/5 border border-purple-500/20 text-[10px] font-bold text-purple-400/70 flex items-center gap-2">
                                🔒 Locked — player booking active
                              </div>
                            ) : (
                              <div className="relative">
                                <select
                                  value={ownerStatus}
                                  disabled={isLocked}
                                  onChange={e => updateStatus(slot.id, e.target.value as SlotStatus)}
                                  className="w-full appearance-none bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-3 py-2 pr-8 text-xs font-bold outline-none focus:border-accent/50 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <option value="available">✅ Available</option>
                                  <option value="walkin">🚶 Walk-in</option>
                                  <option value="maintenance">🔧 Maintenance</option>
                                </select>
                                <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted)]" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      </>
      )}
    </div>
  );
}
