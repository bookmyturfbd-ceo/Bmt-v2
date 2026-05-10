'use client';
import { useState, useCallback, useEffect } from 'react';
import DateTimePicker from './DateTimePicker';
import BookingReceipt from './BookingReceipt';
import { getCookie } from '@/lib/cookies';
import {
  LogIn, Zap, Loader2, X, Wallet, Tag, ChevronRight,
  Building2, Clock, Calendar, MapPin, CheckCircle2, AlertTriangle, Users, BadgeDollarSign
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from '@/i18n/routing';
import { getSupabaseClient } from '@/lib/supabaseRealtime';

interface Slot {
  id: string; turfId: string; groundId: string; days: string[]; sports: string[];
  startTime: string; endTime: string; price: number; timeCategory?: string;
  status?: 'available' | 'walkin' | 'maintenance' | 'booked';
}
interface Booking { id: string; slotId: string; date: string; }
interface Ground  { id: string; turfId: string; name: string; }

interface Props {
  turfId: string; turfName: string;
  area?: string; cityName?: string;
  slots: Slot[]; bookings: Booking[];
  grounds: Ground[]; sports: string[];
  groupId?: string; // set when booking via Play With Friends group flow
}

// ── Confirm Booking Bottom Sheet ────────────────────────────────────────────
function ConfirmSheet({
  slot, date, turfName, area, cityName, ground, sport,
  slotDiscountedPrice, slotDiscountReason,
  groupId,
  onClose, onBooked,
}: {
  slot: Slot; date: string; turfName: string;
  area?: string; cityName?: string;
  ground?: Ground; sport: string;
  slotDiscountedPrice?: number;
  slotDiscountReason?: string;
  groupId?: string;
  onClose: () => void;
  onBooked: (receipt: any) => void;
}) {
  const [coupon, setCoupon]       = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError]     = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [booking, setBooking]     = useState(false);

  // ── Group mode state ────────────────────────────────────────────────────────
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [groupError, setGroupError]     = useState<string | null>(null);
  const [groupCulprits, setGroupCulprits] = useState<any[]>([]);
  const [groupLoading, setGroupLoading] = useState(!!groupId);

  const availableSports = slot.sports?.length > 0 ? slot.sports : [sport];
  const [selectedSport, setSelectedSport] = useState(availableSports.length === 1 ? availableSports[0] : '');

  const playerId   = getCookie('bmt_player_id');
  const playerName = getCookie('bmt_name') || 'Player';

  // Base price after slot-level discount (from discount engine)
  const basePrice  = slotDiscountedPrice ?? slot.price;
  const slotSaving = slot.price - basePrice;
  // Coupon applied on top of already-discounted price
  const finalPrice = Math.max(0, basePrice - couponDiscount);
  const remaining  = (walletBalance ?? 0) - finalPrice;
  const hasEnough  = (walletBalance ?? 0) >= finalPrice;

  // ── Load wallet balance (solo mode only) ───────────────────────────────────
  useEffect(() => {
    if (playerId && !groupId) {
      fetch(`/api/bmt/players/${playerId}`)
        .then(r => r.json())
        .then(d => setWalletBalance(d?.walletBalance ?? 0))
        .catch(() => setWalletBalance(0));
    }
  }, [playerId, groupId]);

  // ── Load group members + validate splits (group mode) ─────────────────────
  useEffect(() => {
    if (!groupId) return;
    setGroupLoading(true);
    fetch(`/api/play/groups/${groupId}`)
      .then(r => r.json())
      .then(d => {
        const members = d.group?.members ?? [];
        setGroupMembers(members);
        // Validate allocation
        const totalAllocated = members.reduce((s: number, m: any) => s + (m.splitAmount || 0), 0);
        if (totalAllocated < slot.price) {
          setGroupError(`Allocated ৳${totalAllocated} is ৳${slot.price - totalAllocated} short of the ৳${slot.price} slot price. Update allocations in My Group.`);
        } else {
          setGroupError(null);
        }
      })
      .catch(() => setGroupError('Could not load group data.'))
      .finally(() => setGroupLoading(false));
  }, [groupId, slot.price]);

  const applyCoupon = () => {
    setCouponError('');
    // Demo coupons
    if (coupon.toUpperCase() === 'BMT10') {
      setCouponDiscount(Math.round(basePrice * 0.1));
      setCouponApplied(true);
    } else if (coupon.toUpperCase() === 'BMT20') {
      setCouponDiscount(Math.round(basePrice * 0.2));
      setCouponApplied(true);
    } else {
      setCouponError('Invalid coupon code.');
    }
  };

  const handleBook = async () => {
    if (groupId) {
      // ── Group split booking ──────────────────────────────────────────────
      if (groupError) return;
      setBooking(true);
      try {
        const res = await fetch(`/api/play/groups/${groupId}/book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slotId: slot.id, turfId: slot.turfId, date, selectedSport }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data.error === 'insufficient_allocation') {
            setGroupError(data.message);
          } else if (data.error === 'insufficient_balance') {
            setGroupCulprits(data.culprits ?? []);
            setGroupError(data.message);
          } else {
            setGroupError(data.details || data.message || data.error || 'Booking failed.');
          }
          return;
        }
        // Broadcast to group channel so all members get redirected
        const supabase = getSupabaseClient();
        const ch = supabase.channel(`play-group:${groupId}`);
        ch.subscribe(async (status: string) => {
          if (status === 'SUBSCRIBED') {
            await ch.send({
              type: 'broadcast',
              event: 'group_booked',
              payload: { groupBookingCode: data.groupBookingCode, bookingId: data.booking?.id },
            });
            setTimeout(() => supabase.removeChannel(ch), 500);
          }
        });
        onBooked({
          id: data.booking?.id,
          turfName, groundName: ground?.name || '',
          date, startTime: slot.startTime, endTime: slot.endTime,
          price: slot.price, originalPrice: slot.price,
          playerName, sport: selectedSport, area, cityName,
          groupBookingCode: data.groupBookingCode,
          isGroupBooking: true,
        });
      } finally {
        setBooking(false);
      }
      return;
    }

    // ── Solo booking (original flow) ─────────────────────────────────────────
    if (!hasEnough) return;
    setBooking(true);
    try {
      const body = {
        turfId: slot.turfId, slotId: slot.id, date,
        playerId: playerId || 'guest',
        playerName, price: finalPrice,
        originalPrice: slot.price,
        slotDiscount: slotSaving > 0 ? slotSaving : undefined,
        slotDiscountReason: slotDiscountReason || undefined,
        coupon: couponApplied ? coupon.toUpperCase() : undefined,
        couponDiscount: couponDiscount > 0 ? couponDiscount : undefined,
        paidViaWallet: true,
        selectedSport,
        createdAt: new Date().toISOString(),
      };

      const res  = await fetch('/api/bmt/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();

      if (playerId) {
        await fetch(`/api/bmt/players/${playerId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletBalance: Math.max(0, (walletBalance ?? 0) - finalPrice) }),
        });
      }

      onBooked({
        id: data.id, turfName, groundName: ground?.name || '',
        date, startTime: slot.startTime, endTime: slot.endTime,
        price: finalPrice, originalPrice: slot.price,
        discountReason: slotDiscountReason,
        playerName, sport: selectedSport, area, cityName,
      });
    } finally {
      setBooking(false);
    }
  };

  const formattedDate = new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="fixed inset-0 z-[90] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md mx-auto rounded-t-3xl border-t border-x border-white/10 overflow-hidden flex flex-col"
        style={{ background: 'linear-gradient(180deg, #0f1a0f 0%, #080808 100%)' }}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Top accent */}
        <div className="h-0.5 mx-6 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #00ff41, transparent)' }} />

        <div className="px-5 pt-4 pb-28 flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: 'min(85dvh, 85vh)' }}>
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">Confirm Booking</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors"><X size={14} /></button>
          </div>

          {/* Booking details card */}
          <div className="flex flex-col gap-3 glass-panel border border-white/5 rounded-2xl p-4">
            <div className="flex items-center gap-2.5">
              <Building2 size={14} className="text-accent shrink-0" />
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Turf</p>
                <p className="text-sm font-black truncate">{turfName}</p>
                {ground && <p className="text-[10px] text-[var(--muted)]">Ground: {ground.name}</p>}
              </div>
            </div>
            <div className="h-px bg-white/5" />
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-accent shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Date</p>
                  <p className="text-xs font-black">{formattedDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-accent shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">Time</p>
                  <p className="text-xs font-black">{slot.startTime} – {slot.endTime}</p>
                </div>
              </div>
            </div>
            {(area || cityName) && (
              <>
                <div className="h-px bg-white/5" />
                <div className="flex items-center gap-2">
                  <MapPin size={13} className="text-accent shrink-0" />
                  <p className="text-xs font-semibold text-[var(--muted)]">{[area, cityName].filter(Boolean).join(', ')}</p>
                </div>
              </>
            )}
          </div>

          {/* Sport Selection (Hybrid Slots Only) */}
          {availableSports.length > 1 && (
            <div className="flex flex-col gap-2 glass-panel border border-white/5 rounded-2xl p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)] flex items-center gap-1.5"><Tag size={12}/> Select Your Game Format</p>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {availableSports.map(sp => (
                  <button key={sp} onClick={() => setSelectedSport(sp)} 
                    className={`px-3 py-3 rounded-xl border text-xs font-black transition-all shadow-sm ${
                      selectedSport === sp 
                        ? 'bg-accent/15 border-accent text-accent shadow-[inset_0_0_15px_rgba(0,255,0,0.1)]' 
                        : 'bg-white/5 border-white/10 text-[var(--muted)] hover:text-white hover:border-white/20'
                    }`}>
                    {sp}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── COUPON (solo only) */}
          {!groupId && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Coupon Code</p>
              {couponApplied ? (
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-accent/30 bg-accent/5">
                  <CheckCircle2 size={14} className="text-accent" />
                  <p className="text-sm font-black text-accent flex-1">{coupon.toUpperCase()} applied! −৳{couponDiscount.toLocaleString()}</p>
                  <button onClick={() => { setCouponDiscount(0); setCouponApplied(false); setCoupon(''); }} className="text-[var(--muted)] hover:text-white">
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                    <input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                      placeholder="Enter coupon…"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold outline-none focus:border-accent/50 placeholder:text-neutral-600 uppercase tracking-wider" />
                  </div>
                  <button onClick={applyCoupon} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-black hover:bg-white/10 transition-colors">Apply</button>
                </div>
              )}
              {couponError && <p className="text-[10px] font-bold text-red-400 flex items-center gap-1"><AlertTriangle size={10} /> {couponError}</p>}
            </div>
          )}

          {/* ── GROUP SPLIT PANEL ── */}
          {groupId && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Users size={13} className="text-cyan-400" />
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Group Split Breakdown</p>
              </div>

              {groupLoading ? (
                <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-cyan-400" /></div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {groupMembers.map((m: any) => {
                    const hasInsufficient = m.splitAmount > 0 && groupCulprits.some((c: any) => c.playerId === m.player?.id);
                    return (
                      <div key={m.id} className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${
                        hasInsufficient ? 'border-red-500/30 bg-red-500/5' : 'border-white/5 bg-white/[0.02]'
                      }`}>
                        <div className="w-7 h-7 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center text-[9px] font-black text-neutral-400">
                          {m.player?.avatarUrl
                            ? <img src={m.player.avatarUrl} className="w-full h-full object-cover" alt="" />
                            : (m.player?.fullName?.[0] ?? '?')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black truncate">{m.player?.fullName ?? 'Member'}</p>
                          {hasInsufficient && (
                            <p className="text-[9px] text-red-400 font-bold">Insufficient wallet</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-black ${m.splitAmount === 0 ? 'text-neutral-600' : hasInsufficient ? 'text-red-400' : 'text-cyan-400'}`}>
                            ৳{(m.splitAmount || 0).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Allocation vs slot price summary */}
                  {(() => {
                    const totalAllocated = groupMembers.reduce((s: number, m: any) => s + (m.splitAmount || 0), 0);
                    const isAllocationExact = totalAllocated === slot.price;
                    return (
                      <>
                        <div className={`flex items-center justify-between px-3 py-2 rounded-xl border mt-1 ${
                          isAllocationExact ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
                        }`}>
                          <span className="text-[10px] font-black text-neutral-400">Total allocated</span>
                          <span className={`text-sm font-black ${isAllocationExact ? 'text-emerald-400' : 'text-red-400'}`}>
                            ৳{totalAllocated.toLocaleString()} / ৳{slot.price.toLocaleString()}
                          </span>
                        </div>
                        {!isAllocationExact && (
                          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-red-500/30 bg-red-500/5 mt-1">
                            <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
                            <p className="text-xs font-bold text-red-400">
                              Your split payment (৳{totalAllocated.toLocaleString()}) does not match the slot price (৳{slot.price.toLocaleString()}).
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Error messages */}
              {groupError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-red-500/30 bg-red-500/5">
                  <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-red-400">{groupError}</p>
                </div>
              )}
              {groupCulprits.length > 0 && (
                <div className="flex flex-col gap-1 px-3 py-2.5 rounded-xl border border-orange-500/30 bg-orange-500/5">
                  <p className="text-[10px] font-black text-orange-400 flex items-center gap-1"><AlertTriangle size={11} /> Low wallet balance:</p>
                  {groupCulprits.map((c: any) => (
                    <p key={c.playerId} className="text-[10px] text-orange-300 font-bold pl-4">
                      {c.name} needs ৳{c.shortfall.toLocaleString()} more
                    </p>
                  ))}
                  <p className="text-[10px] text-neutral-500 font-bold pl-4 mt-0.5">Ask them to top up their wallet, then try again.</p>
                </div>
              )}
            </div>
          )}

          {/* ── SOLO WALLET ── */}
          {!groupId && (
            <>
              <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${
                !hasEnough ? 'border-red-500/30 bg-red-500/5' : 'border-accent/30 bg-accent/5'
              }`}>
                <Wallet size={16} className={!hasEnough ? 'text-red-400' : 'text-accent'} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black">Wallet Balance</p>
                  <p className={`text-[10px] font-bold ${!hasEnough ? 'text-red-400' : 'text-[var(--muted)]'}`}>
                    {walletBalance === null ? 'Loading…' : `৳${(walletBalance).toLocaleString()} available`}
                  </p>
                </div>
                {walletBalance !== null && (
                  <div className="text-right shrink-0">
                    <p className="text-[9px] text-[var(--muted)] font-bold uppercase tracking-wide">After booking</p>
                    <p className={`text-sm font-black ${remaining < 0 ? 'text-red-400' : 'text-accent'}`}>
                      ৳{Math.max(0, remaining).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
              {!hasEnough && walletBalance !== null && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-red-500/30 bg-red-500/5">
                  <AlertTriangle size={14} className="text-red-400 shrink-0" />
                  <p className="text-xs font-bold text-red-400">Insufficient wallet balance. Please recharge your wallet first.</p>
                </div>
              )}
            </>
          )}

          {/* ── PRICE BREAKDOWN ── */}
          <div className="flex flex-col gap-2 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted)] font-semibold">Slot Price</span>
              {slotSaving > 0 ? (
                <span className="font-black line-through text-neutral-500">৳{slot.price.toLocaleString()}</span>
              ) : (
                <span className="font-black">৳{slot.price.toLocaleString()}</span>
              )}
            </div>
            {slotSaving > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-semibold" style={{ color: '#00ff41' }}>
                  <Tag size={11} />
                  {slotDiscountReason || 'Slot Discount'}
                </span>
                <span className="font-black" style={{ color: '#00ff41' }}>−৳{slotSaving.toLocaleString()}</span>
              </div>
            )}
            {!groupId && couponDiscount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-accent/80 font-semibold">Coupon Discount</span>
                <span className="font-black text-accent">−৳{couponDiscount.toLocaleString()}</span>
              </div>
            )}
            <div className="h-px bg-white/10 my-1" />
            <div className="flex items-center justify-between">
              <span className="font-black text-sm">Total</span>
              <div className="text-right">
                {slotSaving > 0 && <p className="text-[10px] text-neutral-500 line-through font-medium">৳{slot.price.toLocaleString()}</p>}
                <span className="text-xl font-black text-accent">৳{groupId ? slot.price.toLocaleString() : finalPrice.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* ── BOOK BUTTON ── */}
          {groupId ? (
            <button
              onClick={handleBook}
              disabled={
                booking || 
                !!groupError || 
                groupLoading || 
                !selectedSport || 
                groupMembers.reduce((s: number, m: any) => s + (m.splitAmount || 0), 0) !== slot.price
              }
              className="w-full py-4 rounded-2xl bg-cyan-500 text-black font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-[0_4px_20px_rgba(0,210,255,0.25)]">
              {booking ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
              {booking ? 'Booking…' : (!selectedSport ? 'Select a Game Format' : 'Confirm Group Booking')}
            </button>
          ) : (
            <button
              onClick={handleBook}
              disabled={booking || !hasEnough || walletBalance === null || !selectedSport}
              className="w-full py-4 rounded-2xl bg-accent text-black font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 shadow-[0_4px_20px_rgba(0,255,65,0.25)]">
              {booking ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" />}
              {booking ? 'Booking…' : (!selectedSport ? 'Select a Game Format' : (!hasEnough ? 'Insufficient Balance' : `Book for ৳${finalPrice.toLocaleString()}`))}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Booking Client ────────────────────────────────────────────────────────
export default function TurfBookingClient({ turfId, turfName, area, cityName, slots, bookings, grounds, sports, groupId }: Props) {
  const isAuthed = useAuth();
  const router   = useRouter();
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate]     = useState<string>('');
  const [showConfirm, setShowConfirm]       = useState(false);
  const [receipt, setReceipt]               = useState<any | null>(null);
  const [slotDiscountedPrice, setSlotDiscountedPrice] = useState<number | undefined>(undefined);
  const [slotDiscountReason, setSlotDiscountReason]   = useState<string | undefined>(undefined);

  const selectedSlot = slots.find(s => s.id === selectedSlotId);
  const displayPrice = (slotDiscountedPrice !== undefined && selectedSlotId) ? slotDiscountedPrice : (selectedSlot?.price ?? (slots.length > 0 ? Math.min(...slots.map(s => s.price)) : 0));
  const minPrice     = slots.length > 0 ? Math.min(...slots.map(s => s.price)) : 0;

  const handleConfirmClick = useCallback(() => {
    if (!isAuthed) {
      window.location.href = window.location.origin + '/en/login?next=' + encodeURIComponent(window.location.pathname);
      return;
    }
    if (!selectedSlotId || !selectedDate) {
      alert('Please select a date and time slot first!');
      return;
    }
    setShowConfirm(true);
  }, [isAuthed, selectedSlotId, selectedDate]);

  const handleBooked = (receiptData: any) => {
    setShowConfirm(false);
    setReceipt(receiptData);
  };

  const handleReceiptClose = () => {
    setReceipt(null);
    // Navigate to /book page with history tab active
    router.push('/book?tab=history');
  };

  const ground = selectedSlot ? grounds.find(g => g.id === selectedSlot.groundId) : undefined;
  const sport  = selectedSlot?.sports?.[0] || sports[0] || 'Sport';

  return (
    <>
      <DateTimePicker
        slots={slots} bookings={bookings} grounds={grounds} sports={sports}
        onSlotSelect={(slotId, date, discountedPrice, reason) => {
          setSelectedSlotId(slotId);
          setSelectedDate(date);
          setSlotDiscountedPrice(discountedPrice);
          setSlotDiscountReason(reason);
        }}
      />

      {/* Sticky booking bar */}
      <div className="fixed bottom-16 left-0 right-0 z-50 px-4 py-3 max-w-md mx-auto w-full">
        <div className="glass-light dark:glass rounded-3xl border border-white/10 shadow-[0_-4px_40px_rgba(0,0,0,0.8)] px-5 pt-3.5 pb-4 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
              {selectedSlot ? 'Selected' : 'Starting from'}
            </span>
            <div className="flex flex-col text-white">
              {slotDiscountedPrice !== undefined && selectedSlotId ? (
                <>
                  <span className="text-[11px] text-neutral-500 line-through font-bold leading-none mb-0.5">৳{selectedSlot?.price.toLocaleString()}</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[20px] font-black leading-none" style={{ color: '#00ff41' }}>৳{slotDiscountedPrice.toLocaleString()}</span>
                    <span className="text-[11px] text-neutral-400 font-bold">/slot</span>
                  </div>
                </>
              ) : (
                <div className="flex items-baseline gap-1.5 mt-1 text-white">
                  <span className="text-[22px] font-black leading-none">৳{displayPrice.toLocaleString()}</span>
                  <span className="text-[11px] text-neutral-400 font-bold">/slot</span>
                </div>
              )}
            </div>
            {selectedSlot && (
              <span className="text-[10px] text-accent font-bold">{selectedSlot.startTime} – {selectedSlot.endTime}</span>
            )}
          </div>

          {isAuthed === null ? (
            <div className="w-32 h-9 rounded-full bg-neutral-800 animate-pulse" />
          ) : isAuthed ? (
            <button onClick={handleConfirmClick} disabled={!selectedSlotId}
              className="flex items-center gap-1.5 bg-accent text-black px-5 py-2.5 rounded-full font-black tracking-wide shadow-[0_4px_16px_rgba(0,255,0,0.2)] active:scale-95 hover:brightness-110 transition-all text-xs disabled:opacity-40 disabled:cursor-not-allowed">
              <Zap size={13} fill="currentColor" />
              {selectedSlotId ? 'Confirm Booking' : 'Select a Slot'}
            </button>
          ) : (
            <button onClick={handleConfirmClick}
              className="flex items-center gap-1.5 bg-neutral-800 border border-white/10 text-white px-5 py-2.5 rounded-full font-bold tracking-wide active:scale-95 hover:bg-neutral-700 transition-all text-xs">
              <LogIn size={13} className="text-accent" />
              Sign in to Book
            </button>
          )}
        </div>
      </div>

      {/* Confirm bottom sheet */}
      {showConfirm && selectedSlot && selectedDate && (
        <ConfirmSheet
          slot={selectedSlot} date={selectedDate}
          turfName={turfName} area={area} cityName={cityName}
          ground={ground} sport={sport}
          slotDiscountedPrice={slotDiscountedPrice}
          slotDiscountReason={slotDiscountReason}
          groupId={groupId}
          onClose={() => setShowConfirm(false)}
          onBooked={handleBooked}
        />
      )}

      {/* Receipt modal */}
      <BookingReceipt
        open={receipt !== null}
        onClose={handleReceiptClose}
        booking={receipt}
      />
    </>
  );
}
