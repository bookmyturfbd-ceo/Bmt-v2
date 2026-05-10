'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import {
  ArrowLeft, Trophy, Users, Calendar, Loader2, AlertTriangle,
  ChevronDown, Check, X, Star, Zap, Shield,
} from 'lucide-react';
import { getCookie } from '@/lib/cookies';

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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TournamentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'en';

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'teams' | 'matches' | 'standings'>('overview');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    fetch(`/api/arena/tournaments/${id}`)
      .then(r => r.json())
      .then(data => { if (data.success) setTournament(data.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

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
  tournament.registrations.forEach(r => {
    if (r.team) teamNameMap[r.entityId] = r.team.name;
    if (r.player) teamNameMap[r.entityId] = r.player.fullName;
  });

  const mainSponsors = tournament.sponsors.filter(s => s.type === 'MAIN').sort((a, b) => a.order - b.order);
  const coSponsors = tournament.sponsors.filter(s => s.type === 'CO_SPONSOR').sort((a, b) => a.order - b.order);

  const groupNames: Record<string, string> = {};
  tournament.groups.forEach(g => { groupNames[g.id] = g.name; });

  const tabs = (['overview', 'teams', 'matches', 'standings'] as const);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-28">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5 px-4 py-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-black text-base truncate flex-1">{tournament.name}</h1>
        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 ${statusColor(tournament.status)}`}>
          {tournament.status.replace(/_/g, ' ')}
        </span>
      </header>

      {/* ── Hero Banner ── */}
      <div className="relative bg-gradient-to-br from-yellow-950/60 via-amber-900/30 to-[#0a0a0a] px-6 py-10 border-b border-white/5 overflow-hidden">
        <div className="absolute right-4 top-4 opacity-10 pointer-events-none">
          <Trophy size={120} className="text-yellow-400" />
        </div>
        <div className="relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400/60 mb-1">
            {tournament.sport} · {tournament.formatType?.replace(/_/g, ' ')}
          </p>
          <h2 className="text-3xl font-black text-white mb-4 leading-tight">{tournament.name}</h2>
          <div className="flex flex-wrap gap-4 text-xs font-bold text-neutral-400">
            <div className="flex items-center gap-1.5">
              <Users size={14} />
              <span>{tournament._count?.registrations} / {tournament.maxParticipants} Teams</span>
            </div>
            {tournament.prizePoolTotal > 0 && (
              <div className="flex items-center gap-1.5 text-yellow-400">
                <Trophy size={14} />
                <span>{tournament.prizePoolTotal.toLocaleString()} Coins Prize</span>
              </div>
            )}
            {tournament.entryFee > 0 && (
              <div className="flex items-center gap-1.5">
                <Zap size={14} />
                <span>{tournament.entryFee} Coins Entry</span>
              </div>
            )}
            {tournament.venue && (
              <div className="flex items-center gap-1.5">
                <Shield size={14} />
                <span>{tournament.venue}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sponsor Strip ── */}
      {tournament.sponsors.length > 0 && (
        <div className="px-4 py-4 border-b border-white/5 bg-black/30">
          {mainSponsors.length > 0 && (
            <div className="mb-3">
              <p className="text-[9px] font-black uppercase tracking-widest text-yellow-400/60 mb-2 text-center">Main Sponsor</p>
              <div className="flex items-center justify-center gap-4">
                {mainSponsors.map(s => (
                  <a key={s.id} href={s.ctaUrl || '#'} target="_blank" rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 group">
                    <div className="w-24 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center p-2 group-hover:border-yellow-400/40 transition-colors">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.logoUrl} alt={s.name} className="max-h-full max-w-full object-contain" />
                    </div>
                    <span className="text-[9px] font-bold text-neutral-400 group-hover:text-yellow-400 transition-colors">{s.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          {coSponsors.length > 0 && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-2 text-center">Co-Sponsors</p>
              <div className="flex items-center justify-center flex-wrap gap-3">
                {coSponsors.map(s => (
                  <a key={s.id} href={s.ctaUrl || '#'} target="_blank" rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 group">
                    <div className="w-16 h-9 rounded-lg bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center p-1.5 group-hover:border-white/30 transition-colors">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.logoUrl} alt={s.name} className="max-h-full max-w-full object-contain" />
                    </div>
                    <span className="text-[8px] font-bold text-neutral-500 group-hover:text-white transition-colors">{s.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Register CTA ── */}
      {tournament.status === 'REGISTRATION_OPEN' && (
        <div className="px-4 py-4 border-b border-white/5 bg-blue-500/5">
          <button
            onClick={() => setIsRegistering(true)}
            className="w-full bg-blue-500 text-white font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-blue-400 transition-colors"
          >
            {tournament.registrationType === 'PLAYER' ? 'Join as Player' : 'Register Your Team'}
          </button>
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
        {tab === 'matches'    && <MatchesTab tournament={tournament} teamNameMap={teamNameMap} />}
        {tab === 'standings'  && <StandingsTab tournament={tournament} teamNameMap={teamNameMap} groupNames={groupNames} />}
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

  const infoRows = [
    ['Format',          tournament.formatType?.replace(/_/g, ' ')],
    ['Sport',           tournament.sport],
    ['Registration',    tournament.registrationType === 'TEAM' ? 'Team-based' : 'Individual Players'],
    ['Max Teams',       String(tournament.maxParticipants)],
    ['Entry Fee',       tournament.entryFee > 0 ? `${tournament.entryFee.toLocaleString()} Coins` : 'Free'],
    ['Prize Pool',      tournament.prizePoolTotal > 0 ? `${tournament.prizePoolTotal.toLocaleString()} Coins` : 'Trophy Only'],
    ['Prize Type',      tournament.prizeType?.replace(/_/g, ' ')],
    ...(tournament.venue    ? [['Venue', tournament.venue]] : []),
    ...(tournament.startDate ? [['Starts', new Date(tournament.startDate).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })]] : []),
    ...(tournament.endDate   ? [['Ends',   new Date(tournament.endDate).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })]] : []),
  ];

  return (
    <div className="flex flex-col gap-5">

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

      {/* Prize Distribution */}
      {Object.keys(prizeMap).length > 0 && (
        <div className="bg-neutral-900 border border-white/5 rounded-2xl p-5">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Prize Distribution</h3>
          <div className="flex flex-col gap-2">
            {Object.entries(prizeMap).map(([place, pct]) => {
              const coins = Math.round((pct / 100) * tournament.prizePoolTotal);
              const icons: Record<string, string> = { '1st': '🥇', '2nd': '🥈', '3rd': '🥉' };
              return (
                <div key={place} className="flex items-center justify-between px-4 py-3 rounded-xl bg-black/40 border border-white/5">
                  <span className="font-black text-sm text-white">{icons[place] || '🏅'} {place} Place</span>
                  <div className="text-right">
                    <p className="text-yellow-400 font-black text-sm">{coins.toLocaleString()} Coins</p>
                    <p className="text-[10px] text-neutral-500 font-bold">{pct}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Groups */}
      {tournament.groups.length > 0 && (
        <div className="bg-neutral-900 border border-white/5 rounded-2xl p-5">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Groups</h3>
          <div className="grid grid-cols-2 gap-3">
            {tournament.groups.map(g => (
              <div key={g.id} className="bg-black/40 border border-white/5 rounded-xl p-4">
                <p className="font-black text-yellow-400 mb-1">{g.name}</p>
                <p className="text-xs text-neutral-400 font-bold">{g.teamIds?.length || 0} Teams</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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
              <div className="border-t border-white/5 divide-y divide-white/5">
                {team.members.map(m => {
                  const p = m.player;
                  const pMmr = tournament.sport === 'FOOTBALL' ? p.footballMmr : p.cricketMmr;
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3">
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

                      {/* Name + role */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{p.fullName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {m.role === 'captain' && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded-md">
                              Captain
                            </span>
                          )}
                          {m.sportRole && (
                            <span className="text-[9px] text-neutral-500 font-bold">{m.sportRole}</span>
                          )}
                          {m.isStarter && (
                            <span className="text-[8px] font-black text-[#00ff41] bg-[#00ff41]/10 px-1.5 py-0.5 rounded-md">
                              Starter
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Player MMR */}
                      <div className="shrink-0 flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg">
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
              <div className="border-t border-white/5 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                  {player.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={player.avatarUrl} alt={player.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-black text-neutral-400">{player.fullName.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{player.fullName}</p>
                  <p className="text-[10px] text-neutral-500 font-bold">Level {player.level}</p>
                </div>
                <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-lg">
                  <Star size={10} className="text-yellow-400" />
                  <span className="text-[11px] font-black text-yellow-400">{mmr}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
function MatchesTab({ tournament, teamNameMap }: { tournament: Tournament; teamNameMap: Record<string, string> }) {
  if (tournament.matches.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center text-center">
        <Calendar size={48} className="text-neutral-800 mb-4" />
        <p className="text-neutral-500 font-bold">No matches scheduled yet.</p>
        <p className="text-neutral-600 text-xs mt-1">Check back once the bracket is set.</p>
      </div>
    );
  }

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

  function matchStatusStyle(s: string) {
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
      return side === 'A' ? rs.runsA ?? null : rs.runsB ?? null;
    }
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      {orderedStages.map(stage => (
        <div key={stage}>
          {/* Stage header */}
          <div className="flex items-center gap-3 mb-3">
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
                      {m.scheduledAt && ` · ${new Date(m.scheduledAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                      {m.venue && ` · ${m.venue}`}
                    </span>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${matchStatusStyle(m.status)}`}>
                      {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mr-1 animate-pulse" />}
                      {m.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Teams VS */}
                  <div className="flex items-center px-4 py-4 gap-3">
                    {/* Team A */}
                    <div className={`flex-1 text-center ${winnerIsA ? 'opacity-100' : isDone ? 'opacity-50' : ''}`}>
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
                    <div className={`flex-1 text-center ${winnerIsB ? 'opacity-100' : isDone ? 'opacity-50' : ''}`}>
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
  );
}
function StandingsTab({ tournament, teamNameMap, groupNames }: {
  tournament: Tournament;
  teamNameMap: Record<string, string>;
  groupNames: Record<string, string>;
}) {
  if (tournament.standings.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center text-center">
        <Trophy size={48} className="text-neutral-800 mb-4" />
        <p className="text-neutral-500 font-bold">No standings yet.</p>
        <p className="text-neutral-600 text-xs mt-1">Matches still in progress.</p>
      </div>
    );
  }

  // Group standings by groupId (null → 'overall')
  const grouped: Record<string, any[]> = {};
  tournament.standings.forEach((s: any) => {
    const key = s.groupId || 'overall';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });

  const isCricket = tournament.sport === 'CRICKET';
  const isFootball = tournament.sport === 'FOOTBALL';

  return (
    <div className="flex flex-col gap-5">
      {Object.entries(grouped).map(([groupId, rows]) => {
        const sorted = [...rows].sort((a, b) => a.position - b.position);
        const label = groupId === 'overall'
          ? 'Overall Standings'
          : groupNames[groupId] || 'Group';

        return (
          <div key={groupId} className="bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden">

            {/* Group header */}
            <div className="px-4 py-3 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center justify-between">
              <h3 className="font-black uppercase tracking-widest text-sm text-yellow-400">{label}</h3>
              <span className="text-[10px] font-bold text-neutral-500">{sorted.length} teams</span>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[2rem_1fr_auto] gap-0 px-4 py-2 border-b border-white/5">
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">#</span>
              <span className="text-[9px] font-black uppercase tracking-widest text-neutral-600">Team</span>
              <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-neutral-600">
                <span className="w-5 text-center" title="Played">P</span>
                <span className="w-5 text-center" title="Won">W</span>
                <span className="w-5 text-center" title="Lost">L</span>
                {isFootball && <span className="w-5 text-center" title="Drawn">D</span>}
                {isCricket  && <span className="w-5 text-center" title="No Result">NR</span>}
                {isFootball && <span className="w-6 text-center" title="Goal Difference">GD</span>}
                {isCricket  && <span className="w-8 text-center" title="Net Run Rate">NRR</span>}
                <span className="w-7 text-center text-white" title="Points">Pts</span>
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/5">
              {sorted.map((s: any, idx: number) => {
                const teamName = teamNameMap[s.teamId] || s.teamId.slice(0, 12) + '…';
                const isTop = idx < 2;
                const nrr = s.nrr >= 0 ? `+${s.nrr.toFixed(3)}` : s.nrr.toFixed(3);
                const gd = s.goalDifference >= 0 ? `+${s.goalDifference}` : String(s.goalDifference);

                return (
                  <div key={s.id} className={`grid grid-cols-[2rem_1fr_auto] gap-0 items-center px-4 py-3 ${
                    isTop ? 'bg-yellow-500/[0.03]' : ''
                  }`}>
                    {/* Position */}
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                      idx === 0 ? 'bg-yellow-500/25 text-yellow-400' :
                      idx === 1 ? 'bg-neutral-400/20 text-neutral-300' :
                      idx === 2 ? 'bg-amber-700/20 text-amber-600' :
                      'bg-white/5 text-neutral-500'
                    }`}>
                      {s.position}
                    </span>

                    {/* Team name + qualified badge */}
                    <div className="flex items-center gap-2 min-w-0 pl-2">
                      <span className="text-sm font-bold text-white truncate">{teamName}</span>
                      {s.qualified && (
                        <span className="shrink-0 text-[8px] font-black uppercase tracking-widest text-[#00ff41] bg-[#00ff41]/10 px-1.5 py-0.5 rounded-full">
                          Q
                        </span>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs font-black shrink-0">
                      <span className="w-5 text-center text-neutral-400">{s.played}</span>
                      <span className="w-5 text-center text-[#00ff41]">{s.won}</span>
                      <span className="w-5 text-center text-red-400">{s.lost}</span>
                      {isFootball && <span className="w-5 text-center text-neutral-400">{s.drawn}</span>}
                      {isCricket  && <span className="w-5 text-center text-neutral-400">{s.noResult}</span>}
                      {isFootball && (
                        <span className={`w-6 text-center text-xs font-bold ${
                          s.goalDifference > 0 ? 'text-[#00ff41]' :
                          s.goalDifference < 0 ? 'text-red-400' : 'text-neutral-500'
                        }`}>{gd}</span>
                      )}
                      {isCricket && (
                        <span className={`w-8 text-center text-xs font-bold ${
                          s.nrr > 0 ? 'text-[#00ff41]' :
                          s.nrr < 0 ? 'text-red-400' : 'text-neutral-500'
                        }`}>{nrr}</span>
                      )}
                      <span className="w-7 text-center text-white font-black">{s.points}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
function RegistrationModal({ tournament, onClose, onSuccess }: {
  tournament: Tournament;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');

  const isPlayerReg = tournament.registrationType === 'PLAYER';

  useEffect(() => {
    const pid = getCookie('bmt_player_id');
    if (!pid) { setError('You must be signed in to register.'); setLoading(false); return; }

    if (isPlayerReg) {
      fetch(`/api/bmt/players/${pid}`)
        .then(r => r.json())
        .then(data => { setPlayerInfo(data); setLoading(false); })
        .catch(() => { setError('Failed to load profile'); setLoading(false); });
    } else {
      fetch('/api/interact/market')
        .then(r => r.json())
        .then(data => {
          const teams = (data.myTeams || []).filter((t: any) => t.teamType === 'TOURNAMENT');
          setMyTeams(teams);
          if (teams.length > 0) setSelectedTeamId(teams[0].id);
          setLoading(false);
        })
        .catch(() => { setError('Failed to load teams'); setLoading(false); });
    }
  }, [isPlayerReg]);

  const handleRegister = async () => {
    setSubmitting(true);
    setError('');
    const pid = getCookie('bmt_player_id');
    const entityId = isPlayerReg ? pid : selectedTeamId;
    if (!entityId) { setError('Please select a team.'); setSubmitting(false); return; }

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

  const balance = playerInfo?.walletBalance ?? 0;
  const hasEnoughBalance = tournament.entryFee === 0 || balance >= tournament.entryFee;
  const pid = getCookie('bmt_player_id');
  const isSignedOut = !pid;

  const submitDisabled =
    submitting || loading ||
    (isPlayerReg && !hasEnoughBalance && tournament.entryFee > 0) ||
    (!isPlayerReg && myTeams.length === 0 && !!pid);

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

          {/* Entry fee chip */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex flex-col items-center text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Entry Fee</p>
            <p className="text-3xl font-black text-white">
              {tournament.entryFee > 0 ? `৳${tournament.entryFee.toLocaleString()}` : 'Free'}
            </p>
          </div>

          {/* Signed out */}
          {isSignedOut && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center">
              <AlertTriangle className="mx-auto text-red-500 mb-2" />
              <p className="text-sm font-bold text-red-400">You must be signed in to register.</p>
            </div>
          )}

          {/* Loading */}
          {!isSignedOut && loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin text-blue-500 w-8 h-8" />
            </div>
          )}

          {/* Player registration — wallet check */}
          {!isSignedOut && !loading && isPlayerReg && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-4 bg-zinc-900 border border-white/5 rounded-xl">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Your Wallet Balance</p>
                  <p className="text-xl font-black text-white mt-1">৳{balance.toLocaleString()}</p>
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
              {!hasEnoughBalance && tournament.entryFee > 0 && (
                <p className="text-xs text-red-400 font-bold text-center">
                  You need ৳{(tournament.entryFee - balance).toLocaleString()} more to join.
                </p>
              )}
            </div>
          )}

          {/* Team registration — selector */}
          {!isSignedOut && !loading && !isPlayerReg && (
            <div className="flex flex-col gap-3">
              <label className="text-xs font-black uppercase tracking-widest text-neutral-500">
                Select Tournament Team
              </label>
              {myTeams.length === 0 ? (
                <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-xl text-center">
                  <p className="text-sm font-bold text-red-400">You don't have any Tournament Teams.</p>
                  <p className="text-xs text-red-400/60 mt-1">Create one in Profile → Teams first.</p>
                </div>
              ) : (
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
              )}
              {tournament.entryFee > 0 && (
                <p className="text-[10px] text-neutral-400 font-bold text-center">
                  Entry fee deducted from the Team Owner's wallet.
                </p>
              )}
            </div>
          )}

          {/* API error */}
          {error && pid && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 text-center">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/5 bg-black/40 pb-10 sm:pb-5">
          <button
            onClick={handleRegister}
            disabled={submitDisabled || isSignedOut}
            className="w-full bg-blue-500 text-white font-black uppercase tracking-widest py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Confirm & Join'}
          </button>
        </div>
      </div>
    </div>
  );
}
