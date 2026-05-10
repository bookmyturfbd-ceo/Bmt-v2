'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ChevronLeft, CheckCircle, Award, Target, Shield, X } from 'lucide-react';

import { BADGES_BY_SPORT, maxBadges } from '@/lib/rankUtils';

type Player = { id: string; fullName: string; avatarUrl?: string };
type Member = { id: string; playerId: string; role: string; sportRole?: string; player: Player };
type Team = { id: string; name: string; sportType: string; members: Member[]; ownerId: string };
type RosterPick = { teamId: string; memberId: string; isStarter: boolean };

export default function PlayerStatsPage() {
  const params  = useParams();
  const router  = useRouter();
  const matchId = params.matchId as string;
  const locale  = (params.locale as string) || 'en';

  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]             = useState('');
  const [success, setSuccess]     = useState(false);
  const [match, setMatch]         = useState<any>(null);
  const [myTeam, setMyTeam]       = useState<Team | null>(null);
  const [myTeamId, setMyTeamId]   = useState('');
  const [isOMC, setIsOMC]         = useState(false);
  const [myScore, setMyScore]     = useState(0);
  const [isCricket, setIsCricket] = useState(false);
  const [scoringMode, setScoringMode] = useState('LIVE');
  const [sportType, setSportType] = useState('FUTSAL_5');

  // Per-player stats state: { [playerId]: { goals, assists, saves, minutesPlayed, badge } }
  const [stats, setStats] = useState<Record<string, any>>({});
  // Badge assignments: { playerId: badgeKey | null }
  const [badges, setBadges] = useState<Record<string, string | null>>({});

  // Modal State
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/matches/${matchId}/state`);
    const d = await r.json();
    if (!r.ok) { router.push(`/${locale}/interact`); return; }

    setMatch(d.match);
    setMyTeamId(d.myTeamId);
    setIsOMC(d.isOMC);
    setScoringMode(d.scoringMode ?? 'LIVE');

    const mt: Team = d.isTeamA ? d.match.teamA : d.match.teamB;
    setMyTeam(mt);
    const sport = mt.sportType as string;
    setSportType(sport);
    setIsCricket(['CRICKET_7','CRICKET_FULL'].includes(sport));

    const sc = d.isTeamA ? (d.match.scoreA ?? 0) : (d.match.scoreB ?? 0);
    setMyScore(sc);

    // Only show rostered players for my team
    const myPicks: RosterPick[] = (d.match.rosterPicks || []).filter((p: RosterPick) => p.teamId === d.myTeamId);
    const initial: Record<string, any> = {};
    const initialBadges: Record<string, string | null> = {};
    myPicks.forEach((pick: RosterPick) => {
      const member = mt.members.find(m => m.id === pick.memberId);
      if (member) {
        // Pre-fill from confirmed events
        const confirmedGoals = d.events?.filter((e: any) =>
          e.status === 'CONFIRMED' && e.teamId === d.myTeamId &&
          ['GOAL','PENALTY_SCORED'].includes(e.type) && e.playerId === member.playerId
        ).length || 0;
        const confirmedAssists = d.events?.filter((e: any) =>
          e.status === 'CONFIRMED' && e.teamId === d.myTeamId &&
          e.type === 'GOAL' && e.assistPlayerId === member.playerId
        ).length || 0;

        initial[member.playerId] = {
          goals: confirmedGoals,
          assists: confirmedAssists,
          saves: 0,
          minutesPlayed: pick.isStarter ? 90 : 45,
          runs: 0,
          wickets: 0,
          overs: 0,
        };
        initialBadges[member.playerId] = null;
      }
    });
    setStats(initial);
    setBadges(initialBadges);
    setLoading(false);
  }, [matchId, locale, router]);

  useEffect(() => { load(); }, [load]);

  const rosteredPlayers = myTeam?.members.filter(m =>
    Object.keys(stats).includes(m.playerId)
  ) || [];

  const setStat = (playerId: string, field: string, val: number) => {
    setStats(prev => ({ ...prev, [playerId]: { ...prev[playerId], [field]: Math.max(0, val) } }));
  };

  const setBadge = (playerId: string, badge: string | null) => {
    setBadges(prev => {
      // Remove badge from previous holder if re-assigning
      const next = { ...prev };
      if (badge) {
        Object.keys(next).forEach(pid => { if (next[pid] === badge) next[pid] = null; });
      }
      next[playerId] = badge;
      return next;
    });
  };

  // Validation
  const totalGoals   = Object.values(stats).reduce((s, p) => s + (p.goals || 0), 0);
  const totalAssists = Object.values(stats).reduce((s, p) => s + (p.assists || 0), 0);
  const totalRuns    = Object.values(stats).reduce((s, p) => s + (p.runs || 0), 0);
  const badgeCount   = Object.values(badges).filter(Boolean).length;
  
  const allowedBadges = BADGES_BY_SPORT[sportType] || BADGES_BY_SPORT['FUTSAL_5'];
  const badgeLimit = maxBadges(sportType);

  // If LIVE mode, bypass goal validation since they are pre-filled from events and locked
  const isScoreAfter = scoringMode === 'SCORE_AFTER';
  const isValid = !isScoreAfter ? true : (isCricket
    ? totalRuns === myScore
    : totalGoals === myScore && totalAssists <= myScore);

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true); setErr('');
    const payload = rosteredPlayers.map(m => ({
      playerId: m.playerId,
      ...stats[m.playerId],
      badgeKey: badges[m.playerId] || undefined,
    }));
    const r = await fetch(`/api/matches/${matchId}/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stats: payload }),
    });
    const d = await r.json();
    if (r.ok) setSuccess(true);
    else setErr(d.error || 'Failed to submit');
    setSubmitting(false);
  };

  if (loading) return (
    <div className="fixed inset-0 z-[100] bg-[#08090f] flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-[#00ff41]" />
    </div>
  );

  if (success) return (
    <div className="fixed inset-0 z-[100] bg-[#08090f] flex flex-col items-center justify-center px-5 text-center">
      <div className="text-5xl mb-4">🎉</div>
      <h1 className="text-2xl font-black text-white mb-2">Stats Submitted!</h1>
      <p className="text-neutral-500 text-sm mb-6">Player stats and badges saved for this match.</p>
      <button onClick={() => router.push(`/${locale}/interact`)} className="px-8 py-3 rounded-2xl bg-[#00ff41] text-black font-black text-sm">Back to Hub →</button>
    </div>
  );

  const selectedPlayer = selectedPlayerId ? rosteredPlayers.find(m => m.playerId === selectedPlayerId) : null;
  const pStats = selectedPlayerId ? stats[selectedPlayerId] : null;
  const pBadge = selectedPlayerId ? badges[selectedPlayerId] : null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#08090f] text-white flex flex-col overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="shrink-0 border-b border-[#1e2028] px-4 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-white">Distribute Badges {isScoreAfter ? '& Stats' : ''}</h1>
          <p className="text-xs text-neutral-500">{myTeam?.name}</p>
        </div>
      </div>

      {/* Validation banner (only if SCORE_AFTER, otherwise badges-only indicator) */}
      <div className="shrink-0 px-4 pt-3">
        {isScoreAfter ? (
          <div className={`p-3 rounded-xl border flex items-center gap-2 ${isValid ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/20'}`}>
            {isValid
              ? <CheckCircle size={14} className="text-green-400 shrink-0" />
              : <Target size={14} className="text-amber-400 shrink-0" />}
            <p className={`text-xs font-bold ${isValid ? 'text-green-400' : 'text-amber-400'}`}>
              {isCricket
                ? `${totalRuns} / ${myScore} runs assigned`
                : `${totalGoals} / ${myScore} goals · ${totalAssists} assists`}
              {isValid && ' ✓'}
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-xl border bg-blue-500/10 border-blue-500/30 flex items-center gap-2">
            <Award size={14} className="text-blue-400 shrink-0" />
            <p className="text-xs font-bold text-blue-400">Live Scoring Match — Tap players to award badges</p>
          </div>
        )}
      </div>

      {/* Grid of box-style player cards */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-32">
        <div className="grid grid-cols-3 gap-3">
          {rosteredPlayers.map(m => {
            const mStats = stats[m.playerId];
            const mBadge = badges[m.playerId];
            return (
              <button
                key={m.id}
                onClick={() => setSelectedPlayerId(m.playerId)}
                className="relative bg-[#111318] border border-[#1e2028] rounded-2xl p-3 flex flex-col items-center gap-2 hover:bg-white/5 active:scale-95 transition-all"
              >
                {/* Badge Icon (if assigned) */}
                {mBadge && (
                  <div className="absolute top-2 right-2 text-lg drop-shadow-md z-10" style={{ animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                    {allowedBadges.find(b => b.key === mBadge)?.emoji}
                  </div>
                )}
                
                <div className="w-12 h-12 rounded-xl bg-neutral-800 overflow-hidden shrink-0 mt-1">
                  {m.player.avatarUrl
                    ? <img src={m.player.avatarUrl} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full flex items-center justify-center text-lg font-black text-neutral-500">{m.player.fullName[0]}</div>}
                </div>
                <div className="text-center w-full">
                  <p className="text-[11px] font-black text-white truncate">{m.player.fullName}</p>
                  <p className="text-[9px] font-black text-neutral-500 uppercase tracking-widest truncate">{m.sportRole || m.role}</p>
                </div>
                
                {/* Mini Stat Summary */}
                {(!isCricket ? (mStats?.goals > 0 || mStats?.assists > 0) : (mStats?.runs > 0 || mStats?.wickets > 0)) && (
                  <div className="flex items-center gap-1.5 mt-1 bg-white/5 px-2 py-0.5 rounded-full">
                    {!isCricket ? (
                      <>
                        {mStats?.goals > 0 && <span className="text-[10px] font-bold text-white">⚽ {mStats.goals}</span>}
                        {mStats?.assists > 0 && <span className="text-[10px] font-bold text-white">🎯 {mStats.assists}</span>}
                      </>
                    ) : (
                      <>
                        {mStats?.runs > 0 && <span className="text-[10px] font-bold text-white">🏏 {mStats.runs}</span>}
                        {mStats?.wickets > 0 && <span className="text-[10px] font-bold text-white">🎳 {mStats.wickets}</span>}
                      </>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submit bar */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-[#08090f]/95 backdrop-blur-md border-t border-[#1e2028] z-40">
        <div className="flex justify-between items-end mb-2 px-1">
          <p className="text-xs font-bold text-neutral-400">Badges Used</p>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${badgeCount <= badgeLimit ? 'bg-neutral-800 text-white' : 'bg-red-500/20 text-red-400'}`}>{badgeCount} / {badgeLimit}</span>
        </div>
        {err && <p className="text-red-400 text-xs font-bold mb-2">{err}</p>}
        <button
          onClick={handleSubmit}
          disabled={!isValid || !isOMC || submitting || badgeCount > badgeLimit}
          className="w-full py-4 rounded-2xl bg-[#00ff41] text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : '✓ Finalise Stats & Badges'}
        </button>
        {isScoreAfter && !isValid && (
          <div className="mt-2 text-center text-[11px] font-bold text-amber-400">
            {isCricket ? (
              totalRuns > myScore ? <p>⚠️ You assigned {totalRuns} runs but the team scored {myScore}.</p> :
              <p>⚠️ Assign all {myScore} runs first (currently {totalRuns}).</p>
            ) : (
              <>
                {totalGoals > myScore && <p>⚠️ You assigned {totalGoals} goals but the team scored {myScore}.</p>}
                {totalGoals < myScore && <p>⚠️ Assign all {myScore} goals first (currently {totalGoals}).</p>}
                {totalAssists > myScore && <p>⚠️ You assigned {totalAssists} assists but the team only scored {myScore} goals.</p>}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Player Stat Modal ── */}
      {selectedPlayer && pStats && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedPlayerId(null)} />
          <div className="bg-[#111318] border-t border-[#1e2028] rounded-t-3xl relative z-10 flex flex-col max-h-[85vh]" style={{ animation: 'slideUpSheet 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-800 overflow-hidden shrink-0">
                  {selectedPlayer.player.avatarUrl
                    ? <img src={selectedPlayer.player.avatarUrl} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full flex items-center justify-center text-sm font-black text-neutral-500">{selectedPlayer.player.fullName[0]}</div>}
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">{selectedPlayer.player.fullName}</h3>
                  <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">{selectedPlayer.sportRole || selectedPlayer.role}</p>
                </div>
              </div>
              <button onClick={() => setSelectedPlayerId(null)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto p-4 pb-8 flex flex-col gap-6">
              
              {/* Badges Section */}
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-widest mb-3">Award Badge</h4>
                <div className="grid grid-cols-2 gap-2">
                  {allowedBadges.map(b => {
                    const isSelected = pBadge === b.key;
                    // Check if badge is assigned to someone else
                    const assignedToOtherId = Object.keys(badges).find(pid => badges[pid] === b.key && pid !== selectedPlayerId);
                    const assignedToOther = assignedToOtherId ? rosteredPlayers.find(m => m.playerId === assignedToOtherId) : null;
                    
                    return (
                      <button
                        key={b.key}
                        onClick={() => {
                          if (!selectedPlayerId) return;
                          if (isSelected) setBadge(selectedPlayerId, null);
                          else setBadge(selectedPlayerId, b.key);
                        }}
                        className={`p-3 rounded-xl border flex flex-col items-start gap-1 transition-all active:scale-95 text-left ${isSelected ? 'bg-white/10 border-white/30' : 'bg-neutral-900/50 border-white/5 hover:bg-white/5'}`}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-xl">{b.emoji}</span>
                          <span className={`text-xs font-black flex-1 ${isSelected ? 'text-white' : 'text-neutral-400'}`}>{b.label}</span>
                          {isSelected && <CheckCircle size={14} className="text-[#00ff41]" />}
                        </div>
                        {assignedToOther ? (
                          <p className="text-[9px] font-bold text-amber-500 truncate w-full">Currently with {assignedToOther.player.fullName.split(' ')[0]}</p>
                        ) : (
                          <p className={`text-[9px] font-bold truncate w-full ${isSelected ? 'text-neutral-300' : 'text-neutral-600'}`}>+{b.bonus} MMR Bonus</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Stats Section (Editable only if Score After) */}
              {isScoreAfter ? (
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest mb-3">Match Stats</h4>
                  {!isCricket ? (
                    <div className="flex flex-col gap-2">
                      {[
                        { field: 'goals',   label: '⚽ Goals', color: 'text-white' },
                        { field: 'assists', label: '🎯 Assists', color: 'text-white' },
                        { field: 'saves',   label: '🧤 Saves', color: 'text-white' },
                      ].map(({ field, label, color }) => (
                        <div key={field} className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/50 border border-white/5">
                          <p className={`text-xs font-black ${color}`}>{label}</p>
                          <div className="flex items-center gap-3">
                            <button onClick={() => selectedPlayerId && setStat(selectedPlayerId, field, (pStats[field] || 0) - 1)} className="w-8 h-8 rounded-lg bg-neutral-800 text-white font-black text-lg flex items-center justify-center active:scale-90">−</button>
                            <span className="w-8 text-center text-lg font-black text-white tabular-nums">{pStats[field] ?? 0}</span>
                            <button onClick={() => selectedPlayerId && setStat(selectedPlayerId, field, (pStats[field] || 0) + 1)} className="w-8 h-8 rounded-lg bg-[#00ff41]/20 border border-[#00ff41]/40 text-[#00ff41] font-black text-lg flex items-center justify-center active:scale-90">+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {[
                        { field: 'runs',    label: '🏏 Runs' },
                        { field: 'wickets', label: '🎳 Wickets' },
                        { field: 'overs',   label: '⚡ Overs' },
                      ].map(({ field, label }) => (
                        <div key={field} className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/50 border border-white/5">
                          <p className="text-xs font-black text-white">{label}</p>
                          <div className="flex items-center gap-3">
                            <button onClick={() => selectedPlayerId && setStat(selectedPlayerId, field, (pStats[field] || 0) - 1)} className="w-8 h-8 rounded-lg bg-neutral-800 text-white font-black text-lg flex items-center justify-center active:scale-90">−</button>
                            <span className="w-8 text-center text-lg font-black text-white tabular-nums">{pStats[field] ?? 0}</span>
                            <button onClick={() => selectedPlayerId && setStat(selectedPlayerId, field, (pStats[field] || 0) + 1)} className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 text-white font-black text-lg flex items-center justify-center active:scale-90">+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* LIVE Mode: Stats are locked */
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest mb-3">Match Stats</h4>
                  <div className="p-4 rounded-xl bg-neutral-900/50 border border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-white mb-1">Stats Locked</p>
                      <p className="text-[10px] font-bold text-neutral-500 max-w-[200px]">Stats were recorded during live scoring and cannot be changed here.</p>
                    </div>
                    <div className="text-right">
                      {!isCricket ? (
                        <>
                          <p className="text-sm font-black text-white">⚽ {pStats.goals}</p>
                          <p className="text-sm font-black text-neutral-400">🎯 {pStats.assists}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-black text-white">🏏 {pStats.runs}</p>
                          <p className="text-sm font-black text-neutral-400">🎳 {pStats.wickets}</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <button onClick={() => setSelectedPlayerId(null)} className="w-full py-3.5 rounded-2xl bg-white/10 text-white font-black text-sm active:scale-95 transition-all mt-2">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
