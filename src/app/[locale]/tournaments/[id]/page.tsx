'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Trophy, Users, Calendar, Loader2, AlertTriangle,
  ChevronDown, Check, X, Star, Zap, Shield,
} from 'lucide-react';
import { getCookie } from '@/lib/cookies';
import { getSupabaseClient } from '@/lib/supabaseRealtime';
import TournamentBracket from '@/components/shared/TournamentBracket';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Sponsor {
  id: string; name: string; logoUrl: string; type: string; ctaUrl?: string; order: number;
}

interface PlayerInfo {
  id: string; fullName: string; avatarUrl?: string;
  footballMmr: number; cricketMmr: number; level: number;
}

interface TeamMember {
  id: string; role: string; sportRole?: string; isStarter: boolean;
  player: PlayerInfo;
}

interface EnrichedTeam {
  id: string; name: string; formation?: string;
  footballMmr: number; cricketMmr: number;
  members: TeamMember[];
  logoUrl?: string;
}

interface EnrichedRegistration {
  id: string; entityType: string; entityId: string;
  status: string; registeredAt: string;
  team: EnrichedTeam | null;
  player: PlayerInfo | null;
}

interface Tournament {
  id: string; name: string; sport: string; status: string;
  formatType: string; registrationType: string;
  maxParticipants: number; entryFee: number; prizePoolTotal: number;
  prizeType: string; prizeDistribution?: Record<string, number> | unknown; description?: string; venue?: string;
  startDate?: string; endDate?: string; logoUrl?: string; bannerImageUrl?: string;
  _count: { registrations: number };
  sponsors: Sponsor[];
  registrations: EnrichedRegistration[];
  groups: { id: string; name: string; teamIds: string[] }[];
  standings: any[];
  matches: any[];
  formatConfig?: any;
  playerStatsMap?: Record<string, { goals: number; assists: number }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(s: string) {
  if (s === 'ACTIVE') return 'bg-[#00ff41]/20 text-[#00ff41]';
  if (s === 'REGISTRATION_OPEN') return 'bg-blue-500/20 text-blue-400';
  if (s === 'COMPLETED') return 'bg-neutral-700 text-neutral-400';
  return 'bg-amber-500/20 text-amber-400';
}

function mmrLabel(sport: string, team: EnrichedTeam) {
  return sport === 'FOOTBALL' ? team.footballMmr : team.cricketMmr;
}

function getSportVariantLabel(variant?: string, fallbackSport?: string) {
  if (!variant) {
    if (fallbackSport === 'FOOTBALL') return 'Futsal';
    if (fallbackSport === 'CRICKET') return 'Cricket';
    return fallbackSport || '';
  }
  switch (variant) {
    case 'FUTSAL_5': return '5-a-side Futsal';
    case 'FUTSAL_6': return '6-a-side Futsal';
    case 'FUTSAL_7': return '7-a-side Futsal';
    case 'CRICKET_7': return '7-a-side Cricket';
    case 'FOOTBALL_FULL': return '11-a-side Football';
    case 'CRICKET_FULL': return '11-a-side Cricket';
    default: return variant.replace(/_/g, ' ');
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TournamentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'en';
  const searchParams = useSearchParams();
  const joinParam = searchParams.get('join');

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'teams' | 'matches' | 'standings'>('overview');
  const [isRegistering, setIsRegistering] = useState(false);

  const pid = getCookie('bmt_player_id');
  const isRegistered = tournament ? tournament.registrations.some(r => {
    if (r.entityType === 'PLAYER' && r.entityId === pid) return true;
    if (r.entityType === 'TEAM' && r.team) {
      return r.team.members.some(m => m.player.id === pid);
    }
    return false;
  }) : false;

  const fetchTournament = useCallback((isInitial = false) => {
    if (isInitial) setLoading(true);
    fetch(`/api/arena/tournaments/${id}`)
      .then(r => r.json())
      .then(data => { if (data.success) setTournament(data.data); })
      .catch(console.error)
      .finally(() => { if (isInitial) setLoading(false); });
  }, [id]);

  useEffect(() => {
    fetchTournament(true);
  }, [fetchTournament]);

  useEffect(() => {
    if (!id) return;
    const supabase = getSupabaseClient();
    const ch = supabase.channel(`tournament-details:${id}`);
    
    ch.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tournament_matches' },
      (payload: any) => {
        const rec = payload.new || payload.old;
        if (rec && (rec.tournamentId === id || rec.tournament_id === id)) {
          fetchTournament();
        }
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tournament_standings' },
      (payload: any) => {
        const rec = payload.new || payload.old;
        if (rec && (rec.tournamentId === id || rec.tournament_id === id)) {
          fetchTournament();
        }
      }
    )
    .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, fetchTournament]);

  useEffect(() => {
    if (tournament) {
      if (joinParam === 'true') {
        const isReg = tournament.registrations.some(r => {
          if (r.entityType === 'PLAYER' && r.entityId === pid) return true;
          if (r.entityType === 'TEAM' && r.team) {
            return r.team.members.some(m => m.player.id === pid);
          }
          return false;
        });
        if (!isReg && tournament.status === 'REGISTRATION_OPEN') {
          setIsRegistering(true);
        }
        const newUrl = pathname;
        window.history.replaceState({ ...window.history.state, as: newUrl, url: newUrl }, '', newUrl);
      }
    }
  }, [tournament, joinParam, pathname, pid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="animate-spin text-yellow-400 w-10 h-10" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-white">
        <Trophy size={48} className="text-neutral-700 mb-4" />
        <h2 className="text-2xl font-black mb-2">Tournament Not Found</h2>
        <button onClick={() => router.back()} className="mt-4 text-yellow-400 font-bold">← Go Back</button>
      </div>
    );
  }

  // Build team name lookup from registrations
  const teamNameMap: Record<string, string> = {};
  const teamLogoMap: Record<string, string> = {};
  tournament.registrations.forEach(r => {
    if (r.team) {
      teamNameMap[r.entityId] = r.team.name;
      if (r.team.logoUrl) teamLogoMap[r.entityId] = r.team.logoUrl;
    }
    if (r.player) {
      teamNameMap[r.entityId] = r.player.fullName;
      if (r.player.avatarUrl) teamLogoMap[r.entityId] = r.player.avatarUrl;
    }
  });

  const mainSponsors = tournament.sponsors.filter(s => s.type === 'MAIN').sort((a, b) => a.order - b.order);
  const coSponsors = tournament.sponsors.filter(s => s.type === 'CO_SPONSOR').sort((a, b) => a.order - b.order);

  const groupNames: Record<string, string> = {};
  tournament.groups.forEach(g => { groupNames[g.id] = g.name; });

  const tabs = (['overview', 'teams', 'matches', 'standings'] as const);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-28">

      {/* ── Header ── */}
      <header className="sticky top-0 z-45 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5 px-4 py-3.5 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </button>

        {/* Tournament mini-logo in header */}
        <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
          {tournament.logoUrl ? (
            <img src={tournament.logoUrl} alt="" className="w-full h-full object-contain" />
          ) : (
            <Trophy size={14} className="text-yellow-400" />
          )}
        </div>

        <h1 className="font-black text-base truncate flex-1">{tournament.name}</h1>
        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 ${statusColor(tournament.status)}`}>
          {tournament.status.replace(/_/g, ' ')}
        </span>
      </header>

      {/* ── Hero Banner ── */}
      <div className="relative bg-gradient-to-br from-yellow-950/60 via-amber-900/30 to-[#0a0a0a] px-5 py-4 border-b border-white/5 overflow-hidden">
        <div className="absolute right-4 top-2.5 opacity-10 pointer-events-none">
          <Trophy size={80} className="text-yellow-400" />
        </div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-3.5">
          {/* Tournament logo/icon - Slimmed Box Container */}
          <div className="w-12 h-12 rounded-xl border border-yellow-500/30 bg-black/40 overflow-hidden shrink-0 flex items-center justify-center p-1.5 shadow-xl shadow-yellow-500/5 hover:border-yellow-400 transition-colors">
            {tournament.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={tournament.logoUrl} alt={tournament.name} className="w-full h-full object-contain" />
            ) : (
              <Trophy size={22} className="text-yellow-400 animate-pulse" />
            )}
          </div>

          <div className="flex-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-yellow-400/60 mb-0.5">
              {getSportVariantLabel((tournament.formatConfig as any)?.sportVariant, tournament.sport)} · {tournament.formatType?.replace(/_/g, ' ')}
            </p>
            <h2 className="text-xl font-display font-black text-white leading-tight">{tournament.name}</h2>
            
            {/* Verified Organizer Tag (Organized by Name then Profile Photo) */}
            <div className="flex items-center gap-2 mt-1.5 text-xs font-bold text-neutral-400 bg-white/5 border border-white/10 pl-3 pr-2 py-0.5 rounded-full w-fit backdrop-blur-sm shadow-sm">
              <Shield size={13} className="text-yellow-400 shrink-0" />
              <span>Organized by:</span>
              <span className="text-white font-black">{(tournament as any).organizerName || 'Book My Turf'}</span>
              
              {/* Organizer Profile Photo Badge */}
              <div className="w-6.5 h-6.5 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-[10px] text-yellow-400 font-black uppercase shrink-0">
                {((tournament as any).organizerName || 'B')[0]}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sponsor Section (Names stacked under bigger logos, Main on first line, Co-sponsors on second line) ── */}
      {(mainSponsors.length > 0 || coSponsors.length > 0) && (
        <div className="px-6 py-4.5 border-b border-white/5 bg-black/30 backdrop-blur-sm flex flex-col gap-4 text-left">
          {/* Main Sponsors Row */}
          {mainSponsors.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-yellow-400 flex items-center gap-1.5">
                🏆 Main Sponsor{mainSponsors.length > 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-3.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1">
                {mainSponsors.map(s => (
                  <a key={s.id} href={s.ctaUrl || '#'} target="_blank" rel="noopener noreferrer"
                    className="flex flex-col items-center bg-white/5 border border-white/10 rounded-2xl p-2.5 hover:border-yellow-500/50 hover:bg-yellow-500/[0.02] hover:scale-[1.02] transition-all duration-300 shrink-0 w-24 text-center group">
                    <div className="w-18 h-18 bg-black/40 border border-white/5 rounded-xl flex items-center justify-center p-2 shrink-0 overflow-hidden mb-1.5 group-hover:border-yellow-500/30 transition-colors">
                      <img src={s.logoUrl} alt={s.name} className="max-h-full max-w-full object-contain rounded" />
                    </div>
                    <span className="text-[10px] font-black text-white truncate w-full group-hover:text-yellow-400 transition-colors">{s.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Co-Sponsors Row */}
          {coSponsors.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                🤝 Co-Sponsor{coSponsors.length > 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-3.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1">
                {coSponsors.map(s => (
                  <a key={s.id} href={s.ctaUrl || '#'} target="_blank" rel="noopener noreferrer"
                    className="flex flex-col items-center bg-white/5 border border-white/10 rounded-2xl p-2.5 hover:border-white/20 hover:bg-white/[0.02] hover:scale-[1.02] transition-all duration-300 shrink-0 w-24 text-center group">
                    <div className="w-18 h-18 bg-black/40 border border-white/5 rounded-xl flex items-center justify-center p-2 shrink-0 overflow-hidden mb-1.5 group-hover:border-white/10 transition-colors">
                      <img src={s.logoUrl} alt={s.name} className="max-h-full max-w-full object-contain rounded" />
                    </div>
                    <span className="text-[10px] font-black text-white truncate w-full group-hover:text-neutral-200 transition-colors">{s.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Register CTA ── */}
      {tournament.status === 'REGISTRATION_OPEN' && (
        <div className="px-4 py-4 border-b border-white/5 bg-blue-500/5 bg-gradient-to-r from-blue-500/5 to-transparent">
          {isRegistered ? (
            <div className="w-full bg-emerald-500/10 border border-emerald-500/20 text-[#00ff41] font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2">
              <Check size={16} strokeWidth={3} />
              <span>Registered &amp; Entered</span>
            </div>
          ) : tournament._count?.registrations >= tournament.maxParticipants ? (
            <div className="w-full bg-neutral-900 border border-white/5 text-neutral-400 font-black uppercase tracking-widest py-4 rounded-2xl flex items-center justify-center gap-2">
              <span>Tournament Filled (Spectator Mode)</span>
            </div>
          ) : (
            <button
              onClick={() => setIsRegistering(true)}
              className="w-full bg-blue-500 text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-blue-400 transition-colors"
            >
              {tournament.registrationType === 'PLAYER' ? 'Join as Player' : 'Register Your Team'}
            </button>
          )}
        </div>
      )}

      {isRegistering && (
        <RegistrationModal
          tournament={tournament}
          onClose={() => setIsRegistering(false)}
          onSuccess={() => { setIsRegistering(false); window.location.reload(); }}
        />
      )}

      {/* ── Tab Bar ── */}
      <div className="flex border-b border-white/5 sticky top-[73px] z-30 bg-[#0a0a0a]">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-widest transition-all ${
              tab === t ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-neutral-500 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="px-4 pt-5">
        {tab === 'overview'   && <OverviewTab tournament={tournament} />}
        {tab === 'teams'      && <TeamsTab tournament={tournament} />}
        {tab === 'matches'    && <MatchesTab tournament={tournament} teamNameMap={teamNameMap} teamLogoMap={teamLogoMap} />}
        {tab === 'standings'  && <StandingsTab tournament={tournament} teamNameMap={teamNameMap} teamLogoMap={teamLogoMap} groupNames={groupNames} playerStatsMap={tournament.playerStatsMap || {}} />}
      </div>
    </div>
  );
}

// ─── Placeholder sub-components (filled in next parts) ───────────────────────

function OverviewTab({ tournament }: { tournament: Tournament }) {
  const prizeMap: Record<string, number> =
    typeof tournament.prizeDistribution === 'object' && tournament.prizeDistribution !== null
      ? (tournament.prizeDistribution as Record<string, number>)
      : {};

  const getSmartPrizeAmount = (place: string, pct: number) => {
    if (prizeMap[`${place}_amount`]) {
      return Number(prizeMap[`${place}_amount`]);
    }
    const raw = (pct / 100) * tournament.prizePoolTotal;
    
    // If it's close to a multiple of 1000, or 500, or 100, let's round it beautifully
    const nearest1000 = Math.round(raw / 1000) * 1000;
    if (Math.abs(raw - nearest1000) <= Math.max(200, raw * 0.03)) {
      return nearest1000;
    }
    const nearest500 = Math.round(raw / 500) * 500;
    if (Math.abs(raw - nearest500) <= Math.max(100, raw * 0.03)) {
      return nearest500;
    }
    const nearest100 = Math.round(raw / 100) * 100;
    if (Math.abs(raw - nearest100) <= Math.max(50, raw * 0.03)) {
      return nearest100;
    }
    return Math.round(raw);
  };

  const firstPlacePrize = tournament.prizePoolTotal > 0 && prizeMap['1st'] ? getSmartPrizeAmount('1st', prizeMap['1st']) : null;
  const secondPlacePrize = tournament.prizePoolTotal > 0 && prizeMap['2nd'] ? getSmartPrizeAmount('2nd', prizeMap['2nd']) : null;
  const thirdPlacePrize = tournament.prizePoolTotal > 0 && prizeMap['3rd'] ? getSmartPrizeAmount('3rd', prizeMap['3rd']) : null;

  const infoRows = [
    ['Format',          tournament.formatType?.replace(/_/g, ' ')],
    ['Sport',           getSportVariantLabel((tournament.formatConfig as any)?.sportVariant, tournament.sport)],
    ['Registration',    tournament.registrationType === 'TEAM' ? 'Team-based' : 'Individual Players'],
    ['Max Teams',       String(tournament.maxParticipants)],
    ['Entry Fee',       tournament.entryFee > 0 ? `BDT ${tournament.entryFee.toLocaleString()}` : 'Free'],
    ['Prize Pool',      tournament.prizePoolTotal > 0 ? `BDT ${tournament.prizePoolTotal.toLocaleString()}` : 'Trophy Only'],
    ['Prize Type',      tournament.prizeType?.replace(/_/g, ' ')],
    ...(tournament.venue    ? [['Venue', tournament.venue]] : []),
    ...(tournament.startDate ? [['Starts', new Date(tournament.startDate).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })]] : []),
    ...(tournament.endDate   ? [['Ends',   new Date(tournament.endDate).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })]] : []),
  ];

  return (
    <div className="flex flex-col gap-5">

      {/* ── Highlighted Prize Money Podiums ── */}
      {tournament.prizePoolTotal > 0 && (
        <div className="bg-neutral-900 border border-white/5 rounded-2xl p-5 flex flex-col gap-4 shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500 flex items-center gap-1.5">
            <Trophy size={14} /> Prize Distribution
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1st Place */}
            {firstPlacePrize !== null && (
              <div className="bg-gradient-to-br from-yellow-500/15 via-yellow-500/5 to-transparent border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3.5 shadow-lg relative overflow-hidden group">
                <div className="absolute right-0 bottom-0 opacity-10 translate-x-2 translate-y-2 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                  <Trophy size={64} className="text-yellow-400" />
                </div>
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400 text-lg font-black shrink-0">
                  1st
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-yellow-400/60">Champion Prize</p>
                  <p className="text-base sm:text-lg font-black text-white mt-0.5">BDT {firstPlacePrize.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* 2nd Place */}
            {secondPlacePrize !== null && secondPlacePrize > 0 && (
              <div className="bg-gradient-to-br from-neutral-400/15 via-neutral-400/5 to-transparent border border-white/10 rounded-xl p-4 flex items-center gap-3.5 shadow-lg relative overflow-hidden group">
                <div className="absolute right-0 bottom-0 opacity-10 translate-x-2 translate-y-2 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                  <Trophy size={64} className="text-neutral-400" />
                </div>
                <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-neutral-300 text-lg font-black shrink-0">
                  2nd
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400/60">Runner Up Prize</p>
                  <p className="text-base sm:text-lg font-black text-white mt-0.5">BDT {secondPlacePrize.toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {thirdPlacePrize !== null && thirdPlacePrize > 0 && (
              <div className="bg-gradient-to-br from-amber-700/15 via-amber-700/5 to-transparent border border-amber-700/20 rounded-xl p-4 flex items-center gap-3.5 shadow-lg relative overflow-hidden group">
                <div className="absolute right-0 bottom-0 opacity-10 translate-x-2 translate-y-2 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                  <Trophy size={64} className="text-amber-600" />
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-700/20 border border-amber-700/40 flex items-center justify-center text-amber-500 text-lg font-black shrink-0">
                  3rd
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-600/60">2nd Runner Up</p>
                  <p className="text-base sm:text-lg font-black text-white mt-0.5">BDT {thirdPlacePrize.toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Highlight Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Prize Pool */}
        <div className="bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-transparent border border-yellow-500/20 rounded-2xl p-4 flex flex-col justify-between shadow-xl shadow-yellow-555/[0.02]">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center text-yellow-400 mb-3 border border-yellow-500/20">
            <Trophy size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500/60 mb-0.5">Prize Pool</p>
            <p className="text-sm sm:text-base font-black text-white">
              {tournament.prizePoolTotal > 0 ? `BDT ${tournament.prizePoolTotal.toLocaleString()}` : 'Trophy Only'}
            </p>
          </div>
        </div>

        {/* Entry Fee */}
        <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/20 rounded-2xl p-4 flex flex-col justify-between shadow-xl shadow-blue-555/[0.02]">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center text-blue-400 mb-3 border border-blue-500/20">
            <Zap size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400/60 mb-0.5">Entry Fee</p>
            <p className="text-sm sm:text-base font-black text-white">
              {tournament.entryFee > 0 ? `BDT ${tournament.entryFee.toLocaleString()}` : 'Free'}
            </p>
          </div>
        </div>

        {/* Format */}
        <div className="bg-gradient-to-br from-neutral-500/10 to-transparent border border-white/5 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-neutral-300 mb-3 border border-white/10">
            <Shield size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-0.5">Format</p>
            <p className="text-xs sm:text-sm font-black text-white leading-snug">
              {tournament.formatType?.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        {/* Teams Entered */}
        <div className="bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent border border-orange-500/20 rounded-2xl p-4 flex flex-col justify-between shadow-xl shadow-orange-555/[0.02]">
          <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center text-orange-400 mb-3 border border-orange-500/20">
            <Users size={16} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-orange-400/60 mb-0.5">Participants</p>
            <p className="text-sm sm:text-base font-black text-white">
              {tournament._count?.registrations} / {tournament.maxParticipants}
            </p>
          </div>
        </div>
      </div>

      {/* About */}
      {tournament.description && (
        <div className="bg-neutral-900 border border-white/5 rounded-2xl p-5">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">About</h3>
          <p className="text-sm text-neutral-300 leading-relaxed">{tournament.description}</p>
        </div>
      )}

      {/* Info rows */}
      <div className="bg-neutral-900 border border-white/5 rounded-2xl p-5">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Tournament Info</h3>
        <div className="space-y-0">
          {infoRows.map(([label, value]) => (
            <div key={label} className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0">
              <span className="text-sm font-bold text-neutral-400">{label}</span>
              <span className="text-sm font-black text-white">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function getMmrRank(mmr: number): { label: string; cls: string } {
  if (mmr >= 2500) return { label: 'Legend', cls: 'bg-red-500/10 text-red-400 border-red-500/20' };
  if (mmr >= 2000) return { label: 'Diamond', cls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
  if (mmr >= 1500) return { label: 'Platinum', cls: 'bg-purple-500/10 text-purple-400 border-purple-500/20' };
  if (mmr >= 1000) return { label: 'Gold', cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
  if (mmr >= 500)  return { label: 'Silver', cls: 'bg-neutral-400/10 text-neutral-300 border-neutral-400/20' };
  return { label: 'Bronze', cls: 'bg-amber-700/10 text-amber-500 border-amber-700/20' };
}

function TeamsTab({ tournament }: { tournament: Tournament }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const regs = tournament.registrations.filter(r => r.status !== 'REJECTED');

  if (regs.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center text-center">
        <Users size={48} className="text-neutral-800 mb-4" />
        <p className="text-neutral-500 font-bold">No registrations yet.</p>
        <p className="text-neutral-600 text-xs mt-1">Be the first to register!</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {regs.map((reg, idx) => {
        const team = reg.team;
        const player = reg.player;
        const name = team?.name ?? player?.fullName ?? reg.entityId.slice(0, 12);
        const mmr = team
          ? (tournament.sport === 'FOOTBALL' ? team.footballMmr : team.cricketMmr)
          : (tournament.sport === 'FOOTBALL' ? player?.footballMmr : player?.cricketMmr) ?? 0;
        const memberCount = team?.members?.length ?? 1;
        const isOpen = expanded === reg.id;
        const isPending = reg.status === 'PENDING';

        return (
          <div key={reg.id} className="bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden">

            {/* Team header row */}
            <button
              onClick={() => setExpanded(isOpen ? null : reg.id)}
              className="w-full flex items-center gap-3 px-4 py-4 hover:bg-white/[0.02] transition-colors text-left"
            >
              {/* Rank badge */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                idx === 1 ? 'bg-neutral-400/20 text-neutral-300' :
                idx === 2 ? 'bg-amber-700/20 text-amber-600' :
                'bg-white/5 text-neutral-500'
              }`}>
                {idx + 1}
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-black text-sm text-white truncate">{name}</p>
                  {isPending && (
                    <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                      Pending
                    </span>
                  )}
                  {reg.status === 'APPROVED' && (
                    <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-[#00ff41]/10 text-[#00ff41]">
                      ✓
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {team?.formation && (
                    <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-md">
                      {team.formation}
                    </span>
                  )}
                  <span className="text-[10px] text-neutral-500 font-bold">
                    {memberCount} {memberCount === 1 ? 'player' : 'players'}
                  </span>
                </div>
              </div>

              {/* MMR chip */}
              <div className="shrink-0 flex flex-col items-end gap-1">
                <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-lg">
                  <Star size={10} className="text-yellow-400" />
                  <span className="text-[11px] font-black text-yellow-400">{mmr}</span>
                </div>
                <ChevronDown size={14} className={`text-neutral-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Expanded: player roster */}
            {isOpen && team?.members && team.members.length > 0 && (
              <div className="border-t border-white/5 divide-y divide-white/5 bg-black/15">
                {team.members.map(m => {
                  const p = m.player;
                  const pMmr = tournament.sport === 'FOOTBALL' ? p.footballMmr : p.cricketMmr;
                  const pRank = getMmrRank(pMmr);
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.01] transition-colors">
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                        {p.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.avatarUrl} alt={p.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-black text-neutral-400">
                            {p.fullName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>

                      {/* Name + role + rank */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white truncate">{p.fullName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {/* Rank badge */}
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${pRank.cls} shrink-0`}>
                            {pRank.label}
                          </span>
                          
                          {/* Level badge */}
                          <span className="text-[9px] text-neutral-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-md font-bold shrink-0">
                            Lvl {p.level}
                          </span>

                          {m.role === 'captain' && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded-md shrink-0">
                              Captain
                            </span>
                          )}
                          {m.sportRole && (
                            <span className="text-[9px] text-neutral-500 font-bold shrink-0">{m.sportRole}</span>
                          )}
                          {m.isStarter && (
                            <span className="text-[8px] font-black text-[#00ff41] bg-[#00ff41]/10 px-1.5 py-0.5 rounded-md shrink-0">
                              Starter
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Player MMR */}
                      <div className="shrink-0 flex items-center gap-1 bg-white/5 border border-white/5 px-2 py-1 rounded-lg">
                        <Zap size={9} className="text-neutral-400" />
                        <span className="text-[10px] font-black text-neutral-300">{pMmr}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Expanded: individual player (PLAYER registration type) */}
            {isOpen && !team && player && (
              <div className="border-t border-white/5 px-4 py-3 flex items-center gap-3 bg-black/15">
                <div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                  {player.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={player.avatarUrl} alt={player.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-black text-neutral-400">{player.fullName.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white truncate">{player.fullName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {/* Rank badge */}
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${getMmrRank(mmr).cls} shrink-0`}>
                      {getMmrRank(mmr).label}
                    </span>

                    {/* Level */}
                    <span className="text-[9px] text-neutral-400 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-md font-bold shrink-0">
                      Lvl {player.level}
                    </span>
                  </div>
                </div>

                {/* Player MMR */}
                <div className="shrink-0 flex items-center gap-1 bg-white/5 border border-white/5 px-2 py-1 rounded-lg">
                  <Zap size={9} className="text-neutral-400" />
                  <span className="text-[10px] font-black text-neutral-300">{mmr}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MatchesTab({
  tournament,
  teamNameMap,
  teamLogoMap,
}: {
  tournament: Tournament;
  teamNameMap: Record<string, string>;
  teamLogoMap: Record<string, string>;
}) {
  const hasKnockouts = tournament.matches.some((m: any) =>
    ['ROUND_OF_16', 'QUARTER', 'SEMI', 'FINAL'].includes(m.stage)
  );
  const [viewMode, setViewMode] = useState<'list' | 'bracket'>(hasKnockouts ? 'bracket' : 'list');

  // Build group name lookup
  const groupNames: Record<string, string> = {};
  tournament.groups.forEach(g => { groupNames[g.id] = g.name; });

  // Group by stage
  const byStage: Record<string, any[]> = {};
  tournament.matches.forEach((m: any) => {
    if (!byStage[m.stage]) byStage[m.stage] = [];
    byStage[m.stage].push(m);
  });

  const stageOrder = ['GROUP', 'ROUND_OF_16', 'QUARTER', 'SEMI', 'THIRD_PLACE', 'FINAL'];
  const stageLabel: Record<string, string> = {
    GROUP: 'Group Stage', ROUND_OF_16: 'Round of 16',
    QUARTER: 'Quarter Finals', SEMI: 'Semi Finals',
    THIRD_PLACE: '3rd Place', FINAL: 'Final',
  };

  const orderedStages = stageOrder.filter(s => byStage[s]);

  function resolveTeam(tid: string) {
    if (!tid || tid === 'TBD') return 'TBD';
    return teamNameMap[tid] || tid.slice(0, 10) + '…';
  }

  function matchStatusStyle(m: any) {
    if (m.resultSummary?.forfeited) {
      return 'bg-amber-500/20 text-amber-500 border border-amber-500/30';
    }
    const s = m.status;
    if (s === 'LIVE') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (s === 'COMPLETED') return 'bg-[#00ff41]/15 text-[#00ff41]';
    if (s === 'WALKOVER') return 'bg-neutral-700 text-neutral-400';
    return 'bg-neutral-800 text-neutral-500';
  }

  function getScore(m: any, side: 'A' | 'B') {
    if (!m.resultSummary) return null;
    const rs = m.resultSummary as any;
    if (tournament.sport === 'FOOTBALL') {
      return side === 'A' ? rs.goalsA ?? null : rs.goalsB ?? null;
    }
    if (tournament.sport === 'CRICKET') {
      const runs = side === 'A' ? rs.runsA : rs.runsB;
      if (runs === undefined || runs === null) return null;
      const wickets = side === 'A' ? rs.wicketsA : rs.wicketsB;
      const overs = side === 'A' ? rs.oversA : rs.oversB;

      const w = wickets !== undefined && wickets !== null ? wickets : 0;
      if (overs === undefined || overs === null || overs === 0) {
        return `${runs}/${w}`;
      }
      const totalBalls = Math.round(overs * 6);
      return `${runs}/${w} (${Math.floor(totalBalls / 6)}.${totalBalls % 6} ov)`;
    }
    return null;
  }

  const hasMatches = tournament.matches.length > 0;

  if (!hasMatches) {
    return (
      <div className="py-20 flex flex-col items-center text-center">
        <Calendar size={48} className="text-neutral-800 mb-4" />
        <p className="text-neutral-500 font-bold">No matches scheduled yet.</p>
        <p className="text-neutral-600 text-xs mt-1">Check back once the bracket is set.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {hasKnockouts && (
        <div className="flex justify-end shrink-0">
          <div className="inline-flex bg-neutral-950 border border-white/5 p-1 rounded-xl shadow-lg">
            <button
              onClick={() => setViewMode('bracket')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'bracket'
                  ? 'bg-yellow-500 text-black shadow-md shadow-yellow-500/10'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              Bracket View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-yellow-500 text-black shadow-md shadow-yellow-500/10'
                  : 'text-neutral-500 hover:text-white'
              }`}
            >
              List View
            </button>
          </div>
        </div>
      )}

      {viewMode === 'bracket' ? (
        <TournamentBracket
          matches={tournament.matches}
          teamNameMap={teamNameMap}
          teamLogoMap={teamLogoMap}
          sport={tournament.sport}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {orderedStages.map(stage => (
            <div key={stage} className="flex flex-col gap-3">
              {/* Stage header */}
              <div className="flex items-center gap-3 mb-1 mt-2">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 px-2">
                  {stageLabel[stage] || stage}
                </span>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              <div className="flex flex-col gap-3">
                {byStage[stage].map((m: any) => {
                  const nameA = resolveTeam(m.teamAId);
                  const nameB = resolveTeam(m.teamBId);
                  const scoreA = getScore(m, 'A');
                  const scoreB = getScore(m, 'B');
                  const isLive = m.status === 'LIVE';
                  const isDone = m.status === 'COMPLETED' || m.status === 'WALKOVER';
                  const winnerIsA = isDone && m.winnerId === m.teamAId;
                  const winnerIsB = isDone && m.winnerId === m.teamBId;

                  return (
                    <div
                      key={m.id}
                      className={`bg-neutral-900 border rounded-2xl overflow-hidden ${
                        isLive ? 'border-red-500/30' : 'border-white/5'
                      }`}
                    >
                      {/* Match meta bar */}
                      <div className={`flex items-center justify-between px-4 py-2.5 ${isLive ? 'bg-red-500/5' : 'bg-black/30'}`}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                          Match {m.matchNumber}
                          {m.groupId && groupNames[m.groupId] && ` · ${groupNames[m.groupId]}`}
                          {m.scheduledAt && ` · ${new Date(m.scheduledAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                          {m.venue && ` · ${m.venue}`}
                        </span>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${matchStatusStyle(m)}`}>
                          {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mr-1 animate-pulse" />}
                          {m.resultSummary?.forfeited ? 'FORFEITED' : m.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Teams VS Grid */}
                      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-4 w-full">
                        {/* Team A */}
                        <div className={`min-w-0 text-center ${winnerIsA ? 'opacity-100' : isDone ? 'opacity-50' : ''}`}>
                          <p className={`text-sm font-black truncate ${winnerIsA ? 'text-yellow-400' : 'text-white'}`}>
                            {nameA}
                            {winnerIsA && <span className="ml-1 text-[10px]">👑</span>}
                          </p>
                          {scoreA !== null && (
                            <p className={`text-2xl font-black mt-1 ${winnerIsA ? 'text-yellow-400' : 'text-neutral-300'}`}>
                              {scoreA}
                            </p>
                          )}
                        </div>

                        {/* VS divider */}
                        <div className={`px-3 py-1.5 rounded-xl shrink-0 ${isLive ? 'bg-red-500/10 border border-red-500/20' : 'bg-neutral-800'}`}>
                          <p className={`text-xs font-black ${isLive ? 'text-red-400' : 'text-neutral-500'}`}>
                            {isLive ? 'LIVE' : 'VS'}
                          </p>
                        </div>

                        {/* Team B */}
                        <div className={`min-w-0 text-center ${winnerIsB ? 'opacity-100' : isDone ? 'opacity-50' : ''}`}>
                          <p className={`text-sm font-black truncate ${winnerIsB ? 'text-yellow-400' : 'text-white'}`}>
                            {nameB}
                            {winnerIsB && <span className="ml-1 text-[10px]">👑</span>}
                          </p>
                          {scoreB !== null && (
                            <p className={`text-2xl font-black mt-1 ${winnerIsB ? 'text-yellow-400' : 'text-neutral-300'}`}>
                              {scoreB}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function StandingsTab({ tournament, teamNameMap, teamLogoMap, groupNames, playerStatsMap }: {
  tournament: Tournament;
  teamNameMap: Record<string, string>;
  teamLogoMap: Record<string, string>;
  groupNames: Record<string, string>;
  playerStatsMap: Record<string, { goals: number; assists: number }>;
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (key: string) => setOpenGroups(prev => ({ ...prev, [key]: !prev[key] }));

  if (tournament.standings.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center text-center">
        <Trophy size={48} className="text-neutral-800 mb-4" />
        <p className="text-neutral-500 font-bold">No standings yet.</p>
        <p className="text-neutral-600 text-xs mt-1">Matches still in progress.</p>
      </div>
    );
  }

  const isCricket = tournament.sport === 'CRICKET';
  const isFootball = tournament.sport === 'FOOTBALL';
  const matches = tournament.matches || [];

  // ── Group stage standings ───────────────────────────────────────────────────
  const groupStandings: Record<string, any[]> = {};
  tournament.standings.forEach((s: any) => {
    if (!s.groupId) return;
    if (!groupStandings[s.groupId]) groupStandings[s.groupId] = [];
    groupStandings[s.groupId].push(s);
  });

  const groupIds = Object.keys(groupStandings);
  const groupStageComplete = groupIds.length > 0 && groupIds.every(gid =>
    (groupStandings[gid] || []).every((s: any) => {
      const groupMatches = matches.filter((m: any) => m.groupId === gid);
      return groupMatches.length > 0 && groupMatches.every((m: any) => m.status === 'COMPLETED');
    })
  );

  // ── Knockout stage analysis ─────────────────────────────────────────────────
  const qfMatches = matches.filter((m: any) => m.stage === 'QUARTER');
  const sfMatches = matches.filter((m: any) => m.stage === 'SEMI');
  const finalMatches = matches.filter((m: any) => m.stage === 'FINAL');

  const qfDone = qfMatches.length > 0 && qfMatches.every((m: any) => m.status === 'COMPLETED');
  const sfDone = sfMatches.length > 0 && sfMatches.every((m: any) => m.status === 'COMPLETED');
  const finalDone = finalMatches.length > 0 && finalMatches.every((m: any) => m.status === 'COMPLETED');

  // Teams advancing through knockout stages
  const qfTeamIds = qfMatches.length > 0
    ? [...new Set(qfMatches.flatMap((m: any) => [m.teamAId, m.teamBId]).filter(Boolean))]
    : [];
  const sfTeamIds = sfMatches.length > 0
    ? [...new Set(sfMatches.flatMap((m: any) => [m.teamAId, m.teamBId]).filter(Boolean))]
    : [];
  const finalTeamIds = finalMatches.length > 0
    ? [...new Set(finalMatches.flatMap((m: any) => [m.teamAId, m.teamBId]).filter(Boolean))]
    : [];
  const championId = finalDone ? finalMatches[0]?.winnerId : null;

  // ── Overall team standings ──────────────────────────────────────────────────
  // All registered teams, sorted by: still-in > knocked-out | stage reached | group pts
  const allTeamIds = tournament.registrations
    .filter(r => r.entityType === 'TEAM')
    .map(r => r.entityId);

  function stageReached(teamId: string): number {
    if (championId === teamId) return 6;
    if (finalTeamIds.includes(teamId)) return 5;
    if (sfTeamIds.includes(teamId)) return sfDone ? 4 : 4;
    if (qfTeamIds.includes(teamId)) return qfDone ? 3 : 3;
    if (groupStageComplete && tournament.standings.some((s: any) => s.teamId === teamId && s.qualified)) return 2;
    return 1;
  }

  function isEliminated(teamId: string): boolean {
    // Knocked out if group done and not qualified, or if made it to KO but lost
    if (groupStageComplete) {
      const s = tournament.standings.find((x: any) => x.teamId === teamId);
      if (s && !s.qualified && !qfTeamIds.includes(teamId)) return true;
    }
    if (qfDone && qfTeamIds.includes(teamId) && !sfTeamIds.includes(teamId)) return true;
    if (sfDone && sfTeamIds.includes(teamId) && !finalTeamIds.includes(teamId)) return true;
    if (finalDone && finalTeamIds.includes(teamId) && championId !== teamId) return true;
    return false;
  }

  const sortedOverall = [...allTeamIds].sort((a, b) => {
    const elimA = isEliminated(a);
    const elimB = isEliminated(b);
    if (elimA !== elimB) return elimA ? 1 : -1;
    const stageA = stageReached(a);
    const stageB = stageReached(b);
    if (stageA !== stageB) return stageB - stageA;
    const standingA = tournament.standings.find((s: any) => s.teamId === a);
    const standingB = tournament.standings.find((s: any) => s.teamId === b);
    return (standingB?.points ?? 0) - (standingA?.points ?? 0);
  });

  // ── Top 20 players from registered teams ────────────────────────────────────
  interface PlayerEntry { id: string; name: string; avatar?: string; teamName: string; mmr: number; level: number; }
  const allPlayers: PlayerEntry[] = [];
  tournament.registrations.forEach(r => {
    if (r.team && r.team.members) {
      r.team.members.forEach(m => {
        if (m.player) {
          allPlayers.push({
            id: m.player.id,
            name: m.player.fullName,
            avatar: m.player.avatarUrl,
            teamName: r.team!.name,
            mmr: tournament.sport === 'CRICKET' ? m.player.cricketMmr : m.player.footballMmr,
            level: m.player.level,
          });
        }
      });
    }
  });
  const top20 = allPlayers
    .sort((a, b) => b.mmr - a.mmr)
    .slice(0, 20);

  const stageLabel: Record<string, string> = {
    QUARTER: 'Quarter Finals',
    SEMI: 'Semi Finals',
    FINAL: 'Grand Final',
  };

  function StandingRow({ s, idx }: { s: any; idx: number }) {
    const teamName = teamNameMap[s.teamId] || s.teamId.slice(0, 12) + '…';
    const logo = teamLogoMap[s.teamId];
    const isTop = idx < 2;
    const nrr = s.nrr >= 0 ? `+${s.nrr.toFixed(2)}` : s.nrr.toFixed(2);
    const gd = s.goalDifference >= 0 ? `+${s.goalDifference}` : String(s.goalDifference);
    return (
      <div className={`grid grid-cols-[2rem_1fr_auto] gap-0 items-center px-4 py-3 ${isTop ? 'bg-yellow-500/[0.03]' : ''}`}>
        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
          idx === 0 ? 'bg-yellow-500/25 text-yellow-400' :
          idx === 1 ? 'bg-neutral-400/20 text-neutral-300' :
          'bg-white/5 text-neutral-500'
        }`}>{s.position || idx + 1}</span>
        <div className="flex items-center gap-2 min-w-0 pl-2">
          {logo && <img src={logo} alt="" className="w-5 h-5 rounded-full object-cover shrink-0 border border-white/10" />}
          <span className="text-sm font-bold text-white truncate">{teamName}</span>
          {s.qualified && (
            <span className="shrink-0 text-[8px] font-black uppercase tracking-widest text-[#00ff41] bg-[#00ff41]/10 px-1.5 py-0.5 rounded-full">Q</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs font-black shrink-0">
          <span className="w-5 text-center text-neutral-400">{s.played}</span>
          <span className="w-5 text-center text-[#00ff41]">{s.won}</span>
          <span className="w-5 text-center text-red-400">{s.lost}</span>
          {isFootball && <span className="w-5 text-center text-neutral-400">{s.drawn}</span>}
          {isCricket && <span className="w-5 text-center text-neutral-400">{s.noResult}</span>}
          {isFootball && <span className={`w-6 text-center text-xs font-bold ${s.goalDifference > 0 ? 'text-[#00ff41]' : s.goalDifference < 0 ? 'text-red-400' : 'text-neutral-500'}`}>{gd}</span>}
          {isCricket && <span className={`w-8 text-center text-xs font-bold ${s.nrr > 0 ? 'text-[#00ff41]' : s.nrr < 0 ? 'text-red-400' : 'text-neutral-500'}`}>{nrr}</span>}
          <span className="w-7 text-center text-white font-black">{s.points}</span>
        </div>
      </div>
    );
  }

  function StandingColHeaders() {
    return (
      <div className="grid grid-cols-[2rem_1fr_auto] gap-0 px-4 py-2 border-b border-white/5">
        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">#</span>
        <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600 pl-2">Team</span>
        <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-neutral-600">
          <span className="w-5 text-center" title="Played">P</span>
          <span className="w-5 text-center" title="Won">W</span>
          <span className="w-5 text-center" title="Lost">L</span>
          {isFootball && <span className="w-5 text-center" title="Drawn">D</span>}
          {isCricket && <span className="w-5 text-center" title="No Result">NR</span>}
          {isFootball && <span className="w-6 text-center" title="Goal Difference">GD</span>}
          {isCricket && <span className="w-8 text-center" title="Net Run Rate">NRR</span>}
          <span className="w-7 text-center text-white" title="Points">Pts</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Section A: Group Stage Standings (Accordions) ── */}
      {groupIds.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Group Stage</h3>
            {groupStageComplete && (
              <span className="text-[9px] font-black uppercase tracking-widest text-[#00ff41] bg-[#00ff41]/10 px-2 py-0.5 rounded-full">Concluded ✓</span>
            )}
          </div>

          {groupIds
            .sort((a, b) => (groupNames[a] || '').localeCompare(groupNames[b] || ''))
            .map(groupId => {
              const rows = [...(groupStandings[groupId] || [])].sort((a, b) => a.position - b.position || b.points - a.points);
              const label = groupNames[groupId] || 'Group';
              const isOpen = openGroups[groupId] !== false; // open by default
              const groupComplete = matches
                .filter((m: any) => m.groupId === groupId)
                .every((m: any) => m.status === 'COMPLETED');

              return (
                <div key={groupId} className="bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden">
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleGroup(groupId)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-black/20 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="font-black uppercase tracking-widest text-sm text-yellow-400">{label}</h3>
                      {groupComplete && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-[#00ff41] bg-[#00ff41]/10 px-1.5 py-0.5 rounded-full">Done</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-neutral-500">{rows.length} teams</span>
                      <ChevronDown size={14} className={`text-neutral-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {isOpen && (
                    <>
                      <StandingColHeaders />
                      <div className="divide-y divide-white/5">
                        {rows.map((s: any, idx: number) => <StandingRow key={s.id} s={s} idx={idx} />)}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* ── Section B: Knockout Stage Progress ── */}
      {(qfMatches.length > 0 || sfMatches.length > 0 || finalMatches.length > 0) && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Knockout Stages</h3>

          {[
            { stage: 'QUARTER', teamIds: qfTeamIds, done: qfDone, matches: qfMatches },
            { stage: 'SEMI', teamIds: sfTeamIds, done: sfDone, matches: sfMatches },
            { stage: 'FINAL', teamIds: finalTeamIds, done: finalDone, matches: finalMatches },
          ].filter(({ teamIds }) => teamIds.length > 0).map(({ stage, teamIds, done, matches: stageMatches }) => (
            <div key={stage} className={`border rounded-2xl overflow-hidden ${
              stage === 'FINAL' ? 'border-yellow-500/20 bg-yellow-950/10' :
              stage === 'SEMI' ? 'border-purple-500/20 bg-purple-950/10' :
              'border-blue-500/20 bg-blue-950/10'
            }`}>
              <div className={`px-4 py-2.5 border-b flex items-center justify-between ${
                stage === 'FINAL' ? 'border-yellow-500/20' :
                stage === 'SEMI' ? 'border-purple-500/20' :
                'border-blue-500/20'
              }`}>
                <h4 className={`font-black uppercase tracking-widest text-xs ${
                  stage === 'FINAL' ? 'text-yellow-400' :
                  stage === 'SEMI' ? 'text-purple-400' :
                  'text-blue-400'
                }`}>{stageLabel[stage]}</h4>
                {done && <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                  stage === 'FINAL' ? 'text-yellow-400 bg-yellow-500/10' :
                  'text-[#00ff41] bg-[#00ff41]/10'
                }`}>Done ✓</span>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3">
                {teamIds.map(tid => {
                  const isWinner = done && stageMatches.some((m: any) => m.winnerId === tid);
                  const isLoser = done && stageMatches.some((m: any) => m.winnerId && m.winnerId !== tid && (m.teamAId === tid || m.teamBId === tid));
                  const logo = teamLogoMap[tid];
                  return (
                    <div key={tid} className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
                      tid === championId ? 'bg-yellow-500/10 border border-yellow-500/20' :
                      isWinner ? 'bg-[#00ff41]/5 border border-[#00ff41]/10' :
                      isLoser ? 'opacity-40 bg-black/20 border border-white/5' :
                      'bg-black/20 border border-white/5'
                    }`}>
                      <div className="w-6 h-6 rounded-full bg-neutral-900 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                        {logo ? <img src={logo} alt="" className="w-full h-full object-cover" /> : <Shield size={12} className="text-neutral-600" />}
                      </div>
                      <span className={`text-[10px] font-black truncate ${
                        tid === championId ? 'text-yellow-400' :
                        isWinner ? 'text-[#00ff41]' :
                        'text-white'
                      }`}>
                        {teamNameMap[tid] || '?'}
                      </span>
                      {tid === championId && <Trophy size={10} className="text-yellow-400 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Section C: Overall Team Rankings ── */}
      {sortedOverall.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Overall Team Rankings</h3>
          <div className="bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden">
            <div className="divide-y divide-white/5">
              {sortedOverall.map((teamId, rank) => {
                const name = teamNameMap[teamId] || teamId.slice(0, 12) + '…';
                const logo = teamLogoMap[teamId];
                const elim = isEliminated(teamId);
                const stage = stageReached(teamId);
                const stageBadge = championId === teamId ? { label: '🏆 Champion', cls: 'text-yellow-400 bg-yellow-500/10' }
                  : stage >= 5 ? { label: 'Finalist', cls: 'text-yellow-400/70 bg-yellow-500/10' }
                  : stage >= 4 ? { label: 'Semi Finals', cls: 'text-purple-400 bg-purple-500/10' }
                  : stage >= 3 ? { label: 'Quarter Finals', cls: 'text-blue-400 bg-blue-500/10' }
                  : stage >= 2 ? { label: 'Qualified', cls: 'text-[#00ff41] bg-[#00ff41]/10' }
                  : null;

                return (
                  <div key={teamId} className={`flex items-center gap-3 px-4 py-3 transition-all ${elim ? 'opacity-40' : ''}`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      rank === 0 ? 'bg-yellow-500/25 text-yellow-400' :
                      rank === 1 ? 'bg-neutral-400/20 text-neutral-300' :
                      rank === 2 ? 'bg-amber-700/20 text-amber-600' :
                      'bg-white/5 text-neutral-500'
                    }`}>{rank + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-neutral-950 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                      {logo ? <img src={logo} alt="" className="w-full h-full object-cover" /> : <Shield size={14} className="text-neutral-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white truncate">{name}</p>
                      {elim && <p className="text-[9px] font-bold text-neutral-600 uppercase tracking-wider">Eliminated</p>}
                    </div>
                    {stageBadge && (
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${stageBadge.cls}`}>
                        {stageBadge.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Section D: Top 20 Players ── */}
      {top20.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400">Top Players</h3>
          <div className="bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden">
            {/* Column headers */}
            <div className="px-4 py-2 border-b border-white/5 flex items-center text-[9px] font-black uppercase tracking-widest text-neutral-600">
              <span className="w-8 shrink-0">#</span>
              <span className="flex-1">Player</span>
              {isFootball && (
                <div className="flex items-center gap-3 shrink-0">
                  <span className="w-8 text-center" title="Goals">⚽G</span>
                  <span className="w-8 text-center" title="Assists">🅰A</span>
                  <span className="w-10 text-center text-white">MMR</span>
                </div>
              )}
              {isCricket && (
                <div className="flex items-center gap-3 shrink-0">
                  <span className="w-10 text-center" title="Runs">Runs</span>
                  <span className="w-10 text-center" title="Wickets">Wkts</span>
                  <span className="w-10 text-center text-white">MMR</span>
                </div>
              )}
              {!isFootball && !isCricket && <span className="w-10 text-center text-white">MMR</span>}
            </div>
            <div className="divide-y divide-white/5">
              {top20.map((p, idx) => {
                const pStats = playerStatsMap[p.id];
                const goals = pStats?.goals ?? 0;
                const assists = pStats?.assists ?? 0;
                const hasStats = goals > 0 || assists > 0;
                return (
                  <div key={p.id} className="flex items-center gap-2 px-4 py-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                      idx === 0 ? 'bg-yellow-500/25 text-yellow-400' :
                      idx === 1 ? 'bg-neutral-400/20 text-neutral-300' :
                      idx === 2 ? 'bg-amber-700/20 text-amber-600' :
                      'bg-white/5 text-neutral-500'
                    }`}>{idx + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-neutral-950 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                      {p.avatar ? <img src={p.avatar} alt="" className="w-full h-full object-cover" /> : <Users size={12} className="text-neutral-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-white truncate">{p.name}</p>
                      <p className="text-[9px] text-neutral-500 font-bold truncate">{p.teamName} · Lvl {p.level}</p>
                    </div>
                    {isFootball && (
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-8 text-center">
                          <p className={`text-sm font-black ${goals > 0 ? 'text-[#00ff41]' : 'text-neutral-600'}`}>{goals}</p>
                        </div>
                        <div className="w-8 text-center">
                          <p className={`text-sm font-black ${assists > 0 ? 'text-blue-400' : 'text-neutral-600'}`}>{assists}</p>
                        </div>
                        <div className="w-10 text-center">
                          <p className="text-sm font-black text-yellow-400">{p.mmr}</p>
                        </div>
                      </div>
                    )}
                    {isCricket && (
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="w-10 text-center">
                          <p className={`text-sm font-black ${(pStats?.goals ?? 0) > 0 ? 'text-[#00ff41]' : 'text-neutral-600'}`}>{pStats?.goals ?? 0}</p>
                        </div>
                        <div className="w-10 text-center">
                          <p className={`text-sm font-black ${(pStats?.assists ?? 0) > 0 ? 'text-red-400' : 'text-neutral-600'}`}>{pStats?.assists ?? 0}</p>
                        </div>
                        <div className="w-10 text-center">
                          <p className="text-sm font-black text-yellow-400">{p.mmr}</p>
                        </div>
                      </div>
                    )}
                    {!isFootball && !isCricket && (
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-yellow-400">{p.mmr}</p>
                        <p className="text-[9px] text-neutral-600 font-bold">MMR</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RegistrationModal({ tournament, onClose, onSuccess }: {
  tournament: Tournament;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'en';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedTeamData, setSelectedTeamData] = useState<any>(null);

  const isPlayerReg = tournament.registrationType === 'PLAYER';
  const pid = getCookie('bmt_player_id');
  const isSignedOut = !pid;

  useEffect(() => {
    if (isSignedOut) return;

    if (isPlayerReg) {
      fetch(`/api/bmt/players/${pid}`)
        .then(r => r.json())
        .then(data => { setPlayerInfo(data); setLoading(false); })
        .catch(() => { setError('Failed to load profile'); setLoading(false); });
    } else {
      fetch('/api/teams?type=TOURNAMENT')
        .then(r => r.json())
        .then(data => {
          const teams = data.teams || [];
          setMyTeams(teams);
          if (teams.length > 0) {
            setSelectedTeamId(teams[0].id);
          } else {
            setLoading(false);
          }
        })
        .catch(() => { setError('Failed to load teams'); setLoading(false); });
    }
  }, [isPlayerReg, isSignedOut, pid]);

  useEffect(() => {
    if (!selectedTeamId) return;
    setLoading(true);
    fetch(`/api/teams/${selectedTeamId}`)
      .then(r => r.json())
      .then(data => {
        if (data.team) {
          setSelectedTeamData(data.team);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedTeamId]);

  const handleRegister = async () => {
    setSubmitting(true);
    setError('');
    const entityId = isPlayerReg ? pid : selectedTeamId;
    if (!entityId) { setError(isPlayerReg ? 'Missing Player ID' : 'Please select a team.'); setSubmitting(false); return; }

    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: tournament.registrationType, entityId }),
      });
      const data = await res.json();
      if (data.success) { onSuccess(); }
      else { setError(data.error || 'Failed to register'); }
    } catch (e: any) {
      setError(e.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (isSignedOut) {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
        <div className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col p-6 text-center">
          <div className="flex justify-end">
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="my-6 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-4 animate-pulse">
              <Shield size={32} />
            </div>
            <h3 className="text-xl font-black text-white mb-2 font-display">Login Required</h3>
            <p className="text-sm text-neutral-400 max-w-xs leading-relaxed">
              You must be signed in to participate and register for this tournament.
            </p>
          </div>
          <button
            onClick={() => router.push(`/${locale}/login?next=${encodeURIComponent(pathname)}`)}
            className="w-full bg-blue-500 text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-blue-400 hover:shadow-lg hover:shadow-blue-500/20 transition-all font-display"
          >
            Please Login
          </button>
        </div>
      </div>
    );
  }

  const balance = isPlayerReg
    ? (playerInfo?.walletBalance ?? 0)
    : (selectedTeamData?.owner?.walletBalance ?? 0);
  const balanceAfter = balance - tournament.entryFee;
  const hasEnoughBalance = tournament.entryFee === 0 || balance >= tournament.entryFee;

  const submitDisabled =
    submitting || loading ||
    !hasEnoughBalance ||
    (!isPlayerReg && myTeams.length === 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-zinc-950 border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-black/40">
          <h3 className="font-black text-lg">Join Tournament</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">

          {/* Entry fee banner */}
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-2xl p-4 flex flex-col items-center text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Entry Fee</p>
            <p className="text-3xl font-black text-white">
              {tournament.entryFee > 0 ? `BDT ${tournament.entryFee.toLocaleString()}` : 'Free'}
            </p>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
            </div>
          )}

          {/* Player registration */}
          {!loading && isPlayerReg && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-4 bg-zinc-900 border border-white/5 rounded-xl">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Your Wallet Balance</p>
                  <p className="text-xl font-black text-white mt-1">BDT {balance.toLocaleString()}</p>
                </div>
                {hasEnoughBalance ? (
                  <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Check size={16} strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                    <AlertTriangle size={16} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Team registration */}
          {!loading && !isPlayerReg && (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-black uppercase tracking-widest text-neutral-500">
                Select Tournament Team
              </label>
              {myTeams.length === 0 ? (
                <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-xl text-center">
                  <p className="text-sm font-bold text-red-400">You don't have any Tournament Teams.</p>
                  <p className="text-xs text-red-400/60 mt-1">Create one in Arena &gt; Teams &gt; Tournament Team first.</p>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <select
                      value={selectedTeamId}
                      onChange={e => setSelectedTeamId(e.target.value)}
                      className="w-full appearance-none bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-sm font-black text-white focus:border-blue-500 outline-none"
                    >
                      {myTeams.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none" />
                  </div>

                  {selectedTeamData && (
                    <div className="flex items-center justify-between p-4 bg-zinc-900 border border-white/5 rounded-xl mt-1">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                          Owner: {selectedTeamData.owner?.fullName || 'Unknown'}
                        </p>
                        <p className="text-[10px] font-bold text-neutral-400 mt-0.5">Owner's Balance</p>
                        <p className="text-lg font-black text-white mt-0.5">BDT {balance.toLocaleString()}</p>
                      </div>
                      {hasEnoughBalance ? (
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                          <Check size={16} strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                          <AlertTriangle size={16} />
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Checkout Invoice Summary */}
          {!loading && (myTeams.length > 0 || isPlayerReg) && (
            <div className="bg-zinc-900/60 border border-white/5 rounded-2xl p-4 space-y-3 mt-1">
              <h4 className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-1">Invoice Summary</h4>
              <div className="flex justify-between items-center text-xs font-bold text-neutral-400">
                <span>Entry Fee</span>
                <span className="text-white font-black">BDT {tournament.entryFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-neutral-400">
                <span>{isPlayerReg ? 'Your Current Balance' : "Owner's Current Balance"}</span>
                <span className="text-white font-black">BDT {balance.toLocaleString()}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wider text-neutral-400">Balance After Paying</span>
                <span className={`text-sm font-black ${balanceAfter >= 0 ? 'text-[#00ff41]' : 'text-red-500'}`}>
                  BDT {balanceAfter.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* Balance Warn Error */}
          {!loading && !hasEnoughBalance && (myTeams.length > 0 || isPlayerReg) && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 text-center">
              {isPlayerReg
                ? `Insufficient balance. You need BDT ${Math.abs(balanceAfter).toLocaleString()} more to join.`
                : `Insufficient balance. Team Owner (${selectedTeamData?.owner?.fullName || 'Owner'}) needs BDT ${Math.abs(balanceAfter).toLocaleString()} more to pay the entry fee.`}
            </div>
          )}

          {/* API error */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 text-center">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/5 bg-black/40 pb-10 sm:pb-5">
          <button
            onClick={handleRegister}
            disabled={submitDisabled}
            className={`w-full text-white font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              hasEnoughBalance && !loading ? 'bg-blue-500 hover:bg-blue-400 hover:shadow-lg hover:shadow-blue-500/20' : 'bg-red-650'
            }`}
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Pay and Enter'}
          </button>
        </div>
      </div>
    </div>
  );
}
