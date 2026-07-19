'use client';
import { useState } from 'react';
import { Loader2, CheckCircle, X, Shield, Star, Award } from 'lucide-react';

function getRankColor(mmr: number) {
  if (mmr <= 899)  return '#cd7f32';
  if (mmr <= 1199) return '#c0c0c0';
  if (mmr <= 1499) return '#ffd700';
  if (mmr <= 1799) return '#00e5ff';
  return '#ff00ff';
}

const FUTSAL_BADGES = [
  { key: 'MVP',        label: 'MVP',         icon: '⭐', bonus: 20 },
  { key: 'THE_SNIPER', label: 'The Sniper',  icon: '🎯', bonus: 10 },
  { key: 'THE_MAESTRO',label: 'The Maestro', icon: '🪄', bonus: 10 },
  { key: 'THE_WALL',   label: 'The Wall',    icon: '🛡️', bonus: 10 },
];

const OPPONENT_BADGES = [
  { key: 'OPP_RESPECT',  label: 'Respect',            icon: '🤝', bonus: 10 },
  { key: 'OPP_TOUGHEST', label: 'Toughest Opponent',  icon: '🪨', bonus: 10 },
  { key: 'OPP_KEEPER',   label: 'Best Keeper',        icon: '🧤', bonus: 10 },
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
  opponentTeam: Team;
  agreedScore: number;   // how many goals MY team scored
  playedPlayerIds?: string[];
  onDone: (statsPayload?: any) => void;
}

