'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  ChevronLeft, BarChart2, Users, Shield, ChevronDown,
  Loader2, Trophy, Star
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getRankData, TIER_KEYS } from '@/lib/rankUtils';

// ─── Types ───────────────────────────────────────────────────────────────────

type MainTab = 'teams' | 'players';
type LeaderboardTab = 'sports' | 'organizer' | 'professional';
type ProCategory = 'ALL' | 'COACH' | 'REF' | 'TRAINER';

const SPORTS = [
  { key: 'ALL',      emoji: '🏆' },
  { key: 'FUTSAL',   emoji: '⚽' },
  { key: 'FOOTBALL', emoji: '⚽' },
  { key: 'CRICKET',  emoji: '🏏' },
];

const TIER_CONFIG: Record<string, { color: string; glow: string; icon: string }> = {
  ALL     : { color: '#ffffff', glow: '255,255,255', icon: '🏆' },
  Bronze  : { color: '#cd7f32', glow: '165,80,0',    icon: '' },
  Silver  : { color: '#c0c0c0', glow: '180,180,180', icon: '' },
  Gold    : { color: '#ffd700', glow: '200,160,0',   icon: '' },
  Platinum: { color: '#00e5ff', glow: '0,200,220',   icon: '' },
  Legend  : { color: '#ff00ff', glow: '200,0,200',   icon: '' },
};

// ─── Localizations (Bangla / English) ─────────────────────────────────────────

const l10n: Record<string, Record<string, string>> = {
  en: {
    sports: 'Sports',
    organizer: 'Organizer',
    professional: 'Professional',
    topOrganizers: 'Top Organizers',
    completedTourneys: 'completed tourneys',
    reviewsCount: 'reviews',
    writeReview: 'Write Review',
    rateOrganizer: 'Rate Tournament & Organizer',
    rateProfessional: 'Rate Professional',
    ratingLabel: 'Rating',
    commentLabel: 'Comment',
    submit: 'Submit Review',
    submitting: 'Submitting...',
    noReviews: 'No reviews yet. Be the first to review!',
    coaches: 'Coaches',
    referees: 'Referees',
    trainers: 'Trainers',
    all: 'All',
    experience: 'experience',
    joined: 'Joined',
    successHeader: 'Review submitted successfully!',
  },
  bn: {
    sports: 'খেলাধুলা',
    organizer: 'সংগঠক',
    professional: 'পেশাদার',
    topOrganizers: 'সেরা সংগঠকসমূহ',
    completedTourneys: 'টি সম্পন্ন টুর্নামেন্ট',
    reviewsCount: 'টি রিভিউ',
    writeReview: 'রিভিউ লিখুন',
    rateOrganizer: 'টুর্নামেন্ট ও সংগঠক রেট করুন',
    rateProfessional: 'পেশাদার রেট করুন',
    ratingLabel: 'রেটিং',
    commentLabel: 'মন্তব্য',
    submit: 'রিভিউ জমা দিন',
    submitting: 'জমা হচ্ছে...',
    noReviews: 'এখনও কোনো রিভিউ নেই। প্রথম রিভিউটি আপনি দিন!',
    coaches: 'কোচ',
    referees: 'রেফারি',
    trainers: 'ট্রেইনার',
    all: 'সব',
    experience: 'অভিজ্ঞতা',
    joined: 'যুক্ত হয়েছেন',
    successHeader: 'রিভিউ সফলভাবে জমা দেওয়া হয়েছে!',
  }
};

// ─── i18n Helpers ────────────────────────────────────────────────────────────

const translateSportLabel = (key: string, locale: string) => {
  if (locale === 'bn') {
    const map: Record<string, string> = {
      'ALL': 'সব খেলা',
      'FUTSAL': 'ফুটসাল',
      'FOOTBALL': 'ফুটবল',
      'CRICKET': 'ক্রিকেট',
      'FUTSAL_5': 'ফুটসাল',
      'FUTSAL_6': 'ফুটসাল',
      'FUTSAL_7': 'ফুটসাল',
      'FOOTBALL_FULL': 'ফুটবল',
      'CRICKET_7': 'ক্রিকেট',
      'CRICKET_FULL': 'ক্রিকেট',
    };
    return map[key] ?? key;
  }
  const mapEn: Record<string, string> = {
    'ALL': 'All Sports',
    'FUTSAL': 'Futsal',
    'FOOTBALL': 'Football',
    'CRICKET': 'Cricket',
    'FUTSAL_5': 'Futsal',
    'FUTSAL_6': 'Futsal',
    'FUTSAL_7': 'Futsal',
    'FOOTBALL_FULL': 'Football',
    'CRICKET_7': 'Cricket',
    'CRICKET_FULL': 'Cricket',
  };
  return mapEn[key] ?? key;
};

const translateTier = (t: string, locale: string) => {
  if (locale === 'bn') {
    const map: Record<string, string> = {
      'ALL': 'সব র‍্যাংক',
      'Bronze': 'ব্রোঞ্জ',
      'Silver': 'সিলভার',
      'Gold': 'গোল্ড',
      'Platinum': 'প্ল্যাটিনাম',
      'Legend': 'লেজেন্ড',
    };
    return map[t] ?? t;
  }
  return t === 'ALL' ? 'All Ranks' : t;
};

const translateRankLabel = (label: string, locale: string) => {
  if (locale === 'bn') {
    return label
      .replace('Bronze', 'ব্রোঞ্জ')
      .replace('Silver', 'সিলভার')
      .replace('Gold', 'গোল্ড')
      .replace('Platinum', 'প্ল্যাটিনাম')
      .replace('Legend', 'লেজেন্ড');
  }
  return label;
};

