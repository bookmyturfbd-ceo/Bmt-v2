import HomeHeader from '@/components/home/HomeHeader';
import HeroBanner from '@/components/home/HeroBanner';
import SearchBar from '@/components/home/SearchBar';
import SportsTurfSection from '@/components/home/SportsTurfSection';
import SponsorsBar from '@/components/home/SponsorsBar';
import JoinUsBentoSection from '@/components/home/JoinUsBentoSection';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { Trophy, Shield, User, ChevronRight, Star, MapPin, Sparkles } from 'lucide-react';
import Link from 'next/link';

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200';
const FALLBACK_TURF = 'https://images.unsplash.com/photo-1518605368461-1ee18cd30f6b?auto=format&fit=crop&q=80';

const SPORT_LABELS: Record<string, string> = {
  FUTSAL_5: '5-a-side Futsal',
  FUTSAL_6: '6-a-side Futsal',
  FUTSAL_7: '7-a-side Futsal',
  FOOTBALL_FULL: '11v11 Football',
  CRICKET_7: '7-a-side Cricket',
  CRICKET_FULL: '11v11 Cricket',
};

const SPORT_EMOJIS: Record<string, string> = {
  FUTSAL_5: '⚽',
  FUTSAL_6: '⚽',
  FUTSAL_7: '⚽',
  FOOTBALL_FULL: '⚽',
  CRICKET_7: '🏏',
  CRICKET_FULL: '🏏',
};

