'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Swords, Users, Trophy, ArrowLeftRight, BarChart2,
  Plus, User, ChevronRight, Shield, Video
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function ArenaPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'en';
  const t = useTranslations('Arena');

  const [mounted, setMounted] = useState(false);
  const [avatar, setAvatar] = useState('');
  const [initials, setInitials] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);

  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<{ received: any[]; upcoming: any[] }>({ received: [], upcoming: [] });
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Parse cookies on client
    const getCookie = (name: string) => {
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? decodeURIComponent(match[2]) : '';
    };

    const auth = document.cookie.includes('bmt_auth=');
    const role = getCookie('bmt_role');
    const currentlyAuthed = auth && (!role || role === 'player');
    setIsAuthed(currentlyAuthed);

    if (currentlyAuthed) {
      const name = getCookie('bmt_name') || '';
      setInitials(name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'P');
      const pid = getCookie('bmt_player_id');
      if (pid) {
        fetch(`/api/bmt/players/${pid}`)
          .then(r => r.json())
          .then(d => { if (d?.avatarUrl || d?.avatarBase64) setAvatar(d.avatarUrl || d.avatarBase64); })
          .catch(() => {});
      }
    }

    Promise.all([
      fetch('/api/interact/market').then(r => r.json()).catch(() => ({ myTeams: [] })),
      fetch('/api/interact/challenge').then(r => r.json()).catch(() => ({ received: [], upcoming: [] })),
      fetch('/api/arena/tournaments').then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([market, ch, tour]) => {
      setMyTeams(market.myTeams || []);
      setChallenges({ received: ch.received || [], upcoming: ch.upcoming || [] });
      setTournaments((tour.data || []).slice(0, 3));
      setLoading(false);
    });
    setMounted(true);
  }, []);

  const pendingReceived = challenges.received.filter((c: any) => c.status === 'PENDING').length;
  const liveMatches = challenges.upcoming.filter((c: any) => c.status === 'LIVE').length;
  const activeTournaments = tournaments.filter(t => t.status === 'ACTIVE').length;

  const formatNumber = (num: number | string) => {
    if (locale === 'bn') {
      const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
      return String(num).replace(/[0-9]/g, (w) => banglaDigits[+w]);
    }
    return String(num);
  };

  const translateVariant = (variant: string) => {
    if (locale === 'bn') {
      const map: Record<string, string> = {
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
      return map[variant] ?? variant;
    }
    const mapEn: Record<string, string> = {
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
    return mapEn[variant] ?? variant;
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords size={20} className="text-fuchsia-400" />
          <h1 className="font-black text-xl tracking-tight">{t('title')}</h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/profile"
            className="w-10 h-10 rounded-full bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors shadow-sm overflow-hidden"
          >
            {isAuthed ? (
              avatar ? (
                <img src={avatar} className="w-full h-full object-cover" alt="Profile" />
              ) : (
                <span className="text-xs font-black text-accent">{initials}</span>
              )
            ) : (
              <User size={18} className="text-[var(--muted)]" />
            )}
          </Link>
        </div>
      </header>

      <div className="px-4 pt-5 flex flex-col gap-4">

        {/* ── Hero: Challenge Market ── */}
        <button
          onClick={() => router.push(`/${locale}/interact`)}
          className="relative w-full rounded-3xl overflow-hidden border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-950/80 via-purple-900/60 to-zinc-900 p-6 text-left group hover:border-fuchsia-400/50 transition-all active:scale-[0.99] shadow-[0_0_40px_rgba(168,85,247,0.12)]"
        >
          <div className="absolute right-6 top-0 bottom-0 flex items-center opacity-30 group-hover:opacity-50 transition-opacity pointer-events-none">
            <div className="w-40 h-40 rounded-full bg-fuchsia-500 blur-3xl" />
          </div>
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center">
                <Swords size={22} className="text-fuchsia-300" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-fuchsia-400/70 mb-1">{t('competitive')}</p>
                <h2 className="text-2xl font-black text-white leading-tight">{t('challengeMarket')}</h2>
                <p className="text-sm text-fuchsia-200/60 mt-1 max-w-[200px] leading-relaxed">{t('challengeMarketDesc')}</p>
              </div>
              {pendingReceived > 0 && (
                <div className="inline-flex items-center gap-2 bg-fuchsia-500/20 border border-fuchsia-500/30 rounded-full px-3 py-1.5 w-fit">
                  <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse" />
                  <span className="text-xs font-black text-fuchsia-300">
                    {t('challengesWaiting', { count: formatNumber(pendingReceived) })}
                  </span>
                </div>
              )}
              {liveMatches > 0 && (
                <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-full px-3 py-1.5 w-fit">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                  <span className="text-xs font-black text-red-300">{formatNumber(liveMatches)} {t('live')}</span>
                </div>
              )}
            </div>
            <ChevronRight size={22} className="text-fuchsia-400/40 group-hover:text-fuchsia-400 transition-colors mt-1 shrink-0" />
          </div>
          <div className="relative z-10 mt-5 pt-4 border-t border-fuchsia-500/20 flex items-center gap-5">
            <div className="flex flex-col">
              <span className="text-[10px] text-fuchsia-400/50 font-bold uppercase tracking-wider">{t('myTeams')}</span>
              <span className="font-black text-lg text-white">{loading ? '—' : formatNumber(myTeams.length)}</span>
            </div>
            <div className="w-px h-8 bg-fuchsia-500/20" />
            <div className="flex flex-col">
              <span className="text-[10px] text-fuchsia-400/50 font-bold uppercase tracking-wider">{t('activeMatches')}</span>
              <span className="font-black text-lg text-white">
                {loading ? '—' : formatNumber(challenges.upcoming.filter((c: any) => ['LIVE', 'SCHEDULED', 'SCORE_ENTRY'].includes(c.status)).length)}
              </span>
            </div>
            <div className="ml-auto">
              <span className="text-[11px] font-black text-fuchsia-300 bg-fuchsia-500/10 border border-fuchsia-500/20 px-3 py-1.5 rounded-full">{t('openArena')}</span>
            </div>
          </div>
        </button>

        {/* ── Tournaments Hero Bento (LIVE DATA) ── */}
        <button
          onClick={() => router.push(`/${locale}/tournaments`)}
          className="relative w-full rounded-3xl overflow-hidden border border-yellow-500/30 bg-gradient-to-br from-yellow-950/60 via-amber-900/40 to-zinc-900 p-6 text-left group hover:border-yellow-400/50 transition-all active:scale-[0.99] shadow-[0_0_40px_rgba(234,179,8,0.08)]"
        >
          <div className="absolute right-4 top-0 bottom-0 flex items-center opacity-20 group-hover:opacity-30 transition-opacity pointer-events-none">
            <div className="w-48 h-48 rounded-full bg-yellow-500 blur-3xl" />
          </div>
          <div className="relative z-10 flex items-start justify-between mb-5">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center">
                <Trophy size={22} className="text-yellow-300" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400/70 mb-1">{t('officialEvents')}</p>
                <h2 className="text-2xl font-black text-white leading-tight">{t('tournaments')}</h2>
                <p className="text-sm text-yellow-200/50 mt-1">{t('tournamentsDesc')}</p>
              </div>
              {activeTournaments > 0 && (
                <div className="inline-flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full px-3 py-1.5 w-fit">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-xs font-black text-yellow-300">
                    {t('activeNow', { count: formatNumber(activeTournaments) })}
                  </span>
                </div>
              )}
            </div>
            <ChevronRight size={22} className="text-yellow-400/40 group-hover:text-yellow-400 transition-colors mt-1 shrink-0" />
          </div>

          {/* Live tournament mini-list */}
          <div className="relative z-10 pt-4 border-t border-yellow-500/20">
            {!loading && tournaments.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {tournaments.map(tour => {
                  const variantLabel = translateVariant(tour.formatConfig?.sportVariant || tour.sport);
                  return (
                    <div key={tour.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                          <Trophy size={14} className="text-yellow-400" />
                        </div>
                        <div>
                          <p className="text-sm font-black text-white truncate max-w-[160px]">{tour.name}</p>
                          <p className="text-[10px] text-yellow-400/50 font-bold uppercase">
                            {variantLabel} · {tour.entryFee > 0 ? t('entryFee', { fee: formatNumber(tour.entryFee) }) : t('freeEntry')}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full shrink-0 ${
                        tour.status === 'ACTIVE' ? 'bg-[#00ff41]/20 text-[#00ff41]' :
                        tour.status === 'REGISTRATION_OPEN' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-neutral-800 text-neutral-400'
                      }`}>
                        {tour.status === 'REGISTRATION_OPEN' ? t('open') : tour.status === 'ACTIVE' ? t('liveStatus') : tour.status.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : !loading ? (
              <p className="text-xs text-yellow-400/40 font-bold text-center py-1">{t('noTournaments')}</p>
            ) : (
              <div className="h-6 bg-yellow-500/10 rounded animate-pulse" />
            )}
          </div>
        </button>

        {/* ── Middle Row: My Teams + Play with Friends ── */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push(`/${locale}/teams`)}
            className="relative rounded-3xl bg-zinc-900 border border-white/10 p-5 text-left group hover:border-accent/30 hover:bg-zinc-900/80 transition-all active:scale-[0.98] shadow-lg flex flex-col gap-4 min-h-[180px]"
          >
            <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Shield size={18} className="text-accent" />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <p className="font-black text-base text-white leading-tight">{t('myTeams')}</p>
              {!loading && myTeams.length > 0 ? (
                <div className="flex flex-col gap-1.5 mt-1">
                  {myTeams.slice(0, 2).map((team: any) => (
                    <div key={team.id} className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-neutral-800 border border-white/10 overflow-hidden flex-shrink-0">
                        {team.logoUrl ? <img src={team.logoUrl} className="w-full h-full object-cover" alt="" /> : <Shield size={8} className="m-auto text-accent" />}
                      </div>
                      <span className="text-[11px] text-[var(--muted)] truncate font-medium">{team.name}</span>
                    </div>
                  ))}
                  {myTeams.length > 2 && (
                    <span className="text-[10px] text-[var(--muted)] opacity-60">
                      +{formatNumber(myTeams.length - 2)} {locale === 'bn' ? 'টি আরও' : 'more'}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[var(--muted)] opacity-60 mt-1">{t('manageSquads')}</p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-accent">{loading ? '—' : formatNumber(myTeams.length)}</span>
              <ChevronRight size={16} className="text-accent/40 group-hover:text-accent transition-colors" />
            </div>
          </button>

          <button
            onClick={() => router.push(`/${locale}/play`)}
            className="relative rounded-3xl bg-zinc-900 border border-white/10 p-5 text-left group hover:border-cyan-500/30 hover:bg-zinc-900/80 transition-all active:scale-[0.98] shadow-lg flex flex-col gap-4 min-h-[180px] overflow-hidden"
          >
            <div className="absolute bottom-0 right-0 w-20 h-20 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center relative z-10">
              <Users size={18} className="text-cyan-400" />
            </div>
            <div className="flex flex-col gap-1 flex-1 relative z-10">
              <p className="font-black text-base text-white leading-tight">{t('playWithFriends')}</p>
              <p className="text-xs text-[var(--muted)] opacity-60 mt-1">{t('playWithFriendsDesc')}</p>
            </div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[11px] text-cyan-400/70 font-black bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-full">{t('newBadge')}</span>
              <ChevronRight size={16} className="text-cyan-500/40 group-hover:text-cyan-400 transition-colors" />
            </div>
          </button>
        </div>

        {/* ── Highlights & Reels ── */}
        <button
          onClick={() => router.push(`/${locale}/interact/reels`)}
          className="w-full rounded-3xl bg-zinc-900 border border-white/10 p-5 text-left group hover:border-[#00ff41]/30 transition-all active:scale-[0.99] flex items-center gap-5 overflow-hidden relative"
        >
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#00ff41]/5 to-transparent pointer-events-none" />
          <div className="w-12 h-12 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/20 flex items-center justify-center shrink-0">
            <Video size={20} className="text-[#00ff41]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-base text-white">{t('highlights')}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">{t('highlightsDesc')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-[#00ff41]/70 font-black bg-[#00ff41]/10 border border-[#00ff41]/20 px-2 py-1 rounded-full">{t('watch')}</span>
            <ChevronRight size={16} className="text-[#00ff41]/40 group-hover:text-[#00ff41] transition-colors" />
          </div>
        </button>

        {/* Transfer Market */}
        <button
          onClick={() => router.push(`/${locale}/interact?tab=transfer`)}
          className="w-full rounded-3xl bg-zinc-900 border border-white/10 p-5 text-left group hover:border-blue-500/30 transition-all active:scale-[0.99] flex items-center gap-5 overflow-hidden relative"
        >
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <ArrowLeftRight size={20} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-base text-white">{t('transferMarket')}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">{t('transferMarketDesc')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-blue-400/70 font-black bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-full">{t('browse')}</span>
            <ChevronRight size={16} className="text-blue-500/40 group-hover:text-blue-400 transition-colors" />
          </div>
        </button>

        {/* Leaderboards */}
        <button
          onClick={() => router.push(`/${locale}/leaderboard`)}
          className="w-full rounded-3xl bg-zinc-900 border border-white/10 p-5 text-left group hover:border-orange-500/30 transition-all active:scale-[0.99] flex items-center gap-5 overflow-hidden relative"
        >
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-orange-500/5 to-transparent pointer-events-none" />
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
            <BarChart2 size={20} className="text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-base text-white">{t('leaderboards')}</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">{t('leaderboardsDesc')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-orange-400/70 font-black bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-full">{t('viewAll')}</span>
            <ChevronRight size={16} className="text-orange-500/40 group-hover:text-orange-400 transition-colors" />
          </div>
        </button>

      </div>

      {/* ── Floating Action Button ── */}
      <button
        onClick={() => router.push(`/${locale}/teams?create=1`)}
        className="fixed bottom-24 right-5 z-50 w-14 h-14 rounded-full bg-accent text-black flex items-center justify-center shadow-[0_0_30px_rgba(0,255,65,0.4)] hover:brightness-110 active:scale-95 transition-all"
        title={t('createTeamTitle')}
      >
        <Plus size={24} strokeWidth={3} />
      </button>
    </div>
  );
}
