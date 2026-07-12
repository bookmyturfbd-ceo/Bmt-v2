'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Share2, Edit2, MapPin, Calendar, Footprints, Shield,
  ChevronRight, Crown, Star, Trophy, Users, Zap, LogOut
} from 'lucide-react';
import { PlayerCard } from '@/components/profile/PlayerCard';
import { FormStrip } from '@/components/profile/FormStrip';
import { IdentityEditSheet } from '@/components/profile/IdentityEditSheet';
import { getRankData } from '@/lib/rankUtils';
import type { PlayerFacets } from '@/lib/playerFacets';
import type { RankData } from '@/lib/rankUtils';

// Ordinal helper
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function dateSince(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

interface PublicProfileClientProps {
  player: {
    id: string;
    fullName: string;
    playerCode?: string | null;
    joinedAt: string;
    avatarUrl?: string | null;
    position?: string | null;
    preferredFoot?: string | null;
    ageBracket?: string | null;
    homeArea?: { id: string; name: string } | null;
    khep?: { available: boolean; positions: string[]; areas: string[] } | null;
    footballMmr: number;
    cricketMmr: number;
    tournamentFootballMmr: number;
    tournamentCricketMmr: number;
    isFootballProvisional: boolean;
    isCricketProvisional: boolean;
    peakTournamentFinish: number | null;
    teams: Array<{ role: string; team: { id: string; name: string; logoUrl?: string | null; sportType?: string; isVerified?: boolean } }>;
    badges: Array<{ id: string; title: string; description?: string; icon?: string; earnedAt?: string; isShowcased?: boolean }>;
    matchSummary: {
      football: { count: number; goals: number; assists: number };
      cricket: { count: number; runs: number; wickets: number };
    };
  };
  facets: { football: PlayerFacets; cricket: PlayerFacets };
  fbRank: RankData;
  ckRank: RankData;
  primaryTeamLogoUrl?: string | null;
  isOwner: boolean;
  locale: string;
  activeSeason?: { name: string; endsAt: string } | null;
}

type SportTab = 'football' | 'cricket';

const POSITION_LABELS: Record<string, string> = { GK: 'Goalkeeper', DEF: 'Defender', MID: 'Midfielder', FWD: 'Forward' };
const FOOT_LABELS: Record<string, string> = { L: 'Left', R: 'Right', Both: 'Both' };

export function PublicProfileClient({
  player, facets, fbRank, ckRank, primaryTeamLogoUrl, isOwner, locale, activeSeason,
}: PublicProfileClientProps) {
  const t = useTranslations('Profile');
  const router = useRouter();
  const [sport, setSport] = useState<SportTab>('football');
  const [editOpen, setEditOpen] = useState(false);
  const [playerState, setPlayerState] = useState(player);

  const handleSignOut = () => {
    ['bmt_auth', 'bmt_role', 'bmt_player_id', 'bmt_name'].forEach(k => {
      document.cookie = `${k}=; path=/; max-age=0`;
    });
    router.replace(`/${locale}/login`);
  };

  // Academy alumni pending confirmations (only loaded for owner)
  const [pendingAlumni, setPendingAlumni] = useState<any[]>([]);
  const [respondingAlumni, setRespondingAlumni] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwner) return;
    fetch('/api/academy/alumni/pending')
      .then(r => r.ok ? r.json() : [])
      .then(data => setPendingAlumni(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, [isOwner]);

  const handleAlumniResponse = async (recordId: string, accept: boolean) => {
    setRespondingAlumni(recordId);
    try {
      const res = await fetch('/api/academy/alumni/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: recordId, accept })
      });
      if (res.ok) {
        setPendingAlumni(prev => prev.filter(a => a.id !== recordId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRespondingAlumni(null);
    }
  };

  const isFootball = sport === 'football';
  const currentFacets = isFootball ? facets.football : facets.cricket;
  const currentRank = isFootball ? fbRank : ckRank;
  const isProvisional = isFootball ? player.isFootballProvisional : player.isCricketProvisional;
  const currentMmr = isFootball ? player.footballMmr : player.cricketMmr;

  const ms = player.matchSummary;
  const currentMatchCount = isFootball ? ms.football.count : ms.cricket.count;
  const primaryCount = isFootball ? ms.football.goals : ms.cricket.runs;
  const secondaryCount = isFootball ? ms.football.assists : ms.cricket.wickets;

  const placementCount = Math.min(3, currentMatchCount);

  async function handleShare() {
    const url = `${window.location.origin}/${locale}/player/${player.playerCode}`;
    if (navigator.share) {
      await navigator.share({ title: `${player.fullName} — BMT`, text: 'Check out my BMT player card!', url });
    } else {
      await navigator.clipboard.writeText(url);
      alert('Profile link copied!');
    }
  }

  const fbFacetRows = [
    { abbr: 'ATT', val: facets.football.ATT, label: 'Attack' },
    { abbr: 'PLY', val: facets.football.PLY, label: 'Playmaking' },
    { abbr: 'FRM', val: facets.football.FRM, label: 'Form' },
    { abbr: 'WIN', val: facets.football.WIN, label: 'Win Rate' },
    { abbr: 'REL', val: facets.football.REL, label: 'Reliability' },
    { abbr: 'EXP', val: facets.football.EXP, label: 'Experience' },
  ];
  const ckFacetRows = [
    { abbr: 'BAT', val: facets.cricket.ATT, label: 'Batting' },
    { abbr: 'BWL', val: facets.cricket.PLY, label: 'Bowling' },
    { abbr: 'FRM', val: facets.cricket.FRM, label: 'Form' },
    { abbr: 'WIN', val: facets.cricket.WIN, label: 'Win Rate' },
    { abbr: 'REL', val: facets.cricket.REL, label: 'Reliability' },
    { abbr: 'EXP', val: facets.cricket.EXP, label: 'Experience' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-base)] pb-24 relative overflow-x-hidden">
      {/* Subtle radial green glow behind the card hero */}
      <div className="absolute top-[120px] left-1/2 -translate-x-1/2 w-[340px] h-[340px] rounded-full bg-[var(--accent)]/[0.14] blur-[80px] pointer-events-none z-0" />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="px-4 pt-12 pb-4 flex items-center justify-between relative z-10">
        <h1 className="text-xl font-black tracking-tight truncate max-w-[60%]">{playerState.fullName}</h1>
        <div className="flex items-center gap-2">
          {isOwner && (
            <>
              <button
                onClick={() => setEditOpen(true)}
                className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-all"
                aria-label="Edit profile"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={handleSignOut}
                className="w-9 h-9 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center hover:bg-red-500/20 text-red-400 transition-all"
                aria-label="Sign out"
              >
                <LogOut size={14} />
              </button>
            </>
          )}
          <button
            onClick={handleShare}
            className="w-9 h-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white/15 transition-all"
            aria-label="Share profile"
          >
            <Share2 size={14} />
          </button>
        </div>
      </div>

      {/* ── Sport tab ─────────────────────────────────────────────────────── */}
      <div className="px-4 mb-5 relative z-10">
        <div className="flex rounded-2xl bg-white/[0.04] border border-white/[0.06] p-1 gap-1">
          {(['football', 'cricket'] as SportTab[]).map(s => (
            <button
              key={s}
              onClick={() => setSport(s)}
              className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                sport === s
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {s === 'football' ? '⚽ Football' : '🏏 Cricket'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Player Card Hero ──────────────────────────────────────────────── */}
      <div className="px-4 mb-6 max-w-[380px] mx-auto relative z-10">
        <PlayerCard
          player={{
            fullName: playerState.fullName,
            playerCode: playerState.playerCode,
            avatarUrl: playerState.avatarUrl,
            position: playerState.position,
            footballMmr: player.footballMmr,
            cricketMmr: player.cricketMmr,
          }}
          facets={currentFacets}
          rankData={currentRank}
          sport={sport}
          teamLogoUrl={primaryTeamLogoUrl}
          isFutsal={false}
          isProvisional={isProvisional}
        />
      </div>


      {/* ── Form Strip ────────────────────────────────────────────────────── */}
      <div className="mx-4 mb-4 rounded-2xl bg-[var(--bg-surface)] border border-white/[0.05] p-4 relative z-10">
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mb-3 flex items-center gap-1.5">
          <Calendar size={12} className="text-[var(--accent)]" />
          {t('recentForm')}
        </p>
        <FormStrip
          last5={currentFacets.last5}
          mmrDeltaMonth={currentFacets.mmrDeltaMonth}
        />
      </div>

      {/* ── Active Season Banner ──────────────────────────────────────────── */}
      {activeSeason && (
        <div className="mx-4 mb-4 rounded-2xl bg-accent/10 border border-accent/20 px-4 py-3 flex items-center gap-3 relative z-10">
          <Trophy size={16} className="text-accent flex-shrink-0" />
          <div>
            <p className="text-xs font-black text-accent">{activeSeason.name}</p>
            <p className="text-[10px] text-white/40 font-medium">
              Ends {new Date(activeSeason.endsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
      )}

      {/* ── Identity Tags ─────────────────────────────────────────────────── */}
      <div className="px-4 mb-4 relative z-10">
        <div className="flex flex-wrap gap-2">
          {playerState.position && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs font-black text-white/70">
              <Shield size={11} /> {POSITION_LABELS[playerState.position] ?? playerState.position}
            </span>
          )}
          {playerState.preferredFoot && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs font-black text-white/70">
              <Footprints size={11} /> {FOOT_LABELS[playerState.preferredFoot] ?? playerState.preferredFoot} Foot
            </span>
          )}
          {playerState.homeArea && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs font-black text-white/70">
              <MapPin size={11} /> {playerState.homeArea.name}
            </span>
          )}
          {playerState.ageBracket && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs font-black text-white/70">
              {playerState.ageBracket}
            </span>
          )}
          {playerState.khep?.available && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-xs font-black text-accent">
              ⚡ {t('khepAvailable')}
            </span>
          )}
          {isOwner && !playerState.position && !playerState.preferredFoot && !playerState.homeArea && (
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-white/20 text-xs font-medium text-white/30 hover:text-white/50 hover:border-white/30 transition-all"
            >
              <Edit2 size={10} /> {t('addIdentityInfo')}
            </button>
          )}
        </div>
      </div>

      {/* ── Stat Tiles ────────────────────────────────────────────────────── */}
      <div className="mx-4 mb-4 rounded-2xl bg-[var(--bg-surface)] border border-white/[0.05] p-4 relative z-10">
        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mb-3 flex items-center gap-1.5">
          <Shield size={12} className="text-[var(--accent)]" />
          {isFootball ? 'Football Stats' : 'Cricket Stats'}
        </p>

        <div className="grid grid-cols-3 gap-2.5">
          {/* Matches Tile */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 flex flex-col gap-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Matches</p>
            <p className={`text-lg font-black leading-none ${currentMatchCount === 0 ? 'text-white/35 font-medium' : 'text-white'}`}>
              {currentMatchCount}
            </p>
          </div>

          {/* Goals / Runs Tile */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 flex flex-col gap-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">{isFootball ? 'Goals' : 'Runs'}</p>
            <p className={`text-lg font-black leading-none ${primaryCount === 0 ? 'text-white/35 font-medium' : 'text-white'}`}>
              {primaryCount}
            </p>
          </div>

          {/* Assists / Wickets Tile */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 flex flex-col gap-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">{isFootball ? 'Assists' : 'Wickets'}</p>
            <p className={`text-lg font-black leading-none ${secondaryCount === 0 ? 'text-white/35 font-medium' : 'text-white'}`}>
              {secondaryCount}
            </p>
          </div>

          {/* MMR Tile */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 flex flex-col gap-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">MMR</p>
            <p className="text-lg font-black leading-none text-white">{currentMmr}</p>
          </div>

          {/* Peak Finish Tile: Small trophy outline icon if no history */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 flex flex-col gap-1 justify-between min-h-[58px]">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Peak Finish</p>
            {player.peakTournamentFinish ? (
              <p className="text-lg font-black leading-none text-white mt-1">
                {ordinal(player.peakTournamentFinish)}
              </p>
            ) : (
              <div className="text-white/20 mt-1 flex items-center" title="No tournament history yet">
                <Trophy size={15} />
              </div>
            )}
          </div>

          {/* Rank Tile: Small progress-ring if calibrating */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-3 flex flex-col gap-1 justify-between min-h-[58px]">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/30">Rank</p>
            {isProvisional ? (
              <div className="flex items-center gap-1.5 mt-1">
                <svg width="20" height="20" className="-rotate-90 flex-shrink-0">
                  <circle cx="10" cy="10" r="7" fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
                  <circle
                    cx="10"
                    cy="10"
                    r="7"
                    fill="transparent"
                    stroke="var(--accent)"
                    strokeWidth="2"
                    strokeDasharray="44"
                    strokeDashoffset={44 - (placementCount / 3) * 44}
                    strokeLinecap="round"
                  />
                  <text
                    x="10"
                    y="-9"
                    transform="rotate(90)"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="var(--accent)"
                    className="text-[8px] font-black"
                  >
                    ?
                  </text>
                </svg>
                <span className="text-[10px] font-black text-white/50">{placementCount}/3</span>
              </div>
            ) : (
              <p className="text-lg font-black leading-none text-white mt-1">
                {isFootball ? fbRank.label : ckRank.label}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Facet Breakdown ───────────────────────────────────────────────── */}
      {!isProvisional && (
        <div className="mx-4 mb-4 rounded-2xl bg-[var(--bg-surface)] border border-white/[0.05] p-4 relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mb-3 flex items-center gap-1.5">
            <Star size={12} className="text-[var(--accent)]" />
            {t('attributeBreakdown')}
          </p>
          <div className="flex flex-col gap-2.5">
            {(isFootball ? fbFacetRows : ckFacetRows).map(f => (
              <div key={f.abbr} className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/30 w-8">{f.abbr}</span>
                <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-800 ease-out"
                    style={{ width: `${f.val}%` }}
                  />
                </div>
                <span className="text-xs font-black tabular-nums text-white/70 w-7 text-right">{f.val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Showcased Badges ──────────────────────────────────────────────── */}
      {player.badges.length > 0 && (
        <div className="mx-4 mb-4 rounded-2xl bg-[var(--bg-surface)] border border-white/[0.05] p-4 relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mb-3 flex items-center gap-1.5">
            <Trophy size={12} className="text-[var(--accent)]" />
            {t('badges')}
          </p>
          <div className="flex flex-wrap gap-2">
            {player.badges.slice(0, 8).map(b => (
              <div
                key={b.id}
                title={b.description ?? b.title}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs font-black text-white/70"
              >
                {b.icon ? (
                  <img src={b.icon} className="h-4 w-4 object-contain" alt="" />
                ) : (
                  <Star size={12} className="text-accent" />
                )}
                {b.title}
              </div>
            ))}
            {player.badges.length > 8 && (
              <a
                href={`/${locale}/player/${player.playerCode}/badges`}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-dashed border-white/10 text-xs font-bold text-white/30 hover:text-white/50 transition-all"
              >
                +{player.badges.length - 8} more
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── Teams ─────────────────────────────────────────────────────────── */}
      {player.teams.length > 0 && (
        <div className="mx-4 mb-4 rounded-2xl bg-[var(--bg-surface)] border border-white/[0.05] p-4 relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)] mb-3 flex items-center gap-1.5">
            <Users size={12} className="text-[var(--accent)]" />
            {t('myTeams')}
          </p>
          <div className="flex flex-col gap-2">
            {player.teams.slice(0, 4).map(({ role, team }) => (
              <div key={team.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                {team.logoUrl ? (
                  <img src={team.logoUrl} className="h-9 w-9 rounded-full object-cover flex-shrink-0" alt={team.name} />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Users size={14} className="text-white/40" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate">{team.name}</p>
                  <p className="text-[10px] text-white/40 font-medium capitalize">{role}</p>
                </div>
                {team.isVerified && <Crown size={13} className="text-accent flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Academy Alumni Pending Confirms (Owner-only) ───────────────────── */}
      {isOwner && pendingAlumni.length > 0 && (
        <div className="mx-4 mb-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4 relative z-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-3">
            Academy Training Requests
          </p>
          <div className="flex flex-col gap-2">
            {pendingAlumni.map((record: any) => (
              <div key={record.id} className="flex items-center justify-between gap-3 bg-neutral-950 border border-white/5 p-3 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white truncate">{record.academy?.name}</p>
                  <p className="text-[9px] text-neutral-500 mt-0.5">Confirm you train(ed) at this academy</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => handleAlumniResponse(record.id, false)}
                    disabled={respondingAlumni === record.id}
                    className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-black text-[9px] rounded-lg transition-all"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleAlumniResponse(record.id, true)}
                    disabled={respondingAlumni === record.id}
                    className="px-2.5 py-1.5 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black text-[9px] rounded-lg transition-all"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Joined Since ──────────────────────────────────────────────────── */}
      <div className="px-4 pb-4 relative z-10">
        <p className="text-[11px] text-white/50 text-center font-bold">
          BMT player since {dateSince(player.joinedAt)}
          {player.playerCode && ` · ${player.playerCode}`}
        </p>
      </div>

      {/* ── Sign Out Button ── */}
      {isOwner && (
        <div className="px-4 pb-6 relative z-10 max-w-[380px] mx-auto">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-black hover:bg-red-500/15 active:scale-95 transition-all"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      )}

      {/* ── Owner: Identity Edit Sheet ────────────────────────────────────── */}
      {isOwner && (
        <IdentityEditSheet
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          onSaved={fields => setPlayerState(prev => ({ ...prev, ...fields }))}
          initial={{
            fullName: playerState.fullName,
            position: playerState.position,
            preferredFoot: playerState.preferredFoot,
            ageBracket: playerState.ageBracket,
            homeArea: playerState.homeArea,
          }}
        />
      )}
    </div>
  );
}