const formatNumber = (num: number | string, locale: string) => {
  if (locale === 'bn') {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/[0-9]/g, (w) => banglaDigits[+w]);
  }
  return String(num);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sportEmoji(s: string) {
  let key = s;
  if (s.startsWith('FUTSAL')) key = 'FUTSAL';
  else if (s.startsWith('FOOTBALL')) key = 'FOOTBALL';
  else if (s.startsWith('CRICKET')) key = 'CRICKET';
  return SPORTS.find(x => x.key === key)?.emoji ?? '🏆';
}

function rankIcon(tier: string) {
  const icons: Record<string, string> = {
    Bronze: '/ranks/Bronze.svg', Silver: '/ranks/Silver.svg',
    Gold: '/ranks/Gold.svg', Platinum: '/ranks/Platinum.svg', Legend: '/ranks/Legend.svg',
  };
  return icons[tier] ?? '';
}

const PODIUM_GLOW = ['rgba(255,215,0,0.3)', 'rgba(192,192,192,0.25)', 'rgba(205,127,50,0.2)'];
const PODIUM_LABEL = ['🥇', '🥈', '🥉'];

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

// ─── Slide-up Sheet ──────────────────────────────────────────────────────────

function Sheet({
  open, onClose, children
}: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-[#0e0e0e] border-t border-white/10 rounded-t-3xl p-5 pb-10 max-h-[80dvh] overflow-y-auto"
        style={{ animation: 'slideUp 0.25s cubic-bezier(0.32,0.72,0,1)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/20 rounded-full" />
        {children}
      </div>
      <style>{`@keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }`}</style>
    </div>
  );
}

// ─── Team Card ────────────────────────────────────────────────────────────────

function TeamCard({ team, rank, locale, t }: { team: any; rank: number; locale: string; t: any }) {
  const rd = getRankData(team.mmr);
  const top3 = rank <= 3;
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-all relative overflow-hidden"
      style={top3 ? { boxShadow: `0 0 20px ${PODIUM_GLOW[rank - 1]}`, borderColor: `rgba(255,255,255,0.1)` } : {}}
    >
      {team.isDisbanded && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-[0.5px] pointer-events-none z-10" />
      )}

      <div className="w-8 shrink-0 text-center relative z-20">
        {top3
          ? <span className="text-xl">{PODIUM_LABEL[rank - 1]}</span>
          : <span className="text-sm font-black text-neutral-500">#{formatNumber(rank, locale)}</span>}
      </div>

      <div className="w-11 h-11 rounded-xl overflow-hidden bg-neutral-800 border border-white/10 shrink-0 flex items-center justify-center relative z-20">
        {team.logoUrl
          ? <img src={team.logoUrl} className="w-full h-full object-cover" alt={team.name} />
          : <Shield size={18} className="text-neutral-500" />}
      </div>

      <div className="flex-1 min-w-0 relative z-20">
        <div className="flex items-center gap-2">
          <p className="font-black text-sm truncate text-white">{team.name}</p>
          {team.isDisbanded && (
            <span className="shrink-0 text-[8px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/30 px-1.5 py-0.5 rounded-full animate-pulse">
              {t('disbanded')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[9px] text-neutral-500 font-bold">{sportEmoji(team.sportType)} {translateSportLabel(team.sportType, locale)}</span>
          <span className="text-[9px] text-neutral-600">·</span>
          <span className="text-[9px] text-neutral-500">{formatNumber(team.members, locale)} {t('members')}</span>
          <span className="text-[9px] text-neutral-600">·</span>
          <span className="text-[9px] text-neutral-500">{formatNumber(team.winRate, locale)}{t('winRate')}</span>
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1 relative z-20">
        <div className="flex items-center gap-1.5">
          {rankIcon(rd.tier) && (
            <img src={rankIcon(rd.tier)} className="w-5 h-5 object-contain" alt={rd.tier} />
          )}
          <span className="text-xs font-black" style={{ color: rd.color }}>{translateRankLabel(rd.label, locale)}</span>
        </div>
        <span className="text-[10px] font-bold text-neutral-400">{formatNumber(team.mmr, locale)} MMR</span>
      </div>
    </div>
  );
}

// ─── Player Card ─────────────────────────────────────────────────────────────

function PlayerCard({ player, rank, locale, t }: { player: any; rank: number; locale: string; t: any }) {
  const rd = getRankData(player.mmr);
  const top3 = rank <= 3;
  const name     = player.fullName ?? player.name ?? '?';
  const initials = name.split(' ').map((w: string) => w[0] ?? '').join('').toUpperCase().slice(0, 2) || '?';
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-all"
      style={top3 ? { boxShadow: `0 0 20px ${PODIUM_GLOW[rank - 1]}`, borderColor: `rgba(255,255,255,0.1)` } : {}}
    >
      <div className="w-8 shrink-0 text-center">
        {top3
          ? <span className="text-xl">{PODIUM_LABEL[rank - 1]}</span>
          : <span className="text-sm font-black text-neutral-500">#{formatNumber(rank, locale)}</span>}
      </div>

      <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-800 border border-white/10 shrink-0 flex items-center justify-center">
        {player.avatarUrl
          ? <img src={player.avatarUrl} className="w-full h-full object-cover" alt={name} />
          : <span className="text-sm font-black text-accent">{getInitials(name)}</span>}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-black text-sm truncate text-white">{name}</p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {player.team ? (
            <div className="flex items-center gap-1">
              {player.team.logoUrl
                ? <img src={player.team.logoUrl} className="w-3 h-3 rounded-sm object-cover" />
                : <Shield size={8} className="text-neutral-500" />}
              <span className="text-[9px] text-neutral-400 font-bold truncate max-w-[80px]">{player.team.name}</span>
            </div>
          ) : (
            <span className="text-[9px] text-neutral-600 italic">{t('noTeam')}</span>
          )}
          {player.badges > 0 && (
            <>
              <span className="text-[9px] text-neutral-600">·</span>
              <span className="text-[9px] text-fuchsia-400 font-bold">💎 {formatNumber(player.badges, locale)} {t('badgesCount')}</span>
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          {rankIcon(rd.tier) && (
            <img src={rankIcon(rd.tier)} className="w-5 h-5 object-contain" alt={rd.tier} />
          )}
          <span className="text-xs font-black" style={{ color: rd.color }}>{translateRankLabel(rd.label, locale)}</span>
        </div>
        <span className="text-[10px] font-bold text-neutral-400">{formatNumber(player.mmr, locale)} MMR</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const router   = useRouter();
  const pathname = usePathname();
  const locale   = pathname.split('/')[1] || 'en';
  const t        = useTranslations('Leaderboard');
  const d        = l10n[locale] || l10n.en;

  // Active top-level tab: Sports, Organizer, Professional
  const [leaderboardTab, setLeaderboardTab] = useState<LeaderboardTab>('sports');

  // 1. Sports Tab States
  const [mainTab,  setMainTab]  = useState<MainTab>('teams');
  const [category, setCategory] = useState<'ranked' | 'tournament'>('ranked');
  const [sport, setSport] = useState('ALL');
  const [tier,  setTier]  = useState<string>('ALL');
  const [sportSheet, setSportSheet] = useState(false);
  const [tierSheet,  setTierSheet]  = useState(false);
  const [sportsData, setSportsData] = useState<any[]>([]);
  const [sportsLoading, setSportsLoading] = useState(true);

  // 2. Organizer Tab States
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [orgLoading, setOrgLoading] = useState(true);
  const [activeOrg, setActiveOrg] = useState<any | null>(null);
  const [orgReviewSheet, setOrgReviewSheet] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // 3. Professional Tab States
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [proLoading, setProLoading] = useState(true);
  const [proSubTab, setProSubTab] = useState<ProCategory>('ALL');
  const [activePro, setActivePro] = useState<any | null>(null);
  const [proReviewSheet, setProReviewSheet] = useState(false);
  const [newProRating, setNewProRating] = useState(5);
  const [newProComment, setNewProComment] = useState('');
  const [submittingProReview, setSubmittingProReview] = useState(false);
  const [proReviewError, setProReviewError] = useState('');
  const [proReviewSuccess, setProReviewSuccess] = useState(false);

  // Fetch Sports Data
  const loadSports = useCallback(async () => {
    setSportsLoading(true);
    try {
      const res = await fetch(
        `/api/leaderboard?type=${mainTab}&sport=${sport}&tier=${tier}&category=${category}`
      );
      const json = await res.json();
      setSportsData(json.leaderboard ?? []);
    } catch {
      setSportsData([]);
    }
    setSportsLoading(false);
  }, [mainTab, sport, tier, category]);

  // Fetch Organizers Data
  const loadOrganizers = useCallback(async () => {
    setOrgLoading(true);
    try {
      const res = await fetch('/api/leaderboard/organizers');
      const json = await res.json();
      setOrganizers(json.organizers ?? []);
    } catch {
      setOrganizers([]);
    }
    setOrgLoading(false);
  }, []);

  // Fetch Professionals Data
  const loadProfessionals = useCallback(async () => {
    setProLoading(true);
    try {
      const res = await fetch(`/api/leaderboard/professionals?category=${proSubTab}`);
      const json = await res.json();
      setProfessionals(json.professionals ?? []);
    } catch {
      setProfessionals([]);
    }
    setProLoading(false);
  }, [proSubTab]);

  useEffect(() => {
    if (leaderboardTab === 'sports') loadSports();
    if (leaderboardTab === 'organizer') loadOrganizers();
    if (leaderboardTab === 'professional') loadProfessionals();
  }, [leaderboardTab, loadSports, loadOrganizers, loadProfessionals]);

  // Handle Organizer Review Submit
  const handleOrgReviewSubmit = async () => {
    if (!activeOrg) return;
    setSubmittingReview(true);
    setReviewError('');
    setReviewSuccess(false);

    try {
      const res = await fetch('/api/leaderboard/organizers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizerId: activeOrg.id,
          rating: newRating,
          comment: newComment
        })
      });

      const json = await res.json();
      if (res.ok) {
        setReviewSuccess(true);
        setNewComment('');
        await loadOrganizers();
        // Refresh the currently open drawer info
        const updated = (await (await fetch('/api/leaderboard/organizers')).json()).organizers?.find((o: any) => o.id === activeOrg.id);
        if (updated) setActiveOrg(updated);
      } else {
        setReviewError(json.error || 'Failed to submit review.');
      }
    } catch {
      setReviewError('Network error. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Handle Professional Review Submit
  const handleProReviewSubmit = async () => {
    if (!activePro) return;
    setSubmittingProReview(true);
    setProReviewError('');
    setProReviewSuccess(false);

    try {
      const res = await fetch('/api/leaderboard/professionals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turfId: activePro.id,
          rating: newProRating,
          comment: newProComment
        })
      });

      const json = await res.json();
      if (res.ok) {
        setProReviewSuccess(true);
        setNewProComment('');
        await loadProfessionals();
        // Refresh currently open pro info
        const updated = (await (await fetch(`/api/leaderboard/professionals?category=${proSubTab}`)).json()).professionals?.find((p: any) => p.id === activePro.id);
        if (updated) setActivePro(updated);
      } else {
        setProReviewError(json.error || 'Failed to submit review.');
      }
    } catch {
      setProReviewError('Network error. Please try again.');
    } finally {
      setSubmittingProReview(false);
    }
  };

  const activeSport = SPORTS.find(s => s.key === sport) ?? SPORTS[0];
  const activeTier  = tier;
  const tierConf    = TIER_CONFIG[tier] ?? TIER_CONFIG.ALL;

  return (
    <div className="min-h-screen bg-[#080808] text-white pb-28 flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-md border-b border-white/5 px-4 pt-4 pb-3 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/${locale}/arena`)}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <BarChart2 size={18} className="text-orange-400" />
            <h1 className="font-black text-xl tracking-tight">{t('title')}</h1>
          </div>
        </div>

        {/* TOP LEVEL SEGMENTED TABS: Sports, Organizer, Professional */}
        <div className="flex gap-1.5 bg-white/5 border border-white/5 p-1 rounded-2xl shrink-0">
          {([
            { key: 'sports', label: d.sports },
            { key: 'organizer', label: d.organizer },
            { key: 'professional', label: d.professional }
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setLeaderboardTab(tab.key)}
              className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                leaderboardTab === tab.key
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-black shadow-[0_0_16px_rgba(249,115,22,0.3)]'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab-Specific Sub-headers */}
        {leaderboardTab === 'sports' && (
          <div className="flex flex-col gap-3">
            {/* Category Tabs: Ranked vs Tournament */}
            <div className="flex gap-2 bg-white/[0.02] border border-white/5 p-1 rounded-2xl shrink-0">
              {([
                { key: 'ranked', label: t('rankedArena') },
                { key: 'tournament', label: t('tournaments') }
              ] as const).map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    category === cat.key
                      ? 'bg-white/10 text-white shadow-md'
                      : 'text-neutral-500 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Main Tabs: Teams vs Players */}
            <div className="flex gap-2 bg-white/5 p-1 rounded-2xl">
              {(['teams', 'players'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setMainTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    mainTab === tab
                      ? 'bg-orange-500 text-black'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {tab === 'teams' ? <Shield size={12} /> : <Users size={12} />}
                  {t(tab)}
                </button>
              ))}
            </div>
          </div>
        )}

        {leaderboardTab === 'professional' && (
          /* Sub-tabs for professionals based on work type */
          <div className="flex gap-2 bg-white/5 p-1 rounded-2xl shrink-0">
            {([
              { key: 'ALL', label: d.all },
              { key: 'COACH', label: d.coaches },
              { key: 'REF', label: d.referees },
              { key: 'TRAINER', label: d.trainers }
            ] as const).map(sub => (
              <button
                key={sub.key}
                onClick={() => setProSubTab(sub.key)}
                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  proSubTab === sub.key
                    ? 'bg-orange-500 text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ── 1. SPORTS TAB CONTENT ──────────────────────────────────────────── */}
      {leaderboardTab === 'sports' && (
        <>
          {/* Filter Bar */}
          <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto scrollbar-none shrink-0">
            <button
              onClick={() => setSportSheet(true)}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-black border border-white/20 bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
            >
              <span>{activeSport.emoji}</span>
              <span className="text-white">{translateSportLabel(activeSport.key, locale)}</span>
              <ChevronDown size={11} className="text-neutral-400" />
            </button>

            <button
              onClick={() => setTierSheet(true)}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-black border bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
              style={{ borderColor: activeTier === 'ALL' ? 'rgba(255,255,255,0.2)' : tierConf.color, color: activeTier === 'ALL' ? '#fff' : tierConf.color }}
            >
              {activeTier !== 'ALL' && rankIcon(activeTier) && (
                <img src={rankIcon(activeTier)} className="w-4 h-4 object-contain" />
              )}
              {translateTier(activeTier, locale)}
              <ChevronDown size={11} className="opacity-60" />
            </button>
          </div>

          {/* Stats bar */}
          <div className="px-4 pb-3">
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">
              {sportsLoading ? (locale === 'bn' ? 'লোড হচ্ছে…' : 'Loading…') : `${formatNumber(sportsData.length, locale)} ${t(mainTab)} · ${translateSportLabel(activeSport.key, locale)} · ${translateTier(activeTier, locale)}`}
            </p>
          </div>

          {/* Sports List */}
          <div className="flex-1 px-4 flex flex-col gap-2">
            {sportsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 size={32} className="animate-spin text-orange-400" />
                <p className="text-neutral-500 text-sm">{t('loadingRankings')}</p>
              </div>
            ) : sportsData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Trophy size={40} className="text-neutral-700" />
                <p className="text-neutral-500 font-black">{t('noData')}</p>
                <p className="text-neutral-700 text-xs text-center">{t('noDataDesc')}</p>
              </div>
            ) : (
              <>
                {sportsData.length >= 3 && (
                  <div className="flex items-end justify-center gap-3 py-4 mb-2">
                    {/* 2nd */}
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <div className="w-14 h-14 rounded-full overflow-hidden border-4 border-[#c0c0c0]/50 bg-neutral-800 flex items-center justify-center shadow-[0_0_20px_rgba(192,192,192,0.2)]">
                        {mainTab === 'teams'
                          ? (sportsData[1].logoUrl ? <img src={sportsData[1].logoUrl} className="w-full h-full object-cover" /> : <Shield size={20} className="text-neutral-500" />)
                          : (sportsData[1].avatarUrl ? <img src={sportsData[1].avatarUrl} className="w-full h-full object-cover" /> : <span className="font-black text-lg text-neutral-400">{getInitials(sportsData[1].fullName ?? sportsData[1].name ?? '')}</span>)}
                      </div>
                      <span className="text-[10px] font-black text-neutral-400 truncate max-w-[70px] text-center">{sportsData[1].name ?? sportsData[1].fullName ?? '?'}</span>
                      <div className="bg-[#c0c0c0]/20 border border-[#c0c0c0]/30 rounded-t-xl px-3 py-3 text-center w-full">
                        <p className="text-xl font-black">🥈</p>
                        <p className="text-[9px] text-[#c0c0c0] font-black mt-0.5">{formatNumber(sportsData[1].mmr, locale)} MMR</p>
                      </div>
                    </div>
                    {/* 1st */}
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <div className="w-[4.5rem] h-[4.5rem] rounded-full overflow-hidden border-4 border-[#ffd700]/60 bg-neutral-800 flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.3)]">
                        {mainTab === 'teams'
                          ? (sportsData[0].logoUrl ? <img src={sportsData[0].logoUrl} className="w-full h-full object-cover" /> : <Shield size={24} className="text-neutral-500" />)
                          : (sportsData[0].avatarUrl ? <img src={sportsData[0].avatarUrl} className="w-full h-full object-cover" /> : <span className="font-black text-xl text-neutral-400">{getInitials(sportsData[0].fullName ?? sportsData[0].name ?? '')}</span>)}
                      </div>
                      <span className="text-[11px] font-black text-white truncate max-w-[80px] text-center">{sportsData[0].name ?? sportsData[0].fullName ?? '?'}</span>
                      <div className="bg-[#ffd700]/15 border border-[#ffd700]/30 rounded-t-xl px-3 py-4 text-center w-full">
                        <p className="text-2xl font-black">🥇</p>
                        <p className="text-[9px] text-[#ffd700] font-black mt-0.5">{formatNumber(sportsData[0].mmr, locale)} MMR</p>
                      </div>
                    </div>
                    {/* 3rd */}
                    <div className="flex flex-col items-center gap-2 flex-1">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-4 border-[#cd7f32]/40 bg-neutral-800 flex items-center justify-center shadow-[0_0_16px_rgba(205,127,50,0.2)]">
                        {mainTab === 'teams'
                          ? (sportsData[2].logoUrl ? <img src={sportsData[2].logoUrl} className="w-full h-full object-cover" /> : <Shield size={16} className="text-neutral-500" />)
                          : (sportsData[2].avatarUrl ? <img src={sportsData[2].avatarUrl} className="w-full h-full object-cover" /> : <span className="font-black text-base text-neutral-400">{getInitials(sportsData[2].fullName ?? sportsData[2].name ?? '')}</span>)}
                      </div>
                      <span className="text-[10px] font-black text-neutral-400 truncate max-w-[65px] text-center">{sportsData[2].name ?? sportsData[2].fullName ?? '?'}</span>
                      <div className="bg-[#cd7f32]/15 border border-[#cd7f32]/30 rounded-t-xl px-3 py-2.5 text-center w-full">
                        <p className="text-lg font-black">🥉</p>
                        <p className="text-[9px] text-[#cd7f32] font-black mt-0.5">{formatNumber(sportsData[2].mmr, locale)} MMR</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {(sportsData.length >= 3 ? sportsData.slice(3) : sportsData).map((item: any, i: number) => {
                    const rank = sportsData.length >= 3 ? i + 4 : i + 1;
                    return mainTab === 'teams'
                      ? <TeamCard key={item.id} team={item} rank={rank} locale={locale} t={t} />
                      : <PlayerCard key={item.id} player={item} rank={rank} locale={locale} t={t} />;
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ── 2. ORGANIZER TAB CONTENT ────────────────────────────────────────── */}
      {leaderboardTab === 'organizer' && (
        <div className="flex-1 px-4 flex flex-col gap-3 pt-4">
          <h2 className="text-xs font-black uppercase tracking-wider text-neutral-500 mb-2">{d.topOrganizers}</h2>

          {orgLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 size={32} className="animate-spin text-orange-400" />
              <p className="text-neutral-500 text-sm">{locale === 'bn' ? 'লোড হচ্ছে…' : 'Loading…'}</p>
            </div>
          ) : organizers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Trophy size={40} className="text-neutral-700" />
              <p className="text-neutral-500 font-black">{t('noData')}</p>
            </div>
          ) : (
            <>
              {/* Top Organizers Podium */}
              {organizers.length >= 3 && (
                <div className="flex items-end justify-center gap-3 py-4 mb-2">
                  {/* 2nd */}
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-4 border-[#c0c0c0]/50 bg-neutral-800 flex items-center justify-center shadow-[0_0_20px_rgba(192,192,192,0.2)]">
                      <span className="font-black text-lg text-neutral-400">{organizers[1].name[0]}</span>
                    </div>
                    <span className="text-[10px] font-black text-neutral-400 truncate max-w-[70px] text-center">{organizers[1].name}</span>
                    <div className="bg-[#c0c0c0]/20 border border-[#c0c0c0]/30 rounded-t-xl px-2 py-3 text-center w-full">
                      <p className="text-xl font-black">🥈</p>
                      <p className="text-[9px] text-[#c0c0c0] font-black mt-0.5">⭐ {organizers[1].averageRating}</p>
                    </div>
                  </div>
                  {/* 1st */}
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className="w-[4.5rem] h-[4.5rem] rounded-full overflow-hidden border-4 border-[#ffd700]/60 bg-neutral-800 flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.3)]">
                      <span className="font-black text-xl text-neutral-200">{organizers[0].name[0]}</span>
                    </div>
                    <span className="text-[11px] font-black text-white truncate max-w-[80px] text-center">{organizers[0].name}</span>
                    <div className="bg-[#ffd700]/15 border border-[#ffd700]/30 rounded-t-xl px-2 py-4 text-center w-full">
                      <p className="text-2xl font-black">🥇</p>
                      <p className="text-[9px] text-[#ffd700] font-black mt-0.5">⭐ {organizers[0].averageRating}</p>
                    </div>
                  </div>
                  {/* 3rd */}
                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-4 border-[#cd7f32]/40 bg-neutral-800 flex items-center justify-center shadow-[0_0_16px_rgba(205,127,50,0.2)]">
                      <span className="font-black text-base text-neutral-400">{organizers[2].name[0]}</span>
                    </div>
                    <span className="text-[10px] font-black text-neutral-400 truncate max-w-[65px] text-center">{organizers[2].name}</span>
                    <div className="bg-[#cd7f32]/15 border border-[#cd7f32]/30 rounded-t-xl px-2 py-2.5 text-center w-full">
                      <p className="text-lg font-black">🥉</p>
                      <p className="text-[9px] text-[#cd7f32] font-black mt-0.5">⭐ {organizers[2].averageRating}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Full Organizer List */}
              <div className="flex flex-col gap-2">
                {organizers.map((org, i) => {
                  const rank = i + 1;
                  return (
                    <div
                      key={org.id}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-all relative overflow-hidden"
                    >
                      <span className="w-8 shrink-0 text-center font-mono font-black text-xs text-neutral-500">
                        {rank <= 3 ? PODIUM_LABEL[rank - 1] : `#${formatNumber(rank, locale)}`}
                      </span>
                      <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center font-black text-sm text-orange-400">
                        {org.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-white truncate">{org.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-neutral-500 font-semibold">
                          <span>🏆 {formatNumber(org.completedCount, locale)} {d.completedTourneys}</span>
                          <span>·</span>
                          <span>💬 {formatNumber(org.totalReviews, locale)} {d.reviewsCount}</span>
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1">
                          <Star size={13} className="text-yellow-400 fill-yellow-400" />
                          <span className="text-sm font-black text-white">{org.averageRating}</span>
                        </div>
                        <button
                          onClick={() => {
                            setActiveOrg(org);
                            setNewRating(5);
                            setNewComment('');
                            setReviewError('');
                            setReviewSuccess(false);
                            setOrgReviewSheet(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-orange-500 text-black font-black text-[9px] uppercase tracking-wide hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                        >
                          {d.writeReview}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── 3. PROFESSIONAL TAB CONTENT ────────────────────────────────────── */}
      {leaderboardTab === 'professional' && (
        <div className="flex-1 px-4 flex flex-col gap-3 pt-4">
          {proLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 size={32} className="animate-spin text-orange-400" />
              <p className="text-neutral-500 text-sm">{locale === 'bn' ? 'লোড হচ্ছে…' : 'Loading…'}</p>
            </div>
          ) : professionals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Trophy size={40} className="text-neutral-700" />
              <p className="text-neutral-500 font-black">{t('noData')}</p>
            </div>
          ) : (
            <>
              {/* Top Professionals Podium */}
              {professionals.length >= 3 && (
                <div className="flex items-end justify-center gap-3 py-4 mb-2">
                  {/* 2nd */}
                  <div 
                    onClick={() => router.push(`/${locale}/turf/${professionals[1].id}`)}
                    className="flex flex-col items-center gap-2 flex-1 cursor-pointer group"
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden border-4 border-[#c0c0c0]/50 bg-neutral-800 flex items-center justify-center shadow-[0_0_20px_rgba(192,192,192,0.2)] group-hover:scale-105 transition-transform">
                      {professionals[1].logoUrl ? <img src={professionals[1].logoUrl} className="w-full h-full object-cover" /> : <span className="font-black text-lg text-neutral-400">{professionals[1].name[0]}</span>}
                    </div>
                    <span className="text-[10px] font-black text-neutral-400 truncate max-w-[70px] text-center group-hover:text-blue-400 transition-colors">{professionals[1].name}</span>
                    <div className="bg-[#c0c0c0]/20 border border-[#c0c0c0]/30 rounded-t-xl px-2 py-3 text-center w-full">
                      <p className="text-xl font-black">🥈</p>
                      <p className="text-[9px] text-[#c0c0c0] font-black mt-0.5">⭐ {professionals[1].averageRating}</p>
                    </div>
                  </div>
                  {/* 1st */}
                  <div 
                    onClick={() => router.push(`/${locale}/turf/${professionals[0].id}`)}
                    className="flex flex-col items-center gap-2 flex-1 cursor-pointer group"
                  >
                    <div className="w-[4.5rem] h-[4.5rem] rounded-full overflow-hidden border-4 border-[#ffd700]/60 bg-neutral-800 flex items-center justify-center shadow-[0_0_30px_rgba(255,215,0,0.3)] group-hover:scale-105 transition-transform">
                      {professionals[0].logoUrl ? <img src={professionals[0].logoUrl} className="w-full h-full object-cover" /> : <span className="font-black text-xl text-neutral-200">{professionals[0].name[0]}</span>}
                    </div>
                    <span className="text-[11px] font-black text-white truncate max-w-[80px] text-center group-hover:text-blue-400 transition-colors">{professionals[0].name}</span>
                    <div className="bg-[#ffd700]/15 border border-[#ffd700]/30 rounded-t-xl px-2 py-4 text-center w-full">
                      <p className="text-2xl font-black">🥇</p>
                      <p className="text-[9px] text-[#ffd700] font-black mt-0.5">⭐ {professionals[0].averageRating}</p>
                    </div>
                  </div>
                  {/* 3rd */}
                  <div 
                    onClick={() => router.push(`/${locale}/turf/${professionals[2].id}`)}
                    className="flex flex-col items-center gap-2 flex-1 cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden border-4 border-[#cd7f32]/40 bg-neutral-800 flex items-center justify-center shadow-[0_0_16px_rgba(205,127,50,0.2)] group-hover:scale-105 transition-transform">
                      {professionals[2].logoUrl ? <img src={professionals[2].logoUrl} className="w-full h-full object-cover" /> : <span className="font-black text-base text-neutral-400">{professionals[2].name[0]}</span>}
                    </div>
                    <span className="text-[10px] font-black text-neutral-400 truncate max-w-[65px] text-center group-hover:text-blue-400 transition-colors">{professionals[2].name}</span>
                    <div className="bg-[#cd7f32]/15 border border-[#cd7f32]/30 rounded-t-xl px-2 py-2.5 text-center w-full">
                      <p className="text-lg font-black">🥉</p>
                      <p className="text-[9px] text-[#cd7f32] font-black mt-0.5">⭐ {professionals[2].averageRating}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Full Professionals list */}
              <div className="flex flex-col gap-2">
                {professionals.map((pro, i) => {
                  const rank = i + 1;
                  return (
                    <div
                      key={pro.id}
                      className="flex items-center gap-3 p-3 rounded-2xl border border-white/5 bg-white/[0.03] hover:bg-white/[0.06] transition-all relative overflow-hidden"
                    >
                      <span className="w-8 shrink-0 text-center font-mono font-black text-xs text-neutral-500">
                        {rank <= 3 ? PODIUM_LABEL[rank - 1] : `#${formatNumber(rank, locale)}`}
                      </span>
                      
                      <div 
                        onClick={() => router.push(`/${locale}/turf/${pro.id}`)}
                        className="flex-1 min-w-0 flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-800 border border-white/10 shrink-0 flex items-center justify-center group-hover:border-blue-500/50 transition-colors">
                          {pro.logoUrl
                            ? <img src={pro.logoUrl} className="w-full h-full object-cover" alt="" />
                            : <span className="font-black text-sm text-blue-400">{pro.name[0]}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm text-white truncate group-hover:text-blue-400 transition-colors">{pro.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-neutral-500 font-semibold">
                            <span className="uppercase text-blue-400 font-bold text-[9px]">{pro.coachType}</span>
                            <span>·</span>
                            <span>📍 {pro.area}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1">
                          <Star size={13} className="text-yellow-400 fill-yellow-400" />
                          <span className="text-sm font-black text-white">{pro.averageRating}</span>
                          <span className="text-[10px] text-neutral-500">({formatNumber(pro.totalReviews, locale)})</span>
                        </div>
                        <button
                          onClick={() => {
                            setActivePro(pro);
                            setNewProRating(5);
                            setNewProComment('');
                            setProReviewError('');
                            setProReviewSuccess(false);
                            setProReviewSheet(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-orange-500 text-black font-black text-[9px] uppercase tracking-wide hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                        >
                          {d.writeReview}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── ORGANIZER REVIEW SLIDE SHEET ──────────────────────────────────── */}
      <Sheet open={orgReviewSheet} onClose={() => setOrgReviewSheet(false)}>
        {activeOrg && (
          <div className="flex flex-col gap-4 text-left">
            <div className="border-b border-white/10 pb-3">
              <h3 className="font-black text-lg text-white">{activeOrg.name}</h3>
              <p className="text-xs text-neutral-500 mt-1">{d.rateOrganizer}</p>
            </div>

            {/* List existing reviews */}
            <div className="max-h-[30vh] overflow-y-auto flex flex-col gap-2.5 mb-2 pr-1 hide-scrollbar">
              {activeOrg.reviews.length === 0 ? (
                <p className="text-xs text-neutral-600 italic py-4 text-center">{d.noReviews}</p>
              ) : (
                activeOrg.reviews.map((r: any) => (
                  <div key={r.id} className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white">{r.playerName}</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            size={10}
                            className={idx < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-700'}
                          />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-neutral-400 font-medium leading-relaxed">{r.comment}</p>}
                    <span className="text-[8px] text-neutral-600 mt-0.5">{new Date(r.createdAt).toLocaleDateString(locale)}</span>
                  </div>
                ))
              )}
            </div>

            {/* Write a review form */}
            <div className="border-t border-white/10 pt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{d.ratingLabel}</label>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const starVal = idx + 1;
                    return (
                      <button
                        key={idx}
                        onClick={() => setNewRating(starVal)}
                        className="transition-transform active:scale-90 hover:scale-110 cursor-pointer"
                      >
                        <Star
                          size={24}
                          className={starVal <= newRating ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-700'}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{d.commentLabel}</label>
                <textarea
                  placeholder="e.g. Flawless bracket, great venue selection, and extremely punctual..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  rows={2}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                />
              </div>

              {reviewError && (
                <div className="bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl text-xs text-red-400 font-bold">
                  {reviewError}
                </div>
              )}

              {reviewSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl text-xs text-emerald-400 font-bold">
                  {d.successHeader}
                </div>
              )}

              <button
                onClick={handleOrgReviewSubmit}
                disabled={submittingReview}
                className="w-full py-3.5 bg-orange-500 text-black font-black text-sm rounded-xl hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {submittingReview ? <Loader2 size={16} className="animate-spin" /> : d.submit}
              </button>
            </div>
          </div>
        )}
      </Sheet>

      {/* ─── PROFESSIONAL REVIEW SLIDE SHEET ────────────────────────────────── */}
      <Sheet open={proReviewSheet} onClose={() => setProReviewSheet(false)}>
        {activePro && (
          <div className="flex flex-col gap-4 text-left">
            <div className="border-b border-white/10 pb-3">
              <h3 className="font-black text-lg text-white">{activePro.name}</h3>
              <p className="text-xs text-neutral-500 mt-1">{d.rateProfessional}</p>
            </div>

            {/* List existing reviews */}
            <div className="max-h-[30vh] overflow-y-auto flex flex-col gap-2.5 mb-2 pr-1 hide-scrollbar">
              {activePro.reviews.length === 0 ? (
                <p className="text-xs text-neutral-600 italic py-4 text-center">{d.noReviews}</p>
              ) : (
                activePro.reviews.map((r: any) => (
                  <div key={r.id} className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-white">{r.playerName}</span>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            size={10}
                            className={idx < r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-700'}
                          />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-neutral-400 font-medium leading-relaxed">{r.comment}</p>}
                    <span className="text-[8px] text-neutral-600 mt-0.5">{new Date(r.createdAt).toLocaleDateString(locale)}</span>
                  </div>
                ))
              )}
            </div>

            {/* Write a review form */}
            <div className="border-t border-white/10 pt-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{d.ratingLabel}</label>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const starVal = idx + 1;
                    return (
                      <button
                        key={idx}
                        onClick={() => setNewProRating(starVal)}
                        className="transition-transform active:scale-90 hover:scale-110 cursor-pointer"
                      >
                        <Star
                          size={24}
                          className={starVal <= newProRating ? 'text-yellow-400 fill-yellow-400' : 'text-neutral-700'}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{d.commentLabel}</label>
                <textarea
                  placeholder="e.g. Excellent coaching, high patience level, and tailored routines..."
                  value={newProComment}
                  onChange={e => setNewProComment(e.target.value)}
                  rows={2}
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                />
              </div>

              {proReviewError && (
                <div className="bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl text-xs text-red-400 font-bold">
                  {proReviewError}
                </div>
              )}

              {proReviewSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl text-xs text-emerald-400 font-bold">
                  {d.successHeader}
                </div>
              )}

              <button
                onClick={handleProReviewSubmit}
                disabled={submittingProReview}
                className="w-full py-3.5 bg-orange-500 text-black font-black text-sm rounded-xl hover:brightness-110 disabled:opacity-60 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {submittingProReview ? <Loader2 size={16} className="animate-spin" /> : d.submit}
              </button>
            </div>
          </div>
        )}
      </Sheet>

      {/* ── Sport Sheet ────────────────────────────────────────────────────── */}
      <Sheet open={sportSheet} onClose={() => setSportSheet(false)}>
        <h3 className="font-black text-base mb-4 text-center">{t('selectSport')}</h3>
        <div className="flex flex-col gap-2">
          {SPORTS.map(s => (
            <button
              key={s.key}
              onClick={() => { setSport(s.key); setSportSheet(false); }}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                sport === s.key
                  ? 'bg-white/10 border-white/30 text-white'
                  : 'bg-white/[0.03] border-white/10 text-neutral-400 hover:border-white/20'
              }`}
            >
              <span className="text-2xl">{s.emoji}</span>
              <span className="font-black text-sm">{translateSportLabel(s.key, locale)}</span>
              {sport === s.key && <span className="ml-auto text-accent text-sm">✓</span>}
            </button>
          ))}
        </div>
      </Sheet>

      {/* ── Tier Sheet ─────────────────────────────────────────────────────── */}
      <Sheet open={tierSheet} onClose={() => setTierSheet(false)}>
        <h3 className="font-black text-base mb-4 text-center">{t('selectRank')}</h3>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => { setTier('ALL'); setTierSheet(false); }}
            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
              tier === 'ALL'
                ? 'bg-white/10 border-white/30 text-white'
                : 'bg-white/[0.03] border-white/10 text-neutral-400 hover:border-white/20'
            }`}
          >
            <span className="text-2xl">🏆</span>
            <span className="font-black text-sm">{translateTier('ALL', locale)}</span>
            {tier === 'ALL' && <span className="ml-auto text-accent text-sm">✓</span>}
          </button>

          {TIER_KEYS.map(tKey => {
            const conf = TIER_CONFIG[tKey];
            const icon = rankIcon(tKey);
            return (
              <button
                key={tKey}
                onClick={() => { setTier(tKey); setTierSheet(false); }}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  tier === tKey
                    ? 'bg-white/10 text-white'
                    : 'bg-white/[0.03] border-white/10 text-neutral-400 hover:border-white/20'
                }`}
                style={tier === tKey ? { borderColor: conf.color } : {}}
              >
                {icon
                  ? <img src={icon} className="w-8 h-8 object-contain" alt={tKey} />
                  : <span className="text-2xl">{conf.icon}</span>}
                <div className="flex flex-col">
                  <span className="font-black text-sm" style={{ color: conf.color }}>{translateTier(tKey, locale)}</span>
                  <span className="text-[9px] text-neutral-500 font-bold">
                    {formatNumber(({ Bronze:'0–674', Silver:'675–1349', Gold:'1350–2024', Platinum:'2025–2699', Legend:'2700+' } as Record<string,string>)[tKey], locale)} MMR
                  </span>
                </div>
                {tier === tKey && <span className="ml-auto text-accent text-sm">✓</span>}
              </button>
            );
          })}
        </div>
      </Sheet>

    </div>
  );
}
