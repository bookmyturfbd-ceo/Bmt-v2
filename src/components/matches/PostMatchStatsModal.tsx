'use client';
import { useState } from 'react';
import { Loader2, CheckCircle, X } from 'lucide-react';

// Rank data for badge icon colours
function getRankColor(mmr: number) {
  if (mmr <= 899)  return '#cd7f32';
  if (mmr <= 1199) return '#c0c0c0';
  if (mmr <= 1499) return '#ffd700';
  if (mmr <= 1799) return '#00e5ff';
  return '#ff00ff';
}

// Badges available for futsal / small-sided football
const FUTSAL_BADGES = [
  { key: 'MVP',        label: 'MVP',         icon: '⭐', bonus: 20 },
  { key: 'THE_SNIPER', label: 'The Sniper',  icon: '🎯', bonus: 10 },
  { key: 'THE_MAESTRO',label: 'The Maestro', icon: '🪄', bonus: 10 },
  { key: 'THE_WALL',   label: 'The Wall',    icon: '🛡️', bonus: 10 },
];

type Player = {
  id: string;
  playerId: string;
  role: string;
  sportRole?: string;
  player: { id: string; fullName: string; avatarUrl?: string; mmr: number };
};

type Team = {
  id: string;
  name: string;
  members: Player[];
};

type PlayerStat = {
  goals: number;
  assists: number;
  badge: string | null;
};

interface PostMatchStatsModalProps {
  matchId: string;
  myTeam: Team;
  agreedScore: number;   // how many goals MY team scored
  onDone: () => void;
}

