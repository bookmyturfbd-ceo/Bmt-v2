'use client';
import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Tag } from 'lucide-react';

interface Slot {
  id: string; turfId: string; groundId: string; days: string[]; sports: string[];
  startTime: string; endTime: string; price: number;
  timeCategory?: string;
  status?: 'available' | 'walkin' | 'maintenance' | 'booked';
}
interface Booking  { id: string; slotId: string; date: string; }
interface Ground   { id: string; turfId: string; name: string; }
interface Discount {
  id: string; turfId: string; code: string; type: string; value: number;
  active: boolean; expiresAt?: string;
}

interface Props {
  slots: Slot[];
  bookings: Booking[];
  grounds: Ground[];
  sports: string[];
  onSlotSelect?: (slotId: string | null, date: string, discountedPrice?: number, discountReason?: string) => void;
}

/* ── Time-of-day mapping ── */
const TIME_OF_DAY_RANGES: Record<string, [number, number]> = {
  Morning:   [6 * 60,  12 * 60],
  Afternoon: [12 * 60, 15 * 60],
  Evening:   [15 * 60, 19 * 60],
  Night:     [19 * 60, 24 * 60],
};

function parseTime12h(t: string): number {
  if (!t) return 0;
  const parts = t.split(' ');
  let [hours, minutes] = parts[0].split(':').map(Number);
  const modifier = parts[1] || 'AM';
  if (hours === 12) hours = 0;
  if (modifier.toUpperCase() === 'PM') hours += 12;
  let total = hours * 60 + (minutes || 0);
  if (total < 5 * 60) total += 24 * 60;
  return total;
}

function slotTimeOfDay(startTime: string, timeCategory?: string): string {
  if (timeCategory) return timeCategory;
  const mins = parseTime12h(startTime) % (24 * 60);
  if (mins < 12 * 60) return 'Morning';
  if (mins < 15 * 60) return 'Afternoon';
  if (mins < 19 * 60) return 'Evening';
  return 'Night';
}


