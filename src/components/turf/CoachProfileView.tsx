'use client';
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Star, MapPin, User, ChevronRight, LogIn, Loader2, X, Wallet, Tag, 
  Clock, Dumbbell, Award, Share2, ShieldCheck, CheckCircle2, AlertTriangle, BadgeDollarSign, Heart
} from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { getCookie } from '@/lib/cookies';
import OpenMap from '../shared/OpenMap';
import { getSupabaseClient } from '@/lib/supabaseRealtime';

interface Slot {
  id: string;
  turfId: string;
  groundId: string;
  days: string[];
  sports: string[];
  startTime: string;
  endTime: string;
  price: number;
  timeCategory?: string;
  slotType?: string;
}

interface Booking {
  id: string;
  slotId: string;
  date: string;
}

interface Ground {
  id: string;
  turfId: string;
  name: string;
}

interface Discount {
  id: string;
  turfId: string;
  code: string;
  type: string;
  value: number;
  active: boolean;
  expiresAt?: string;
}

interface CoachProfileViewProps {
  pro: {
    id: string;
    name: string;
    sportsList: string[];
    address: string;
    rating: number;
    reviewCount: number;
    images: string[];
    logoUrl?: string;
    amenities: string[];
    rules?: string;
    lat?: number;
    lng?: number;
    mapLink?: string;
    coachType: string;
  };
  slots: Slot[];
  bookings: Booking[];
  grounds: Ground[];
  reviews: any[];
}

