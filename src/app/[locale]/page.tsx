import HomeHeader from '@/components/home/HomeHeader';
import HeroBanner from '@/components/home/HeroBanner';
import SearchBar from '@/components/home/SearchBar';
import SportsTurfSection from '@/components/home/SportsTurfSection';
import SponsorsBar from '@/components/home/SponsorsBar';
import JoinUsBentoSection from '@/components/home/JoinUsBentoSection';
import ProfessionalsSection from '@/components/home/ProfessionalsSection';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { Trophy, Shield, User, ChevronRight, Star, MapPin, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { getRankData } from '@/lib/rankUtils';

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200';
const FALLBACK_TURF = 'https://images.unsplash.com/photo-1518605368461-1ee18cd30f6b?auto=format&fit=crop&q=80';

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

const SPORT_LABELS: Record<string, string> = {
  FUTSAL: 'Futsal',
  FOOTBALL: 'Football',
  CRICKET: 'Cricket',
  FUTSAL_5: 'Futsal',
  FUTSAL_6: 'Futsal',
  FUTSAL_7: 'Futsal',
  FOOTBALL_FULL: 'Football',
  CRICKET_7: 'Cricket',
  CRICKET_FULL: 'Cricket',
};

const SPORT_EMOJIS: Record<string, string> = {
  FUTSAL: '⚽',
  FOOTBALL: '⚽',
  CRICKET: '🏏',
  FUTSAL_5: '⚽',
  FUTSAL_6: '⚽',
  FUTSAL_7: '⚽',
  FOOTBALL_FULL: '⚽',
  CRICKET_7: '🏏',
  CRICKET_FULL: '🏏',
};

export default async function RootPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Home' });

  const cookieStore = await cookies();
  const authCookie = cookieStore.get('bmt_auth');
  const roleCookie = cookieStore.get('bmt_role');
  const initialAuth = !!authCookie && (!roleCookie || roleCookie.value === 'player');
  const playerId = cookieStore.get('bmt_player_id')?.value || null;

  const [
    sports,
    turfs,
    bannerSlides,
    carouselSettings,
    sponsors,
    sponsorSettings,
    turfServiceSetting,
    tournaments,
    rawTopTeams,
    rawTopPlayers
  ] = await Promise.all([
    prisma.sport.findMany(),
    prisma.turf.findMany({
      where: { status: 'published' },
      include: {
        sports: { include: { sport: true } },
        grounds: { include: { slots: true } },
        city: true,
        division: true,
      },
    }),
    prisma.bannerSlide.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
    prisma.carouselSettings.findUnique({ where: { id: 'singleton' } }),
    prisma.sponsor.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
    prisma.sponsorSettings.findUnique({ where: { id: 'singleton' } }),
    prisma.turfServiceSetting.findUnique({ where: { id: 'singleton' } }),
    prisma.tournament.findMany({
      where: {
        OR: [
          { status: { not: 'DRAFT' } },
          { status: 'DRAFT', isRegistrationOpen: true },
          { status: 'DRAFT', registrationOpenAt: { not: null } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    prisma.team.findMany({
      where: { isDisbanded: false },
      orderBy: { footballMmr: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        logoUrl: true,
        sportType: true,
        footballMmr: true,
        cricketMmr: true,
        _count: { select: { members: true } }
      }
    }),
    prisma.player.findMany({
      orderBy: { footballMmr: 'desc' },
      take: 5,
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        footballMmr: true,
        cricketMmr: true,
        teamMemberships: {
          take: 1,
          select: {
            team: { select: { name: true } }
          }
        }
      }
    })
  ]);

  // Fetch player details if logged in
  let playerProfile = null;
  let primaryTeam = null;
  let primaryTeamCompletedCount = 0;
  let contextChip: {
    type: 'challenge' | 'booking' | 'notification';
    count?: number;
    date?: string;
    time?: string;
  } | null = null;

  if (initialAuth && playerId) {
    playerProfile = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        teamMemberships: {
          include: {
            team: {
              include: {
                homeAreas: true,
                _count: { select: { members: true } }
              }
            }
          }
        }
      }
    });

    if (playerProfile && playerProfile.teamMemberships.length > 0) {
      primaryTeam = playerProfile.teamMemberships[0].team;

      if (primaryTeam) {
        // Fetch completed matches count for primaryTeam
        primaryTeamCompletedCount = await prisma.match.count({
          where: {
            OR: [
              { teamA_Id: primaryTeam.id },
              { teamB_Id: primaryTeam.id }
            ],
            status: 'COMPLETED'
          }
        });

        // 1. Pending challenges count received by teamB_Id
        const pendingChallengesCount = await prisma.match.count({
          where: {
            teamB_Id: primaryTeam.id,
            status: 'PENDING'
          }
        });

        // 2. Next upcoming booking for the player (status: 'confirmed')
        const nowStr = new Date().toISOString().split('T')[0];
        const upcomingBooking = await prisma.booking.findFirst({
          where: {
            playerId: playerProfile.id,
            status: 'confirmed',
            date: { gte: nowStr }
          },
          orderBy: [
            { date: 'asc' },
            { slot: { startTime: 'asc' } }
          ],
          include: {
            slot: true
          }
        });

        // 3. Unread notifications count
        const unreadCount = await prisma.notification.count({
          where: {
            userId: playerProfile.id,
            read: false
          }
        });

        if (pendingChallengesCount > 0) {
          contextChip = {
            type: 'challenge',
            count: pendingChallengesCount
          };
        } else if (upcomingBooking) {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const dateObj = new Date(upcomingBooking.date);
          const dayName = days[dateObj.getDay()];
          
          let timeStr = upcomingBooking.slot.startTime;
          if (timeStr.toUpperCase().includes('PM') || timeStr.toUpperCase().includes('AM')) {
            const parts = timeStr.split(':');
            const hour = parseInt(parts[0], 10);
            const ampm = timeStr.toUpperCase().includes('PM') ? 'PM' : 'AM';
            timeStr = `${hour} ${ampm}`;
          } else {
            const parts = timeStr.split(':');
            let hour = parseInt(parts[0], 10);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            if (hour > 12) hour -= 12;
            if (hour === 0) hour = 12;
            timeStr = `${hour} ${ampm}`;
          }

          contextChip = {
            type: 'booking',
            date: dayName,
            time: timeStr
          };
        } else if (unreadCount > 0) {
          contextChip = {
            type: 'notification',
            count: unreadCount
          };
        }
      }
    }
  }

  // Build sportIds for each turf
  const turfsWithSportIds = turfs.map((t: any) => {
    let sportIds: string[] = t.sports.map((ts: any) => ts.sportId);

    if (sportIds.length === 0) {
      const slotSportNames = new Set<string>();
      t.grounds.forEach((g: any) =>
        g.slots.forEach((s: any) =>
          s.sports.forEach((n: string) => slotSportNames.add(n))
        )
      );

      sportIds = sports
        .filter((sp: any) =>
          [...slotSportNames].some((n: any) =>
            n.toLowerCase().includes(sp.name.toLowerCase()) ||
            sp.name.toLowerCase().includes(n.toLowerCase())
          )
        )
        .map((sp: any) => sp.id);
    }

    return { ...t, sportIds };
  });

  // Separate standard turfs and professional coach profiles
  const standardTurfs = turfsWithSportIds.filter((t: any) => !t.isCoachProfile);
  const professionals = turfsWithSportIds
    .filter((t: any) => t.isCoachProfile)
    .sort((a: any, b: any) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));

  // Map leaderboard models
  const topTeams = rawTopTeams.map(t => ({
    id: t.id,
    name: t.name,
    logoUrl: t.logoUrl,
    sportType: t.sportType,
    mmr: t.sportType?.includes('CRICKET') ? t.cricketMmr : t.footballMmr,
    members: t._count.members,
  })).sort((a, b) => b.mmr - a.mmr);

  const topPlayers = rawTopPlayers.map(p => ({
    id: p.id,
    fullName: p.fullName,
    avatarUrl: p.avatarUrl,
    mmr: Math.max(p.footballMmr, p.cricketMmr),
    teamName: p.teamMemberships[0]?.team?.name || null
  })).sort((a, b) => b.mmr - a.mmr);

  const isTimerActive = turfServiceSetting?.isActive ?? false;

  // Render Helpers
  const renderMerchBanner = () => (
    <div className="px-4">
      <Link 
        href={`/${locale}/shop`}
        className="group relative block w-full rounded-2xl transition-all duration-300 transform active:scale-95 active:translate-y-[1px] hover:-translate-y-[1px] cursor-pointer"
      >
        <div className="absolute inset-2 bg-[#00ff41]/25 blur-[15px] rounded-2xl -z-10 group-hover:bg-[#00ff41]/35 transition-all duration-300" />
        <div className="relative rounded-2xl border border-white/20 border-b-[6px] border-b-[#00ff41]/50 overflow-hidden shadow-[0_4px_15px_rgba(0,0,0,0.6),0_0_12px_rgba(0,255,65,0.12)] group-hover:shadow-[0_6px_25px_rgba(0,0,0,0.7),0_0_20px_rgba(0,255,65,0.25)] transition-all duration-300">
          <img 
            src="/fifa-merch-btn.png" 
            alt="FIFA 2026 Merch" 
            className="w-full h-auto object-cover group-hover:scale-[1.01] transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </div>
      </Link>
    </div>
  );

  const renderTournamentsSection = () => {
    if (tournaments.length === 0) return null;
    return (
      <section className="px-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Trophy size={16} className="text-yellow-400 animate-bounce" />
            <h3 className="text-base font-black tracking-tight text-white">{t('activeTournaments')}</h3>
          </div>
          <a href={`/${locale}/tournaments`} className="text-[10px] font-black text-yellow-400 uppercase tracking-widest flex items-center gap-0.5 hover:brightness-110">
            {t('viewAll')} <ChevronRight size={10} />
          </a>
        </div>

        <div className="flex gap-4 overflow-x-auto green-scrollbar pb-1 snap-x snap-mandatory">
          {tournaments.map((tItem: any) => {
            const cover = tItem.bannerImageUrl || FALLBACK_TURF;
            const isCompleted = tItem.status === 'COMPLETED';
            const isLive = tItem.status === 'ACTIVE' || tItem.status === 'LIVE';

            let statusLabel = t('open');
            let statusClass = 'bg-neutral-900 text-neutral-400 border border-white/5';
            if (isCompleted) {
              statusLabel = locale === 'bn' ? 'সম্পন্ন' : 'COMPLETED';
              statusClass = 'bg-neutral-800/40 text-neutral-500 border border-white/5';
            } else if (isLive) {
              statusLabel = t('live');
              statusClass = 'bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/20';
            } else {
              statusLabel = locale === 'bn' ? 'আসন্ন' : 'UPCOMING';
              statusClass = 'bg-[#00ff41]/5 text-accent/80 border border-accent/20';
            }

            return (
              <a
                key={tItem.id}
                href={`/${locale}/tournaments/${tItem.id}`}
                className={`shrink-0 w-[78vw] max-w-[310px] snap-start block active:scale-[0.98] transition-transform ${isCompleted ? 'opacity-60 grayscale-[30%]' : ''}`}
              >
                <div className={`relative rounded-2xl border bg-gradient-to-r from-yellow-950/20 to-neutral-900/40 p-4 flex gap-4 overflow-hidden group hover:border-yellow-400/40 transition-all min-h-[105px] ${isCompleted ? 'border-neutral-800' : 'border-yellow-500/20'}`}>
                  <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-yellow-500/5 to-transparent pointer-events-none" />
                  
                  {/* Image Thumbnail */}
                  <div className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 border relative ${isCompleted ? 'border-neutral-800' : 'border-yellow-500/20'}`}>
                    <img src={cover} alt={tItem.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/35" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs font-black text-white truncate leading-tight group-hover:text-yellow-200 transition-colors max-w-[125px]">
                          {tItem.name}
                        </h4>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${statusClass}`}>
                          {isLive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse mr-0.5" />
                          )}
                          {statusLabel}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-yellow-400/60 font-bold uppercase tracking-wider mt-1.5">
                        {SPORT_EMOJIS[tItem.sport] || '🏆'} {SPORT_LABELS[tItem.sport] || tItem.sport}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-yellow-500/10 pt-2.5 mt-2.5">
                      <span className="text-[9px] font-black text-white flex items-center gap-1">
                        💰 <span className="text-yellow-300">BDT {tItem.prizePoolTotal.toLocaleString()}</span>
                      </span>
                      <span className="text-[9px] font-black text-yellow-400 uppercase tracking-widest">
                        {tItem.entryFee > 0 ? `BDT ${tItem.entryFee}` : t('free')}
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </section>
    );
  };

  const renderLeaderboardSection = () => {
    if (topTeams.length === 0 && topPlayers.length === 0) return null;
    return (
      <section className="px-4 flex flex-col gap-3 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Trophy size={16} className="text-accent" />
            <h3 className="text-base font-black tracking-tight text-white">{t('leaderboardHighlights')}</h3>
          </div>
          <a href={`/${locale}/leaderboard`} className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-0.5 hover:brightness-110">
            {t('viewAll')} <ChevronRight size={10} />
          </a>
        </div>

        <div className="flex gap-4 overflow-x-auto green-scrollbar pb-1.5 snap-x snap-mandatory">
          {/* Card 1: Top Teams */}
          {topTeams.length > 0 && (
            <div className="shrink-0 w-[88vw] max-w-[350px] snap-start glass-panel border border-white/5 rounded-2xl p-4 flex flex-col gap-3 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-black text-accent uppercase tracking-wider flex items-center gap-1">
                  🛡️ {t('rankedSquads')}
                </span>
                <span className="text-[9px] font-bold text-neutral-500">{t('regularTeams')}</span>
              </div>
              <div className="flex flex-col gap-2">
                {topTeams.map((team, idx) => {
                  const isTop3 = idx < 3;
                  const rankColors = [
                    'bg-yellow-500/20 text-yellow-300 border-yellow-400/40 shadow-[0_0_10px_rgba(234,179,8,0.25)]',
                    'bg-zinc-400/20 text-zinc-300 border-zinc-400/40 shadow-[0_0_10px_rgba(161,161,170,0.2)]',
                    'bg-amber-700/20 text-amber-500 border-amber-600/40 shadow-[0_0_10px_rgba(180,83,9,0.2)]'
                  ];
                  const elevationClass = idx === 0 ? 'bg-yellow-500/[0.03] border-yellow-500/20 -translate-y-[1px]'
                    : idx === 1 ? 'bg-zinc-400/[0.02] border-zinc-400/20 -translate-y-[0.5px]'
                    : idx === 2 ? 'bg-amber-700/[0.02] border-amber-700/20 -translate-y-[0.5px]'
                    : 'bg-white/[0.01] border-white/5';

                  return (
                    <div key={team.id} className={`flex items-center gap-3 p-1.5 rounded-xl border transition-all ${elevationClass}`}>
                      {isTop3 ? (
                        <span className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-full text-[10px] font-black border ${rankColors[idx]}`}>
                          #{idx + 1}
                        </span>
                      ) : (
                        <span className="w-7 shrink-0 text-center font-mono font-black text-xs text-neutral-400">
                          #{idx + 1}
                        </span>
                      )}
                      <div className="w-7 h-7 rounded-lg overflow-hidden bg-neutral-800 border border-white/10 shrink-0 flex items-center justify-center">
                        {team.logoUrl ? (
                          <img src={team.logoUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-[9px] font-black text-accent">
                            {getInitials(team.name)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-xs text-white truncate leading-tight">{team.name}</p>
                        <p className="text-[9px] text-neutral-500 font-bold uppercase mt-0.5">
                          {SPORT_EMOJIS[team.sportType] || '⚽'} {SPORT_LABELS[team.sportType] || team.sportType}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {team.mmr === 1000 ? (
                          <span className="text-[9px] font-black text-neutral-400 bg-neutral-800 border border-white/5 px-2 py-0.5 rounded-full">
                            {t('greeting.calibrating', { count: 0 }).split(' · ')[0]}
                          </span>
                        ) : (
                          <span className="text-[9px] font-black text-accent bg-[#00ff41]/10 border border-[#00ff41]/25 px-2 py-0.5 rounded-full">
                            {team.mmr} MMR
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Card 2: Top Players */}
          {topPlayers.length > 0 && (
            <div className="shrink-0 w-[88vw] max-w-[350px] snap-start glass-panel border border-white/5 rounded-2xl p-4 flex flex-col gap-3 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-black text-accent uppercase tracking-wider flex items-center gap-1">
                  👑 {t('topCompetitors')}
                </span>
                <span className="text-[9px] font-bold text-neutral-500">{t('playerStandings')}</span>
              </div>
              <div className="flex flex-col gap-2">
                {topPlayers.map((player, idx) => {
                  const isTop3 = idx < 3;
                  const rankColors = [
                    'bg-yellow-500/20 text-yellow-300 border-yellow-400/40 shadow-[0_0_10px_rgba(234,179,8,0.25)]',
                    'bg-zinc-400/20 text-zinc-300 border-zinc-400/40 shadow-[0_0_10px_rgba(161,161,170,0.2)]',
                    'bg-amber-700/20 text-amber-500 border-amber-600/40 shadow-[0_0_10px_rgba(180,83,9,0.2)]'
                  ];
                  const elevationClass = idx === 0 ? 'bg-yellow-500/[0.03] border-yellow-500/20 -translate-y-[1px]'
                    : idx === 1 ? 'bg-zinc-400/[0.02] border-zinc-400/20 -translate-y-[0.5px]'
                    : idx === 2 ? 'bg-amber-700/[0.02] border-amber-700/20 -translate-y-[0.5px]'
                    : 'bg-white/[0.01] border-white/5';

                  return (
                    <div key={player.id} className={`flex items-center gap-3 p-1.5 rounded-xl border transition-all ${elevationClass}`}>
                      {isTop3 ? (
                        <span className={`w-7 h-7 shrink-0 flex items-center justify-center rounded-full text-[10px] font-black border ${rankColors[idx]}`}>
                          #{idx + 1}
                        </span>
                      ) : (
                        <span className="w-7 shrink-0 text-center font-mono font-black text-xs text-neutral-400">
                          #{idx + 1}
                        </span>
                      )}
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-neutral-800 border border-white/10 shrink-0 flex items-center justify-center">
                        {player.avatarUrl ? (
                          <img src={player.avatarUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-[9px] font-black text-accent">
                            {getInitials(player.fullName)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-xs text-white truncate leading-tight">{player.fullName}</p>
                        {player.teamName ? (
                          <p className="text-[9px] text-accent/60 font-bold uppercase mt-0.5 truncate">
                            {player.teamName}
                          </p>
                        ) : (
                          <p className="text-[9px] text-neutral-500 font-bold uppercase mt-0.5">
                            {t('freeAgent')}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        {player.mmr === 1000 ? (
                          <span className="text-[9px] font-black text-neutral-400 bg-neutral-800 border border-white/5 px-2 py-0.5 rounded-full">
                            {t('greeting.calibrating', { count: 0 }).split(' · ')[0]}
                          </span>
                        ) : (
                          <span className="text-[9px] font-black text-accent bg-[#00ff41]/10 border border-[#00ff41]/25 px-2 py-0.5 rounded-full">
                            {player.mmr} MMR
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24 pt-0 selection:bg-accent/30 selection:text-accent scrollbar-none">
      <div className="w-full max-w-md mx-auto relative flex flex-col gap-6">
        
        {/* 1. Header */}
        <HomeHeader initialAuth={initialAuth} />

        {initialAuth ? (
          /* ========================================================================= */
          /* LOGGED-IN (PLAYER WORKSPACE)                                              */
          /* ========================================================================= */
          <>
            {/* 1. Personal Greeting Strip */}
            {playerProfile && (
              <div className="px-4 pt-2 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Player Workspace</p>
                    <h2 className="text-lg font-black text-white leading-tight">
                      {(() => {
                        const bdTime = new Date(new Date().getTime() + 6 * 60 * 60 * 1000);
                        const hour = bdTime.getUTCHours();
                        const name = playerProfile.fullName?.split(' ')[0] || '';
                        if (hour >= 5 && hour < 12) {
                          return t('greeting.morning', { name });
                        } else if (hour >= 12 && hour < 17) {
                          return t('greeting.afternoon', { name });
                        } else {
                          return t('greeting.evening', { name });
                        }
                      })()}
                    </h2>
                  </div>

                  {contextChip && (
                    <div className="shrink-0">
                      {contextChip.type === 'challenge' && (
                        <span className="text-[9px] font-black text-accent bg-[#00ff41]/10 border border-[#00ff41]/25 px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(0,255,65,0.05)]">
                          {t('greeting.pendingChallenge', { count: contextChip.count ?? 0 })}
                        </span>
                      )}
                      {contextChip.type === 'booking' && (
                        <span className="text-[9px] font-black text-accent bg-[#00ff41]/10 border border-[#00ff41]/25 px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(0,255,65,0.05)]">
                          {t('greeting.upcomingBooking', { date: contextChip.date ?? '', time: contextChip.time ?? '' })}
                        </span>
                      )}
                      {contextChip.type === 'notification' && (
                        <span className="text-[9px] font-black text-accent bg-[#00ff41]/10 border border-[#00ff41]/25 px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(0,255,65,0.05)]">
                          {t('greeting.unreadNotifications', { count: contextChip.count ?? 0 })}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {primaryTeam ? (
                  <a 
                    href={`/${locale}/teams/${primaryTeam.id}`}
                    className="group block relative overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/50 hover:bg-neutral-900 p-3.5 flex items-center justify-between active:scale-[0.98] transition-all"
                  >
                    {(() => {
                      const mmr = primaryTeam.sportType?.includes('CRICKET') ? primaryTeam.cricketMmr : primaryTeam.footballMmr;
                      const isProv = primaryTeamCompletedCount < 3;
                      const rank = getRankData(mmr);
                      return (
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1" 
                          style={{ background: isProv ? '#00ff41' : rank.color }}
                        />
                      );
                    })()}

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {primaryTeam.logoUrl ? (
                          <img src={primaryTeam.logoUrl} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-black text-accent">{getInitials(primaryTeam.name)}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-black text-sm text-white group-hover:text-accent transition-colors leading-tight">{primaryTeam.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {(() => {
                            const mmr = primaryTeam.sportType?.includes('CRICKET') ? primaryTeam.cricketMmr : primaryTeam.footballMmr;
                            const isProv = primaryTeamCompletedCount < 3;
                            const rank = getRankData(mmr);
                            return (
                              <span className="text-[10px] font-bold text-neutral-400">
                                {isProv 
                                  ? t('greeting.calibrating', { count: primaryTeamCompletedCount })
                                  : `${rank.label} · ${mmr} MMR`
                                }
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-neutral-600 group-hover:text-accent transition-colors" />
                  </a>
                ) : (
                  <a 
                    href={`/${locale}/teams/create`}
                    className="group block relative overflow-hidden rounded-2xl border border-dashed border-accent/25 hover:border-accent/40 bg-[#00ff41]/5 hover:bg-[#00ff41]/10 p-3.5 flex items-center justify-between active:scale-[0.98] transition-all text-center"
                  >
                    <span className="text-xs font-black text-accent uppercase tracking-wider flex items-center gap-1.5 mx-auto">
                      {t('greeting.createTeamCTA')}
                    </span>
                  </a>
                )}
              </div>
            )}

            {/* 1. Hero Banner Carousel */}
            <HeroBanner
              slides={bannerSlides}
              settings={carouselSettings ?? { autoSlide: true, intervalMs: 3500 }}
            />

            {/* 2. Personal Greeting Strip */}
            {playerProfile && (
              <div className="px-4 pt-2 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Player Workspace</p>
                    <h2 className="text-lg font-black text-white leading-tight">
                      {(() => {
                        const bdTime = new Date(new Date().getTime() + 6 * 60 * 60 * 1000);
                        const hour = bdTime.getUTCHours();
                        const name = playerProfile.fullName?.split(' ')[0] || '';
                        if (hour >= 5 && hour < 12) {
                          return t('greeting.morning', { name });
                        } else if (hour >= 12 && hour < 17) {
                          return t('greeting.afternoon', { name });
                        } else {
                          return t('greeting.evening', { name });
                        }
                      })()}
                    </h2>
                  </div>

                  {contextChip && (
                    <div className="shrink-0">
                      {contextChip.type === 'challenge' && (
                        <span className="text-[9px] font-black text-accent bg-[#00ff41]/10 border border-[#00ff41]/25 px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(0,255,65,0.05)]">
                          {t('greeting.pendingChallenge', { count: contextChip.count ?? 0 })}
                        </span>
                      )}
                      {contextChip.type === 'booking' && (
                        <span className="text-[9px] font-black text-accent bg-[#00ff41]/10 border border-[#00ff41]/25 px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(0,255,65,0.05)]">
                          {t('greeting.upcomingBooking', { date: contextChip.date ?? '', time: contextChip.time ?? '' })}
                        </span>
                      )}
                      {contextChip.type === 'notification' && (
                        <span className="text-[9px] font-black text-accent bg-[#00ff41]/10 border border-[#00ff41]/25 px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(0,255,65,0.05)]">
                          {t('greeting.unreadNotifications', { count: contextChip.count ?? 0 })}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {primaryTeam ? (
                  <a 
                    href={`/${locale}/teams/${primaryTeam.id}`}
                    className="group block relative overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/50 hover:bg-neutral-900 p-3.5 flex items-center justify-between active:scale-[0.98] transition-all"
                  >
                    {(() => {
                      const mmr = primaryTeam.sportType?.includes('CRICKET') ? primaryTeam.cricketMmr : primaryTeam.footballMmr;
                      const isProv = primaryTeamCompletedCount < 3;
                      const rank = getRankData(mmr);
                      return (
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1" 
                          style={{ background: isProv ? '#00ff41' : rank.color }}
                        />
                      );
                    })()}

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {primaryTeam.logoUrl ? (
                          <img src={primaryTeam.logoUrl} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-black text-accent">{getInitials(primaryTeam.name)}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-black text-sm text-white group-hover:text-accent transition-colors leading-tight">{primaryTeam.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {(() => {
                            const mmr = primaryTeam.sportType?.includes('CRICKET') ? primaryTeam.cricketMmr : primaryTeam.footballMmr;
                            const isProv = primaryTeamCompletedCount < 3;
                            const rank = getRankData(mmr);
                            return (
                              <span className="text-[10px] font-bold text-neutral-400">
                                {isProv 
                                  ? t('greeting.calibrating', { count: primaryTeamCompletedCount })
                                  : `${rank.label} · ${mmr} MMR`
                                }
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-neutral-600 group-hover:text-accent transition-colors" />
                  </a>
                ) : (
                  <a 
                    href={`/${locale}/teams/create`}
                    className="group block relative overflow-hidden rounded-2xl border border-dashed border-accent/25 hover:border-accent/40 bg-[#00ff41]/5 hover:bg-[#00ff41]/10 p-3.5 flex items-center justify-between active:scale-[0.98] transition-all text-center"
                  >
                    <span className="text-xs font-black text-accent uppercase tracking-wider flex items-center gap-1.5 mx-auto">
                      {t('greeting.createTeamCTA')}
                    </span>
                  </a>
                )}
              </div>
            )}

            {/* 3. Search & Booking Section */}
            {isTimerActive ? (
              <SportsTurfSection
                initialSports={sports}
                initialTurfs={standardTurfs as any}
                turfServiceSetting={turfServiceSetting ?? { isActive: false, launchAt: null }}
              />
            ) : (
              <>
                <SearchBar turfs={standardTurfs as any} sports={sports} />
                <SportsTurfSection
                  initialSports={sports}
                  initialTurfs={standardTurfs as any}
                  turfServiceSetting={turfServiceSetting ?? { isActive: false, launchAt: null }}
                />
              </>
            )}

            {/* 4. Hire Professionals (after turf!) */}
            <ProfessionalsSection initialProfessionals={professionals as any} />

            {/* 5. Active Tournaments */}
            {renderTournamentsSection()}

            {/* 6. Leaderboard Highlights */}
            {renderLeaderboardSection()}

            {/* 7. Merch Banner */}
            {renderMerchBanner()}

            {/* 8. Partners + Join strips (Collapsed) */}
            <JoinUsBentoSection compact={true} />
            <SponsorsBar 
              key="sponsors-compact"
              sponsors={sponsors} 
              settings={sponsorSettings ?? { autoSlide: false, intervalMs: 3500 }} 
              compact={true}
            />
          </>
        ) : (
          /* ========================================================================= */
          /* LOGGED-OUT (LANDING MODE)                                                 */
          /* ========================================================================= */
          <>
            {/* 1. Hero Banner Carousel */}
            <HeroBanner
              slides={bannerSlides}
              settings={carouselSettings ?? { autoSlide: true, intervalMs: 3500 }}
            />

            {/* 2. Partners row */}
            <SponsorsBar 
              key="sponsors-full"
              sponsors={sponsors} 
              settings={sponsorSettings ?? { autoSlide: true, intervalMs: 3500 }} 
            />

            {/* 3. Join the Platform */}
            <JoinUsBentoSection />

            {/* 4. Search + Sports + Available Turfs */}
            {isTimerActive ? (
              <SportsTurfSection
                initialSports={sports}
                initialTurfs={standardTurfs as any}
                turfServiceSetting={turfServiceSetting ?? { isActive: false, launchAt: null }}
              />
            ) : (
              <>
                <SearchBar turfs={standardTurfs as any} sports={sports} />
                <SportsTurfSection
                  initialSports={sports}
                  initialTurfs={standardTurfs as any}
                  turfServiceSetting={turfServiceSetting ?? { isActive: false, launchAt: null }}
                />
              </>
            )}

            {/* 5. Hire Professionals (after turf!) */}
            <ProfessionalsSection initialProfessionals={professionals as any} />

            {/* 6. Tournaments */}
            {renderTournamentsSection()}

            {/* 7. Leaderboard */}
            {renderLeaderboardSection()}

            {/* 8. Merch Banner (moved below Leaderboard) */}
            {renderMerchBanner()}
          </>
        )}

      </div>
    </div>
  );
}