export default function DateTimePicker({ slots = [], bookings = [], grounds = [], sports = [], onSlotSelect }: Props) {
  const t = useTranslations('TurfDetails');

  const [selectedSport, setSelectedSport]     = useState<string | null>(sports[0] || null);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedSlotId, setSelectedSlotId]   = useState<string | null>(null);
  const [selectedGroundId, setSelectedGroundId] = useState<string | null>(null);
  const [discounts, setDiscounts]             = useState<Discount[]>([]);

  const turfId = slots[0]?.turfId;

  useEffect(() => {
    if (!turfId) return;
    fetch('/api/bmt/discounts')
      .then(r => r.json())
      .then((all: Discount[]) => {
        setDiscounts(Array.isArray(all) ? all.filter(d => d.turfId === turfId && d.active) : []);
      })
      .catch(() => {});
  }, [turfId]);

  /* Find best applicable discount for a slot on a given date */
  const getDiscount = (slot: Slot, dateObj: { dayName: string; fullDate: string } | undefined): Discount | null => {
    if (!dateObj || discounts.length === 0) return null;

    // Find all matching discounts, pick highest value (assuming percentage type for now)
    const matches = discounts.filter((d: any) => {
      const activeMatch = d.active;
      const notExpired = !d.expiresAt || new Date(d.expiresAt) >= new Date(dateObj.fullDate);
      
      const groundMatch = !d.groundId || d.groundId === slot.groundId;
      const sportMatch = !d.targetSport || (slot.sports && slot.sports.includes(d.targetSport)) || selectedSport === d.targetSport;
      const dayMatch = !d.targetDays || d.targetDays.length === 0 || d.targetDays.includes(dateObj.dayName) || d.targetDays.includes(dateObj.dayName.substring(0,3));
      const timeMatch = !d.targetTimes || d.targetTimes.length === 0 || d.targetTimes.includes(slotTimeOfDay(slot.startTime, slot.timeCategory));
      
      return activeMatch && notExpired && groundMatch && sportMatch && dayMatch && timeMatch;
    });
    if (matches.length === 0) return null;
    return matches.reduce((best, d) => d.value > best.value ? d : best, matches[0]);
  };

  const pickSlot = (slotId: string | null, dateIdx: number, discountedPrice?: number, reason?: string) => {
    setSelectedSlotId(slotId);
    if (onSlotSelect && dates.length > 0) {
      onSlotSelect(slotId, dates[dateIdx]?.fullDate || '', discountedPrice, reason);
    }
  };

  useEffect(() => {
    if (!selectedGroundId && grounds.length > 0) setSelectedGroundId(grounds[0].id);
  }, [grounds, selectedGroundId]);

  const [dates, setDates] = useState<{ dayName: string; monthName: string; dateNum: string; fullDate: string }[]>([]);
  useEffect(() => {
    const arr = Array.from({ length: 14 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return {
        dayName:   d.toLocaleDateString('en-US', { weekday: 'short' }),
        monthName: d.toLocaleDateString('en-US', { month: 'short' }),
        dateNum:   d.toLocaleDateString('en-US', { day: '2-digit' }),
        fullDate:  d.toISOString().split('T')[0],
      };
    });
    setDates(arr);
  }, []);

  const activeDateObj = dates[selectedDateIdx];

  const availableSlots = activeDateObj
    ? slots.filter(s => s.days.includes(activeDateObj.dayName) && 
        (selectedSport ? (s.sports && s.sports.length > 0 ? s.sports.includes(selectedSport) : true) : true)
      )
    : [];

  const renderGrounds = () => {
    const targetGround = grounds.find(g => g.id === selectedGroundId) || grounds[0];
    if (!targetGround) return null;

    const gSlots = availableSlots.filter(s => s.groundId === targetGround.id);
    if (gSlots.length === 0) {
      return (
        <div className="col-span-2 text-center py-8 border border-neutral-800 border-dashed rounded-xl flex flex-col items-center justify-center">
          <p className="text-sm text-neutral-500 font-bold mb-1">No slots available</p>
          <p className="text-xs text-neutral-600 font-medium">Try checking a different date or sport</p>
        </div>
      );
    }

    const categoryOrder = ['Morning', 'Afternoon', 'Evening', 'Night', 'Other'];
    const categories: { [key: string]: Slot[] } = { Morning: [], Afternoon: [], Evening: [], Night: [], Other: [] };
    gSlots.forEach(s => {
      const cat = s.timeCategory || 'Other';
      if (categories[cat]) categories[cat].push(s);
      else categories['Other'].push(s);
    });

    return (
      <div className="flex flex-col gap-6 w-full">
        {categoryOrder.map(cat => {
          const catSlots = categories[cat].sort((a, b) => parseTime12h(a.startTime) - parseTime12h(b.startTime));
          if (catSlots.length === 0) return null;

          return (
            <div key={cat} className="flex flex-col gap-3">
              <h5 className="text-[10px] font-black text-accent/80 tracking-widest uppercase flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-accent/80 shadow-[0_0_8px_rgba(0,255,0,0.5)]" /> {cat}
              </h5>
              <div className="grid grid-cols-2 gap-3">
                {catSlots.map((slot) => {
                  const isActualBooked    = bookings.some(b => b.slotId === slot.id && b.date === activeDateObj.fullDate);
                  const slotStatus        = slot.status || 'available';
                  const isMaintenance     = slotStatus === 'maintenance';
                  const isOwnerBooked     = slotStatus === 'booked';
                  const isWalkin          = slotStatus === 'walkin';
                  const effectivelyBooked = isActualBooked || isOwnerBooked || isWalkin;
                  const effectivelyUnavailable = isMaintenance;
                  const isSelected        = selectedSlotId === slot.id;
                  const applicable        = (!effectivelyBooked && !effectivelyUnavailable)
                    ? getDiscount(slot, activeDateObj)
                    : null;
                  const discountedPrice   = applicable ? Math.round(slot.price * (1 - applicable.value / 100)) : null;

                  let stateClass = '';
                  if (isMaintenance) {
                    stateClass = 'border-orange-900/50 bg-orange-950/20 text-orange-500/70 cursor-not-allowed border-[1.5px]';
                  } else if (effectivelyBooked) {
                    stateClass = 'border-red-950/50 bg-red-950/20 text-red-500/70 cursor-not-allowed border-[1.5px]';
                  } else if (isSelected) {
                    stateClass = applicable
                      ? 'border-[1.5px] border-accent text-accent bg-accent/10 shadow-[inset_0_0_15px_rgba(0,255,0,0.12),0_0_0_1px_rgba(0,255,65,0.15)]'
                      : 'border-[1.5px] border-accent text-accent bg-accent/10 shadow-[inset_0_0_15px_rgba(0,255,0,0.1)]';
                  } else {
                    stateClass = applicable
                      ? 'bg-neutral-900 border-[1.5px] border-accent/30 text-white hover:border-accent/50'
                      : 'bg-neutral-900 border-[1.5px] border-neutral-800 text-white hover:border-neutral-700';
                  }

                  return (
                    <button
                      key={slot.id}
                      disabled={effectivelyBooked || effectivelyUnavailable}
                      onClick={() => pickSlot(slot.id, selectedDateIdx, discountedPrice ?? undefined, applicable?.code)}
                      className={`relative flex flex-col items-center justify-center p-3 sm:py-4 rounded-xl transition-all active:scale-[0.98] overflow-hidden ${stateClass}`}
                    >
                      {/* Discount Pill inside the box */}
                      {applicable && !effectivelyBooked && !effectivelyUnavailable && (
                        <div className="flex items-center gap-1 mb-1.5 bg-accent/20 px-2 py-0.5 rounded-[4px] border border-accent/40 shadow-[0_0_8px_rgba(0,255,0,0.15)] flex-wrap justify-center text-center">
                          <Tag size={9} className="text-accent drop-shadow-[0_0_3px_rgb(0,255,65)]" />
                          <span className="text-[8.5px] font-black uppercase tracking-wider text-accent drop-shadow-[0_0_2px_rgb(0,255,65)]">
                            {applicable.code} <span className="text-white opacity-80 mx-0.5 font-normal">•</span> -{applicable.value}%
                          </span>
                        </div>
                      )}

                      <span className={`text-sm font-bold tracking-wide ${(effectivelyBooked || effectivelyUnavailable) ? 'line-through opacity-50' : ''}`}>
                        {slot.startTime} - {slot.endTime}
                      </span>

                      {!effectivelyBooked && !effectivelyUnavailable && (
                        <div className="flex flex-col items-center mt-1 gap-0.5">
                          {discountedPrice !== null ? (
                            <>
                              <span className="text-[10px] text-neutral-500 line-through font-medium leading-none">৳{slot.price}</span>
                              <span className={`text-xs font-black leading-none ${isSelected ? 'text-accent' : 'text-accent/90'}`}>৳{discountedPrice}</span>
                            </>
                          ) : (
                            <span className={`text-xs mt-0.5 font-black ${isSelected ? 'text-accent' : 'text-accent/80'}`}>৳{slot.price}</span>
                          )}
                        </div>
                      )}

                      {(effectivelyBooked || effectivelyUnavailable) && (
                        <span className="text-[9px] font-black tracking-widest uppercase mt-0.5">
                          {isMaintenance ? 'Unavailable' : 'Booked'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="px-5 py-6 flex flex-col gap-8">

      {/* Sport Categories (Pills) */}
      {sports.length > 0 && (
        <div className="flex flex-col gap-3.5">
          <h3 className="text-[13px] font-bold text-neutral-400 uppercase tracking-widest">Select Sport</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar [&::-webkit-scrollbar]:hidden">
            {sports.map((sport) => (
              <button key={sport} onClick={() => setSelectedSport(sport)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-black tracking-wide border transition-all ${
                  selectedSport === sport
                    ? 'bg-accent border-accent text-black shadow-[0_0_15px_rgba(0,255,0,0.3)]'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}>
                {sport}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Date Selection */}
      <div className="flex flex-col gap-3.5">
        <h3 className="text-[13px] font-bold text-neutral-400 uppercase tracking-widest">{t('dateSelection')}</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar [&::-webkit-scrollbar]:hidden">
          {dates.length === 0 ? (
            <p className="text-xs text-neutral-500 italic py-2">Loading calendar...</p>
          ) : (
            dates.map((d, i) => (
              <button key={d.fullDate} onClick={() => { setSelectedDateIdx(i); pickSlot(null, i); }}
                className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] px-2 py-3 rounded-2xl border-2 transition-all active:scale-95 ${
                  selectedDateIdx === i
                    ? 'bg-accent/10 border-accent shadow-[inset_0_0_15px_rgba(0,255,0,0.1)]'
                    : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                }`}>
                <span className={`text-[9px] font-black uppercase tracking-widest leading-none mb-1.5 ${selectedDateIdx === i ? 'text-accent' : 'text-neutral-500'}`}>{d.monthName}</span>
                <span className={`text-[22px] font-black leading-none my-0.5 ${selectedDateIdx === i ? 'text-accent' : 'text-white'}`}>{d.dateNum}</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest leading-none mt-1.5 ${selectedDateIdx === i ? 'text-accent' : 'text-neutral-500'}`}>{d.dayName}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Ground Selection */}
      {grounds.length > 1 && (
        <div className="flex flex-col gap-3.5">
          <h3 className="text-[13px] font-bold text-neutral-400 uppercase tracking-widest">Select Ground</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar [&::-webkit-scrollbar]:hidden">
            {grounds.map((g) => (
              <button key={g.id} onClick={() => { setSelectedGroundId(g.id); setSelectedSlotId(null); }}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-black tracking-wide border transition-all ${
                  selectedGroundId === g.id
                    ? 'bg-accent border-accent text-black shadow-[0_0_15px_rgba(0,255,0,0.3)]'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                }`}>
                {g.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Time Selection */}
      <div className="flex flex-col gap-4">
        <h3 className="text-[13px] font-bold text-neutral-400 uppercase tracking-widest">{t('timeSelection')}</h3>
        <div className="flex flex-col gap-5">
          {dates.length > 0 && renderGrounds()}
        </div>
      </div>
    </div>
  );
}