// ── Confirm Booking Bottom Sheet for Coaches ─────────────────────────────────
function CoachConfirmSheet({
  slot, date, coachName, coachType, serviceName,
  onClose, onBooked,
}: {
  slot: Slot; date: string; coachName: string; coachType: string; serviceName: string;
  onClose: () => void;
  onBooked: (receipt: any) => void;
}) {
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  const playerId = getCookie('bmt_player_id');
  const playerName = getCookie('bmt_name') || 'Player';
  
  const finalPrice = slot.price;
  const hasEnough = walletBalance !== null && walletBalance >= finalPrice;

  useEffect(() => {
    if (playerId) {
      fetch(`/api/bmt/players/${playerId}`)
        .then(r => r.json())
        .then(d => setWalletBalance(d?.walletBalance ?? 0))
        .catch(() => setWalletBalance(0));
    }
  }, [playerId]);

  const handleBook = async () => {
    if (!playerId) {
      setError('Please sign in to book a session.');
      return;
    }
    if (!hasEnough) {
      setError('Insufficient wallet balance. Please recharge.');
      return;
    }
    
    setBooking(true);
    setError('');

    try {
      const body = {
        turfId: slot.turfId,
        slotId: slot.id,
        date,
        playerId,
        playerName,
        price: finalPrice,
        originalPrice: slot.price,
        paidViaWallet: true,
        selectedSport: 'Coaching',
        createdAt: new Date().toISOString(),
      };

      const res = await fetch('/api/bmt/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete booking');
      }

      // Deduct wallet balance
      await fetch(`/api/bmt/players/${playerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletBalance: Math.max(0, (walletBalance ?? 0) - finalPrice) }),
      });

      onBooked({
        id: data.booking?.id,
        coachName,
        coachType,
        serviceName,
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        price: finalPrice,
        playerName,
      });

    } catch (err: any) {
      setError(err.message || 'An error occurred during booking.');
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-t-[32px] sm:rounded-3xl shadow-2xl z-10 overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
        <div className="h-1 w-full bg-gradient-to-r from-blue-500/0 via-blue-500 to-blue-500/0 shrink-0" />
        
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-white/5 shrink-0">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-1.5">
              <Clock size={16} className="text-blue-400" /> Confirm Session
            </h3>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">{coachType}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-white">
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5 custom-scrollbar">
          {/* Coach & Service Card */}
          <div className="bg-neutral-900 border border-white/5 p-4 rounded-2xl flex flex-col gap-2">
            <p className="text-[9px] font-black uppercase tracking-wider text-blue-400">Professional Profile</p>
            <h4 className="text-sm font-black text-white">{coachName}</h4>
            <p className="text-xs text-neutral-400">{serviceName}</p>
          </div>

          {/* Time and Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-900/60 border border-white/5 p-3 rounded-xl">
              <p className="text-[8px] font-black uppercase tracking-wider text-neutral-500 mb-0.5">Session Date</p>
              <p className="text-xs font-black text-white">{new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            </div>
            <div className="bg-neutral-900/60 border border-white/5 p-3 rounded-xl">
              <p className="text-[8px] font-black uppercase tracking-wider text-neutral-500 mb-0.5">Session Time</p>
              <p className="text-xs font-black text-white">{slot.startTime} - {slot.endTime}</p>
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
            <p className="text-[9px] font-black uppercase tracking-wider text-neutral-500">Summary</p>
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400 font-bold">Session Booking Fee</span>
              <span className="text-white font-black">৳{slot.price}</span>
            </div>
            <div className="h-px bg-white/5 my-1" />
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-white">Total Amount</span>
              <span className="text-base font-black text-blue-400">৳{finalPrice}</span>
            </div>
          </div>

          {/* Wallet check */}
          <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center border border-blue-500/25">
                <Wallet size={16} className="text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] text-neutral-500 font-black uppercase tracking-wider">Your Balance</p>
                <p className="text-sm font-black text-white">
                  {walletBalance === null ? 'Checking...' : `৳${walletBalance}`}
                </p>
              </div>
            </div>
            {walletBalance !== null && !hasEnough && (
              <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center gap-1"><AlertTriangle size={9} /> Short of funds</span>
            )}
            {walletBalance !== null && hasEnough && (
              <span className="text-[9px] font-black text-green-400 uppercase tracking-widest px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full flex items-center gap-1"><CheckCircle2 size={9} /> Ready</span>
            )}
          </div>

          {error && (
            <p className="text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 rounded-xl">
              {error}
            </p>
          )}
        </div>

        {/* Action Button */}
        <div className="p-6 border-t border-white/5 shrink-0 bg-neutral-950/40">
          {playerId ? (
            <button
              onClick={handleBook}
              disabled={booking || !hasEnough}
              className="w-full py-4 bg-blue-500 hover:brightness-110 text-white font-black text-sm rounded-2xl transition-all shadow-[0_4px_20px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
            >
              {booking ? <Loader2 size={16} className="animate-spin" /> : <>Complete Reservation <ChevronRight size={15} /></>}
            </button>
          ) : (
            <div className="flex flex-col gap-3 items-center">
              <p className="text-xs text-neutral-500 font-bold">Please log in to complete your reservation.</p>
              <a href="/login" className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-sm rounded-2xl transition-all flex items-center justify-center gap-2">
                <LogIn size={15} /> Log In
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Coach Receipt Page ───────────────────────────────────────────────────────
function CoachReceiptScreen({ receipt, onClose }: { receipt: any; onClose: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center py-12 px-5 max-w-md mx-auto h-full">
      <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center border border-green-500/25 animate-bounce">
        <CheckCircle2 size={36} className="text-green-400" />
      </div>
      
      <div className="flex flex-col gap-2">
        <h2 className="font-black text-2xl text-white tracking-tight">Session Confirmed</h2>
        <p className="text-xs text-neutral-400 leading-relaxed max-w-[280px] mx-auto">
          Your slot with <span className="text-white font-bold">{receipt.coachName}</span> has been booked successfully.
        </p>
      </div>

      <div className="w-full bg-neutral-900 border border-white/5 rounded-3xl p-5 flex flex-col gap-3 text-left">
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 border-b border-white/5 pb-2 mb-1">Receipt Details</p>
        
        <div className="flex justify-between items-center text-xs">
          <span className="text-neutral-500 font-bold">Professional</span>
          <span className="text-white font-black">{receipt.coachName}</span>
        </div>
        
        <div className="flex justify-between items-center text-xs">
          <span className="text-neutral-500 font-bold">Service Type</span>
          <span className="text-white font-black">{receipt.serviceName}</span>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-neutral-500 font-bold">Date</span>
          <span className="text-white font-black">
            {new Date(receipt.date).toLocaleDateString('en-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-neutral-500 font-bold">Time Window</span>
          <span className="text-white font-black">{receipt.startTime} - {receipt.endTime}</span>
        </div>

        <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2 mt-1">
          <span className="text-neutral-500 font-bold">Amount Paid</span>
          <span className="text-sm font-black text-blue-400">৳{receipt.price}</span>
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full py-4 bg-blue-500 hover:brightness-110 text-white font-black rounded-2xl text-sm transition-all shadow-[0_4px_20px_rgba(59,130,246,0.25)] active:scale-95 mt-4"
      >
        Done
      </button>
    </div>
  );
}

export default function CoachProfileView({ pro, slots = [], bookings = [], grounds = [], reviews = [] }: CoachProfileViewProps) {
  const router = useRouter();
  
  // States
  const [selectedGroundId, setSelectedGroundId] = useState<string | null>(null);
  const [selectedDateIdx, setSelectedDateIdx] = useState(0);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  
  const [dates, setDates] = useState<{ dayName: string; displayDay: string; displayMonth: string; dateNum: string; fullDate: string }[]>([]);
  const [isLiked, setIsLiked] = useState(false);

  // Review states
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Booking states
  const [confirmingSlot, setConfirmingSlot] = useState<Slot | null>(null);
  const [receiptData, setReceiptData] = useState<any | null>(null);

  // Default active service
  useEffect(() => {
    if (!selectedGroundId && grounds.length > 0) {
      setSelectedGroundId(grounds[0].id);
    }
  }, [grounds, selectedGroundId]);

  // Setup 14 days calendar
  useEffect(() => {
    const arr = Array.from({ length: 14 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return {
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }), // Fri, Sat etc.
        displayDay: d.toLocaleDateString('en-US', { weekday: 'short' }),
        displayMonth: d.toLocaleDateString('en-US', { month: 'short' }),
        dateNum: d.toLocaleDateString('en-US', { day: '2-digit' }),
        fullDate: d.toISOString().split('T')[0],
      };
    });
    setDates(arr);
  }, []);

  const activeDateObj = dates[selectedDateIdx];

  // Filters slots based on: active service, active day of the week
  const serviceSlots = activeDateObj && selectedGroundId
    ? slots.filter(s => s.groundId === selectedGroundId && s.days.includes(activeDateObj.dayName))
    : [];

  const handleReviewSubmit = async () => {
    if (!reviewComment.trim()) return;
    setSubmittingReview(true);
    try {
      const pId = getCookie('bmt_player_id');
      const pName = getCookie('bmt_name') || 'Guest Player';
      
      const body = {
        turfId: pro.id,
        rating: reviewRating,
        comment: reviewComment.trim(),
      };

      const res = await fetch('/api/leaderboard/professionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        alert(d.error || 'Failed to submit review');
        return;
      }
      
      setReviewComment('');
      setReviewRating(5);
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingReview(false);
    }
  };

  const selectedSlot = slots.find(s => s.id === selectedSlotId);
  const selectedGround = grounds.find(g => g.id === selectedGroundId);

  // If receipt is ready, show details
  if (receiptData) {
    return (
      <div className="flex flex-col min-h-screen bg-[#080808] justify-center items-center py-10 selection:bg-blue-500/30">
        <CoachReceiptScreen receipt={receiptData} onClose={() => { setReceiptData(null); router.refresh(); }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#080808] text-white selection:bg-blue-500/30 selection:text-white">
      {/* ── Top Header Bar ── */}
      <div className="sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-md border-b border-white/5 px-4 pt-4 pb-3 flex items-center justify-between max-w-md mx-auto w-full">
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-1">
          <Award size={15} className="text-blue-400" />
          <span className="text-xs font-black uppercase tracking-wider text-neutral-300">Verified Pro</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsLiked(!isLiked)}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
              isLiked ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
            }`}
          >
            <Heart size={16} className={isLiked ? 'fill-current' : ''} />
          </button>
        </div>
      </div>

      {/* ── Main Profile Container ── */}
      <div className="w-full max-w-md mx-auto px-4 pb-36 flex flex-col gap-6 pt-4">
        {/* Profile Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-blue-600/10 to-blue-900/5 p-6 flex flex-col items-center text-center shadow-xl">
          <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-1">
            <Star size={10} className="text-blue-400 fill-current" />
            <span className="text-[10px] font-black text-blue-400">{pro.rating.toFixed(1)}</span>
            <span className="text-[9px] text-neutral-500 font-bold">({pro.reviewCount})</span>
          </div>

          {/* Profile Picture */}
          <div className="relative w-24 h-24 rounded-full p-[3px] bg-gradient-to-tr from-blue-500 via-cyan-400 to-blue-600 shadow-lg mb-4">
            <div className="w-full h-full rounded-full bg-neutral-950 overflow-hidden">
              {pro.images?.[0] ? (
                <img src={pro.images[0]} alt={pro.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-blue-500/10 text-blue-400 font-black text-2xl uppercase">
                  {pro.name.slice(0, 2)}
                </div>
              )}
            </div>
          </div>

          <h1 className="text-xl font-black text-white tracking-tight">{pro.name}</h1>
          <p className="text-xs text-blue-400 font-bold uppercase tracking-widest mt-1">{pro.coachType}</p>

          <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-3.5 font-bold">
            <MapPin size={13} className="text-blue-400 shrink-0" />
            <span>{pro.address}</span>
          </div>
        </div>

        {/* ── Services Offered (Grounds) ── */}
        {grounds.length > 0 && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
              <Dumbbell size={14} className="text-blue-400" /> Services & Formats
            </h3>
            <div className="flex flex-col gap-2.5">
              {grounds.map((g) => {
                const isSelected = selectedGroundId === g.id;
                // Find a slot price for this ground to display as base fee
                const groundSlots = slots.filter(s => s.groundId === g.id);
                const basePrice = groundSlots.length > 0 ? groundSlots[0].price : 0;
                
                return (
                  <button
                    key={g.id}
                    onClick={() => { setSelectedGroundId(g.id); setSelectedSlotId(null); }}
                    className={`text-left p-4 rounded-2xl border transition-all duration-200 flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-500/10 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                        : 'bg-neutral-900 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="min-w-0 pr-4">
                      <p className={`text-sm font-black transition-colors ${isSelected ? 'text-blue-400' : 'text-white'}`}>{g.name}</p>
                      <p className="text-[10px] text-neutral-500 mt-1 uppercase font-bold tracking-wider">
                        {groundSlots.length} availability slots
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {basePrice > 0 ? (
                        <>
                          <p className="text-[8px] font-black uppercase text-neutral-500 tracking-wider">Starting at</p>
                          <p className="text-sm font-black text-blue-400">৳{basePrice}</p>
                        </>
                      ) : (
                        <p className="text-xs text-neutral-500 font-bold">Ask for price</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Date Selection ── */}
        {selectedGroundId && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
              <Clock size={14} className="text-blue-400" /> Choose Date
            </h3>
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none hide-scrollbar">
              {dates.map((d, i) => (
                <button
                  key={d.fullDate}
                  onClick={() => { setSelectedDateIdx(i); setSelectedSlotId(null); }}
                  className={`flex-shrink-0 flex flex-col items-center justify-center min-w-[3.5rem] px-2 py-3.5 rounded-2xl border transition-all duration-150 active:scale-95 ${
                    selectedDateIdx === i
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-400 shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]'
                      : 'bg-neutral-900 border-white/5 hover:border-white/10'
                  }`}
                >
                  <span className={`text-[8px] font-black uppercase tracking-widest leading-none mb-1.5 ${selectedDateIdx === i ? 'text-blue-400' : 'text-neutral-500'}`}>{d.displayMonth}</span>
                  <span className={`text-xl font-black leading-none my-0.5 ${selectedDateIdx === i ? 'text-blue-400' : 'text-white'}`}>{d.dateNum}</span>
                  <span className={`text-[9px] font-bold uppercase tracking-widest leading-none mt-1.5 ${selectedDateIdx === i ? 'text-blue-400' : 'text-neutral-500'}`}>{d.displayDay}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Time Options / Dual Bento Boxes ── */}
        {selectedGroundId && activeDateObj && (
          <div className="flex flex-col gap-6">
            {/* Bento Box 1: 1-on-1 Private Sessions */}
            <div className="glass-panel p-5 rounded-[24px] border border-blue-500/20 bg-gradient-to-b from-blue-500/5 to-transparent flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">1-on-1 Private Sessions</h3>
                    <p className="text-[10px] text-neutral-400 font-medium">Single training & coaching slot</p>
                  </div>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
                  Per Session
                </span>
              </div>

              {serviceSlots.filter(s => s.slotType !== 'MONTHLY').length === 0 ? (
                <div className="text-center py-6 border border-white/5 border-dashed rounded-2xl bg-neutral-900/40">
                  <p className="text-xs text-neutral-500 font-bold">No 1-on-1 slots scheduled for this date.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {serviceSlots.filter(s => s.slotType !== 'MONTHLY').map((slot) => {
                    const isBooked = bookings.some(b => b.slotId === slot.id && b.date === activeDateObj.fullDate);
                    const isSelected = selectedSlotId === slot.id;
                    
                    let cardClass = '';
                    if (isBooked) {
                      cardClass = 'bg-red-500/5 border-red-500/10 text-red-500/60 cursor-not-allowed line-through';
                    } else if (isSelected) {
                      cardClass = 'bg-blue-500/10 border-blue-500/40 text-blue-400 font-black shadow-[inset_0_0_12px_rgba(59,130,246,0.15)]';
                    } else {
                      cardClass = 'bg-neutral-900 border-white/5 text-white hover:border-white/10';
                    }

                    return (
                      <button
                        key={slot.id}
                        disabled={isBooked}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`py-3.5 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition-all ${cardClass}`}
                      >
                        <span className="text-xs font-bold">{slot.startTime} - {slot.endTime}</span>
                        {!isBooked && <span className={`text-[11px] font-black ${isSelected ? 'text-blue-400' : 'text-neutral-400'}`}>৳{slot.price}</span>}
                        {isBooked && <span className="text-[9px] font-black uppercase tracking-wider text-red-500/80">Reserved</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bento Box 2: Monthly Coaching Packages */}
            <div className="glass-panel p-5 rounded-[24px] border border-cyan-500/20 bg-gradient-to-b from-cyan-500/5 to-transparent flex flex-col gap-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
                    <Award size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-white">Monthly Coaching Packages</h3>
                    <p className="text-[10px] text-neutral-400 font-medium">Recurring monthly membership</p>
                  </div>
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full">
                  Monthly Rate
                </span>
              </div>

              {serviceSlots.filter(s => s.slotType === 'MONTHLY').length === 0 ? (
                <div className="text-center py-6 border border-white/5 border-dashed rounded-2xl bg-neutral-900/40">
                  <p className="text-xs text-neutral-500 font-bold">No monthly packages offered for this service.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {serviceSlots.filter(s => s.slotType === 'MONTHLY').map((slot) => {
                    const isBooked = bookings.some(b => b.slotId === slot.id && b.date === activeDateObj.fullDate);
                    const isSelected = selectedSlotId === slot.id;
                    
                    return (
                      <div
                        key={slot.id}
                        onClick={() => !isBooked && setSelectedSlotId(slot.id)}
                        className={`p-4 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                            : 'bg-neutral-900 border-white/5 hover:border-white/10 text-white'
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          <p className="text-xs font-black tracking-tight">{slot.startTime} - {slot.endTime}</p>
                          <div className="flex items-center gap-1 flex-wrap">
                            {slot.days.map(d => (
                              <span key={d} className="text-[9px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 font-bold px-2 py-0.5 rounded-full">
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-cyan-400">৳{slot.price}</p>
                          <p className="text-[9px] text-neutral-500 uppercase font-bold tracking-wider">/ Month</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Map Location ── */}
        {pro.lat && pro.lng && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Map / Location</h3>
            <div className="w-full h-48 rounded-3xl overflow-hidden border border-white/5 relative bg-neutral-900">
              <OpenMap lat={pro.lat} lng={pro.lng} name={pro.name} />
            </div>
            {pro.mapLink && (
              <a href={pro.mapLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 font-bold hover:underline flex items-center gap-1">
                Open in Google Maps ↗
              </a>
            )}
          </div>
        )}

        {/* ── Testimonials & Feedback ── */}
        <div className="flex flex-col gap-4 border-t border-white/5 pt-6 mt-2">
          <h3 className="text-sm font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
            Player Testimonials ({reviews.length})
          </h3>
          
          {/* Review List */}
          <div className="flex flex-col gap-3">
            {reviews.length === 0 ? (
              <p className="text-xs text-neutral-600 italic">No recommendations left yet. Be the first to recommend!</p>
            ) : (
              reviews.map((r) => (
                <div key={r.id} className="bg-neutral-900 border border-white/5 p-4 rounded-2xl flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-black text-xs">
                        {r.playerName ? r.playerName[0]?.toUpperCase() : <User size={12} />}
                      </div>
                      <span className="text-xs font-black text-white">{r.playerName || 'Anonymous Player'}</span>
                    </div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={10} className={s <= Number(r.rating) ? 'text-blue-400 fill-blue-400' : 'text-neutral-700'} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-neutral-400 leading-relaxed font-medium">{r.comment}</p>
                  <span className="text-[9px] text-neutral-600 font-bold uppercase tracking-wider">{new Date(r.createdAt || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              ))
            )}
          </div>

          {/* Write a Testimonial */}
          <div className="bg-neutral-900/50 border border-white/5 p-5 rounded-3xl flex flex-col gap-4 mt-2">
            <p className="text-xs font-black uppercase tracking-widest text-neutral-400">Leave a recommendation</p>
            
            <div className="flex gap-1.5 -mt-1">
              {[1,2,3,4,5].map(s => (
                <Star 
                  key={s} 
                  size={24} 
                  onClick={() => setReviewRating(s)}
                  className={`transition-all cursor-pointer hover:scale-110 ${s <= reviewRating ? 'text-blue-400 fill-blue-400' : 'text-neutral-700'}`} 
                />
              ))}
            </div>

            <textarea 
              placeholder="Describe your training/coaching experience..."
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              rows={3}
              className="w-full bg-neutral-950 border border-white/10 rounded-2xl p-4 text-xs text-white placeholder:text-neutral-600 outline-none focus:border-blue-500/50 transition-colors resize-none"
            />
            
            <button 
              disabled={submittingReview || !reviewComment.trim()}
              onClick={handleReviewSubmit}
              className="self-end px-5 py-2.5 bg-blue-500 text-white font-black text-xs rounded-xl hover:brightness-110 shadow-[0_4px_15px_rgba(59,130,246,0.2)] active:scale-95 transition-all disabled:opacity-50"
            >
              {submittingReview ? 'Posting...' : 'Submit'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Fixed Session Booking Bottom Action Bar ── */}
      {selectedSlot && selectedGround && activeDateObj && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 border-t border-white/10 backdrop-blur-md px-5 py-4 pb-safe flex items-center justify-between max-w-md mx-auto w-full shadow-2xl">
          <div className="min-w-0 pr-4">
            <p className="text-[9px] font-black uppercase text-blue-400 tracking-widest">Selected Session</p>
            <h4 className="text-xs font-black text-white truncate max-w-[200px] mt-0.5">{selectedGround.name}</h4>
            <p className="text-[10px] text-neutral-400 mt-0.5">{activeDateObj.displayDay} at {selectedSlot.startTime}</p>
          </div>
          
          <button 
            onClick={() => setConfirmingSlot(selectedSlot)}
            className="px-6 py-3.5 bg-blue-500 text-white font-black text-xs rounded-2xl hover:brightness-110 active:scale-95 shadow-[0_4px_15px_rgba(59,130,246,0.3)] transition-all flex items-center gap-1.5"
          >
            Book Session · ৳{selectedSlot.price}
          </button>
        </div>
      )}

      {/* Booking sheet */}
      {confirmingSlot && selectedGround && activeDateObj && (
        <CoachConfirmSheet
          slot={confirmingSlot}
          date={activeDateObj.fullDate}
          coachName={pro.name}
          coachType={pro.coachType}
          serviceName={selectedGround.name}
          onClose={() => setConfirmingSlot(null)}
          onBooked={(receipt) => {
            setConfirmingSlot(null);
            setReceiptData(receipt);
          }}
        />
      )}
    </div>
  );
}
