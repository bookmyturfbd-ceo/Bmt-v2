'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  MapPin, Trophy, ShieldCheck, Phone, MessageSquare, Award,
  Users, ChevronRight, ChevronLeft, Calendar, User, Clock,
  Smartphone, Share2, Shield, X, CheckCircle, Loader2
} from 'lucide-react';
import { Link } from '@/i18n/routing';
import { getCookie } from '@/lib/cookies';
import { getRankData } from '@/lib/rankUtils';

interface AcademyDetailClientProps {
  academy: any;
  silverOrAboveCount: number;
  locale: string;
}

export default function AcademyDetailClient({
  academy,
  silverOrAboveCount,
  locale
}: AcademyDetailClientProps) {
  const router = useRouter();

  // Carousel State
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  // Inquiry form sheet state
  const [showInquirySheet, setShowInquirySheet] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  // Auto-fill phone if cookie exists
  useEffect(() => {
    const userPhone = getCookie('bmt_phone') || '';
    setPhone(userPhone);
  }, []);

  // Log Listing view event once on mount
  useEffect(() => {
    fetch('/api/academy/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ academyId: academy.id })
    }).catch(err => console.error('Error logging Listing view:', err));
  }, [academy.id]);

  const handleNextMedia = () => {
    const count = academy.media?.length || 0;
    if (count > 0) {
      setActiveMediaIndex((activeMediaIndex + 1) % count);
    }
  };

  const handlePrevMedia = () => {
    const count = academy.media?.length || 0;
    if (count > 0) {
      setActiveMediaIndex((activeMediaIndex - 1 + count) % count);
    }
  };

  // Submit Inquiry form
  const handleSendInquiry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg('');

    if (!studentName || !message || !phone) {
      setMsg('❌ Please fill all required fields.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/academy/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          academyId: academy.id,
          programId: selectedProgramId || null,
          studentName,
          studentAge: studentAge ? parseInt(studentAge) : null,
          message,
          phone
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMsg('✅ Inquiry sent successfully! The academy will contact you soon.');
        setTimeout(() => {
          setShowInquirySheet(false);
          setStudentName('');
          setStudentAge('');
          setMessage('');
          setMsg('');
        }, 2000);
      } else {
        setMsg(`❌ Error: ${data.error}`);
      }
    } catch {
      setMsg('❌ Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Pre-fill program id and open sheet when "Inquire" clicked on program card
  const handleInquireProgram = (progId: string) => {
    setSelectedProgramId(progId);
    setShowInquirySheet(true);
  };

  // Prepare pre-filled WhatsApp deep link message
  const waMessage = encodeURIComponent(
    `Hi, I saw your academy ${academy.name} on Book My Turf and would like to inquire about your training programs.`
  );
  const waLink = `https://wa.me/${academy.whatsapp || academy.phone}?text=${waMessage}`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-36 relative">
      
      {/* ── Header ── */}
      <div className="absolute top-4 left-4 z-30 flex gap-2">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white backdrop-blur-sm active:scale-95 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      {/* ── Gallery Cover / Carousel ── */}
      <div className="relative w-full h-80 bg-neutral-900 overflow-hidden">
        {academy.media && academy.media.length > 0 ? (
          <img
            src={academy.media[activeMediaIndex].url}
            className="w-full h-full object-cover transition-all duration-300"
            alt="Academy cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-neutral-500">
            <Trophy size={48} className="opacity-20 mb-2" />
            <span className="text-xs">No media uploaded</span>
          </div>
        )}

        {/* Carousel controls */}
        {academy.media && academy.media.length > 1 && (
          <>
            <button
              onClick={handlePrevMedia}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextMedia}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-black/30 to-transparent pointer-events-none" />

        {/* Floating Facts over Media */}
        <div className="absolute bottom-5 left-5 right-5 z-20 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {academy.sport.map((s: string) => (
              <span key={s} className="bg-neutral-950/70 border border-white/10 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full backdrop-blur-sm text-neutral-300">
                {s}
              </span>
            ))}
            {academy.verificationStatus === 'VERIFIED' && (
              <span className="bg-[#00ff41]/20 border border-[#00ff41]/40 text-[#00ff41] text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full backdrop-blur-sm flex items-center gap-1">
                <ShieldCheck size={10} /> Verified
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-white leading-tight mt-1">{academy.name}</h1>
          {academy.tagline && <p className="text-xs text-neutral-400 font-medium italic">{academy.tagline}</p>}
        </div>
      </div>

      <div className="px-4 mt-6 flex flex-col gap-6">

        {/* ── Quick Facts Bar ── */}
        <div className="bg-neutral-900/60 border border-white/5 rounded-3xl p-4 flex items-center justify-around text-center gap-2">
          <div>
            <p className="text-[10px] font-bold text-neutral-500 uppercase">Area</p>
            <p className="font-black text-sm text-[#00ff41] mt-0.5 truncate max-w-[80px]">{academy.area}</p>
          </div>
          <div className="w-px h-6 bg-white/5" />
          <div>
            <p className="text-[10px] font-bold text-neutral-500 uppercase">Programs</p>
            <p className="font-black text-sm text-white mt-0.5">{academy.programs?.length || 0}</p>
          </div>
          <div className="w-px h-6 bg-white/5" />
          <div>
            <p className="text-[10px] font-bold text-neutral-500 uppercase">Sports</p>
            <p className="font-black text-sm text-white mt-0.5">{academy.sport?.length || 0}</p>
          </div>
        </div>

        {/* ── Description ── */}
        {academy.description && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">About Academy</p>
            <p className="text-sm text-neutral-400 leading-relaxed bg-neutral-950 border border-white/5 p-4 rounded-2xl whitespace-pre-wrap">{academy.description}</p>
          </div>
        )}

        {/* ── Programs Section ── */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Training Programs</p>
          <div className="flex flex-col gap-3">
            {academy.programs && academy.programs.length > 0 ? (
              academy.programs.map((prog: any) => (
                <div key={prog.id} className="bg-neutral-900/40 border border-white/5 rounded-3xl p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-base text-white">{prog.name}</h3>
                      <div className="flex gap-1.5 mt-1 items-center">
                        <span className="text-[9px] font-black bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full">{prog.ageGroup}</span>
                        <span className="text-[9px] font-black bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full uppercase">{prog.sport}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-neutral-500 uppercase">Monthly Fee</p>
                      <p className="font-black text-sm text-[#00ff41] mt-0.5">
                        {prog.monthlyFeeBdt ? `৳${prog.monthlyFeeBdt}` : 'Contact'}
                      </p>
                    </div>
                  </div>
                  {prog.description && <p className="text-xs text-neutral-500 leading-relaxed">{prog.description}</p>}
                  
                  <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1.5"><Calendar size={12} className="text-neutral-500" /> {prog.scheduleText}</span>
                    {prog.batchSize && <span className="flex items-center gap-1.5"><Users size={12} className="text-neutral-500" /> Max {prog.batchSize} students</span>}
                  </div>
                  
                  <button
                    onClick={() => handleInquireProgram(prog.id)}
                    className="w-full mt-1.5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  >
                    Inquire about program
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-neutral-500 border border-dashed border-white/10 rounded-3xl">No training programs listed yet.</div>
            )}
          </div>
        </div>

        {/* ── Coaches Section ── */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Coaching Staff</p>
          <div className="grid grid-cols-1 gap-3">
            {academy.coaches && academy.coaches.length > 0 ? (
              academy.coaches.map((coach: any) => {
                const isProLinked = !!coach.coachPlayer;
                const playerMmr = coach.coachPlayer ? Math.max(coach.coachPlayer.footballMmr || 0, coach.coachPlayer.cricketMmr || 0, coach.coachPlayer.mmr || 0) : 1000;
                const rank = getRankData(playerMmr);

                return (
                  <div
                    key={coach.id}
                    className={`bg-neutral-900/40 border rounded-3xl p-4 flex gap-4 items-center transition-all ${
                      isProLinked ? 'border-[#00ff41]/25 hover:border-[#00ff41]/50' : 'border-white/5'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-neutral-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                      {coach.photoUrl ? (
                        <img src={coach.photoUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <User size={20} className="text-neutral-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-black text-sm text-white truncate">{coach.name}</p>
                        {isProLinked && (
                          <span className="bg-[#00ff41]/10 text-[#00ff41] text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            ✓ Pro
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-500 capitalize">{coach.title}</p>
                      {coach.bio && <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">{coach.bio}</p>}
                    </div>

                    {isProLinked && (
                      <Link
                        href={`/player/${coach.coachPlayer.playerCode || coach.coachPlayer.id}`}
                        className="p-2 rounded-full bg-neutral-800 hover:bg-neutral-700 transition-colors text-neutral-300"
                      >
                        <ChevronRight size={16} />
                      </Link>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 text-neutral-500 border border-dashed border-white/10 rounded-3xl">No coaches listed yet.</div>
            )}
          </div>
        </div>

        {/* ── BMT Alumni Moat Section ── */}
        {academy.alumni && academy.alumni.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Ranked Alumni Showcase</p>
              {silverOrAboveCount > 0 && (
                <span className="text-[9px] bg-[#00ff41]/10 border border-[#00ff41]/25 text-[#00ff41] px-2 py-0.5 rounded-full font-black uppercase tracking-wide">
                  {silverOrAboveCount} ranked Silver+
                </span>
              )}
            </div>
            
            <div className="bg-neutral-950 border border-white/5 rounded-3xl p-4 flex flex-col gap-3">
              {academy.alumni.map((alumnus: any) => {
                const p = alumnus.player;
                const mmr = Math.max(p.footballMmr || 0, p.cricketMmr || 0, p.mmr || 0);
                const rank = getRankData(mmr);
                return (
                  <div key={alumnus.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center shrink-0">
                        {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" alt="" /> : <User size={10} className="text-neutral-600" />}
                      </div>
                      <span className="text-xs font-black truncate max-w-[150px] text-neutral-300">{p.fullName}</span>
                    </div>
                    <span className="text-xs font-black text-neutral-500 flex items-center gap-1.5 shrink-0">
                      <img src={rank.icon} className="h-4 w-auto object-contain" alt="" />
                      <span style={{ color: rank.color }}>{rank.label} ({mmr})</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Location Map ── */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Location</p>
          <div className="bg-neutral-900/60 border border-white/5 rounded-3xl p-4 flex flex-col gap-3.5">
            <div className="flex gap-2.5 items-start">
              <MapPin size={16} className="text-[#00ff41] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-neutral-300 font-bold">{academy.address}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{academy.area}</p>
              </div>
            </div>
            
            {/* Simple static map box placeholder */}
            <div className="w-full h-32 rounded-2xl bg-neutral-950 border border-white/10 overflow-hidden flex items-center justify-center relative group">
              <div className="absolute inset-0 bg-neutral-950 opacity-40" />
              <MapPin size={24} className="text-[#00ff41] animate-bounce z-10" />
              <span className="text-[10px] font-bold text-neutral-500 absolute bottom-3 z-10">Map View Available</span>
            </div>
          </div>
        </div>

      </div>

      {/* ── Sticky Bottom Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-950/90 backdrop-blur-md border-t border-white/5 px-4 py-3 flex gap-3">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-3.5 bg-[#25d366]/10 border border-[#25d366]/30 text-[#25d366] font-black text-xs uppercase rounded-xl flex items-center justify-center gap-2 hover:bg-[#25d366]/20 transition-all active:scale-95"
        >
          <Smartphone size={14} /> WhatsApp
        </a>
        <button
          onClick={() => setShowInquirySheet(true)}
          className="flex-[2] py-3.5 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black text-xs uppercase rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <MessageSquare size={14} /> Send Inquiry
        </button>
      </div>

      {/* ── INQUIRY BOTTOM SHEET OVERLAY ── */}
      {showInquirySheet && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-[#111318] rounded-t-3xl border-t border-white/10 p-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <h2 className="text-base font-black text-white">Send Inquiry</h2>
                <p className="text-[11px] text-neutral-500 mt-0.5">Fill out student details below to contact {academy.name}.</p>
              </div>
              <button
                onClick={() => {
                  setShowInquirySheet(false);
                  setMsg('');
                }}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:bg-white/10"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSendInquiry} className="flex flex-col gap-3.5 overflow-y-auto pr-1">
              
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Select Program</span>
                <select
                  value={selectedProgramId}
                  onChange={e => setSelectedProgramId(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#00ff41]/50 text-white font-bold cursor-pointer"
                >
                  <option value="">General / Contact Academy</option>
                  {academy.programs?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.ageGroup})</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Student Name *</span>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  placeholder="e.g. Liam Smith"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#00ff41]/50 text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Student Age</span>
                  <input
                    type="number"
                    value={studentAge}
                    onChange={e => setStudentAge(e.target.value)}
                    placeholder="e.g. 12"
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#00ff41]/50 text-white font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Phone Number *</span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. 01712345678"
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#00ff41]/50 text-white font-bold"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Message *</span>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="I would like to know about available slots, batch timing, and fee structures…"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-[#00ff41]/50 text-white font-bold resize-none"
                />
              </div>

              {msg && <p className="text-xs font-bold text-center mt-1 leading-snug">{msg}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 transition-all mt-2 active:scale-95 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Send Inquiry Message'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
