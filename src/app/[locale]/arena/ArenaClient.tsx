'use client';

import { useState, useEffect, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import {
  Swords, Users, Trophy, ArrowLeftRight, BarChart2,
  Plus, User, ChevronRight, Shield, Video, Lock, Clock,
  CheckCircle, Calendar, MapPin, AlertCircle, Loader2, Send, Wifi, AlertTriangle
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { getSupabaseClient } from '@/lib/supabaseRealtime';
import AcademyDiscoverTab from '@/components/academy/AcademyDiscoverTab';

interface ArenaClientProps {
  initials: string;
  avatar: string;
  isAuthed: boolean;
  myTeams: any[];
  challenges: { received: any[]; upcoming: any[] };
  tournaments: any[];
  locale: string;
}

export default function ArenaClient({
  initials,
  avatar,
  isAuthed,
  myTeams,
  challenges: initialChallenges,
  tournaments: initialTournaments,
  locale
}: ArenaClientProps) {
  const router = useRouter();
  const t = useTranslations('Arena');

  // Arena tab navigation: 'dashboard' | 'academy'
  const [arenaTab, setArenaTab] = useState<'dashboard' | 'academy'>('dashboard');

  // Dynamic Dashboard States loaded client-side
  const [loading, setLoading] = useState(true);
  const [dbData, setDbData] = useState<any>(null);

  // Modal / Compose Sheet states
  const [showPostSheet, setShowPostSheet] = useState(false);
  const [showAcceptSheet, setShowAcceptSheet] = useState(false);
  const [selectedChallengeToAccept, setSelectedChallengeToAccept] = useState<any>(null);
  const [acceptingTeamId, setAcceptingTeamId] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  const [submittingAccept, setSubmittingAccept] = useState(false);

  // Countdown timer state for next confirmed match
  const [countdownStr, setCountdownStr] = useState('');

  // Fetch all dashboard metrics
  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/arena/dashboard');
      if (res.ok) {
        const data = await res.json();
        setDbData(data);
        if (data.myTeams && data.myTeams.length > 0 && !acceptingTeamId) {
          setAcceptingTeamId(data.myTeams[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Realtime match updates setup
  useEffect(() => {
    if (!isAuthed || !dbData?.myTeams) return;
    const myTeamIds = dbData.myTeams.map((team: any) => team.id);
    if (myTeamIds.length === 0) return;

    const supabase = getSupabaseClient();
    const channel = supabase.channel('arena-dashboard-matches');

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        (payload: any) => {
          const rec = payload.new || payload.old;
          if (rec && (myTeamIds.includes(rec.teamA_Id) || myTeamIds.includes(rec.teamB_Id))) {
            // Live update or refresh counts in place
            fetchDashboard();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthed, dbData?.myTeams]);

  // Live countdown timer ticking every minute
  useEffect(() => {
    const upNext = dbData?.upNext;
    const upNextType = dbData?.upNextType;
    if (!upNext || upNextType !== 'SCHEDULED' || !upNext.matchDate) {
      setCountdownStr('');
      return;
    }

    const updateCountdown = () => {
      let matchTime = upNext.matchDate; // YYYY-MM-DD
      if (upNext.selectedSlotInfo?.startTime) {
        matchTime = `${upNext.matchDate}T${upNext.selectedSlotInfo.startTime}:00`;
      } else if (upNext.wbtFrom) {
        matchTime = `${upNext.matchDate}T${upNext.wbtFrom}:00`;
      } else {
        matchTime = `${upNext.matchDate}T00:00:00`;
      }

      const matchDateObj = new Date(matchTime);
      const diffMs = matchDateObj.getTime() - Date.now();

      if (diffMs <= 0) {
        setCountdownStr('Kickoff now!');
        return;
      }

      const diffMins = Math.floor(diffMs / 60000);
      const days = Math.floor(diffMins / 1440);
      const hours = Math.floor((diffMins % 1440) / 60);
      const mins = diffMins % 60;

      if (days > 0) {
        setCountdownStr(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setCountdownStr(`${hours}h ${mins}m`);
      } else {
        setCountdownStr(`${mins}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [dbData?.upNext, dbData?.upNextType]);

  const formatNumber = (num: number | string) => {
    if (locale === 'bn') {
      const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      return String(num).replace(/[0-9]/g, (w) => banglaDigits[+w]);
    }
    return String(num);
  };

  const translateVariant = (variant: string) => {
    const mapEn: Record<string, string> = {
      'FUTSAL': 'Futsal',
      'FOOTBALL': 'Football',
      'CRICKET': 'Cricket',
      'FUTSAL_5': '5v5 Futsal',
      'FUTSAL_6': '6v6 Futsal',
      'FUTSAL_7': '7v7 Futsal',
      'FOOTBALL_FULL': '11v11 Football',
      'CRICKET_7': '7v7 Cricket',
      'CRICKET_FULL': '11v11 Cricket',
    };
    const mapBn: Record<string, string> = {
      'FUTSAL': 'ফুটসাল',
      'FOOTBALL': 'ফুটবল',
      'CRICKET': 'ক্রিকেট',
      'FUTSAL_5': '৫ বনাম ৫ ফুটসাল',
      'FUTSAL_6': '৬ বনাম ৬ ফুটসাল',
      'FUTSAL_7': '৭ বনাম ৭ ফুটসাল',
      'FOOTBALL_FULL': '১১ বনাম ১১ ফুটবল',
      'CRICKET_7': '৭ বনাম ৭ ক্রিকেট',
      'CRICKET_FULL': '১১ বনাম ১১ ক্রিকেট',
    };
    return (locale === 'bn' ? mapBn[variant] : mapEn[variant]) ?? variant;
  };

  // Primary captain context (user's first managed team)
  const primaryTeam = dbData?.myTeams?.[0] || myTeams?.[0] || null;

  // Post open challenge form submission
  const handlePostOpenChallenge = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmittingPost(true);

    const form = e.target as HTMLFormElement;
    const teamId = (form.elements.namedItem('teamId') as HTMLSelectElement).value;
    const format = (form.elements.namedItem('format') as HTMLSelectElement).value;
    const area = (form.elements.namedItem('area') as HTMLInputElement).value;
    const windowStart = (form.elements.namedItem('windowStart') as HTMLInputElement).value;
    const windowEnd = (form.elements.namedItem('windowEnd') as HTMLInputElement).value;
    const note = (form.elements.namedItem('note') as HTMLTextAreaElement).value;

    if (!teamId || !format || !area || !windowStart || !windowEnd) {
      alert('Please fill all required fields');
      setSubmittingPost(false);
      return;
    }

    try {
      const res = await fetch('/api/interact/open-challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId, format, area, windowStart, windowEnd, note
        })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Challenge posted successfully!');
        setShowPostSheet(false);
        fetchDashboard();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert('Network error.');
    } finally {
      setSubmittingPost(false);
    }
  };

  // Accept open challenge submission
  const handleAcceptOpenChallenge = async () => {
    if (!selectedChallengeToAccept || !acceptingTeamId) return;
    setSubmittingAccept(true);

    try {
      const res = await fetch(`/api/interact/open-challenge/${selectedChallengeToAccept.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptingTeamId })
      });
      const data = await res.json();
      if (res.ok) {
        alert('Challenge accepted successfully!');
        setShowAcceptSheet(false);
        router.push(`/${locale}/interact/match/${data.matchId}`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch {
      alert('Network error.');
    } finally {
      setSubmittingAccept(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-32">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Swords size={20} className="text-[#00ff41]" />
          <h1 className="font-black text-xl tracking-tight">{t('title')}</h1>
          {isAuthed && primaryTeam && (
            <div className="flex items-center gap-1.5 bg-neutral-900 border border-white/5 rounded-full pl-1.5 pr-2.5 py-0.5 text-[9px] font-black text-neutral-400">
              <div className="w-3.5 h-3.5 rounded-full overflow-hidden bg-neutral-800 border border-white/10 shrink-0 flex items-center justify-center">
                {primaryTeam.logoUrl ? (
                  <img src={primaryTeam.logoUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <Shield size={7} className="text-[#00ff41]" />
                )}
              </div>
              <span className="truncate max-w-[80px]">{primaryTeam.name}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/profile"
            className="w-10 h-10 rounded-full bg-neutral-900 border border-white/10 flex items-center justify-center hover:bg-neutral-800 transition-colors shadow-sm overflow-hidden"
          >
            {isAuthed ? (
              avatar ? (
                <img src={avatar} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <span className="text-xs font-black text-[#00ff41]">{initials}</span>
              )
            ) : (
              <User size={18} className="text-neutral-500" />
            )}
          </Link>
        </div>
      </header>

      <div className="px-4 pt-5 flex flex-col gap-5">
        
        {/* ── ZONE 1: Up Next Hero ── */}
        {loading ? (
          <div className="w-full h-44 rounded-3xl bg-neutral-900/40 border border-white/5 animate-pulse flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-neutral-600" />
          </div>
        ) : (
          (() => {
            const upNext = dbData?.upNext;
            const upNextType = dbData?.upNextType;

            if (upNextType === 'LIVE' && upNext) {
              return (
                <div
                  onClick={() => router.push(`/${locale}/interact/match/${upNext.id}`)}
                  className="w-full rounded-3xl border border-red-500/20 bg-neutral-900/80 p-5 text-left transition-all active:scale-[0.99] shadow-lg cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="text-[10px] font-black text-red-500 bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      {t('liveMatch')}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-bold">{translateVariant(upNext.sportType)}</span>
                  </div>
                  <div className="flex items-center justify-between px-2 py-1">
                    <div className="flex flex-col items-center gap-2 flex-1 max-w-[40%] text-center">
                      <div className="w-11 h-11 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {upNext.teamA.logoUrl ? <img src={upNext.teamA.logoUrl} className="w-full h-full object-cover" alt="" /> : <Shield size={18} className="text-[#00ff41]" />}
                      </div>
                      <span className="text-xs font-black truncate w-full text-white">{upNext.teamA.name}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1">
                      <div className="text-2xl font-black tabular-nums">{upNext.scoreA} – {upNext.scoreB}</div>
                      <span className="text-[9px] text-[#00ff41] font-black uppercase tracking-wider animate-pulse">Match Live</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 flex-1 max-w-[40%] text-center">
                      <div className="w-11 h-11 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {upNext.teamB.logoUrl ? <img src={upNext.teamB.logoUrl} className="w-full h-full object-cover" alt="" /> : <Shield size={18} className="text-[#00ff41]" />}
                      </div>
                      <span className="text-xs font-black truncate w-full text-white">{upNext.teamB.name}</span>
                    </div>
                  </div>
                </div>
              );
            }

            if (upNextType === 'SCHEDULED' && upNext) {
              const myTeamIds = dbData.myTeams.map((t: any) => t.id);
              const isTeamA = myTeamIds.includes(upNext.teamA_Id);
              const opponent = isTeamA ? upNext.teamB : upNext.teamA;
              const slotInfo = upNext.selectedSlotInfo;
              const isBmt = upNext.venueType === 'BMT';

              return (
                <div
                  onClick={() => router.push(`/${locale}/interact/match/${upNext.id}`)}
                  className="w-full rounded-3xl border border-white/5 bg-neutral-900/60 p-5 text-left transition-all active:scale-[0.99] shadow-lg cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest bg-neutral-800 px-2 py-0.5 rounded-md">
                      {t('upNext')}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-bold">{translateVariant(upNext.sportType)}</span>
                  </div>
                  <div className="flex items-center gap-3.5 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                      {opponent.logoUrl ? <img src={opponent.logoUrl} className="w-full h-full object-cover" alt="" /> : <Shield size={18} className="text-neutral-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-neutral-300">vs {opponent.name}</p>
                      <p className="text-[10px] text-[#00ff41] font-black uppercase mt-0.5 tracking-wider">Confirmed</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-neutral-500 uppercase">Countdown</p>
                      <p className="text-sm font-black text-[#00ff41] tabular-nums mt-0.5">{countdownStr || 'Calculating…'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pt-3 border-t border-white/5 text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1 truncate"><MapPin size={11} className="text-neutral-500" /> {isBmt ? (slotInfo?.turfName || 'BMT Turf') : (upNext.wbtTurfName || 'Self-booked')}</span>
                    <span className="flex items-center gap-1 shrink-0"><Clock size={11} className="text-neutral-500" /> {isBmt ? (slotInfo?.startTime || '--:--') : (upNext.wbtFrom || '--:--')}</span>
                  </div>
                </div>
              );
            }

            if (upNextType === 'INTERACTION' && upNext) {
              const myTeamIds = dbData.myTeams.map((t: any) => t.id);
              const isTeamA = myTeamIds.includes(upNext.teamA_Id);
              const opponent = isTeamA ? upNext.teamB : upNext.teamA;

              return (
                <div
                  onClick={() => router.push(`/${locale}/interact/match/${upNext.id}`)}
                  className="w-full rounded-3xl border border-[#00ff41]/20 bg-[#00ff41]/5 p-5 text-left transition-all active:scale-[0.99] shadow-lg cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3.5">
                    <span className="text-[10px] font-black text-[#00ff41] bg-[#00ff41]/10 border border-[#00ff41]/25 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      {t('negotiating')}
                    </span>
                    <span className="text-[10px] text-neutral-500 font-bold">{translateVariant(upNext.sportType)}</span>
                  </div>
                  <p className="text-sm font-black text-white">Negotiations in progress with {opponent.name}</p>
                  <p className="text-xs text-neutral-400 mt-1">Tap to lock roster or confirm slot proposals.</p>
                </div>
              );
            }

            // Fallback CTA
            return (
              <div
                onClick={() => router.push(`/${locale}/interact`)}
                className="w-full rounded-3xl border border-dashed border-white/10 bg-neutral-900/20 p-6 text-center transition-all active:scale-[0.99] cursor-pointer hover:bg-neutral-900/30"
              >
                <Swords size={28} className="text-[#00ff41] mx-auto mb-2 opacity-80" />
                <p className="font-black text-sm text-neutral-300">{t('noMatchesScheduled')}</p>
                <p className="text-xs text-neutral-500 mt-1">{t('findOpponent')} →</p>
              </div>
            );
          })()
        )}

        {/* ── ZONE 2: Needs Attention Strip ── */}
        {!loading && dbData?.attention && (() => {
          const { challengesReceived, proposalsAwaitingConfirm, scoreVerificationPending, badgeDistributionPending } = dbData.attention;
          const showAttention = challengesReceived > 0 || proposalsAwaitingConfirm > 0 || scoreVerificationPending > 0 || badgeDistributionPending > 0;

          if (!showAttention) return null;

          return (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none shrink-0">
              {challengesReceived > 0 && (
                <button
                  onClick={() => router.push(`/${locale}/interact`)}
                  className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full pl-3 pr-2.5 py-1.5 shrink-0 text-xs font-black text-amber-400 hover:bg-amber-500/20 transition-all"
                >
                  <span>{t('challengesReceived')}</span>
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-black font-black text-[9px] flex items-center justify-center tabular-nums">
                    {formatNumber(challengesReceived)}
                  </span>
                </button>
              )}
              {proposalsAwaitingConfirm > 0 && (
                <button
                  onClick={() => router.push(`/${locale}/interact`)}
                  className="flex items-center gap-1.5 bg-[#00ff41]/10 border border-[#00ff41]/20 rounded-full pl-3 pr-2.5 py-1.5 shrink-0 text-xs font-black text-[#00ff41] hover:bg-[#00ff41]/20 transition-all"
                >
                  <span>{t('proposalsAwaiting')}</span>
                  <span className="w-5 h-5 rounded-full bg-[#00ff41] text-black font-black text-[9px] flex items-center justify-center tabular-nums">
                    {formatNumber(proposalsAwaitingConfirm)}
                  </span>
                </button>
              )}
              {scoreVerificationPending > 0 && (
                <button
                  onClick={() => router.push(`/${locale}/interact`)}
                  className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full pl-3 pr-2.5 py-1.5 shrink-0 text-xs font-black text-blue-400 hover:bg-blue-500/20 transition-all"
                >
                  <span>{t('verificationPending')}</span>
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-black font-black text-[9px] flex items-center justify-center tabular-nums">
                    {formatNumber(scoreVerificationPending)}
                  </span>
                </button>
              )}
              {badgeDistributionPending > 0 && (
                <button
                  onClick={() => router.push(`/${locale}/interact`)}
                  className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full pl-3 pr-2.5 py-1.5 shrink-0 text-xs font-black text-purple-400 hover:bg-purple-500/20 transition-all"
                >
                  <span>{t('statsPending')}</span>
                  <span className="w-5 h-5 rounded-full bg-purple-500 text-black font-black text-[9px] flex items-center justify-center tabular-nums">
                    {formatNumber(badgeDistributionPending)}
                  </span>
                </button>
              )}
            </div>
          );
        })()}

        {/* ── ZONE 3: Feature Grid ── */}
        <div className="grid grid-cols-2 gap-4">
          {/* Challenge Market */}
          <button
            onClick={() => router.push(`/${locale}/interact`)}
            className="rounded-3xl bg-neutral-900/60 border border-white/5 p-5 text-left group hover:border-[#00ff41]/30 transition-all active:scale-[0.98] shadow-lg flex flex-col gap-4 min-h-[160px]"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/20 flex items-center justify-center">
              <Swords size={18} className="text-[#00ff41]" />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <p className="font-black text-base text-white leading-tight">{t('challengeMarket')}</p>
              <p className="text-[11px] text-neutral-500 mt-1.5 max-w-[120px] leading-snug">{t('challengeMarketDesc')}</p>
            </div>
          </button>

          {/* Tournaments */}
          <button
            onClick={() => router.push(`/${locale}/tournaments`)}
            className="rounded-3xl bg-neutral-900/60 border border-white/5 p-5 text-left group hover:border-[#00ff41]/30 transition-all active:scale-[0.98] shadow-lg flex flex-col gap-4 min-h-[160px]"
          >
            {/* Gold icon on official event */}
            <div className="w-10 h-10 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Trophy size={18} className="text-yellow-400" />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <p className="font-black text-base text-white leading-tight">{t('tournaments')}</p>
              <p className="text-[10px] text-[#00ff41] font-black uppercase mt-1.5 truncate max-w-[120px]">
                {dbData?.discover?.tournament?.name || t('officialEvents')}
              </p>
            </div>
          </button>

          {/* My Teams */}
          <button
            onClick={() => router.push(`/${locale}/teams`)}
            className="rounded-3xl bg-neutral-900/60 border border-white/5 p-5 text-left group hover:border-[#00ff41]/30 transition-all active:scale-[0.98] shadow-lg flex flex-col gap-4 min-h-[160px]"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/20 flex items-center justify-center">
              <Shield size={18} className="text-[#00ff41]" />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <p className="font-black text-base text-white leading-tight">{t('myTeams')}</p>
              {primaryTeam ? (
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-4 h-4 rounded-full bg-neutral-800 border border-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {primaryTeam.logoUrl ? <img src={primaryTeam.logoUrl} className="w-full h-full object-cover" alt="" /> : <Shield size={8} className="text-[#00ff41]" />}
                  </div>
                  <span className="text-[10px] text-neutral-500 truncate font-bold max-w-[80px]">{primaryTeam.name}</span>
                </div>
              ) : (
                <p className="text-[11px] text-neutral-500 mt-1.5 leading-snug">{t('manageSquads')}</p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-lg font-black text-[#00ff41]">{formatNumber(dbData?.myTeams?.length || myTeams.length || 0)}</span>
              <ChevronRight size={14} className="text-neutral-500" />
            </div>
          </button>

          {/* Play with Friends */}
          <button
            onClick={() => router.push(`/${locale}/play`)}
            className="rounded-3xl bg-neutral-900/60 border border-white/5 p-5 text-left group hover:border-[#00ff41]/30 transition-all active:scale-[0.98] shadow-lg flex flex-col gap-4 min-h-[160px]"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/20 flex items-center justify-center">
              <Users size={18} className="text-[#00ff41]" />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <p className="font-black text-base text-white leading-tight">{t('playWithFriends')}</p>
              <p className="text-[11px] text-neutral-500 mt-1.5 leading-snug">{t('playWithFriendsDesc')}</p>
            </div>
          </button>

          {/* Highlights */}
          <button
            onClick={() => router.push(`/${locale}/interact/reels`)}
            className="rounded-3xl bg-neutral-900/60 border border-white/5 p-5 text-left group hover:border-[#00ff41]/30 transition-all active:scale-[0.98] shadow-lg flex flex-col gap-4 min-h-[160px]"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/20 flex items-center justify-center">
              <Video size={18} className="text-[#00ff41]" />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <p className="font-black text-base text-white leading-tight">{t('highlights')}</p>
              <p className="text-[11px] text-neutral-500 mt-1.5 leading-snug">{t('highlightsDesc')}</p>
            </div>
          </button>

          {/* Transfer Market - LOCKED (Coming Soon) */}
          <div
            className="rounded-3xl bg-neutral-900/40 border border-white/5 p-5 text-left flex flex-col gap-4 min-h-[160px] relative opacity-50 select-none"
          >
            <div className="absolute top-4 right-4 text-neutral-600">
              <Lock size={14} />
            </div>
            <div className="w-10 h-10 rounded-2xl bg-neutral-800 flex items-center justify-center">
              <ArrowLeftRight size={18} className="text-neutral-600" />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <p className="font-black text-base text-neutral-400 leading-tight">{t('transferMarket')}</p>
              <p className="text-[11px] text-neutral-600 mt-1.5 leading-snug">{t('transferMarketTease')}</p>
            </div>
            <div className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">{t('comingSoon')}</div>
          </div>

          {/* Leaderboards */}
          <button
            onClick={() => router.push(`/${locale}/leaderboard`)}
            className="col-span-2 rounded-3xl bg-neutral-900/60 border border-white/5 p-5 text-left group hover:border-[#00ff41]/30 transition-all active:scale-[0.99] flex items-center gap-5 relative"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/20 flex items-center justify-center shrink-0">
              <BarChart2 size={20} className="text-[#00ff41]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-base text-white">{t('leaderboards')}</p>
              <p className="text-xs text-neutral-500 mt-0.5">{t('leaderboardsDesc')}</p>
            </div>
            <ChevronRight size={18} className="text-neutral-500" />
          </button>
        </div>

        {/* ── ZONE 4: Discover Strip ── */}
        {!loading && dbData?.discover && (
          <div className="flex flex-col gap-4">
            
            {/* Open Challenges Carousel */}
            {dbData.discover.openChallenges?.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 px-1">{t('openChallenges')}</p>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
                  {dbData.discover.openChallenges.map((oc: any) => (
                    <div key={oc.id} className="bg-neutral-950 border border-white/5 rounded-2xl p-4 w-72 shrink-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center shrink-0">
                            {oc.team.logoUrl ? <img src={oc.team.logoUrl} className="w-full h-full object-cover" alt="" /> : <Shield size={10} className="text-neutral-400" />}
                          </div>
                          <span className="text-xs font-black truncate max-w-[120px] text-white">{oc.team.name}</span>
                          <span className="text-[9px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded-full font-bold ml-auto">{translateVariant(oc.format)}</span>
                        </div>
                        <p className="text-[10px] text-neutral-400 flex items-center gap-1.5"><MapPin size={10} /> {oc.area}</p>
                        <p className="text-[10px] text-neutral-500 flex items-center gap-1.5 mt-1"><Calendar size={10} /> {new Date(oc.windowStart).toLocaleDateString()}</p>
                      </div>
                      {isAuthed && myTeams.length > 0 && (
                        <button
                          onClick={() => {
                            setSelectedChallengeToAccept(oc);
                            setShowAcceptSheet(true);
                          }}
                          className="mt-3.5 w-full py-2 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                        >
                          {t('accept')}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Spotlight Tournament Card */}
            {dbData.discover.tournament && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 px-1">Spotlight Event</p>
                <div
                  onClick={() => router.push(`/${locale}/tournaments`)}
                  className="bg-neutral-950 border border-white/5 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:border-[#00ff41]/25 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                    <Trophy size={18} className="text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white truncate">{dbData.discover.tournament.name}</p>
                    <p className="text-[9px] text-yellow-400 font-black uppercase tracking-wider mt-0.5">{translateVariant(dbData.discover.tournament.sport)} · {dbData.discover.tournament.status.replace('_', ' ')}</p>
                  </div>
                  <ChevronRight size={16} className="text-neutral-500" />
                </div>
              </div>
            )}

            {/* Mini Leaderboard Teaser */}
            {dbData.discover.leaderboard?.length > 0 && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2 px-1">{t('topTeams')}</p>
                <div className="bg-neutral-950 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                  {dbData.discover.leaderboard.map((team: any, index: number) => (
                    <div key={team.id} className="flex items-center gap-3.5 justify-between">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-black text-neutral-500 w-3">{index + 1}</span>
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center shrink-0">
                          {team.logoUrl ? <img src={team.logoUrl} className="w-full h-full object-cover" alt="" /> : <Shield size={10} className="text-neutral-400" />}
                        </div>
                        <span className="text-xs font-black truncate max-w-[150px] text-neutral-300">{team.name}</span>
                      </div>
                      <span className="text-xs font-black text-[#00ff41]">{formatNumber(team.teamMmr)} MMR</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ── Arena Tab Navigation ── */}
        <div className="flex gap-2 border-b border-white/5 pb-1 pt-2">
          <button
            onClick={() => setArenaTab('dashboard')}
            className={`px-4 py-2 rounded-full text-xs font-black transition-all ${
              arenaTab === 'dashboard'
                ? 'bg-[#00ff41] text-black shadow-[0_0_20px_rgba(0,255,65,0.15)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setArenaTab('academy')}
            className={`px-4 py-2 rounded-full text-xs font-black transition-all flex items-center gap-1.5 ${
              arenaTab === 'academy'
                ? 'bg-[#00ff41] text-black shadow-[0_0_20px_rgba(0,255,65,0.15)]'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Trophy size={11} /> Academy
          </button>
        </div>

        {/* ── Academy Discovery Tab ── */}
        {arenaTab === 'academy' && (
          <AcademyDiscoverTab locale={locale} isAuthed={isAuthed} />
        )}

      </div>

      {/* ── Extended Floating Action Button (FAB) ── */}
      {isAuthed && myTeams.length > 0 && (
        <button
          onClick={() => setShowPostSheet(true)}
          className="fixed bottom-24 right-5 z-50 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black flex items-center gap-2 px-5 py-3.5 rounded-full shadow-[0_0_30px_rgba(0,255,65,0.2)] hover:brightness-105 active:scale-95 transition-all"
        >
          <Plus size={18} strokeWidth={3} />
          <span className="text-xs uppercase tracking-wider">{t('postChallenge')}</span>
        </button>
      )}

      {/* ── 1. POST OPEN CHALLENGE BOTTOM SHEET ── */}
      {showPostSheet && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-[#111318] rounded-t-3xl border-t border-white/10 p-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <h2 className="text-base font-black text-white">{t('postChallenge')}</h2>
                <p className="text-[11px] text-neutral-500 mt-0.5">Let any eligible team accept your open match proposal.</p>
              </div>
              <button
                onClick={() => setShowPostSheet(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:bg-white/10"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handlePostOpenChallenge} className="flex flex-col gap-3.5 overflow-y-auto pr-1">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Select Team *</span>
                <select name="teamId" className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#00ff41]/50 text-white font-bold cursor-pointer">
                  {myTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Match Format *</span>
                <select name="format" className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#00ff41]/50 text-white font-bold cursor-pointer">
                  <option value="FUTSAL_5">5v5 Futsal</option>
                  <option value="FUTSAL_6">6v6 Futsal</option>
                  <option value="FUTSAL_7">7v7 Futsal</option>
                  <option value="CRICKET_7">7v7 Cricket</option>
                  <option value="CRICKET_FULL">11v11 Cricket</option>
                  <option value="FOOTBALL_FULL">11v11 Football</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Location Area *</span>
                <input name="area" placeholder="e.g. Uttara" type="text" required className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#00ff41]/50 text-white font-bold" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">Start Window *</span>
                  <input name="windowStart" type="datetime-local" required className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#00ff41]/50 text-white font-bold cursor-pointer" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase">End Window *</span>
                  <input name="windowEnd" type="datetime-local" required className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#00ff41]/50 text-white font-bold cursor-pointer" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Notes (Optional)</span>
                <textarea name="note" rows={2} placeholder="Add any details, budget preference, level requirement…" className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#00ff41]/50 text-white font-bold resize-none" />
              </div>

              <button
                type="submit"
                disabled={submittingPost}
                className="w-full py-3.5 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 transition-all mt-2 active:scale-95 disabled:opacity-50"
              >
                {submittingPost ? <Loader2 size={14} className="animate-spin" /> : 'Publish Open Challenge'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── 2. ACCEPT OPEN CHALLENGE CONFIRMATION SHEET ── */}
      {showAcceptSheet && selectedChallengeToAccept && (
        <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-[#111318] rounded-t-3xl border-t border-white/10 p-5 max-h-[50vh] flex flex-col">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <h2 className="text-base font-black text-white">Accept Open Challenge</h2>
                <p className="text-[11px] text-neutral-500 mt-0.5">Select one of your teams to accept the challenge from {selectedChallengeToAccept.team.name}.</p>
              </div>
              <button
                onClick={() => {
                  setShowAcceptSheet(false);
                  setSelectedChallengeToAccept(null);
                }}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:bg-white/10"
              >
                &times;
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-neutral-500 uppercase">Your Accepting Team</span>
                <select
                  value={acceptingTeamId}
                  onChange={e => setAcceptingTeamId(e.target.value)}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#00ff41]/50 text-white font-bold cursor-pointer"
                >
                  {myTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div className="p-3 bg-neutral-950 border border-white/5 rounded-xl text-xs space-y-1 text-neutral-400">
                <p><span className="font-bold text-neutral-300">Format:</span> {translateVariant(selectedChallengeToAccept.format)}</p>
                <p><span className="font-bold text-neutral-300">Preferred Area:</span> {selectedChallengeToAccept.area}</p>
                {selectedChallengeToAccept.note && <p><span className="font-bold text-neutral-300">Opponent Note:</span> "{selectedChallengeToAccept.note}"</p>}
              </div>

              <button
                onClick={handleAcceptOpenChallenge}
                disabled={submittingAccept}
                className="w-full py-3.5 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black text-xs uppercase rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                {submittingAccept ? <Loader2 size={14} className="animate-spin" /> : 'Confirm Accept'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
