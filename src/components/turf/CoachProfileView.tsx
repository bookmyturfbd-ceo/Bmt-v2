'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Star, MapPin, User, ChevronRight, LogIn, Loader2, X, Wallet, Tag, 
  Clock, Dumbbell, Award, Share2, ShieldCheck, CheckCircle2, AlertTriangle, BadgeDollarSign, Heart, Calendar, Sparkles, Send
} from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { getCookie } from '@/lib/cookies';
import RequestCustomSlotModal from '@/components/shared/RequestCustomSlotModal';
import OpenMap from '../shared/OpenMap';

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
  admissionFee?: number | null;
  monthlyFee?: number | null;
  pricingType?: string | null;
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
    professions?: string[];
    ownerId?: string;
  };
  slots: Slot[];
  bookings: Booking[];
  grounds: Ground[];
  reviews: any[];
}

// ── Slot Reservation Confirmation Modal ──────────────────────────────────────
function ConfirmProSlotModal({
  slot,
  serviceName,
  proName,
  proType,
  onClose,
  onBooked,
}: {
  slot: Slot;
  serviceName: string;
  proName: string;
  proType: string;
  onClose: () => void;
  onBooked: (receipt: any) => void;
}) {
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });

  const isMonthly = slot.pricingType === 'MONTHLY' || slot.slotType === 'MONTHLY';
  const admissionFee = slot.admissionFee || 0;
  const monthlyFee = slot.monthlyFee || slot.price || 0;
  const totalAmount = isMonthly ? (admissionFee + monthlyFee) : (slot.price || 0);

  useEffect(() => {
    const pId = getCookie('bmt_player_id');
    const pName = getCookie('bmt_name') || 'Player';
    if (pId) {
      setPlayerId(pId);
      setPlayerName(pName);
      fetch(`/api/bmt/players/${pId}`)
        .then(r => r.json())
        .then(d => { if (typeof d.walletBalance === 'number') setWalletBalance(d.walletBalance); })
        .catch(() => {});
    }
  }, []);

  const hasEnough = (walletBalance ?? 0) >= totalAmount;

  const handleBook = async () => {
    if (!playerId) {
      setError('Please sign in to complete your reservation.');
      return;
    }
    if (!hasEnough) {
      setError(`Insufficient wallet balance (৳${walletBalance ?? 0}). Please top up your wallet.`);
      return;
    }

    setBooking(true);
    setError('');

    try {
      const body = {
        turfId: slot.turfId,
        slotId: slot.id,
        date: selectedDate,
        playerId,
        playerName,
        price: totalAmount,
        originalPrice: totalAmount,
        paidViaWallet: true,
        selectedSport: proType || 'Coaching',
        createdAt: new Date().toISOString(),
      };

      const res = await fetch('/api/bmt/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to complete booking');

      // Deduct wallet balance
      await fetch(`/api/bmt/players/${playerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletBalance: Math.max(0, (walletBalance ?? 0) - totalAmount) }),
      });

      onBooked({
        id: data.booking?.id,
        coachName: proName,
        coachType: proType,
        serviceName,
        date: selectedDate,
        startTime: slot.startTime,
        endTime: slot.endTime,
        price: totalAmount,
        playerName,
        isMonthly,
        admissionFee,
        monthlyFee,
      });

    } catch (err: any) {
      setError(err.message || 'An error occurred during booking.');
    } finally {
      setBooking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="relative w-full max-w-md bg-[#0a0c14] border border-blue-500/20 rounded-t-[32px] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300">
        <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 shrink-0" />
        
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-white/5 shrink-0">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-1.5">
              <Clock size={16} className="text-blue-400" /> Confirm Pro Booking
            </h3>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">{serviceName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-white">
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex flex-col gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400 font-bold">Professional:</span>
              <span className="text-white font-black">{proName} ({proType})</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400 font-bold">Schedule:</span>
              <span className="text-blue-400 font-mono font-bold">{slot.startTime} - {slot.endTime}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400 font-bold">Active Days:</span>
              <div className="flex gap-1 flex-wrap">
                {slot.days.map(d => (
                  <span key={d} className="text-[9px] bg-blue-500/20 text-blue-300 font-bold px-1.5 py-0.5 rounded">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Date Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Select Session Start Date</label>
            <input
              type="date"
              required
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Pricing Breakdown */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">Fee Breakdown</span>
            {isMonthly ? (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400">One-time Admission Fee</span>
                  <span className="text-white font-bold">৳{admissionFee}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400">First Month Subscription Fee</span>
                  <span className="text-white font-bold">৳{monthlyFee}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400">Session Package Fee</span>
                <span className="text-white font-bold">৳{slot.price}</span>
              </div>
            )}
            <div className="border-t border-white/10 pt-2 mt-1 flex justify-between items-center text-sm font-black">
              <span className="text-white">Total Amount Due</span>
              <span className="text-blue-400 text-base">৳{totalAmount}</span>
            </div>
          </div>

          {/* Wallet check */}
          {playerId && (
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-neutral-400 font-bold flex items-center gap-1">
                <Wallet size={13} className="text-blue-400" /> Wallet Balance:
              </span>
              <span className={`font-black ${hasEnough ? 'text-emerald-400' : 'text-red-400'}`}>
                ৳{walletBalance ?? 0}
              </span>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
              {error}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-white/5 bg-neutral-950/60 shrink-0">
          {playerId ? (
            <button
              onClick={handleBook}
              disabled={booking || !hasEnough}
              className="w-full py-4 bg-blue-500 hover:brightness-110 text-white font-black text-sm rounded-2xl transition-all shadow-[0_4px_20px_rgba(59,130,246,0.35)] flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40"
            >
              {booking ? <Loader2 size={16} className="animate-spin" /> : <>Confirm Reservation <ChevronRight size={15} /></>}
            </button>
          ) : (
            <a href="/login" className="w-full py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black text-sm rounded-2xl transition-all flex items-center justify-center gap-2">
              <LogIn size={15} /> Log In to Book
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Receipt Screen ───────────────────────────────────────────────────────────
function CoachReceiptScreen({ receipt, onClose }: { receipt: any; onClose: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center py-12 px-5 max-w-md mx-auto h-full">
      <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center border border-emerald-500/25 animate-bounce">
        <CheckCircle2 size={36} className="text-emerald-400" />
      </div>
      
      <div className="flex flex-col gap-2">
        <h2 className="font-black text-2xl text-white tracking-tight">Booking Confirmed!</h2>
        <p className="text-xs text-neutral-400 leading-relaxed max-w-[280px] mx-auto">
          Your reservation with <span className="text-white font-bold">{receipt.coachName}</span> is locked in.
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
          <span className="text-neutral-500 font-bold">Session Start Date</span>
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

// ── Main Professional Profile View Component ─────────────────────────────────
export default function CoachProfileView({ pro, slots = [], bookings = [], grounds = [], reviews = [] }: CoachProfileViewProps) {
  const router = useRouter();
  
  const [selectedGroundId, setSelectedGroundId] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [confirmingSlot, setConfirmingSlot] = useState<Slot | null>(null);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [showCustomSlotModal, setShowCustomSlotModal] = useState(false);

  // Review states
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!selectedGroundId && grounds.length > 0) {
      setSelectedGroundId(grounds[0].id);
    }
  }, [grounds, selectedGroundId]);

  const handleReviewSubmit = async () => {
    if (!reviewComment.trim()) return;
    setSubmittingReview(true);
    try {
      const body = {
        turfId: pro.id,
        rating: reviewRating,
        comment: reviewComment.trim(),
      };

      const res = await fetch('/api/leaderboard/professionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  if (receiptData) {
    return (
      <div className="flex flex-col min-h-screen bg-[#080808] justify-center items-center py-10">
        <CoachReceiptScreen receipt={receiptData} onClose={() => { setReceiptData(null); router.refresh(); }} />
      </div>
    );
  }

  const selectedGround = grounds.find(g => g.id === selectedGroundId) || grounds[0];
  const activeSlots = selectedGroundId ? slots.filter(s => s.groundId === selectedGroundId) : slots;

  return (
    <div className="flex flex-col min-h-screen bg-[#080808] text-white selection:bg-blue-500/30 selection:text-white pb-24">
      {/* Top Header */}
      <div className="sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-md border-b border-white/5 px-4 pt-4 pb-3 flex items-center justify-between max-w-xl mx-auto w-full">
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all text-white"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={16} className="text-blue-400" />
          <span className="text-xs font-black uppercase tracking-wider text-neutral-300">Verified Professional</span>
        </div>
        <button 
          onClick={() => setIsLiked(!isLiked)}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
            isLiked ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
          }`}
        >
          <Heart size={16} className={isLiked ? 'fill-current' : ''} />
        </button>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-xl mx-auto px-4 flex flex-col gap-6 pt-4">
        
        {/* Pro Card */}
        <div className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-600/15 via-blue-950/20 to-transparent p-6 flex flex-col items-center text-center shadow-2xl">
          <div className="absolute top-3.5 right-3.5 px-2.5 py-1 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center gap-1">
            <Star size={11} className="text-blue-400 fill-current" />
            <span className="text-xs font-black text-blue-400">{pro.rating.toFixed(1)}</span>
            <span className="text-[10px] text-neutral-400 font-bold">({pro.reviewCount})</span>
          </div>

          {/* Avatar */}
          <div className="relative w-28 h-28 rounded-full p-[3px] bg-gradient-to-tr from-blue-500 via-cyan-400 to-blue-600 shadow-xl mb-4">
            <div className="w-full h-full rounded-full bg-neutral-950 overflow-hidden flex items-center justify-center">
              {pro.images?.[0] ? (
                <img src={pro.images[0]} alt={pro.name} className="w-full h-full object-cover" />
              ) : (
                <User size={48} className="text-blue-500 opacity-40" />
              )}
            </div>
          </div>

          <h1 className="text-2xl font-black text-white tracking-tight">{pro.name}</h1>

          {/* Specialty Pills */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center mt-2">
            {(pro.professions && pro.professions.length > 0 ? pro.professions : [pro.coachType]).map(prof => (
              <span key={prof} className="text-[10px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/15 border border-blue-500/25 px-3 py-1 rounded-lg">
                {prof}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-3 font-semibold">
            <MapPin size={14} className="text-blue-400 shrink-0" />
            <span>{pro.address}</span>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-3 w-full mt-6">
            <button
              onClick={() => setShowCustomSlotModal(true)}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-blue-500 hover:brightness-110 text-white font-black text-xs uppercase tracking-wider transition-all shadow-[0_4px_15px_rgba(59,130,246,0.35)] flex items-center justify-center gap-1.5 active:scale-95"
            >
              ⚡ Request Custom Slot / Budget
            </button>
          </div>
        </div>

        {/* ── Services & Offered Formats ── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
              <Dumbbell size={14} className="text-blue-400" /> Services & Offered Formats
            </h3>
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
              {grounds.length} Services Available
            </span>
          </div>

          {/* Service Tabs */}
          {grounds.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {grounds.map(g => {
                const isSel = selectedGroundId === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGroundId(g.id)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-black shrink-0 transition-all ${
                      isSel
                        ? 'bg-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                        : 'bg-white/5 text-neutral-400 border border-white/10 hover:text-white'
                    }`}
                  >
                    {g.name}
                  </button>
                );
              })}
            </div>
          )}

          {/* Availability Slots List */}
          <div className="flex flex-col gap-3">
            {activeSlots.length === 0 ? (
              <div className="py-12 bg-neutral-900/50 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center p-6 gap-3">
                <Clock size={28} className="text-neutral-600" />
                <p className="text-xs font-bold text-neutral-400">No availability slots configured for this service yet.</p>
                <button
                  onClick={() => setShowCustomSlotModal(true)}
                  className="text-xs font-black text-blue-400 hover:underline uppercase tracking-wider"
                >
                  ⚡ Request custom slot from coach
                </button>
              </div>
            ) : (
              activeSlots.map(slot => {
                const isMonthly = slot.pricingType === 'MONTHLY' || slot.slotType === 'MONTHLY';
                return (
                  <div
                    key={slot.id}
                    className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-blue-500/30 transition-all flex flex-col gap-3 relative bg-gradient-to-r from-white/[0.02] to-transparent shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                          isMonthly ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20' : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                        }`}>
                          {isMonthly ? 'Monthly Subscription' : 'Package / Session'}
                        </span>
                        <h4 className="text-base font-black text-white tracking-tight mt-1.5 font-mono">
                          ⏰ {slot.startTime} - {slot.endTime}
                        </h4>
                      </div>

                      <button
                        onClick={() => setConfirmingSlot(slot)}
                        className="py-2.5 px-4 rounded-xl bg-blue-500 hover:brightness-110 text-white text-xs font-black transition-all shadow-[0_4px_12px_rgba(59,130,246,0.3)] active:scale-95 shrink-0"
                      >
                        Book Session
                      </button>
                    </div>

                    {/* Active Days */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mr-1">Active Days:</span>
                      {slot.days.map(d => (
                        <span key={d} className="text-[9px] bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-md">
                          {d}
                        </span>
                      ))}
                    </div>

                    {/* Pricing */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                      {isMonthly ? (
                        <div className="flex items-center gap-3 text-xs">
                          <div>
                            <span className="text-[9px] text-neutral-500 uppercase font-bold block">Admission</span>
                            <span className="font-black text-purple-300">৳{slot.admissionFee || 0}</span>
                          </div>
                          <div className="h-6 w-px bg-white/10" />
                          <div>
                            <span className="text-[9px] text-neutral-500 uppercase font-bold block">Monthly Fee</span>
                            <span className="font-black text-blue-400">৳{slot.monthlyFee || slot.price}/mo</span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[9px] text-neutral-500 uppercase font-bold block">Package Fee</span>
                          <span className="text-base font-black text-blue-400">৳{slot.price}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Map Location ── */}
        {pro.lat && pro.lng && (
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Base Location / Map</h3>
            <div className="w-full h-48 rounded-3xl overflow-hidden border border-white/10 relative bg-neutral-900">
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
          <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
            Player Testimonials & Recommendations ({reviews.length})
          </h3>
          
          <div className="flex flex-col gap-3">
            {reviews.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">No recommendations left yet. Be the first player to recommend!</p>
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
                  <p className="text-xs text-neutral-300 leading-relaxed font-medium">{r.comment}</p>
                </div>
              ))
            )}
          </div>

          {/* Leave a Testimonial Form */}
          <div className="bg-neutral-900/60 border border-white/5 p-5 rounded-3xl flex flex-col gap-3 mt-2">
            <p className="text-xs font-black uppercase tracking-widest text-neutral-300">Leave a Recommendation</p>
            
            <div className="flex gap-1.5">
              {[1,2,3,4,5].map(s => (
                <Star 
                  key={s} 
                  size={22} 
                  onClick={() => setReviewRating(s)}
                  className={`transition-all cursor-pointer hover:scale-110 ${s <= reviewRating ? 'text-blue-400 fill-blue-400' : 'text-neutral-700'}`} 
                />
              ))}
            </div>

            <textarea 
              placeholder="Share your coaching & training experience..."
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              rows={3}
              className="w-full bg-neutral-950 border border-white/10 rounded-2xl p-4 text-xs text-white placeholder:text-neutral-600 outline-none focus:border-blue-500/50 transition-colors resize-none"
            />
            
            <button 
              disabled={submittingReview || !reviewComment.trim()}
              onClick={handleReviewSubmit}
              className="py-3 bg-blue-500 hover:brightness-110 text-white font-black text-xs rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {submittingReview ? <Loader2 size={14} className="animate-spin" /> : 'Submit Recommendation'}
            </button>
          </div>
        </div>

      </div>

      {/* Confirmation Modal */}
      {confirmingSlot && (
        <ConfirmProSlotModal
          slot={confirmingSlot}
          serviceName={selectedGround?.name || 'Coaching Service'}
          proName={pro.name}
          proType={pro.coachType}
          onClose={() => setConfirmingSlot(null)}
          onBooked={(receipt) => {
            setConfirmingSlot(null);
            setReceiptData(receipt);
          }}
        />
      )}

      {/* Custom Slot Request Modal */}
      <RequestCustomSlotModal
        open={showCustomSlotModal}
        turfId={pro.id}
        coachOwnerId={pro.ownerId || ''}
        coachName={pro.name}
        services={grounds.map(g => g.name)}
        onClose={() => setShowCustomSlotModal(false)}
      />
    </div>
  );
}
