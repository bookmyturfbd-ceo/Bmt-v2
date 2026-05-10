'use client';
import { useState, useRef, useCallback } from 'react';
import { Download, X, Check, MapPin, Calendar, Clock, Building2, Shield, Share2 } from 'lucide-react';

interface BookingReceiptProps {
  open: boolean;
  onClose: () => void;
  booking: {
    id: string;
    turfName: string;
    groundName: string;
    date: string;         // YYYY-MM-DD
    startTime: string;
    endTime: string;
    price: number;
    playerName: string;
    sport: string;
    area?: string;
    cityName?: string;
  } | null;
}

/** Derives a short human-readable match code from the booking ID */
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

export default function BookingReceipt({ open, onClose, booking }: BookingReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!receiptRef.current || !booking) return;
    setDownloading(true);
    try {
      // Dynamic import to avoid SSR issues
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(receiptRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement('a');
      link.download = `BMT-Receipt-${booking.id.slice(0, 8).toUpperCase()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // Fallback to print
      window.print();
    }
    setDownloading(false);
  }, [booking]);

  const handleCopyCode = useCallback(() => {
    if (!booking) return;
    navigator.clipboard.writeText(matchCode(booking.id));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [booking]);

  if (!open || !booking) return null;

  const code    = matchCode(booking.id);
  const shortId = booking.id.slice(0, 8).toUpperCase();

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto" style={{ background: 'rgba(0,0,0,0.85)' }}>
      {/* Fixed backdrop — stays in place even when content scrolls */}
      <div className="fixed inset-0 backdrop-blur-md" style={{ background: 'rgba(0,0,0,0.75)', zIndex: -1 }} onClick={onClose} />

      {/* Scrollable area — padded top for browser chrome, bottom for nav */}
      <div className="relative min-h-full flex items-start justify-center px-4"
        style={{ paddingTop: '4.5rem', paddingBottom: '6rem' }}>
      <div className="w-full max-w-sm flex flex-col gap-3">
        {/* Close */}
        <div className="flex justify-end">
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl glass-panel border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* ── THE RECEIPT CARD ── */}
        <div ref={receiptRef} className="receipt-card relative overflow-hidden rounded-3xl"
          style={{ background: 'linear-gradient(145deg, #0f1a0f 0%, #0a0a0a 40%, #0d1a1a 100%)' }}>

          {/* Glow orbs */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #00ff41 0%, transparent 70%)' }} />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full opacity-10 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #00aaff 0%, transparent 70%)' }} />

          {/* Top accent line */}
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, transparent, #00ff41, transparent)' }} />

          <div className="px-6 py-5 flex flex-col gap-0">

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-green-500/30"
                  style={{ background: 'rgba(0,255,65,0.1)' }}>
                  <Building2 size={16} className="text-green-400" />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-green-500/60">Book My Turf</p>
                  <p className="text-xs font-black text-white leading-tight">Booking Receipt</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 border border-green-500/30"
                style={{ background: 'rgba(0,255,65,0.08)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 shadow-[0_0_6px_#00ff41]" />
                <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Confirmed</span>
              </div>
            </div>

            {/* ──────── MATCH CODE — the BIG deal ──────── */}
            <div className="relative mb-5 rounded-2xl border border-white/10 overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="px-4 pt-3 pb-1">
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-500 mb-2">Match Code</p>
                <p className="text-[10px] text-neutral-600 font-medium leading-snug">
                  Show this code to the facility manager at entry
                </p>
              </div>
              <div className="flex items-center justify-center py-4">
                {code.split('').map((char, i) => (
                  <div key={i}
                    className="w-14 h-16 mx-1 rounded-xl flex items-center justify-center font-black text-3xl border border-green-500/30"
                    style={{
                      background: 'linear-gradient(145deg, rgba(0,255,65,0.12), rgba(0,255,65,0.04))',
                      color: '#00ff41',
                      textShadow: '0 0 20px rgba(0,255,65,0.8)',
                      boxShadow: '0 0 15px rgba(0,255,65,0.05), inset 0 1px 0 rgba(255,255,255,0.05)',
                    }}>
                    {char}
                  </div>
                ))}
              </div>
              <div className="px-4 pb-3">
                <p className="text-[9px] font-bold text-neutral-600 text-center uppercase tracking-widest">
                  Booking Ref: {shortId}
                </p>
              </div>

              {/* Vertical tear line */}
              <div className="absolute top-0 bottom-0 left-0 w-[2px] opacity-20"
                style={{ background: 'repeating-linear-gradient(to bottom, #00ff41 0px, #00ff41 6px, transparent 6px, transparent 12px)' }} />
            </div>

            {/* Divider with holes */}
            <div className="relative flex items-center gap-0 my-1 -mx-6">
              <div className="w-4 h-4 rounded-full bg-black border-r border-white/5 -ml-2" />
              <div className="flex-1 border-t border-dashed border-white/10" />
              <div className="w-4 h-4 rounded-full bg-black border-l border-white/5 -mr-2" />
            </div>

            {/* Booking details */}
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex items-start gap-2.5">
                <Building2 size={13} className="text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Turf</p>
                  <p className="text-sm font-black text-white">{booking.turfName}</p>
                  {booking.groundName && (
                    <p className="text-[10px] font-semibold text-neutral-400 mt-0.5">Ground: {booking.groundName}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Calendar size={13} className="text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Date</p>
                  <p className="text-sm font-black text-white">{formatDate(booking.date)}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock size={13} className="text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Time Slot</p>
                  <p className="text-sm font-black text-white">{booking.startTime} → {booking.endTime}</p>
                  <p className="text-[10px] text-neutral-400 font-semibold mt-0.5">{booking.sport}</p>
                </div>
              </div>

              {(booking.area || booking.cityName) && (
                <div className="flex items-start gap-2.5">
                  <MapPin size={13} className="text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Location</p>
                    <p className="text-sm font-black text-white">{[booking.area, booking.cityName].filter(Boolean).join(', ')}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2.5">
                <Shield size={13} className="text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Booked By</p>
                  <p className="text-sm font-black text-white">{booking.playerName}</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex items-center gap-0 my-4 -mx-6">
              <div className="w-4 h-4 rounded-full bg-black border-r border-white/5 -ml-2" />
              <div className="flex-1 border-t border-dashed border-white/10" />
              <div className="w-4 h-4 rounded-full bg-black border-l border-white/5 -mr-2" />
            </div>

            {/* Total */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Total Paid</p>
                <p className="text-2xl font-black text-white">৳{booking.price.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-widest text-neutral-500 font-bold">Status</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Check size={11} className="text-green-400" />
                  <p className="text-xs font-black text-green-400">Paid & Confirmed</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
              <p className="text-[8px] font-bold text-neutral-600 uppercase tracking-widest">
                bookmyturf.com
              </p>
              <p className="text-[8px] font-bold text-neutral-600">
                Valid for one entry only
              </p>
            </div>
          </div>

          {/* Bottom accent */}
          <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(0,255,65,0.3), transparent)' }} />
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button onClick={handleCopyCode}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border text-xs font-black transition-all ${
              copied
                ? 'bg-green-500/20 border-green-500/40 text-green-400'
                : 'text-neutral-300 hover:brightness-110'
            }`}
            style={copied ? {} : { background: '#1a1a1a', borderColor: '#2a2a2a' }}>
            {copied ? <Check size={13} /> : <Share2 size={13} />}
            {copied ? 'Code Copied!' : 'Copy Code'}
          </button>
          <button onClick={handleDownload} disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-green-500 text-black font-black text-xs hover:brightness-110 active:scale-95 transition-all disabled:opacity-60 shadow-[0_4px_20px_rgba(0,255,65,0.25)]">
            <Download size={13} className={downloading ? 'animate-bounce' : ''} />
            {downloading ? 'Saving…' : 'Download'}
          </button>
        </div>

        {/* View Booking History */}
        <button onClick={onClose}
          className="w-full mt-1 py-3 rounded-2xl border text-sm font-black text-neutral-300 hover:brightness-110 flex items-center justify-center gap-2 transition-all"
          style={{ background: '#1a1a1a', borderColor: '#2a2a2a' }}>
          View Booking History
        </button>
      </div>
      </div>
    </div>
  );
}