export default function PostMatchStatsModal({
  matchId, myTeam, agreedScore, onDone,
}: PostMatchStatsModalProps) {
  const [stats, setStats] = useState<Record<string, PlayerStat>>(() => {
    const init: Record<string, PlayerStat> = {};
    myTeam.members.forEach(m => { init[m.playerId] = { goals: 0, assists: 0, badge: null }; });
    return init;
  });
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [badgeFor, setBadgeFor] = useState<string | null>(null); // playerId who gets the badge
  const [showBadgePicker, setShowBadgePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const totalGoals = Object.values(stats).reduce((s, p) => s + p.goals, 0);
  const totalAssists = Object.values(stats).reduce((s, p) => s + p.assists, 0);
  const goalsValid = totalGoals === agreedScore;
  const assistsValid = totalAssists <= agreedScore;
  const canSave = goalsValid && assistsValid;

  const update = (playerId: string, field: 'goals' | 'assists', delta: number) => {
    setStats(prev => {
      const cur = prev[playerId];
      const newVal = Math.max(0, (cur[field] ?? 0) + delta);
      // Cap assists at agreed score
      if (field === 'assists' && newVal + totalAssists - cur.assists > agreedScore) return prev;
      // Cap goals so total can't exceed agreed score
      if (field === 'goals' && newVal + totalGoals - cur.goals > agreedScore) return prev;
      return { ...prev, [playerId]: { ...cur, [field]: newVal } };
    });
  };

  const assignBadge = (badgeKey: string) => {
    if (!badgeFor) return;
    // Remove badge from previous holder
    setStats(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(pid => {
        if (next[pid].badge === badgeKey) next[pid] = { ...next[pid], badge: null };
      });
      next[badgeFor] = { ...next[badgeFor], badge: badgeKey };
      return next;
    });
    setShowBadgePicker(false);
    setBadgeFor(null);
  };

  const handleSave = async () => {
    setSaving(true); setErr('');
    const payload = myTeam.members.map(m => ({
      playerId: m.playerId,
      goals: stats[m.playerId]?.goals ?? 0,
      assists: stats[m.playerId]?.assists ?? 0,
      badgeKey: stats[m.playerId]?.badge ?? 'NONE',
    }));
    const r = await fetch(`/api/matches/${matchId}/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stats: payload }),
    });
    if (r.ok) {
      onDone();
    } else {
      const d = await r.json();
      setErr(d.error || 'Failed to save stats');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[400] bg-[#08090f] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 pt-6 pb-4 border-b border-[#1e2028]">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-black text-white">Player Stats</h2>
          <button onClick={onDone} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            <X size={16} className="text-neutral-400" />
          </button>
        </div>
        <p className="text-xs text-neutral-500">{myTeam.name} · Agreed Score: <strong className="text-white">{agreedScore}</strong></p>
        {/* Totals bar */}
        <div className="flex gap-3 mt-3">
          <div className={`flex-1 py-2 rounded-xl border text-center text-xs font-black ${
            totalGoals === agreedScore ? 'bg-[#00ff41]/10 border-[#00ff41]/30 text-[#00ff41]'
            : totalGoals > agreedScore ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-neutral-800 border-white/10 text-neutral-400'
          }`}>
            ⚽ {totalGoals}/{agreedScore} Goals
          </div>
          <div className={`flex-1 py-2 rounded-xl border text-center text-xs font-black ${
            assistsValid ? 'bg-neutral-800 border-white/10 text-neutral-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            ⚡ {totalAssists} Assists
          </div>
        </div>
      </div>

      {/* Player list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {myTeam.members.map(m => {
          const s = stats[m.playerId] ?? { goals: 0, assists: 0, badge: null };
          const isExpanded = expandedPlayer === m.playerId;
          const badge = FUTSAL_BADGES.find(b => b.key === s.badge);
          return (
            <div key={m.playerId}
              className="bg-[#111318] border border-[#1e2028] rounded-2xl overflow-hidden">
              {/* Player row */}
              <button className="w-full flex items-center gap-3 p-3 text-left active:bg-white/5 transition-colors"
                onClick={() => setExpandedPlayer(isExpanded ? null : m.playerId)}>
                <div className="w-11 h-11 rounded-xl bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center"
                  style={{ boxShadow: `0 0 10px rgba(${getRankColor(m.player.mmr) === '#cd7f32' ? '165,80,0' : '180,180,180'}, 0.15)` }}>
                  {m.player.avatarUrl
                    ? <img src={m.player.avatarUrl} className="w-full h-full object-cover" alt="" />
                    : <span className="text-sm font-black text-white/40">{m.player.fullName[0]}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-white truncate">{m.player.fullName}</p>
                  <p className="text-[10px] text-neutral-500 capitalize">{m.sportRole || m.role}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {badge && <span className="text-base">{badge.icon}</span>}
                  <span className="text-xs text-neutral-500 font-bold">{s.goals}G {s.assists}A</span>
                  <span className={`text-neutral-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                </div>
              </button>

              {/* Expanded stat row */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-[#1e2028] flex flex-col gap-4">
                  {/* Goals */}
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Goals</p>
                    <div className="flex items-center gap-3">
                      <button onClick={() => update(m.playerId, 'goals', -1)}
                        className="w-9 h-9 rounded-xl bg-neutral-800 border border-white/10 text-white font-black text-lg flex items-center justify-center active:scale-90">−</button>
                      <span className="text-2xl font-black text-white w-6 text-center tabular-nums">{s.goals}</span>
                      <button onClick={() => update(m.playerId, 'goals', +1)}
                        className="w-9 h-9 rounded-xl bg-[#00ff41]/20 border border-[#00ff41]/40 text-[#00ff41] font-black text-lg flex items-center justify-center active:scale-90">+</button>
                    </div>
                  </div>
                  {/* Assists */}
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Assists</p>
                    <div className="flex items-center gap-3">
                      <button onClick={() => update(m.playerId, 'assists', -1)}
                        className="w-9 h-9 rounded-xl bg-neutral-800 border border-white/10 text-white font-black text-lg flex items-center justify-center active:scale-90">−</button>
                      <span className="text-2xl font-black text-white w-6 text-center tabular-nums">{s.assists}</span>
                      <button onClick={() => update(m.playerId, 'assists', +1)}
                        className="w-9 h-9 rounded-xl bg-neutral-800 border border-white/10 text-white font-black text-lg flex items-center justify-center active:scale-90">+</button>
                    </div>
                  </div>
                  {/* Badge */}
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Badge</p>
                    <button onClick={() => { setBadgeFor(m.playerId); setShowBadgePicker(true); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-black transition-all ${
                        badge ? 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-400' : 'bg-neutral-800 border-white/10 text-neutral-400'
                      }`}>
                      {badge ? <>{badge.icon} {badge.label}</> : '+ Assign Badge'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-5 pb-10 pt-3 border-t border-[#1e2028]">
        {err && <p className="text-red-400 text-xs font-bold mb-2">{err}</p>}
        {!goalsValid && (
          <p className="text-amber-400 text-xs font-bold mb-2 text-center">
            Assign exactly {agreedScore} goal{agreedScore !== 1 ? 's' : ''} before saving
          </p>
        )}
        <button onClick={handleSave} disabled={!canSave || saving}
          className="w-full py-4 rounded-2xl bg-[#00ff41] text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <><CheckCircle size={16} /> Save Player Stats</>}
        </button>
      </div>

      {/* Badge Picker Sheet */}
      {showBadgePicker && (
        <div className="fixed inset-0 z-[450] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowBadgePicker(false); setBadgeFor(null); }} />
          <div className="relative bg-[#111318] rounded-t-3xl border-t border-[#1e2028] w-full max-w-md p-5 pb-10"
            style={{ animation: 'slideUpSheet 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
            <style>{`@keyframes slideUpSheet { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            <h3 className="text-lg font-black text-white mb-1">Assign Badge</h3>
            <p className="text-xs text-neutral-500 mb-5">One badge per player. One player per badge type.</p>
            <div className="flex flex-col gap-2">
              {FUTSAL_BADGES.map(b => {
                const currentHolder = Object.entries(stats).find(([, s]) => s.badge === b.key)?.[0];
                const isAssigned = !!currentHolder;
                return (
                  <button key={b.key} onClick={() => assignBadge(b.key)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all active:scale-[0.98] ${
                      isAssigned ? 'bg-fuchsia-500/10 border-fuchsia-500/30' : 'bg-neutral-900 border-white/5'
                    }`}>
                    <span className="text-3xl">{b.icon}</span>
                    <div className="text-left flex-1">
                      <p className="font-black text-sm text-white">{b.label}</p>
                      <p className="text-[10px] text-neutral-500">+{b.bonus} MMR bonus</p>
                      {isAssigned && (
                        <p className="text-[10px] text-fuchsia-400 font-bold mt-0.5">
                          Currently: {myTeam.members.find(m => m.playerId === currentHolder)?.player.fullName}
                        </p>
                      )}
                    </div>
                    {isAssigned && <CheckCircle size={16} className="text-fuchsia-400 shrink-0" />}
                  </button>
                );
              })}
              <button onClick={() => { setStats(prev => ({ ...prev, [badgeFor!]: { ...prev[badgeFor!], badge: null } })); setShowBadgePicker(false); setBadgeFor(null); }}
                className="w-full py-3 rounded-2xl bg-neutral-800 border border-white/10 text-neutral-400 font-black text-sm mt-2">
                Remove Badge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