export default async function RootPage() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('bmt_auth');
  const roleCookie = cookieStore.get('bmt_role');
  const initialAuth = !!authCookie && (!roleCookie || roleCookie.value === 'player');

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
      where: { teamType: 'REGULAR', isDisbanded: false },
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
  const professionals = turfsWithSportIds.filter((t: any) => t.isCoachProfile);

  // Map leaderboard models
  const topTeams = rawTopTeams.map(t => ({
    id: t.id,
    name: t.name,
    logoUrl: t.logoUrl,
    sportType: t.sportType,
    mmr: t.sportType.includes('CRICKET') ? t.cricketMmr : t.footballMmr,
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

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24 pt-0 selection:bg-accent/30 selection:text-accent scrollbar-none">
      <div className="w-full max-w-md mx-auto relative flex flex-col gap-6">
        
        {/* 1. Header */}
        <HomeHeader initialAuth={initialAuth} />

        {/* 2. Hero Banner (h-64 original size) */}
        <HeroBanner
          slides={bannerSlides}
          settings={carouselSettings ?? { autoSlide: true, intervalMs: 3500 }}
        />

        {/* 3. Sponsors Bar (As it was before, outside banner) */}
        <SponsorsBar 
          sponsors={sponsors} 
          settings={sponsorSettings ?? { autoSlide: true, intervalMs: 3500 }} 
        />

        {/* 4. Join Us Bento Cards + Contact Section */}
        <JoinUsBentoSection />

        {/* 5. Booking Section or Timer Card */}
        {isTimerActive ? (
          /* When booking timer is active: completely hide SearchBar and standard SportsTurfSection list */
          <SportsTurfSection
            initialSports={sports}
            initialTurfs={standardTurfs as any}
            turfServiceSetting={turfServiceSetting ?? { isActive: false, launchAt: null }}
          />
        ) : (
          /* When booking timer is NOT active (i.e. booking goes live): render SearchBar and slot booking list */
          <>
            <SearchBar turfs={standardTurfs as any} sports={sports} />
            <SportsTurfSection
              initialSports={sports}
              initialTurfs={standardTurfs as any}
              turfServiceSetting={turfServiceSetting ?? { isActive: false, launchAt: null }}
            />
          </>
        )}

        {/* 5. Professionals Carousel (Mid-size) */}
        {professionals.length > 0 && (
          <section className="px-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles size={16} className="text-blue-400" />
                <h3 className="text-base font-black tracking-tight text-white">Hire Professionals</h3>
              </div>
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
                {professionals.length} active
              </span>
            </div>

            <div className="flex gap-3.5 overflow-x-auto no-scrollbar pb-1.5 snap-x snap-mandatory">
              {professionals.map((pro: any) => {
                const img = pro.imageUrls?.[0] || pro.logoUrl || FALLBACK_AVATAR;
                return (
                  <a
                    key={pro.id}
                    href={`/en/turf/${pro.id}`}
                    className="shrink-0 w-[42vw] max-w-[170px] snap-start block active:scale-[0.98] transition-transform"
                  >
                    <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-lg hover:border-blue-500/30 transition-colors">
                      {/* Photo Container */}
                      <div className="relative h-28 w-full bg-neutral-900 shrink-0">
                        <img
                          src={img}
                          alt={pro.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                        
                        <div className="absolute bottom-2 left-2 right-2">
                          <span className="inline-block text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-500 text-white font-mono shadow-sm">
                            {pro.coachType || 'PRO'}
                          </span>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="p-3 flex flex-col gap-0.5">
                        <h4 className="text-xs font-black truncate text-white leading-snug">
                          {pro.name}
                        </h4>
                        <div className="flex items-center gap-0.5 text-[9px] text-[var(--muted)] font-semibold truncate">
                          <MapPin size={9} className="text-blue-400 shrink-0" />
                          <span>{pro.area || 'BD'}</span>
                        </div>
                        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[9px] font-black text-blue-400 uppercase tracking-wider">Book Session</span>
                          <span className="text-[9px] font-black text-white">⭐ 5.0</span>
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* 6. Active Tournaments Carousel */}
        {tournaments.length > 0 && (
          <section className="px-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Trophy size={16} className="text-yellow-400 animate-bounce" />
                <h3 className="text-base font-black tracking-tight text-white">Active Tournaments</h3>
              </div>
              <a href="/en/tournaments" className="text-[10px] font-black text-yellow-400 uppercase tracking-widest flex items-center gap-0.5 hover:brightness-110">
                View All <ChevronRight size={10} />
              </a>
            </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1 snap-x snap-mandatory">
              {tournaments.map((t: any) => {
                const cover = t.bannerImageUrl || FALLBACK_TURF;
                const isRegOpen = t.status === 'REGISTRATION_OPEN';
                const isActive = t.status === 'ACTIVE';

                return (
                  <a
                    key={t.id}
                    href={`/en/tournaments/${t.id}`}
                    className="shrink-0 w-[78vw] max-w-[310px] snap-start block active:scale-[0.98] transition-transform"
                  >
                    <div className="relative rounded-2xl border border-yellow-500/20 bg-gradient-to-r from-yellow-950/20 to-neutral-900/40 p-4 flex gap-4 overflow-hidden group hover:border-yellow-400/40 transition-all min-h-[105px]">
                      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-yellow-500/5 to-transparent pointer-events-none" />
                      
                      {/* Image Thumbnail */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-yellow-500/20 relative">
                        <img src={cover} alt={t.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/35" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-black text-white truncate leading-tight group-hover:text-yellow-200 transition-colors max-w-[125px]">
                              {t.name}
                            </h4>
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${
                              isActive ? 'bg-[#00ff41]/20 text-[#00ff41] border border-[#00ff41]/30 animate-pulse' :
                              isRegOpen ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              'bg-neutral-800 text-neutral-400 border border-white/5'
                            }`}>
                              {isRegOpen ? 'Open' : isActive ? 'Live' : t.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          <p className="text-[10px] text-yellow-400/60 font-bold uppercase tracking-wider mt-1.5">
                            {SPORT_EMOJIS[t.sport] || '🏆'} {SPORT_LABELS[t.sport] || t.sport}
                          </p>
                        </div>

                        <div className="flex items-center justify-between border-t border-yellow-500/10 pt-2.5 mt-2.5">
                          <span className="text-[9px] font-black text-white flex items-center gap-1">
                            💰 <span className="text-yellow-300">BDT {t.prizePoolTotal.toLocaleString()}</span>
                          </span>
                          <span className="text-[9px] font-black text-yellow-400 uppercase tracking-widest">
                            {t.entryFee > 0 ? `BDT ${t.entryFee}` : 'Free'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* 7. Top Teams and Players as a Swipable Carousel */}
        {(topTeams.length > 0 || topPlayers.length > 0) && (
          <section className="px-4 flex flex-col gap-3 pb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Trophy size={16} className="text-accent" />
                <h3 className="text-base font-black tracking-tight text-white">Leaderboard Highlights</h3>
              </div>
              <a href="/en/leaderboard" className="text-[10px] font-black text-accent uppercase tracking-widest flex items-center gap-0.5 hover:brightness-110">
                View All <ChevronRight size={10} />
              </a>
            </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1.5 snap-x snap-mandatory">
              {/* Card 1: Top Teams */}
              {topTeams.length > 0 && (
                <div className="shrink-0 w-[88vw] max-w-[350px] snap-start glass-panel border border-white/5 rounded-2xl p-4 flex flex-col gap-3 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-[10px] font-black text-accent uppercase tracking-wider flex items-center gap-1">
                      🛡️ Ranked Squads
                    </span>
                    <span className="text-[9px] font-bold text-neutral-500">Regular Teams</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {topTeams.map((team, idx) => {
                      const rankLabels = ['🥇', '🥈', '🥉', '#4', '#5'];
                      return (
                        <div key={team.id} className="flex items-center gap-3 p-1.5 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition-all">
                          <span className="w-6 shrink-0 text-center font-mono font-black text-xs text-neutral-400">
                            {rankLabels[idx]}
                          </span>
                          <div className="w-7 h-7 rounded-lg overflow-hidden bg-neutral-800 border border-white/10 shrink-0 flex items-center justify-center">
                            {team.logoUrl ? (
                              <img src={team.logoUrl} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <Shield size={12} className="text-neutral-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-xs text-white truncate leading-tight">{team.name}</p>
                            <p className="text-[9px] text-neutral-500 font-bold uppercase mt-0.5">
                              {SPORT_EMOJIS[team.sportType] || '⚽'} {SPORT_LABELS[team.sportType] || team.sportType}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="text-[9px] font-black text-accent bg-accent/10 border border-accent/25 px-2 py-0.5 rounded-full">
                              {team.mmr} MMR
                            </span>
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
                    <span className="text-[10px] font-black text-fuchsia-400 uppercase tracking-wider flex items-center gap-1">
                      👑 Top Competitors
                    </span>
                    <span className="text-[9px] font-bold text-neutral-500">Player Standings</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {topPlayers.map((player, idx) => {
                      const rankLabels = ['🥇', '🥈', '🥉', '#4', '#5'];
                      return (
                        <div key={player.id} className="flex items-center gap-3 p-1.5 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 transition-all">
                          <span className="w-6 shrink-0 text-center font-mono font-black text-xs text-neutral-400">
                            {rankLabels[idx]}
                          </span>
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-neutral-800 border border-white/10 shrink-0">
                            <img src={player.avatarUrl || FALLBACK_AVATAR} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-xs text-white truncate leading-tight">{player.fullName}</p>
                            {player.teamName ? (
                              <p className="text-[9px] text-fuchsia-400/60 font-bold uppercase mt-0.5 truncate">
                                {player.teamName}
                              </p>
                            ) : (
                              <p className="text-[9px] text-neutral-500 font-bold uppercase mt-0.5">
                                Free Agent
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="text-[9px] font-black text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/25 px-2 py-0.5 rounded-full">
                              {player.mmr} MMR
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
