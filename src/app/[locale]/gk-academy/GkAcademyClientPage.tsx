'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Shield, MapPin, Award, User, Phone, Home, Loader2, CheckCircle2,
  ArrowLeft, Sparkles, Star, Check, Zap, Target, Activity
} from 'lucide-react';

interface CoachMannaProps {
  id?: string;
  name?: string;
  coachType?: string | null;
  area?: string | null;
  imageUrls?: string[];
  logoUrl?: string | null;
}

export default function GkAcademyClientPage({
  locale,
  coachManna,
}: {
  locale: string;
  coachManna?: CoachMannaProps | null;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const coachName = coachManna?.name || 'Coach Nahidur Rahman Manna';
  const coachLocation = coachManna?.area || 'Uttara, Dhaka';
  const coachImage =
    coachManna?.imageUrls?.[0] ||
    coachManna?.logoUrl ||
    'https://images.unsplash.com/photo-1518605368461-1ee18cd30f6b?auto=format&fit=crop&q=80';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError('Please fill in player name, phone number, and address.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/join-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'GK_ACADEMY',
          name: name.trim(),
          phone: phone.trim(),
          location: address.trim(),
          message: `Pre-registration for Goalkeeper Academy | Head Coach: ${coachName} | Location: ${coachLocation}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit pre-registration.');
      }

      setSubmitted(true);
      setName('');
      setPhone('');
      setAddress('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 selection:bg-amber-500/30 selection:text-amber-300">
      {/* Top Bar Header */}
      <header className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link
            href={`/${locale}`}
            className="flex items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Home
          </Link>
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-amber-400" />
            <span className="text-xs font-black tracking-tight text-white uppercase">
              BMT GK Academy
            </span>
          </div>
          <span className="text-[10px] font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
            Pre-Reg
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 pt-6 space-y-6">
        {/* Hero Section */}
        <section className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 via-neutral-900 to-emerald-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest">
            <Sparkles size={12} className="animate-pulse" /> Official Goalkeeper Training Program
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            Join Goalkeeper Academy
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto">
            Elevate your reflex, shot-stopping, and aerial command with professional goalkeeper coaching in Uttara.
          </p>
        </section>

        {/* Coach Details Section (Details First) */}
        <section className="bg-gradient-to-br from-amber-950/40 via-neutral-900 to-emerald-950/40 border border-amber-500/30 rounded-3xl p-5 shadow-2xl relative overflow-hidden space-y-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />

          {/* Coach Header */}
          <div className="flex gap-4 items-center">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-amber-400/40 bg-neutral-800 shrink-0 relative shadow-xl">
              <img
                src={coachImage}
                alt={coachName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1 text-amber-400 text-[10px] font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full mb-1">
                <Award size={12} /> Head Coach
              </div>
              <h2 className="text-base sm:text-lg font-black text-white truncate leading-tight">
                {coachName}
              </h2>
              <p className="text-xs text-emerald-400 font-bold flex items-center gap-1 mt-1">
                <MapPin size={13} className="shrink-0 text-emerald-400" />
                <span className="truncate">Location: {coachLocation}</span>
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-[9px] font-extrabold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-md">
                  Professional Goalkeeper Specialist
                </span>
              </div>
            </div>
          </div>

          {/* Highlights Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2">
              <Zap size={16} className="text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-black text-white truncate">Reflex Drills</p>
                <p className="text-[9px] text-neutral-400 truncate">Speed & Reaction</p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2">
              <Target size={16} className="text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-black text-white truncate">Shot Stopping</p>
                <p className="text-[9px] text-neutral-400 truncate">Positioning & Diving</p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2">
              <Activity size={16} className="text-blue-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-black text-white truncate">Agility Training</p>
                <p className="text-[9px] text-neutral-400 truncate">Footwork & Handling</p>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center gap-2">
              <Shield size={16} className="text-amber-300 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] font-black text-white truncate">Uttara Campus</p>
                <p className="text-[9px] text-neutral-400 truncate">Pre-Reg Open</p>
              </div>
            </div>
          </div>
        </section>

        {/* Pre-Registration Form Section */}
        <section className="bg-neutral-900 border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4">
          {submitted ? (
            <div className="py-8 px-4 text-center flex flex-col items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Pre-Registration Successful!</h3>
                <p className="text-xs text-emerald-300/80 mt-1 max-w-sm mx-auto">
                  Thank you for registering for the Goalkeeper Academy with {coachName} at Uttara. Our team will contact you shortly to confirm your session schedule.
                </p>
              </div>
              <Link
                href={`/${locale}`}
                className="mt-3 px-6 py-2.5 bg-emerald-500 text-neutral-950 font-black text-xs rounded-xl hover:bg-emerald-400 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="border-b border-white/10 pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                    <Shield size={16} className="text-amber-400" /> Pre-Registration Form
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-bold">Step 2 of 2</span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Enter player details below to confirm your interest
                </p>
              </div>

              {error && (
                <div className="p-3 text-xs bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl">
                  {error}
                </div>
              )}

              {/* Player Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <User size={13} className="text-amber-400" /> Player Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full player name"
                  className="w-full px-4 py-3 bg-neutral-950 border border-white/10 rounded-xl text-xs text-white placeholder:text-neutral-600 outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <Phone size={13} className="text-amber-400" /> Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 01700000000"
                  className="w-full px-4 py-3 bg-neutral-950 border border-white/10 rounded-xl text-xs text-white placeholder:text-neutral-600 outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                  <Home size={13} className="text-amber-400" /> Address / Location
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Sector 4, Uttara, Dhaka"
                  className="w-full px-4 py-3 bg-neutral-950 border border-white/10 rounded-xl text-xs text-white placeholder:text-neutral-600 outline-none focus:border-amber-400 transition-colors"
                />
              </div>

              {/* Signup Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 text-neutral-950 font-black text-sm rounded-xl shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Shield size={16} /> Signup
                  </>
                )}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