export default function PostMatchStatsModal({
  matchId, myTeam, opponentTeam, agreedScore, playedPlayerIds = [], onDone,
}: PostMatchStatsModalProps) {
  const [stats, setStats] = useState<Record<string, PlayerStat>>(() => {
    const init: Record<string, PlayerStat> = {};
    myTeam.members.forEach(m => { init[m.playerId] = { goals: 0, assists: 0, badge: null }; });
    opponentTeam.members.forEach(m => { init[m.playerId] = { goals: 0, assists: 0, badge: null }; });
    return init;
  });
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [badgeFor, setBadgeFor] = useState<string | null>(null); // playerId who gets the badge
  const [showBadgePicker, setShowBadgePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  // Calculate totals for OWN team goals/assists validation
  const totalGoals = myTeam.members.reduce((s, m) => s + (stats[m.playerId]?.goals ?? 0), 0);
  const totalAssists = myTeam.members.reduce((s, m) => s + (stats[m.playerId]?.assists ?? 0), 0);
  
  const goalsValid = totalGoals === agreedScore;
  const assistsValid = totalAssists <= agreedScore;

  // Validation: if any badge is assigned, at least one opponent badge must be assigned
  const badgedPlayers = Object.entries(stats).filter(([, s]) => s.badge && s.badge !== 'NONE');
  const hasAnyBadges = badgedPlayers.length > 0;
  
  const opponentPlayerIds = new Set(opponentTeam.members.map(m => m.playerId));
  const hasOpponentBadge = badgedPlayers.some(([pId]) => opponentPlayerIds.has(pId));
  
  const badgesValid = !hasAnyBadges || hasOpponentBadge;
  const canSave = goalsValid && assistsValid && badgesValid;

  const update = (playerId: string, field: 'goals' | 'assists', delta: number) => {
    setStats(prev => {
      const cur = prev[playerId];
      const newVal = Math.max(0, (cur[field] ?? 0) + delta);
      // Cap assists
      if (field === 'assists' && newVal + totalAssists - cur.assists > agreedScore) return prev;
      // Cap goals
      if (field === 'goals' && newVal + totalGoals - cur.goals > agreedScore) return prev;
      return { ...prev, [playerId]: { ...cur, [field]: newVal } };
    });
  };

  const assignBadge = (badgeKey: string) => {
    if (!badgeFor) return;
    setStats(prev => {
      const next = { ...prev };
      // Remove badge from whoever currently holds it
      Object.keys(next).forEach(pid => {
        if (next[pid].badge === badgeKey) next[pid] = { ...next[pid], badge: null };
      });
      next[badgeFor] = { ...next[badgeFor], badge: badgeKey };
      return next;
    });
    setShowBadgePicker(false);
    setBadgeFor(null);
  };

  const handleSave = async (skipAllBadges = false) => {
    setSaving(true); setErr('');

    // Prepare final stats array (combining both teams' statistics)
    const activePlayers = [...myTeam.members, ...opponentTeam.members];
    const payload = activePlayers.map(m => {
      const s = stats[m.playerId] ?? { goals: 0, assists: 0, badge: null };
      return {
        playerId: m.playerId,
        goals: opponentPlayerIds.has(m.playerId) ? 0 : (s.goals ?? 0),
        assists: opponentPlayerIds.has(m.playerId) ? 0 : (s.assists ?? 0),
        badgeKey: skipAllBadges ? 'NONE' : (s.badge ?? 'NONE'),
      };
    });

    const r = await fetch(`/api/matches/${matchId}/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stats: payload }),
    });
    
    if (r.ok) {
      // Pass stats payload to onDone to share with ShareCard
      onDone(payload);
    } else {
      const d = await r.json();
      setErr(d.error || 'Failed to save stats');
    }
    setSaving(false);
  };

  const isOpponent = badgeFor ? opponentPlayerIds.has(badgeFor) : false;
  const currentBadgeOptions = isOpponent ? OPPONENT_BADGES : FUTSAL_BADGES;

  return (
    <div className="fixed inset-0 z-[400] bg-[#08090f] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 pt-6 pb-4 border-b border-[#1e2028]">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-black text-white">Player Stats & Badges</h2>
          <button onClick={() => onDone()} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            <X size={16} className="text-neutral-400" />
          </button>
        </div>
        <p className="text-xs text-neutral-500">{myTeam.name} · Agreed Goals: <strong className="text-white">{agreedScore}</strong></p>
        
        {/* Totals bar */}
        <div className="flex gap-3 mt-3">
          <div className={`flex-1 py-2 rounded-xl border text-center text-xs font-black ${
            totalGoals === agreedScore ? 'bg-[#00ff41]/10 border-[#00ff41]/30 text-[#00ff41]'
            : totalGoals > agreedScore ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : 'bg-neutral-800 border-white/10 text-neutral-400'
          }`}>
            ⚽ {totalGoals}/{agreedScore} Goals Assigned
          </div>
          <div className={`flex-1 py-2 rounded-xl border text-center text-xs font-black ${
            assistsValid ? 'bg-neutral-800 border-white/10 text-neutral-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            ⚡ {totalAssists} Assists
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 flex flex-col gap-5">
        {/* Section 1: Your Team */}
        <div>
          <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider mb-3">Your Team Stats</h3>
          <div className="flex flex-col gap-3">
            {myTeam.members.map(m => {
              const s = stats[m.playerId] ?? { goals: 0, assists: 0, badge: null };
              const isExpanded = expandedPlayer === m.playerId;
              const badge = FUTSAL_BADGES.find(b => b.key === s.badge);
              const played = playedPlayerIds.length === 0 || playedPlayerIds.includes(m.playerId);
              return (
                <div key={m.playerId} className={`bg-[#111318] border border-[#1e2028] rounded-2xl overflow-hidden ${!played ? 'opacity-50' : ''}`}>
                  <button
                    disabled={!played}
                    className="w-full flex items-center gap-3 p-3 text-left active:bg-white/5 transition-colors disabled:pointer-events-none"
                    onClick={() => setExpandedPlayer(isExpanded ? null : m.playerId)}>
                    <div className="w-11 h-11 rounded-xl bg-neutral-800 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
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
                      {!played ? (
                        <span className="text-[9px] font-black text-neutral-500 uppercase tracking-wider bg-neutral-800 px-2 py-0.5 rounded border border-white/5">Didn't Play</span>
                      ) : (
                        <>
                          {badge && <span className="text-base">{badge.icon}</span>}
                          <span className="text-xs text-neutral-500 font-bold">{s.goals}G {s.assists}A</span>
                          <span className={`text-neutral-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                        </>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-[#1e2028] flex flex-col gap-4">
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
        </div>

        {/* Section 2: Opponent Badging */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black text-neutral-400 uppercase tracking-wider">Opponent Badges</h3>
            <span className="text-[9px] font-bold text-[#00ff41] bg-[#00ff41]/10 px-2 py-0.5 rounded border border-[#00ff41]/20">Required 🤝</span>
          </div>
          <div className="flex flex-col gap-3">
            {opponentTeam.members.map(m => {
              const s = stats[m.playerId] ?? { goals: 0, assists: 0, badge: null };
              const badge = OPPONENT_BADGES.find(b => b.key === s.badge);
              const played = playedPlayerIds.length === 0 || playedPlayerIds.includes(m.playerId);
              return (
                <div key={m.playerId} className={`flex items-center gap-3 p-3 bg-[#111318] border border-[#1e2028] rounded-2xl ${!played ? 'opacity-50' : ''}`}>
                  <div className="w-10 h-10 rounded-xl bg-neutral-800 overflow-hidden shrink-0 flex items-center justify-center">
                    {m.player.avatarUrl
                      ? <img src={m.player.avatarUrl} className="w-full h-full object-cover" alt="" />
                      : <span className="text-xs font-black text-white/40">{m.player.fullName[0]}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-xs text-white truncate">{m.player.fullName}</p>
                    <p className="text-[9px] text-neutral-500 capitalize">{m.sportRole || m.role}</p>
                  </div>
                  {!played ? (
                    <span className="text-[9px] font-black text-neutral-500 uppercase tracking-wider bg-neutral-800 px-2.5 py-1.5 rounded-xl border border-white/5 select-none">Didn't Play</span>
                  ) : (
                    <button onClick={() => { setBadgeFor(m.playerId); setShowBadgePicker(true); }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black transition-all ${
                        badge ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-neutral-800 border-white/5 text-neutral-400'
                      }`}>
                      {badge ? <>{badge.icon} {badge.label}</> : '+ Award Opponent'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-5 pb-8 pt-3 border-t border-[#1e2028] bg-[#08090f] flex flex-col gap-2">
        {err && <p className="text-red-400 text-xs font-bold text-center">{err}</p>}
        
        {!goalsValid && (
          <p className="text-amber-400 text-xs font-bold text-center">
            Assign exactly {agreedScore} goal{agreedScore !== 1 ? 's' : ''} to save player stats
          </p>
        )}
        
        {hasAnyBadges && !hasOpponentBadge && (
          <p className="text-amber-400 text-[10px] font-bold text-center">
            ⚠️ Award at least ONE badge to an opponent player (or click Skip Badges to skip entirely)
          </p>
        )}

        <div className="flex gap-2">
          {/* Skip option */}
          <button onClick={() => handleSave(true)} disabled={!goalsValid || saving}
            className="flex-1 py-3.5 rounded-2xl bg-neutral-900 border border-white/10 hover:border-white/20 text-neutral-400 hover:text-white font-black text-xs uppercase tracking-wider transition-all disabled:opacity-40">
            Skip Badges
          </button>
          
          {/* Main Save */}
          <button onClick={() => handleSave(false)} disabled={!canSave || saving}
            className="flex-[2] py-3.5 rounded-2xl bg-[#00ff41] hover:bg-[#00e038] text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-40 shadow-[0_0_15px_rgba(0,255,65,0.2)]">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <><CheckCircle size={14} /> Save Stats & Badges</>}
          </button>
        </div>
      </div>

      {/* Badge Picker Sheet */}
      {showBadgePicker && (
        <div className="fixed inset-0 z-[450] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowBadgePicker(false); setBadgeFor(null); }} />
          <div className="relative bg-[#111318] rounded-t-3xl border-t border-[#1e2028] w-full max-w-md p-5 pb-10"
            style={{ animation: 'slideUpSheet 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
            <style>{`@keyframes slideUpSheet { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
            
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-white">Award Badge</h3>
                <p className="text-[10px] text-neutral-500">
                  {isOpponent ? 'Select a badge for opponent player' : 'Select a badge for your player'}
                </p>
              </div>
              <button onClick={() => { setShowBadgePicker(false); setBadgeFor(null); }} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
                <X size={14} className="text-neutral-400" />
              </button>
            </div>
            
            <div className="flex flex-col gap-2">
              {currentBadgeOptions.map(b => {
                const currentHolder = Object.entries(stats).find(([, s]) => s.badge === b.key)?.[0];
                const isAssigned = !!currentHolder;
                
                // Name resolution
                const holderMember = isOpponent 
                  ? opponentTeam.members.find(m => m.playerId === currentHolder)
                  : myTeam.members.find(m => m.playerId === currentHolder);

                return (
                  <button key={b.key} onClick={() => assignBadge(b.key)}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all active:scale-[0.98] ${
                      isAssigned ? 'bg-fuchsia-500/10 border-fuchsia-500/30' : 'bg-neutral-900 border-white/5'
                    }`}>
                    <span className="text-2xl shrink-0">{b.icon}</span>
                    <div className="text-left flex-1 min-w-0">
                      <p className="font-black text-xs text-white truncate">{b.label}</p>
                      <p className="text-[9px] text-neutral-500">+{b.bonus} MMR bonus</p>
                      {isAssigned && holderMember && (
                        <p className="text-[9px] text-fuchsia-400 font-bold mt-0.5 truncate">
                          Recipient: {holderMember.player.fullName}
                        </p>
                      )}
                    </div>
                    {isAssigned && <CheckCircle size={14} className="text-fuchsia-400 shrink-0" />}
                  </button>
                );
              })}
              
              <button onClick={() => { setStats(prev => ({ ...prev, [badgeFor!]: { ...prev[badgeFor!], badge: null } })); setShowBadgePicker(false); setBadgeFor(null); }}
                className="w-full py-3 rounded-2xl bg-neutral-800 border border-white/10 text-neutral-400 font-black text-xs mt-2 uppercase tracking-wider">
                Remove Badge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
