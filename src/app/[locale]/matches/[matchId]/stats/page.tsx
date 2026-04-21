'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ChevronLeft, CheckCircle, Award, Target, Shield, Star } from 'lucide-react';

type Player = { id: string; fullName: string; avatarUrl?: string };
type Member = { id: string; playerId: string; role: string; sportRole?: string; player: Player };
type Team = { id: string; name: string; sportType: string; members: Member[]; ownerId: string };
type RosterPick = { teamId: string; memberId: string; isStarter: boolean };

const BADGES = [
  { key: 'MVP',      label: 'MVP',          icon: '🏅', color: '#f59e0b',  desc: 'Man of the Match' },
  { key: 'PLAYMAKER',label: 'Playmaker',    icon: '🎯', color: '#a78bfa',  desc: 'Best assists / chances' },
  { key: 'ENGINE',   label: 'Engine',       icon: '⚡', color: '#60a5fa',  desc: 'Box-to-box workhorse' },
  { key: 'GUARDIAN', label: 'Guardian',     icon: '🛡️', color: '#34d399',  desc: 'Best defender / keeper' },
];

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

  // Per-player stats state: { [playerId]: { goals, assists, saves, minutesPlayed, badge } }
  const [stats, setStats] = useState<Record<string, any>>({});
  // Badge assignments: { playerId: badgeKey | null }
  const [badges, setBadges] = useState<Record<string, string | null>>({});

  const load = useCallback(async () => {
    const r = await fetch(`/api/matches/${matchId}/state`);
    const d = await r.json();
    if (!r.ok) { router.push(`/${locale}/interact`); return; }

    setMatch(d.match);
    setMyTeamId(d.myTeamId);
    setIsOMC(d.isOMC);

    const mt: Team = d.isTeamA ? d.match.teamA : d.match.teamB;
    setMyTeam(mt);
    const sport = mt.sportType as string;
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
  }, [matchId]);

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
  const isValid = isCricket
    ? totalRuns === myScore
    : totalGoals === myScore && totalAssists <= myScore;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true); setErr('');
    const payload = rosteredPlayers.map(m => ({
      playerId: m.playerId,
      ...stats[m.playerId],
      badges: badges[m.playerId] ? [badges[m.playerId]] : [],
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

  return (
    <div className="fixed inset-0 z-[100] bg-[#08090f] text-white flex flex-col overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="shrink-0 border-b border-[#1e2028] px-4 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-white">Player Stats</h1>
          <p className="text-xs text-neutral-500">{myTeam?.name}</p>
        </div>
      </div>

      {/* Validation banner */}
      <div className="shrink-0 px-4 pt-3">
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
      </div>

      {/* Player list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 pb-32">
        {rosteredPlayers.map(m => {
          const p = stats[m.playerId] || {};
          const playerBadge = badges[m.playerId];
          return (
            <div key={m.id} className="bg-[#111318] border border-[#1e2028] rounded-2xl overflow-hidden">
              {/* Player header */}
              <div className="flex items-center gap-3 p-3 border-b border-[#1e2028]">
                <div className="w-10 h-10 rounded-xl bg-neutral-800 overflow-hidden flex items-center justify-center shrink-0">
                  {m.player.avatarUrl
                    ? <img src={m.player.avatarUrl} className="w-full h-full object-cover" alt="" />
                    : <span className="text-sm font-black text-neutral-500">{m.player.fullName[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-white truncate">{m.player.fullName}</p>
                  <p className="text-[10px] text-neutral-500 capitalize">{m.sportRole || m.role}</p>
                </div>
                {playerBadge && (
                  <span className="text-sm">{BADGES.find(b => b.key === playerBadge)?.icon}</span>
                )}
              </div>

              {/* Stat inputs */}
              <div className="p-3">
                {!isCricket ? (
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { field: 'goals',  label: '⚽ Goals' },
                      { field: 'assists',label: '🎯 Assists' },
                      { field: 'saves',  label: '🧤 Saves' },
                      { field: 'minutesPlayed', label: '⏱ Minutes' },
                    ].map(({ field, label }) => (
                      <div key={field} className="bg-neutral-900/60 rounded-xl p-2.5">
                        <p className="text-[10px] text-neutral-500 font-bold mb-1">{label}</p>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setStat(m.playerId, field, (p[field] || 0) - 1)}
                            className="w-7 h-7 rounded-lg bg-neutral-800 text-white font-black text-sm flex items-center justify-center">−</button>
                          <span className="flex-1 text-center text-lg font-black text-white">{p[field] ?? 0}</span>
                          <button onClick={() => setStat(m.playerId, field, (p[field] || 0) + 1)}
                            className="w-7 h-7 rounded-lg bg-neutral-700 text-white font-black text-sm flex items-center justify-center">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { field: 'runs',    label: '🏏 Runs' },
                      { field: 'wickets', label: '🎳 Wickets' },
                      { field: 'overs',   label: '⚡ Overs' },
                    ].map(({ field, label }) => (
                      <div key={field} className="bg-neutral-900/60 rounded-xl p-2.5">
                        <p className="text-[10px] text-neutral-500 font-bold mb-1">{label}</p>
                        <div className="flex items-center gap-1">
                          <button onClick={() => setStat(m.playerId, field, (p[field] || 0) - 1)}
                            className="w-6 h-6 rounded-lg bg-neutral-800 text-white font-black text-xs flex items-center justify-center">−</button>
                          <span className="flex-1 text-center text-base font-black text-white">{p[field] ?? 0}</span>
                          <button onClick={() => setStat(m.playerId, field, (p[field] || 0) + 1)}
                            className="w-6 h-6 rounded-lg bg-neutral-700 text-white font-black text-xs flex items-center justify-center">+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Badge Assignment */}
        <div className="bg-[#111318] border border-[#1e2028] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award size={15} className="text-[#f59e0b]" />
            <h3 className="font-black text-sm text-white">Badge Distribution</h3>
            <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full ${badgeCount <= 4 ? 'bg-neutral-800 text-neutral-400' : 'bg-red-500/20 text-red-400'}`}>{badgeCount}/4</span>
          </div>
          <p className="text-[11px] text-neutral-500 mb-3">Max 4 badges · 1 per player · Tap badge then tap player</p>

          {/* Badge chips */}
          <div className="flex gap-2 flex-wrap mb-4">
            {BADGES.map(b => (
              <div key={b.key} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-neutral-900">
                <span>{b.icon}</span>
                <span className="text-xs font-black text-white">{b.label}</span>
              </div>
            ))}
          </div>

          {/* Assign to player */}
          {rosteredPlayers.map(m => (
            <div key={m.id} className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
              <p className="flex-1 text-xs font-bold text-white truncate">{m.player.fullName}</p>
              <div className="flex gap-1">
                <button onClick={() => setBadge(m.playerId, null)}
                  className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all border ${badges[m.playerId] === null ? 'bg-white/10 border-white/20 text-white' : 'bg-transparent border-white/5 text-neutral-600'}`}>—</button>
                {BADGES.map(b => (
                  <button key={b.key} onClick={() => setBadge(m.playerId, b.key)}
                    className={`w-7 h-7 rounded-lg text-sm transition-all border ${badges[m.playerId] === b.key ? 'border-white/30 bg-white/10 scale-110' : 'border-white/5 opacity-40'}`}>
                    {b.icon}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit bar */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-[#08090f]/95 backdrop-blur-md border-t border-[#1e2028]">
        {err && <p className="text-red-400 text-xs font-bold mb-2">{err}</p>}
        <button
          onClick={handleSubmit}
          disabled={!isValid || !isOMC || submitting}
          className="w-full py-4 rounded-2xl bg-[#00ff41] text-black font-black text-sm uppercase tracking-wider disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
          {submitting ? <Loader2 size={18} className="animate-spin" /> : '✓ Submit Stats & Badges'}
        </button>
        {!isValid && <p className="text-amber-400 text-[11px] font-bold text-center mt-1.5">
          {isCricket ? `Assign all ${myScore} runs first` : `Assign all ${myScore} goals first`}
        </p>}
      </div>
    </div>
  );
}
