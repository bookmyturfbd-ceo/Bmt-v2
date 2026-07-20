'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Loader2, ChevronLeft, Target, CreditCard, ArrowLeftRight,
  CheckCircle, Clock, Flag, X, Shield,
  Zap, Search, User
} from 'lucide-react';
import { subscribeToMatchChannel, broadcastMatchEvent } from '@/lib/supabaseRealtime';
import PostMatchStatsModal from '@/components/matches/PostMatchStatsModal';
import { useMatchResult } from '@/context/MatchResultContext';
import ShareCard from '@/components/matches/ShareCard';

// ─── Types ────────────────────────────────────────────────────────────────────
type MatchEvent = {
  id: string; matchId: string; type: string; teamId: string;
  playerId?: string; assistPlayerId?: string; playerOnId?: string;
  minute: number; status: 'PENDING' | 'CONFIRMED' | 'DISPUTED' | 'REMOVED';
  disputedByTeamId?: string; createdAt: string; isEdited?: boolean;
};
type MatchSignOff = { id: string; matchId: string; teamId: string };
type Player = { id: string; fullName: string; avatarUrl?: string; mmr: number };
type Member = { id: string; playerId: string; role: string; sportRole?: string; player: Player };
type Team = { id: string; name: string; logoUrl?: string; sportType: string; teamMmr: number; ownerId: string; members: Member[] };
type RosterPick = { id: string; matchId: string; teamId: string; memberId: string; isStarter: boolean };
type Match = { id: string; teamA_Id: string; teamB_Id: string; status: string; teamA: Team; teamB: Team; rosterPicks: RosterPick[]; matchStartedByA: boolean; matchStartedByB: boolean; matchEndedByA: boolean; matchEndedByB: boolean; scoreA: number; scoreB: number; };

// ─── Event type meta ─────────────────────────────────────────────────────────
const EVENT_META: Record<string, { icon: string; label: string; color: string }> = {
  GOAL:            { icon: '⚽', label: 'Goal',           color: '#22c55e' },
  OWN_GOAL:        { icon: '⚽', label: 'Own Goal',       color: '#f97316' },
  PENALTY_SCORED:  { icon: '🎯', label: 'Penalty Goal',   color: '#22c55e' },
  PENALTY_MISSED:  { icon: '❌', label: 'Penalty Miss',   color: '#94a3b8' },
  YELLOW_CARD:     { icon: '🟨', label: 'Yellow Card',    color: '#eab308' },
  RED_CARD:        { icon: '🟥', label: 'Red Card',       color: '#ef4444' },
  SUBSTITUTION:    { icon: '🔄', label: 'Substitution',   color: '#a78bfa' },
  HALF_TIME:       { icon: '🔔', label: 'Half Time',      color: '#60a5fa' },
  FULL_TIME:       { icon: '🏁', label: 'Full Time',      color: '#f59e0b' },
};

// ─── Event Bottom Sheet ──────────────────────────────────────────────────────
type SheetType = 'GOAL' | 'OWN_GOAL' | 'PENALTY' | 'CARD' | 'SUB' | null;

function EventSheet({ type, myTeam, opponentTeam, isSingleScorer, matchId, currentMinute, rosterPicks, editEvent, onClose, onSubmit }: {
  type: SheetType; myTeam: Team; opponentTeam: Team; isSingleScorer: boolean;
  matchId: string; currentMinute: number;
  rosterPicks: RosterPick[];
  editEvent?: MatchEvent | null;
  onClose: () => void; onSubmit: (event: MatchEvent) => void;
}) {
  const [step, setStep] = useState(0);
  const [isOwnGoal, setIsOwnGoal] = useState(editEvent?.type === 'OWN_GOAL');
  const [scorerId, setScorerId] = useState<string | null>(editEvent?.playerId || null);
  const [assistId, setAssistId] = useState<string | null>(editEvent?.assistPlayerId || null);
  const [playerOffId, setPlayerOffId] = useState<string | null>(editEvent?.playerId || null);
  const [playerOnId2, setPlayerOnId2] = useState<string | null>(editEvent?.playerOnId || null);
  const [minute, setMinute] = useState(editEvent ? editEvent.minute : currentMinute);
  const [cardType, setCardType] = useState<'YELLOW' | 'RED'>(editEvent?.type === 'RED_CARD' ? 'RED' : 'YELLOW');
  const [penaltyScored, setPenaltyScored] = useState(editEvent?.type === 'PENALTY_SCORED' || editEvent?.type !== 'PENALTY_MISSED');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [showMinuteStepper, setShowMinuteStepper] = useState(false);

  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    editEvent ? editEvent.teamId : myTeam.id
  );

  const activeTeam = isSingleScorer ? (selectedTeamId === myTeam.id ? myTeam : opponentTeam) : myTeam;

  // Split roster into starters and subs based on interaction board picks
  const myPicks = rosterPicks.filter(p => p.teamId === activeTeam.id);
  const starterIds = new Set(myPicks.filter(p => p.isStarter).map(p => p.memberId));
  const subIds     = new Set(myPicks.filter(p => !p.isStarter).map(p => p.memberId));
  const myStarters = activeTeam.members.filter(m => starterIds.has(m.id));
  const mySubs     = activeTeam.members.filter(m => subIds.has(m.id));
  const myMembers  = activeTeam.members; // all members for goal/card/penalty

  const submit = async () => {
    setLoading(true); setErr('');
    let eventType = type as string;
    if (type === 'PENALTY') eventType = penaltyScored ? 'PENALTY_SCORED' : 'PENALTY_MISSED';
    if (type === 'CARD') eventType = cardType === 'RED' ? 'RED_CARD' : 'YELLOW_CARD';
    if (isOwnGoal) eventType = 'OWN_GOAL';

    const body: any = { type: eventType, minute, teamId: activeTeam.id };
    if (eventType === 'GOAL' || eventType === 'PENALTY_SCORED' || eventType === 'PENALTY_MISSED') body.scorerPlayerId = scorerId;
    if (eventType === 'GOAL') body.assistPlayerId = assistId;
    if (eventType === 'CARD' || eventType === 'YELLOW_CARD' || eventType === 'RED_CARD') body.scorerPlayerId = scorerId;
    if (eventType === 'SUB' || eventType === 'SUBSTITUTION') { body.scorerPlayerId = playerOffId; body.playerOnId = playerOnId2; }
    if (eventType === 'OWN_GOAL') body.scorerPlayerId = scorerId; // conceding opponent player

    let r, d;
    if (editEvent) {
      // Edit mode
      r = await fetch(`/api/matches/${matchId}/events/${editEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'edit',
          minute,
          scorerPlayerId: body.scorerPlayerId,
          assistPlayerId: body.assistPlayerId,
          playerOnId: body.playerOnId,
        })
      });
      d = await r.json();
      if (r.ok) {
        await broadcastMatchEvent(matchId, 'EVENT_UPDATED', { event: d.event });
        onSubmit(d.event);
        onClose();
      } else setErr(d.error || 'Failed to edit');
    } else {
      // Create mode
      r = await fetch(`/api/matches/${matchId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      d = await r.json();
      if (r.ok) {
        await broadcastMatchEvent(matchId, 'EVENT_CREATED', { event: d.event });
        onSubmit(d.event);
        onClose();
      } else setErr(d.error || 'Failed');
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!editEvent) return;
    setLoading(true); setErr('');
    const r = await fetch(`/api/matches/${matchId}/events/${editEvent.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete' })
    });
    const d = await r.json();
    if (r.ok) {
      await broadcastMatchEvent(matchId, 'EVENT_UPDATED', { event: d.event });
      onSubmit(d.event);
      onClose();
    } else setErr(d.error || 'Failed to delete');
    setLoading(false);
  };

  // PlayerList — NO internal scroll. The parent body div owns all scrolling.
  const PlayerList = ({ members, selected, onSelect, label, showOwnGoalOption, onSelectOwnGoal }: {
    members: Member[]; selected: string | null; onSelect: (id: string) => void; label: string;
    showOwnGoalOption?: boolean; onSelectOwnGoal?: () => void;
  }) => (
    <div className="flex flex-col gap-2">
      {label ? <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">{label}</p> : null}
      
      {showOwnGoalOption && (
        <button onClick={onSelectOwnGoal}
          className="flex items-center gap-3 p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 active:scale-[0.98] transition-all mb-1 hover:bg-red-500/10">
          <span className="text-xl">⚽</span>
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-black truncate">Own Goal (conceded by opponent)</p>
            <p className="text-[10px] text-red-500/60 font-bold uppercase">Log own goal</p>
          </div>
        </button>
      )}

      {members.length === 0 && !showOwnGoalOption && (
        <p className="text-xs text-neutral-600 italic py-3 text-center">No players in this group</p>
      )}
      {members.map(m => (
        <button key={m.id} onClick={() => onSelect(m.playerId)}
          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
            selected === m.playerId
              ? 'bg-[#00ff41]/10 border-[#00ff41]/40 text-[#00ff41]'
              : 'bg-neutral-900 border-white/5 text-white'
          }`}>
          <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
            {m.player.avatarUrl
              ? <img src={m.player.avatarUrl} className="w-full h-full object-cover" alt="" />
              : <span className="text-xs font-black text-white/40">{m.player.fullName[0]}</span>
            }
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-black truncate">{m.player.fullName}</p>
            <p className="text-[10px] text-neutral-500 capitalize">{m.sportRole || m.role}</p>
          </div>
          {selected === m.playerId && <CheckCircle size={16} className="text-[#00ff41] shrink-0" />}
        </button>
      ))}
    </div>
  );

  // Compact minute selector — buttons hug the number, always thumb-reachable
  const MinuteInput = () => (
    <div className="w-full flex flex-col items-center">
      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Minute</p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setMinute(m => Math.max(0, m - 1))}
          className="w-10 h-10 rounded-xl bg-neutral-800 border border-white/10 text-lg font-black text-white flex items-center justify-center active:scale-90 shrink-0"
        >−</button>
        <input
          type="number"
          value={minute}
          onChange={e => setMinute(Number(e.target.value))}
          className="w-16 text-center text-2xl font-black text-white bg-transparent outline-none"
          style={{ MozAppearance: 'textfield' }}
        />
        <button
          onClick={() => setMinute(m => m + 1)}
          className="w-10 h-10 rounded-xl bg-[#00ff41]/20 border border-[#00ff41]/40 text-lg font-black text-[#00ff41] flex items-center justify-center active:scale-90 shrink-0"
        >+</button>
      </div>
    </div>
  );

  const title = isOwnGoal
    ? ['Who conceded?', 'Who conceded?'][step]
    : type === 'GOAL' ? ['Who scored?', 'Assist?'][step]
    : type === 'PENALTY' ? 'Penalty'
    : type === 'CARD' ? 'Card Event'
    : type === 'SUB' ? ['Player Off?', 'Player On?'][step]
    : 'Own Goal';

  const canNext = isOwnGoal ? true : (type === 'GOAL'
    ? step === 0 ? !!scorerId : true
    : type === 'SUB'
    ? step === 0 ? !!playerOffId : true
    : true);

  const canSubmit = isOwnGoal ? true : (type === 'GOAL'
    ? step === 1 && !!scorerId
    : type === 'CARD' ? !!scorerId
    : type === 'PENALTY' ? (penaltyScored ? !!scorerId : true)
    : type === 'SUB' ? step === 1 && !!playerOffId && !!playerOnId2
    : true);

  const totalSteps = isOwnGoal ? 1 : (type === 'GOAL' ? 2 : type === 'SUB' ? 2 : 1);

  return (
    <div className="fixed inset-0 z-[150] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#111318] rounded-t-3xl border-t border-[#1e2028] overflow-hidden flex flex-col max-h-[85vh]"
        style={{ animation: 'slideUpSheet 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
        <style>{`@keyframes slideUpSheet { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        <div className="flex flex-col px-5 pt-5 pb-4 border-b border-[#1e2028] shrink-0 gap-4">
          <div className="flex items-center justify-between">
            <div>
              {totalSteps > 1 && <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Step {step + 1} of {totalSteps}</p>}
              <h2 className="text-xl font-black text-white">{title}</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
              <X size={16} className="text-neutral-400" />
            </button>
          </div>
          {isSingleScorer && !isOwnGoal && (
            <div className="flex bg-[#000] p-1 rounded-2xl w-full">
              <button onClick={() => { setSelectedTeamId(myTeam.id); setScorerId(null); setAssistId(null); setPlayerOffId(null); setPlayerOnId2(null); }}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all truncate px-2 ${selectedTeamId === myTeam.id ? 'bg-[#00ff41] text-black' : 'text-neutral-500 hover:text-white'}`}>{myTeam.name}</button>
              <button onClick={() => { setSelectedTeamId(opponentTeam.id); setScorerId(null); setAssistId(null); setPlayerOffId(null); setPlayerOnId2(null); }}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all truncate px-2 ${selectedTeamId === opponentTeam.id ? 'bg-[#ef4444] text-white' : 'text-neutral-500 hover:text-white'}`}>{opponentTeam.name}</button>
            </div>
          )}
        </div>

        <div
          className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-4"
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
          {/* Own Goal concessions list */}
          {isOwnGoal && (
            <div>
              <button onClick={() => { setScorerId(null); submit(); }} className={`w-full py-3 px-4 rounded-xl border mb-3 font-black text-sm transition-all bg-neutral-900 border-white/5 text-neutral-400`}>Skip / No Player</button>
              <PlayerList members={opponentTeam.members} selected={scorerId} onSelect={setScorerId} label="Select opponent player who conceded" />
            </div>
          )}

          {!isOwnGoal && type === 'GOAL' && step === 0 && <PlayerList members={myMembers} selected={scorerId} onSelect={setScorerId} label="Goalscorer" showOwnGoalOption={true} onSelectOwnGoal={() => setIsOwnGoal(true)} />}
          {!isOwnGoal && type === 'GOAL' && step === 1 && (
            <div>
              <button onClick={() => setAssistId(null)} className={`w-full py-3 px-4 rounded-xl border mb-3 font-black text-sm transition-all ${assistId === null ? 'bg-neutral-700 border-white/30 text-white' : 'bg-neutral-900 border-white/5 text-neutral-400'}`}>No Assist</button>
              {myMembers.filter((m: Member) => m.playerId !== scorerId).map((m: Member) => (
                <button key={m.id} onClick={() => setAssistId(m.playerId)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border mb-2 transition-all ${assistId === m.playerId ? 'bg-[#00ff41]/10 border-[#00ff41]/40 text-[#00ff41]' : 'bg-neutral-900 border-white/5 text-white'}`}>
                  <span className="font-black text-sm flex-1 text-left">{m.player.fullName}</span>
                  {assistId === m.playerId && <CheckCircle size={15} className="text-[#00ff41]" />}
                </button>
              ))}
            </div>
          )}

          {type === 'PENALTY' && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <button onClick={() => setPenaltyScored(true)} className={`flex-1 py-3 rounded-xl font-black text-sm border transition-all ${penaltyScored ? 'bg-[#00ff41]/10 border-[#00ff41]/40 text-[#00ff41]' : 'bg-neutral-900 border-white/5 text-neutral-400'}`}>Scored</button>
                <button onClick={() => setPenaltyScored(false)} className={`flex-1 py-3 rounded-xl font-black text-sm border transition-all ${!penaltyScored ? 'bg-red-500/10 border-red-500/40 text-red-400' : 'bg-neutral-900 border-white/5 text-neutral-400'}`}>Missed</button>
              </div>
              {penaltyScored && <PlayerList members={myMembers} selected={scorerId} onSelect={setScorerId} label="Penalty Taker" />}
            </div>
          )}

          {type === 'CARD' && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <button onClick={() => setCardType('YELLOW')} className={`flex-1 py-3 rounded-xl font-black text-sm border transition-all ${cardType === 'YELLOW' ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400' : 'bg-neutral-900 border-white/5 text-neutral-400'}`}>🟨 Yellow</button>
                <button onClick={() => setCardType('RED')} className={`flex-1 py-3 rounded-xl font-black text-sm border transition-all ${cardType === 'RED' ? 'bg-red-500/10 border-red-500/40 text-red-400' : 'bg-neutral-900 border-white/5 text-neutral-400'}`}>🟥 Red</button>
              </div>
              <PlayerList members={myMembers} selected={scorerId} onSelect={setScorerId} label="Player Booked" />
            </div>
          )}

          {type === 'SUB' && step === 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Player Coming OFF (starters)</p>
              {myStarters.length === 0
                ? <PlayerList members={myMembers} selected={playerOffId} onSelect={setPlayerOffId} label="All players" />
                : <PlayerList members={myStarters} selected={playerOffId} onSelect={setPlayerOffId} label="" />
              }
            </div>
          )}
          {type === 'SUB' && step === 1 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Player Coming ON (subs)</p>
              {mySubs.length === 0
                ? <PlayerList members={myMembers.filter((m: Member) => m.playerId !== playerOffId)} selected={playerOnId2} onSelect={setPlayerOnId2} label="All players" />
                : <PlayerList members={mySubs.filter((m: Member) => m.playerId !== playerOffId)} selected={playerOnId2} onSelect={setPlayerOnId2} label="" />
              }
            </div>
          )}

          {type === 'OWN_GOAL' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                <p className="text-sm font-bold text-orange-400">⚠️ Own Goal — will add 1 goal to <strong>{opponentTeam.name}</strong></p>
              </div>
            </div>
          )}

          {/* Editable Minute Chip on final step */}
          {(totalSteps === 1 || step === totalSteps - 1) && (
            <div className="flex flex-col items-center justify-center my-4 shrink-0">
              {!showMinuteStepper ? (
                <button
                  type="button"
                  onClick={() => setShowMinuteStepper(true)}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full border border-white/10 text-sm font-black flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  ⏱ {minute}' <span className="text-neutral-400 text-xs">✎</span>
                </button>
              ) : (
                <MinuteInput />
              )}
            </div>
          )}

          {err && <p className="text-red-400 text-xs font-bold">{err}</p>}
        </div>

        <div className="px-5 pb-8 pt-3 border-t border-[#1e2028] shrink-0 flex gap-2">
          {editEvent && (
            <button onClick={handleDelete} disabled={loading}
              className="px-5 py-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-black text-sm transition-all active:scale-[0.98]">
              Delete
            </button>
          )}

          {totalSteps > 1 && step < totalSteps - 1 && (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext}
              className="flex-1 py-4 rounded-2xl bg-[#00ff41] hover:bg-[#00e038] text-black font-black text-sm disabled:opacity-40 transition-all">
              Next →
            </button>
          )}
          {(totalSteps === 1 || step === totalSteps - 1) && (
            <button onClick={submit} disabled={!canSubmit || loading}
              className="flex-1 py-4 rounded-2xl bg-[#00ff41] hover:bg-[#00e038] text-black font-black text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
              {loading ? <Loader2 size={16} className="animate-spin" /> : (editEvent ? 'Save ✓' : 'Submit ✓')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Single Scorer Search Modal ──────────────────────────────────────────────
function ScorerSearchModal({ myTeam, opponentTeam, onClose, onSelect }: {
  myTeam: Team; opponentTeam: Team; onClose: () => void; onSelect: (playerId: string) => void;
}) {
  const [tab, setTab] = useState<'myTeam'|'opponent'|'search'>('myTeam');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Player[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (tab !== 'search' || query.length < 3) { setResults([]); return; }
    const delay = setTimeout(async () => {
      setSearching(true);
      const r = await fetch(`/api/players/search?q=${encodeURIComponent(query)}`);
      const d = await r.json();
      setResults(Array.isArray(d) ? d : (d.players || []));
      setSearching(false);
    }, 400);
    return () => clearTimeout(delay);
  }, [tab, query]);

  const renderPlayer = (p: Player) => (
    <button key={p.id} onClick={() => onSelect(p.id)}
      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-[#111318] border border-white/5 active:scale-[0.98] transition-all text-left mb-2">
      <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
        {p.avatarUrl ? <img src={p.avatarUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-neutral-500 font-bold">{p.fullName.charAt(0)}</span>}
      </div>
      <div className="flex-1">
        <p className="font-black text-white text-sm">{p.fullName}</p>
        <p className="text-xs text-neutral-500">{p.mmr} MMR</p>
      </div>
      <ChevronLeft size={16} className="text-neutral-500 rotate-180" />
    </button>
  );

  return (
    <div className="fixed inset-0 z-[400] bg-[#08090f]/98 backdrop-blur-md flex flex-col pt-12 pb-6 px-4">
      <div className="flex items-center gap-4 mb-6 relative">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-neutral-800/50 flex items-center justify-center text-white active:scale-95"><ChevronLeft size={20} /></button>
        <h2 className="text-xl font-black text-white flex-1 text-center pr-10">Select Scorer</h2>
      </div>
      <div className="flex bg-[#111318] p-1 rounded-2xl mb-6 shrink-0">
        <button onClick={() => setTab('myTeam')} className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${tab === 'myTeam' ? 'bg-[#22c55e] text-black' : 'text-neutral-400'}`}>My Team</button>
        <button onClick={() => setTab('opponent')} className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${tab === 'opponent' ? 'bg-[#ef4444] text-white' : 'text-neutral-400'}`}>Opponent</button>
        <button onClick={() => setTab('search')} className={`flex-1 py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1 ${tab === 'search' ? 'bg-neutral-700 text-white' : 'text-neutral-400'}`}><Search size={12}/> Global</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 'myTeam' && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3 ml-1">{myTeam.name}</p>
            {myTeam.members.map(m => renderPlayer(m.player))}
          </div>
        )}
        {tab === 'opponent' && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3 ml-1">{opponentTeam.name}</p>
            {opponentTeam.members.map(m => renderPlayer(m.player))}
          </div>
        )}
        {tab === 'search' && (
          <div className="flex flex-col gap-4">
            <input type="text" placeholder="Search name, phone, email..." value={query} onChange={e => setQuery(e.target.value)}
              className="w-full bg-[#111318] border border-white/10 rounded-2xl p-4 text-white placeholder-neutral-500 font-bold focus:outline-none focus:border-white/30" />
            {searching && <p className="text-xs text-neutral-500 text-center">Searching...</p>}
            {!searching && query.length >= 3 && results.length === 0 && <p className="text-xs text-neutral-500 text-center">No players found.</p>}
            {!searching && results.map(p => renderPlayer(p))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Live Scoring Page ───────────────────────────────────────────────────
export default function LiveScoringPage() {
  const params  = useParams();
  const router  = useRouter();
  const matchId = params.matchId as string;
  const locale  = (params.locale as string) || 'en';
  const { showMatchResult } = useMatchResult();

  const [state, setState]       = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [events, setEvents]     = useState<MatchEvent[]>([]);
  const [signOffs, setSignOffs] = useState<MatchSignOff[]>([]);
  const [scoreA, setScoreA]     = useState(0);
  const [scoreB, setScoreB]     = useState(0);
  const [halfTime, setHalfTime] = useState<any>(null);

  // Derive score reactively from events array to prevent double counting
  useEffect(() => {
    const match = state?.match;
    if (!match) return;
    const goals = events.filter(e => ['GOAL', 'PENALTY_SCORED', 'OWN_GOAL'].includes(e.type) && e.status === 'CONFIRMED');
    let sA = 0, sB = 0;
    goals.forEach(e => {
      if (e.type === 'OWN_GOAL') {
        if (e.teamId === match.teamA_Id) sB++; else sA++;
      } else {
        if (e.teamId === match.teamA_Id) sA++; else sB++;
      }
    });
    setScoreA(sA);
    setScoreB(sB);
  }, [events, state?.match?.teamA_Id, state?.match?.teamB_Id]);

  const [timerSecs, setTimerSecs]       = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<any>(null);
  const stateRef = useRef<any>(null);

  useEffect(() => { stateRef.current = state; }, [state]);

  const [activeTab, setActiveTab]     = useState<'timeline' | 'disputes'>('timeline');
  const [sheetType, setSheetType]     = useState<SheetType>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [msg, setMsg]                 = useState('');
  const [showSignOff, setShowSignOff] = useState(false);
  const [matchResult, setMatchResult] = useState<{
    scoreA: number; scoreB: number;
    winnerId: string | null;
    mmrChangeA: number; mmrChangeB: number;
    victoryString?: string;
    multA?: number;
    multB?: number;
  } | null>(null);

  // ── Score After Match state ────────────────────────────────────────────────
  const [scoringMode, setScoringMode]             = useState<'LIVE' | 'LIVE_SINGLE' | 'SCORE_AFTER'>('LIVE');
  const [scoreModeAgreed, setScoreModeAgreed]     = useState(false);
  const [scoreModeRequest, setScoreModeRequest]   = useState<{ mode: string; fromTeamId: string; singleScorerId?: string } | null>(null);
  const [showModeGate, setShowModeGate]           = useState(false);
  const [modeGateLoading, setModeGateLoading]     = useState(false);
  // Server-authoritative negotiation state
  const [negStatus, setNegStatus]           = useState<'negotiating' | 'agreed'>('negotiating');
  const [teamAPresent, setTeamAPresent]     = useState(false);
  const [teamBPresent, setTeamBPresent]     = useState(false);
  const [proposalA, setProposalA]           = useState<{ mode: string; method?: string } | null>(null);
  const [proposalB, setProposalB]           = useState<{ mode: string; method?: string } | null>(null);
  const [isSuggestingInstead, setIsSuggestingInstead] = useState(false);
  const [timeoutPromptVisible, setTimeoutPromptVisible] = useState(false);
  const [matchServerStartMs, setMatchServerStartMs] = useState<number | null>(null);
  // End-game dual-confirm
  const [myEndedGame, setMyEndedGame]             = useState(false);
  const [opponentEndedGame, setOpponentEndedGame] = useState(false);
  const [endGameLoading, setEndGameLoading]       = useState(false);
  // Score entry panel
  const [showScoreEntry, setShowScoreEntry]       = useState(false);
  const [mySubmittedScore, setMySubmittedScore]   = useState<{ us: number; them: number } | null>(null);
  const [opponentSubmitted, setOpponentSubmitted] = useState(false);
  const [scoreEntryUs, setScoreEntryUs]           = useState(0);
  const [scoreEntryThem, setScoreEntryThem]       = useState(0);
  const [scoreSubmitting, setScoreSubmitting]     = useState(false);
  const [playedMemberIds, setPlayedMemberIds]     = useState<string[]>([]);
  // Score comparison (after both submit)
  const [scoresRevealed, setScoresRevealed]       = useState<{ scoreA: number; scoreB: number } | null>(null);
  const [myAccepted, setMyAccepted]               = useState(false);
  const [opponentAccepted, setOpponentAccepted]   = useState(false);
  const [acceptLoading, setAcceptLoading]         = useState(false);
  // Post-match stats modal (Score After only)
  const [showStatsModal, setShowStatsModal]       = useState(false);
  const [matchStats, setMatchStats]               = useState<any[]>([]);
  const [badgesDismissed, setBadgesDismissed]     = useState(false);
  const [showShareCard, setShowShareCard]         = useState(false);
  const [sharedBadges, setSharedBadges]           = useState<any[]>([]);

  // Undo/Edit states
  const [undoToast, setUndoToast] = useState<{ id: string; msg: string } | null>(null);
  const [undoTimer, setUndoTimer] = useState<number>(5);
  const [selectedEventToEdit, setSelectedEventToEdit] = useState<any | null>(null);
  const [isHalfTimeConfirmed, setIsHalfTimeConfirmed] = useState(false);

  // Quick-Log States
  const [showQuickLogTeamPicker, setShowQuickLogTeamPicker] = useState(false);
  const [longPressed, setLongPressed] = useState(false);
  const longPressTimerRef = useRef<any>(null);

  // Single Scorer Mode State
  const [liveScoringSubMenu, setLiveScoringSubMenu] = useState(false);
  const [showScorerSearch, setShowScorerSearch]     = useState(false);

  const loadState = useCallback(async () => {
    const r = await fetch(`/api/matches/${matchId}/state`);
    if (!r.ok) { router.push(`/${locale}/interact`); return; }
    const d = await r.json();
    setState(d);
    setEvents(d.events || []);
    setSignOffs(d.signOffs || []);
    setMatchStats(d.matchStats || []);
    setIsHalfTimeConfirmed(!!(d.halfTime?.calledByA && d.halfTime?.calledByB));
    setScoreA(d.scoreA ?? 0);
    setScoreB(d.scoreB ?? 0);
    setHalfTime(d.halfTime || null);
    const myPicks = d.match.rosterPicks?.filter((p: any) => p.teamId === d.myTeamId) || [];
    const myStarters = myPicks.filter((p: any) => p.isStarter);
    setPlayedMemberIds(prev => prev.length > 0 ? prev : myStarters.map((s: any) => s.memberId));
    // Scoring mode
    setScoringMode(d.scoringMode ?? 'LIVE');
    setScoreModeAgreed(d.scoreModeAgreed ?? false);
    setOpponentSubmitted(
      d.isTeamA ? (d.scoreSubmittedByB ?? false) : (d.scoreSubmittedByA ?? false)
    );
    // End-game dual-confirm hydration
    setMyEndedGame(d.isTeamA ? (d.matchEndedByA ?? false) : (d.matchEndedByB ?? false));
    setOpponentEndedGame(d.isTeamA ? (d.matchEndedByB ?? false) : (d.matchEndedByA ?? false));
    // Score comparison hydration: if both submitted and agreed, restore revealed state
    if (d.scoreSubmittedByA && d.scoreSubmittedByB && d.submittedScoreA !== null) {
      const sA = d.submittedScoreA ?? 0;
      const sB = d.submittedScoreB ?? 0;
      const sA2 = d.submittedScoreA2 ?? 0;
      const sB2 = d.submittedScoreB2 ?? 0;
      if (sA === sA2 && sB === sB2 && d.match?.status === 'SCORE_ENTRY') {
        setScoresRevealed({ scoreA: sA, scoreB: sB });
        setMySubmittedScore(d.isTeamA ? { us: sA, them: sB } : { us: sB2, them: sA2 });
      }
    }
    setMyAccepted(d.isTeamA ? (d.agreedByA ?? false) : (d.agreedByB ?? false));
    setOpponentAccepted(d.isTeamA ? (d.agreedByB ?? false) : (d.agreedByA ?? false));
    // Surface accept/reject ONLY to the opponent (not the proposer)
    if (d.scoreModeRequestedBy && d.scoreModeRequestedBy !== d.myTeamId && !d.scoreModeAgreed) {
      setScoreModeRequest({ mode: d.scoringMode, fromTeamId: d.scoreModeRequestedBy, singleScorerId: d.match?.proposedSingleScorerId });
      setShowModeGate(false); // opponent sees accept/reject, not the gate
    } else if (d.scoreModeRequestedBy && d.scoreModeRequestedBy === d.myTeamId && !d.scoreModeAgreed) {
      // Proposer: clear any stale request notification, keep gate hidden
      setScoreModeRequest(null);
      setShowModeGate(false);
    }
    // Hydrate server-authoritative negotiation fields
    const neg = d.match;
    if (neg) {
      const isAgreed = neg.scoringNegotiationStatus === 'agreed' || d.scoreModeAgreed;
      setNegStatus(isAgreed ? 'agreed' : 'negotiating');
      setTeamAPresent(neg.teamA_Present ?? false);
      setTeamBPresent(neg.teamB_Present ?? false);
      setProposalA(neg.proposalA_mode ? { mode: neg.proposalA_mode, method: neg.proposalA_method } : null);
      setProposalB(neg.proposalB_mode ? { mode: neg.proposalB_mode, method: neg.proposalB_method } : null);
      if (neg.matchStartedAt) setMatchServerStartMs(new Date(neg.matchStartedAt).getTime());
    }
    setLoading(false);

    if (d.match?.status === 'LIVE') {
      const isHalfTimeConfirmed = d.halfTime?.calledByA && d.halfTime?.calledByB;
      const isHTProposedOrConfirmed = !!d.halfTime;

      // Use server matchStartedAt if available, fall back to updatedAt
      const startMs = d.match.matchStartedAt
        ? new Date(d.match.matchStartedAt).getTime()
        : new Date(d.match.updatedAt).getTime();
      const now = Date.now();

      setTimerSecs(prev => {
        if (isHalfTimeConfirmed) {
          const htEvent = (d.events || []).find((e: any) => e.type === 'HALF_TIME');
          return htEvent ? htEvent.minute * 60 : 2700;
        }
        if (isHTProposedOrConfirmed) {
          // Pause local clock calculations
          return prev > 0 ? prev : Math.max(0, Math.floor((now - startMs) / 1000));
        }
        // Only count if negotiation is agreed
        const isAgreedLocal = d.match.scoringNegotiationStatus === 'agreed' || d.scoreModeAgreed;
        if (!d.match.matchStartedAt && !isAgreedLocal) return 0;
        let elapsed = Math.floor((now - startMs) / 1000);
        if (d.events?.length > 0) {
          const maxMin = Math.max(...d.events.map((e: any) => e.minute));
          if (maxMin * 60 > elapsed) elapsed = maxMin * 60;
        }
        return Math.max(0, elapsed);
      });
      // Only run timer when agreed and not proposed or confirmed halftime
      const isAgreed = d.match.scoringNegotiationStatus === 'agreed' || d.scoreModeAgreed;
      setTimerRunning(isAgreed && !isHTProposedOrConfirmed);
      // Show mode gate only if: OMC, no mode agreed, and no pending proposal from anyone
      if (d.isOMC && d.match.scoringNegotiationStatus !== 'agreed' && !d.scoreModeRequestedBy) {
        setShowModeGate(true);
      }
    }
    if (d.match?.status === 'SCORE_ENTRY') {
      if (d.scoringMode === 'SCORE_AFTER') {
        setShowScoreEntry(true);
      } else {
        setShowSignOff(true);
      }
    } else {
      setShowSignOff(false);
      setShowScoreEntry(false);
      if (d.match?.status === 'COMPLETED' && d.matchResult) {
        setMatchResult(d.matchResult);
      }
    }
  }, [matchId, locale]);

  useEffect(() => { loadState(); }, [loadState]);

  // Undo countdown timer
  useEffect(() => {
    if (!undoToast) return;
    setUndoTimer(5);
    const interval = setInterval(() => {
      setUndoTimer(t => {
        if (t <= 1) {
          clearInterval(interval);
          setUndoToast(null);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [undoToast]);

  // Auto post-match stats modal open
  useEffect(() => {
    if (!state) return;
    const isCompleted = state.match?.status === 'COMPLETED';
    const badgesDistributed = matchStats.some(s => s.teamId === state.myTeamId && s.badge !== 'NONE');
    if (isCompleted && state.isOMC && !badgesDistributed && !badgesDismissed && !showStatsModal) {
      setShowStatsModal(true);
    }
  }, [state, matchStats, badgesDismissed, showStatsModal]);

  // Supabase Realtime
  useEffect(() => {
    if (!matchId) return;
    const channel = subscribeToMatchChannel(matchId, ({ event, data }) => {
      if (event === 'EVENT_CREATED') {
        setEvents(prev => {
          const exists = prev.some(e => e.id === data.event.id);
          return exists ? prev : [...prev, data.event];
        });
      }
      if (event === 'EVENT_UPDATED') {
        setEvents(prev => prev.map(e => e.id === data.event.id ? data.event : e));
      }
      if (event === 'EVENT_DELETED') {
        setEvents(prev => prev.filter(e => e.id !== data.eventId));
      }
      if (event === 'SCORE_UPDATE') {
        setScoreA(data.scoreA); setScoreB(data.scoreB);
      }
      if (event === 'FULL_TIME') {
        setTimerRunning(false);
        loadState();
      }
      if (event === 'BOTH_SIGNED_OFF') { setMatchResult(data); }
      if (event === 'SIGN_OFF' || event === 'STATE_REQ_RELOAD') { loadState(); }

      if (event === 'SCORE_MODE_REQUEST') {
        // Reload full state to hydrate proposal fields from server
        loadState();
      }
      if (event === 'SCORE_MODE_AGREED') {
        const m = data.match;
        if (m) {
          setScoringMode(m.scoringMode ?? 'LIVE');
          setScoreModeAgreed(true);
          setNegStatus('agreed');
          if (m.matchStartedAt) {
            setMatchServerStartMs(new Date(m.matchStartedAt).getTime());
            setTimerRunning(true);
          }
        }
        setScoreModeRequest(null);
        setShowModeGate(false);
      }
      if (event === 'PRESENCE_UPDATE' || event === 'MATCH_STARTED') {
        const m = data.match;
        if (m) {
          setTeamAPresent(m.teamA_Present ?? false);
          setTeamBPresent(m.teamB_Present ?? false);
          if (event === 'MATCH_STARTED' && m.matchStartedAt) {
            setMatchServerStartMs(new Date(m.matchStartedAt).getTime());
            setNegStatus('agreed');
            setScoreModeAgreed(true);
            setTimerRunning(true);
          }
        }
      }
      if (event === 'SCORE_ENTRY_OPEN') {
        setShowScoreEntry(true);
        setTimerRunning(false);
        loadState();
      }
      if (event === 'OPPONENT_SUBMITTED') {
        setOpponentSubmitted(true);
      }
      if (event === 'SCORES_REVEALED') {
        setScoresRevealed({ scoreA: data.scoreA, scoreB: data.scoreB });
        setShowScoreEntry(true);
      }
      if (event === 'SCORE_ACCEPTED') {
        // If it came from the opponent, mark them as accepted
        if (data.fromTeamId !== stateRef.current?.myTeamId) {
          setOpponentAccepted(true);
        }
      }
      if (event === 'BOTH_AGREED') {
        setMatchResult(data);
        setShowScoreEntry(false);
        setScoresRevealed(null);
      }
      if (event === 'SCORE_DISPUTED') {
        setMsg('⚠️ Score mismatch! Match is now in dispute.');
        loadState();
      }
      if (event === 'END_GAME_REQUEST') {
        // Opponent pressed End — show them the confirm prompt
        if (data.fromTeamId !== stateRef.current?.myTeamId) {
          setOpponentEndedGame(true);
        }
      }
    });
    return () => { channel?.unsubscribe?.(); };
  }, [matchId, loadState]);

  // Presence heartbeat — ping every 8 seconds while on screen
  useEffect(() => {
    if (!matchId) return;
    const sendHeartbeat = async () => {
      try {
        const r = await fetch(`/api/matches/${matchId}/presence`, { method: 'POST' });
        if (r.ok) {
          const d = await r.json();
          if (d.match) {
            setTeamAPresent(d.match.teamA_Present ?? false);
            setTeamBPresent(d.match.teamB_Present ?? false);
            if (d.match.scoringNegotiationStatus === 'agreed' && d.match.matchStartedAt) {
              // Functional setter avoids stale closure — only update if not already set
              setMatchServerStartMs(prev => prev ?? new Date(d.match.matchStartedAt).getTime());
              setNegStatus('agreed');
              setScoreModeAgreed(true);
            }
          }
        }
      } catch {}
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 8000);
    return () => clearInterval(interval);
  }, [matchId]); // matchId only — interval should run for the full page lifetime

  // Timer (Server-authoritative calculation on each tick)
  useEffect(() => {
    if (!timerRunning || !matchServerStartMs) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const tick = () => {
      const now = Date.now();
      const elapsed = Math.floor((now - matchServerStartMs) / 1000);
      setTimerSecs(Math.max(0, elapsed));
    };

    tick(); // Run immediately
    timerRef.current = setInterval(tick, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerRunning, matchServerStartMs]);

  // Auto-sync state on tab focus / phone unlock
  useEffect(() => {
    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        loadState();
      }
    };
    window.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [loadState]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const currentMinute = Math.floor(timerSecs / 60);

  // 10-minute negotiation timeout fallback
  useEffect(() => {
    if (negStatus === 'agreed') return;
    const timer = setTimeout(() => {
      // Both present but no agreement after 10 minutes
      setTimeoutPromptVisible(true);
    }, 10 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [negStatus]);

  // ── Trigger global rank modal when match result lands ──────────────────────────
  useEffect(() => {
    if (!matchResult || !state) return;
    const { match: m, myTeamId: tid, isTeamA: amA, isOMC: isOMCState } = state;
    if (!m || !tid) return;

    const mmrDelta  = amA ? matchResult.mmrChangeA : matchResult.mmrChangeB;
    const sportType = m.sportType ?? m.teamA?.sportType ?? 'FUTSAL_5';
    const myTeam    = amA ? m.teamA : m.teamB;
    const oppTeam   = amA ? m.teamB : m.teamA;
    const currentMmr = myTeam?.footballMmr ?? myTeam?.teamMmr ?? 1000;

    const outcome: 'win' | 'loss' | 'draw' =
      matchResult.winnerId === null ? 'draw' :
      matchResult.winnerId === tid ? 'win' : 'loss';

    const onDismissPath = isOMCState 
        ? `/${locale}/matches/${matchId}/stats` 
        : `/${locale}/arena?tab=history`;

    // Prevent second rank popup in Interaction Hub
    try {
      const stored = localStorage.getItem('bmt_shown_results');
      const shownIds = stored ? JSON.parse(stored) : [];
      if (!shownIds.includes(m.id)) {
        shownIds.push(m.id);
        localStorage.setItem('bmt_shown_results', JSON.stringify(shownIds));
      }
    } catch {}

    showMatchResult({
      outcome,
      sportType,
      victoryString : matchResult.victoryString ?? (outcome === 'draw' ? 'Match Tied — MMR Split Equally' : ''),
      myTeamName    : myTeam?.name ?? '',
      oppTeamName   : oppTeam?.name ?? '',
      myScore       : amA ? matchResult.scoreA : matchResult.scoreB,
      oppScore      : amA ? matchResult.scoreB : matchResult.scoreA,
      mmrDelta,
      currentMmr,
      matchId       : m.id,
      onDismissPath,
      multA         : matchResult.multA,
      multB         : matchResult.multB,
      myMultiplier  : amA ? matchResult.multA : matchResult.multB,
    });
  }, [matchResult, state, showMatchResult, scoringMode, locale, matchId]);

  if (loading) return (
    <div className="min-h-[100dvh] bg-[#08090f] flex items-center justify-center">
      <Loader2 size={36} className="animate-spin text-[#00ff41]" />
    </div>
  );

  const { match, myTeamId, isTeamA, isOMC, isScorer, isSingleScorer } = state;
  const myTeam       = isTeamA ? match.teamA : match.teamB;
  const opponentTeam = isTeamA ? match.teamB : match.teamA;

  // ── Access: OMC or assigned scorer (scorer only during LIVE) ────────────
  if (!isOMC && !isScorer) {
    return (
      <div className="min-h-[100dvh] bg-[#08090f] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-black text-white mb-2">OMC Only</h1>
        <p className="text-sm text-neutral-500 max-w-xs">
          Only team owners, managers, captains, or the assigned scorer can access the live match screen.
        </p>
        <button onClick={() => router.push(`/${locale}/interact`)}
          className="mt-6 px-6 py-3 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41] font-black text-sm">
          ← Back
        </button>
      </div>
    );
  }

  const signedOff     = signOffs.some(s => s.teamId === myTeamId);
  const bothSignedOff = signOffs.length >= 2;
  const visibleEvents = events.filter(e => {
    if (e.status === 'REMOVED') {
      const isMyEvent = (e.type !== 'OWN_GOAL' && e.teamId === myTeamId) || (e.type === 'OWN_GOAL' && e.teamId !== myTeamId);
      return !isMyEvent;
    }
    return true;
  });
  const disputedEvents = events.filter(e => e.status === 'DISPUTED');

  const getPlayerName = (playerId?: string | null) => {
    if (!playerId) return null;
    return myTeam.members.find((m: Member) => m.playerId === playerId)?.player.fullName
        || opponentTeam.members.find((m: Member) => m.playerId === playerId)?.player.fullName
        || 'Unknown';
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleEventAction = async (eventId: string, action: 'confirm' | 'dispute') => {
    setMsg('');
    const r = await fetch(`/api/matches/${matchId}/events/${eventId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const d = await r.json();
    if (!r.ok) { setMsg(`❌ ${d.error || 'Action failed.'}`); return; }

    setEvents(prev => prev.map(e => e.id === eventId ? d.event : e));
    if (action === 'confirm') {
      const freshEvents = events.map(e => e.id === eventId ? d.event : e);
      let sA = 0, sB = 0;
      freshEvents
        .filter(e => ['GOAL','PENALTY_SCORED','OWN_GOAL'].includes(e.type) && e.status === 'CONFIRMED')
        .forEach(e => {
          if (e.type === 'OWN_GOAL') { if (e.teamId === match.teamA_Id) sB++; else sA++; }
          else { if (e.teamId === match.teamA_Id) sA++; else sB++; }
        });
      setScoreA(sA); setScoreB(sB);
      if (['GOAL','PENALTY_SCORED'].includes(d.event.type) && 'vibrate' in navigator) navigator.vibrate([80, 40, 80]);
      await broadcastMatchEvent(matchId, 'EVENT_UPDATED', { event: d.event });
      await broadcastMatchEvent(matchId, 'SCORE_UPDATE', { scoreA: sA, scoreB: sB });
    } else {
      await broadcastMatchEvent(matchId, 'EVENT_UPDATED', { event: d.event });
      setMsg('⚠️ Event disputed.');
    }
  };

  const handleHalfTime = async () => {
    const r = await fetch(`/api/matches/${matchId}/halftime`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ minute: currentMinute })
    });
    const d = await r.json();
    if (d.halfTimeConfirmed) { setMsg('⏸ Half time confirmed!'); setTimerRunning(false); }
    else setMsg('Waiting for opponent to confirm half time...');
    await broadcastMatchEvent(matchId, 'STATE_REQ_RELOAD', {});
    loadState();
  };

  const handleFullTime = async () => {
    if (!confirm('Call Full Time?')) return;
    const r = await fetch(`/api/matches/${matchId}/fulltime`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const d = await r.json();
    if (d.fullTimeConfirmed) {
      setTimerRunning(false);
      if (d.scoreAfterMode) {
        // SCORE_AFTER path: open score entry panel
        setShowScoreEntry(true);
        await broadcastMatchEvent(matchId, 'SCORE_ENTRY_OPEN', {});
      } else {
        // LIVE path: existing behaviour
        setScoreA(d.scoreA); setScoreB(d.scoreB);
        setShowSignOff(true);
        await broadcastMatchEvent(matchId, 'FULL_TIME', { scoreA: d.scoreA, scoreB: d.scoreB });
      }
    } else {
      setMsg('Waiting for opponent to confirm full time...');
      await broadcastMatchEvent(matchId, 'STATE_REQ_RELOAD', {});
    }
    loadState();
  };

  // proposedMode: 'live' | 'after_match'; proposedMethod: 'individual' | 'single_scorer'
  const handleProposeMode = async (proposedMode: string, proposedMethod?: string, singleScorerId?: string) => {
    setModeGateLoading(true);
    const r = await fetch(`/api/matches/${matchId}/mode`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proposedMode, proposedMethod: proposedMethod ?? 'individual', singleScorerId }),
    });
    if (r.ok) {
      const d = await r.json();
      // Hydrate updated proposals from server
      const m = d.match;
      if (m) {
        setProposalA(m.proposalA_mode ? { mode: m.proposalA_mode, method: m.proposalA_method } : null);
        setProposalB(m.proposalB_mode ? { mode: m.proposalB_mode, method: m.proposalB_method } : null);
      }
      setShowModeGate(false);
      setIsSuggestingInstead(false);
    } else {
      const d = await r.json().catch(() => ({}));
      setMsg('❌ ' + (d.error ?? 'Failed to propose mode'));
    }
    setModeGateLoading(false);
  };

  const handleAcceptOpponentProposal = async () => {
    setModeGateLoading(true);
    const r = await fetch(`/api/matches/${matchId}/mode`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (r.ok) {
      const d = await r.json();
      const m = d.match;
      if (m) {
        setScoringMode(m.scoringMode ?? 'LIVE');
        setScoreModeAgreed(true);
        setNegStatus('agreed');
        if (m.matchStartedAt) {
          setMatchServerStartMs(new Date(m.matchStartedAt).getTime());
          setTimerRunning(true);
        }
      }
      setScoreModeRequest(null);
      setShowModeGate(false);
      setIsSuggestingInstead(false);
    } else {
      const d = await r.json().catch(() => ({}));
      setMsg('❌ ' + (d.error ?? 'Failed to accept'));
    }
    setModeGateLoading(false);
  };

  // Legacy compat (used from old SCORE_AFTER reject path)
  const handleRespondMode = async (accept: boolean) => {
    if (accept) { return handleAcceptOpponentProposal(); }
    // Suggest instead — open sub-menu
    setIsSuggestingInstead(true);
  };

  const handleSubmitScore = async () => {
    setScoreSubmitting(true);
    const r = await fetch(`/api/matches/${matchId}/submit-score`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scoreForUs: scoreEntryUs,
        scoreForThem: scoreEntryThem,
        playedMemberIds: playedMemberIds
      }),
    });
    const d = await r.json();
    if (r.ok) {
      setMySubmittedScore({ us: scoreEntryUs, them: scoreEntryThem });
      // If both submitted and agreed, SCORES_REVEALED WS fires — no need to set result here
    } else {
      setMsg('❌ ' + d.error);
    }
    setScoreSubmitting(false);
  };

  const handleAcceptScore = async (dispute = false) => {
    setAcceptLoading(true);
    const r = await fetch(`/api/matches/${matchId}/accept-score`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dispute }),
    });
    const d = await r.json();
    if (r.ok) {
      if (dispute) {
        setMsg('⚠️ You disputed the score. Match is now in dispute.');
        setScoresRevealed(null);
        loadState();
      } else {
        setMyAccepted(true);
        if (d.finalized) {
          // Both accepted — result fires via BOTH_AGREED but set directly too
          setMatchResult({
            scoreA: d.scoreA,
            scoreB: d.scoreB,
            winnerId: d.winnerId,
            mmrChangeA: d.mmrChangeA,
            mmrChangeB: d.mmrChangeB,
            multA: d.multA,
            multB: d.multB,
          });
          setShowScoreEntry(false); setScoresRevealed(null);
        }
        // else wait for opponent — SCORE_ACCEPTED WS will update opponentAccepted
      }
    } else {
      setMsg('❌ ' + d.error);
    }
    setAcceptLoading(false);
  };

  const startGoalPress = () => {
    setLongPressed(false);
    longPressTimerRef.current = setTimeout(() => {
      setLongPressed(true);
      setShowQuickLogTeamPicker(true);
    }, 500);
  };

  const endGoalPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleGoalClick = () => {
    if (longPressed) {
      setLongPressed(false);
      return;
    }
    setSheetType('GOAL');
  };

  const handleUndo = async () => {
    if (!undoToast) return;
    const eventId = undoToast.id;
    setUndoToast(null);
    const r = await fetch(`/api/matches/${matchId}/events/${eventId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    if (r.ok) {
      setEvents(prev => prev.filter(e => e.id !== eventId));
      await broadcastMatchEvent(matchId, 'EVENT_DELETED', { eventId });
      setMsg('Goal undone and removed.');
    } else {
      const d = await r.json();
      setMsg('❌ Failed to undo: ' + d.error);
    }
  };

  const handleQuickLog = async (teamId: string) => {
    setShowQuickLogTeamPicker(false);
    setMsg('Logging quick goal...');
    const body = {
      type: 'GOAL',
      minute: currentMinute,
      scorerPlayerId: null, // anonymous
      teamId,
    };
    const r = await fetch(`/api/matches/${matchId}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (r.ok) {
      setEvents(prev => [...prev, d.event]);
      await broadcastMatchEvent(matchId, 'EVENT_CREATED', { event: d.event });
      setUndoToast({ id: d.event.id, msg: 'Quick goal logged' });
      setMsg('Quick goal logged! Tap "+ Add Scorer" to backfill details.');
    } else {
      setMsg('❌ Failed: ' + d.error);
    }
  };

  const handleSignOff = async () => {
    const r = await fetch(`/api/matches/${matchId}/signoff`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const d = await r.json();
    if (r.ok) {
      if (d.bothSigned) {
        const result = { scoreA: d.scoreA, scoreB: d.scoreB, winnerId: d.winnerId, mmrChangeA: d.mmrChangeA, mmrChangeB: d.mmrChangeB };
        // Broadcast to opponent so their screen updates instantly
        await broadcastMatchEvent(matchId, 'BOTH_SIGNED_OFF', result);
        // Show result on my screen too
        setMatchResult(result);
      } else {
        setMsg('Signed off ✅ Waiting for opponent...');
        await broadcastMatchEvent(matchId, 'SIGN_OFF', { bothSigned: false });
        loadState();
      }
    } else setMsg('❌ ' + d.error);
  };

  return (
    <div className="min-h-[100dvh] bg-[#08090f] text-white flex flex-col" style={{ position: 'fixed', inset: 0, zIndex: 100, overflow: 'hidden' }}>

      {/* ── Scoreboard Header ── */}
      <div className="shrink-0 bg-[#08090f] border-b border-[#1e2028]">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            {match.status === 'LIVE' && (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[11px] font-black text-red-500 uppercase tracking-widest">Live</span>
              </>
            )}
            {match.status === 'SCORE_ENTRY' && <span className="text-[11px] font-black text-amber-400 uppercase tracking-widest">Full Time</span>}
            {match.status === 'COMPLETED' && <span className="text-[11px] font-black text-[#00ff41] uppercase tracking-widest">Completed</span>}
          </div>
          <div className="w-8" />
        </div>

        {/* Score block */}
        <div className="flex flex-col items-center px-4 pb-4 pt-1">
          {/* Teams names/logos row */}
          <div className="flex items-center justify-between w-full mb-3 gap-2 px-1">
            {/* Team A */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                {match.teamA.logoUrl ? <img src={match.teamA.logoUrl} className="w-full h-full object-cover" alt="" /> : <Shield size={14} className="text-neutral-500" />}
              </div>
              <span className="text-xs font-black text-neutral-100 break-words leading-tight">{match.teamA.name}</span>
            </div>

            {/* VS Badge */}
            <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-black text-neutral-500 uppercase tracking-widest shrink-0 mx-2">VS</div>

            {/* Team B */}
            <div className="flex items-center justify-end gap-2 flex-1 min-w-0 text-right">
              <span className="text-xs font-black text-neutral-100 break-words leading-tight">{match.teamB.name}</span>
              <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                {match.teamB.logoUrl ? <img src={match.teamB.logoUrl} className="w-full h-full object-cover" alt="" /> : <Shield size={14} className="text-neutral-500" />}
              </div>
            </div>
          </div>

          {/* Score row (centered under) */}
          <div className="flex items-center gap-3">
            <span key={`sA-${scoreA}`} className="text-5xl font-black text-white tabular-nums" style={{ animation: 'scorePop 0.4s ease-out' }}>{scoreA}</span>
            <span className="text-xl font-black text-neutral-600">:</span>
            <span key={`sB-${scoreB}`} className="text-5xl font-black text-white tabular-nums" style={{ animation: 'scorePop 0.4s ease-out' }}>{scoreB}</span>
          </div>
        </div>

        {/* Timer */}
        {match.status === 'LIVE' && (
          <div className="flex items-center justify-center pb-3 flex-col gap-1">
            {negStatus === 'agreed' ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-neutral-400 font-mono">{formatTime(timerSecs)}'</span>
                {isHalfTimeConfirmed && (
                  <span className="text-[10px] font-black uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 shadow-[0_0_8px_rgba(59,130,246,0.2)] animate-pulse">
                    HT
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs font-bold text-neutral-500 animate-pulse">
                {!teamAPresent || !teamBPresent ? '⏳ Waiting for both teams' : '⚙️ Agree on scoring mode to start'}
              </span>
            )}
          </div>
        )}

        {/* Tab bar */}
        <div className="flex border-t border-[#1e2028]">
          {(['timeline', 'disputes'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex-1 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all relative ${activeTab === t ? 'text-white' : 'text-neutral-600'}`}>
              {t === 'disputes' && disputedEvents.length > 0 && (
                <span className="absolute top-1.5 right-4 w-4 h-4 rounded-full bg-orange-500 text-[9px] font-black flex items-center justify-center text-white">{disputedEvents.length}</span>
              )}
              {t}
              {activeTab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00ff41]" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── Status message ── */}
      {msg && (
        <div className="shrink-0 mx-4 mt-2 px-3 py-2 bg-neutral-800 border border-white/10 rounded-xl">
          <p className="text-xs font-bold text-neutral-300">{msg}</p>
        </div>
      )}

      {/* ── Timeline / Disputes ── */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-32">
        <style>{`@keyframes scorePop { 0%{transform:scale(1.2);} 100%{transform:scale(1);} } @keyframes eventSlide { from{transform:translateY(20px);opacity:0;} to{transform:translateY(0);opacity:1;} }`}</style>

        {activeTab === 'timeline' && (
          <div className="px-3 py-4 flex flex-col gap-3">
            {visibleEvents.length === 0 && (
              <div className="py-16 text-center text-neutral-600">
                <Zap size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">{negStatus === 'agreed' ? 'No events yet. First goal incoming!' : 'Agree on scoring mode to begin'}</p>
              </div>
            )}
            {[...visibleEvents].reverse().map(ev => {
              const meta       = EVENT_META[ev.type] || { icon: '•', label: ev.type, color: '#94a3b8' };
              const isMyTeam   = ev.teamId === myTeamId;
              const isOwnGoal  = ev.type === 'OWN_GOAL';
              
              // Conceding team is the one that logged the own goal
              const eventOwnerIsUs = (!isOwnGoal && isMyTeam) || (isOwnGoal && !isMyTeam);
              
              const playerName = ev.playerId ? getPlayerName(ev.playerId) : null;
              const assistName = ev.assistPlayerId ? getPlayerName(ev.assistPlayerId) : null;
              const isPending  = ev.status === 'PENDING';
              const isDisputed = ev.status === 'DISPUTED';
              const isConfirmed = ev.status === 'CONFIRMED';
              const isRemoved  = ev.status === 'REMOVED';
              const canAct     = !isMyTeam && (isOMC || isScorer) && isPending;
              const canDispute = !isMyTeam && (isOMC || isScorer) && isConfirmed;

              // Long press handlers
              let pressTimer: any = null;
              const startPress = () => {
                const isAuthorized = scoringMode === 'LIVE_SINGLE' ? isSingleScorer : (isOMC || isScorer);
                if (!eventOwnerIsUs || !isAuthorized || isRemoved) return;
                pressTimer = setTimeout(() => {
                  setSelectedEventToEdit(ev);
                  setSheetType((ev.type === 'YELLOW_CARD' || ev.type === 'RED_CARD' ? 'CARD' : ev.type === 'PENALTY_SCORED' || ev.type === 'PENALTY_MISSED' ? 'PENALTY' : ev.type) as any);
                }, 500);
              };
              const endPress = () => {
                if (pressTimer) clearTimeout(pressTimer);
              };

              return (
                <div key={ev.id}
                  className={`flex flex-col gap-1.5 ${isMyTeam ? 'items-end' : 'items-start'}`}
                  style={{ animation: 'eventSlide 0.3s ease-out' }}
                >
                  {/* Minute label */}
                  <p className="text-[9px] font-black text-neutral-600 uppercase tracking-widest px-1">
                    {ev.minute}' · {isMyTeam ? myTeam.name : opponentTeam.name}
                  </p>

                  {/* Bubble */}
                  <div
                    onMouseDown={startPress}
                    onMouseUp={endPress}
                    onTouchStart={startPress}
                    onTouchEnd={endPress}
                    className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl flex flex-col gap-0.5 select-none active:scale-[0.98] transition-transform ${
                      isRemoved ? 'bg-red-500/5 border border-red-500/10 opacity-50 line-through'
                      : isMyTeam
                        ? isDisputed ? 'bg-orange-500/10 border border-orange-500/30 rounded-tl-sm'
                          : isPending ? 'bg-amber-500/8 border border-amber-500/25 border-dashed rounded-tl-sm'
                          : 'bg-[#00ff41]/10 border border-[#00ff41]/20 rounded-tl-sm'
                        : isDisputed ? 'bg-orange-500/10 border border-orange-500/30 rounded-tr-sm'
                          : isPending ? 'bg-neutral-800/80 border border-white/10 border-dashed rounded-tr-sm'
                          : 'bg-[#1a1d24] border border-white/8 rounded-tr-sm'
                    }`}
                  >
                    {/* Event type row */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-base leading-none">{meta.icon}</span>
                      <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: meta.color }}>
                        {isRemoved ? 'Removed Goal' : meta.label}
                      </span>
                      {ev.isEdited && !isRemoved && (
                        <span className="text-[8px] text-neutral-500 font-bold ml-1">(edited)</span>
                      )}
                      {isPending && (
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black bg-amber-500/20 text-amber-400`}>
                          PENDING
                        </span>
                      )}
                      {isDisputed && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full font-black bg-orange-500/20 text-orange-400">
                          DISPUTED
                        </span>
                      )}
                      {isConfirmed && !isRemoved && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full font-black bg-[#00ff41]/15 text-[#00ff41]">
                          ✓
                        </span>
                      )}
                      {isRemoved && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full font-black bg-red-500/20 text-red-400">
                          REMOVED
                        </span>
                      )}
                    </div>

                    {/* Player */}
                    {isRemoved ? (
                      <p className="text-xs text-neutral-500 italic">This event was deleted by opponent</p>
                    ) : (
                      <>
                        {['GOAL', 'PENALTY_SCORED'].includes(ev.type) && !ev.playerId ? (
                          <div className="flex flex-col gap-1 mt-1 items-start">
                            <span className="text-xs text-neutral-400 italic">Scorer Details Pending</span>
                            {eventOwnerIsUs && (
                              <button
                                onClick={() => {
                                  setSelectedEventToEdit(ev);
                                  setSheetType('GOAL');
                                }}
                                className="px-2 py-1 rounded bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41] text-[9px] font-black uppercase tracking-wider active:scale-95 transition-transform"
                              >
                                + Add Scorer
                              </button>
                            )}
                          </div>
                        ) : (
                          playerName && <p className="text-sm font-black text-white leading-tight">{playerName}</p>
                        )}
                        {assistName && (
                          <p className="text-[10px] text-neutral-500">⚡ {assistName}</p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Dispute — only for opponent confirmed events */}
                  {canDispute && !isRemoved && (
                    <div className="flex gap-2 max-w-[78%] w-full">
                      <button onClick={() => handleEventAction(ev.id, 'dispute')}
                        className="flex-1 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 font-black text-xs flex items-center justify-center gap-1 active:scale-95 transition-all">
                        <Flag size={11} /> Dispute
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'disputes' && (
          <div className="px-4 py-3 flex flex-col gap-2">
            {disputedEvents.length === 0 && (
              <div className="py-16 text-center text-neutral-600">
                <CheckCircle size={28} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No disputes. Clean game!</p>
              </div>
            )}
            {disputedEvents.map(ev => {
              const meta = EVENT_META[ev.type] || { icon: '•', label: ev.type, color: '#94a3b8' };
              const isMyDispute = ev.disputedByTeamId === myTeamId;
              return (
                <div key={ev.id} className="p-4 rounded-2xl border bg-orange-500/5 border-orange-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{meta.icon}</span>
                    <span className="text-sm font-black text-white">{meta.label}</span>
                    <span className="text-[10px] text-neutral-600">{ev.minute}'</span>
                    {isMyDispute && <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded font-black ml-auto">You disputed</span>}
                  </div>
                  {!isMyDispute && (
                    <div className="flex gap-2">
                      <button onClick={async () => {
                        const r = await fetch(`/api/matches/${matchId}/events/${ev.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resolve', resolution: 'confirm' }) });
                        const d = await r.json();
                        if (r.ok) { setEvents(prev => prev.map(e => e.id === ev.id ? d.event : e)); await broadcastMatchEvent(matchId, 'EVENT_UPDATED', { event: d.event }); }
                        else setMsg('❌ ' + d.error);
                      }} className="flex-1 py-2 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 font-black text-xs">Confirm Event</button>
                      <button onClick={async () => {
                        const r = await fetch(`/api/matches/${matchId}/events/${ev.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'resolve', resolution: 'remove' }) });
                        const d = await r.json();
                        if (r.ok) { setEvents(prev => prev.map(e => e.id === ev.id ? d.event : e)); await broadcastMatchEvent(matchId, 'EVENT_UPDATED', { event: d.event }); }
                        else setMsg('❌ ' + d.error);
                      }} className="flex-1 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-black text-xs">Remove Event</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Sign-Off Overlay ── */}
      {showSignOff && match.status === 'SCORE_ENTRY' && (
        <div className="fixed inset-0 z-[300] bg-[#08090f]/98 backdrop-blur-sm flex flex-col">
          <div className="flex-1 overflow-y-auto px-5 pt-12">
            <div className="text-center mb-8">
              <div className="text-6xl mb-3">🏁</div>
              <h1 className="text-3xl font-black text-white">Full Time</h1>
              <div className="flex items-center justify-center gap-4 mt-4">
                <span className="text-neutral-400 text-sm font-bold">{match.teamA.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-5xl font-black text-white">{scoreA}</span>
                  <span className="text-2xl text-neutral-600 font-black">:</span>
                  <span className="text-5xl font-black text-white">{scoreB}</span>
                </div>
                <span className="text-neutral-400 text-sm font-bold">{match.teamB.name}</span>
              </div>
            </div>
            {disputedEvents.length > 0 && (
              <div className="mb-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded-2xl">
                <p className="text-orange-400 font-black text-sm mb-1">⚠️ {disputedEvents.length} unresolved dispute(s)</p>
                <p className="text-orange-300/70 text-xs">Resolve all disputes before signing off.</p>
              </div>
            )}
            {(() => {
              const anonGoals = events.filter(e => ['GOAL', 'PENALTY_SCORED'].includes(e.type) && !e.playerId && e.status === 'CONFIRMED');
              if (anonGoals.length > 0 && isOMC) {
                return (
                  <button
                    onClick={() => {
                      setSelectedEventToEdit(anonGoals[0]);
                      setSheetType('GOAL');
                    }}
                    className="mb-4 w-full bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl p-4 text-xs font-black text-center flex flex-col gap-1 active:scale-95 transition-all"
                  >
                    <span>⚠️ {anonGoals.length === 1 ? '1 goal missing scorer details — add now?' : `${anonGoals.length} goals missing scorer details — add now?`}</span>
                    <span className="text-[10px] text-amber-400/60 font-bold underline">Tap to add details now</span>
                  </button>
                );
              }
              return null;
            })()}
            <div className="mb-4 p-4 bg-[#111318] border border-[#1e2028] rounded-2xl">
              <p className="text-xs text-neutral-500 font-bold mb-2">Sign-Off Status</p>
              <div className="flex gap-3">
                <div className={`flex-1 py-2 rounded-xl text-center text-xs font-black border ${signOffs.some(s => s.teamId === match.teamA_Id) ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-neutral-900 border-white/5 text-neutral-500'}`}>{match.teamA.name}</div>
                <div className={`flex-1 py-2 rounded-xl text-center text-xs font-black border ${signOffs.some(s => s.teamId === match.teamB_Id) ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-neutral-900 border-white/5 text-neutral-500'}`}>{match.teamB.name}</div>
              </div>
            </div>
          </div>
          {!signedOff && (
            <div className="px-5 pb-10 pt-3">
              <button onClick={handleSignOff} disabled={disputedEvents.length > 0}
                className="w-full py-4 rounded-2xl bg-[#00ff41] text-black font-black text-sm uppercase tracking-wider disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98] transition-all">
                ✓ Sign Off on Result
              </button>
              {disputedEvents.length > 0 && <p className="text-orange-400 text-xs text-center mt-2 font-bold">Resolve all disputes first</p>}
            </div>
          )}
          {signedOff && !bothSignedOff && (
            <div className="px-5 pb-10"><div className="w-full py-4 rounded-2xl bg-neutral-800 border border-white/10 text-center text-neutral-400 text-sm font-bold">Waiting for {opponentTeam.name} to sign off...</div></div>
          )}
        </div>
      )}


      {/* ── Action Bar (OMC only, LIVE only) ── */}
      {match.status === 'LIVE' && (scoringMode === 'LIVE_SINGLE' ? isSingleScorer : (isOMC || isScorer)) && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-[#0d0e14]/95 backdrop-blur-md border-t border-[#1e2028]">
          {/* Locked overlay when negotiation not yet agreed */}
          {negStatus !== 'agreed' && (
            <div className="absolute inset-0 z-10 bg-black/60 flex items-center justify-center rounded-none cursor-not-allowed">
              <p className="text-xs font-bold text-neutral-400">Agree on scoring mode to unlock</p>
            </div>
          )}
          <div className={`flex gap-2 px-4 pt-4 pb-6 ${negStatus !== 'agreed' ? 'opacity-40 pointer-events-none' : ''}`}>
            <button
              onMouseDown={startGoalPress}
              onMouseUp={endGoalPress}
              onTouchStart={startGoalPress}
              onTouchEnd={endGoalPress}
              onClick={handleGoalClick}
              className="flex-1 h-14 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41] font-black text-sm flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all select-none">
              <Target size={18} /><span className="text-[10px]">Goal</span>
            </button>
            <button onClick={() => setSheetType('CARD')}
              className="flex-1 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-black text-sm flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all">
              <CreditCard size={18} /><span className="text-[10px]">Card</span>
            </button>
            <button onClick={() => setSheetType('SUB')}
              className="flex-1 h-14 rounded-2xl bg-neutral-900 border border-[#00ff41]/20 text-[#00ff41] font-black text-sm flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all">
              <ArrowLeftRight size={18} /><span className="text-[10px]">Sub</span>
            </button>
            <button onClick={() => setSheetType('PENALTY')}
              className="flex-1 h-14 rounded-2xl bg-neutral-900 border border-[#00ff41]/20 text-[#00ff41] font-black text-sm flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-all">
              <Zap size={18} /><span className="text-[10px]">Penalty</span>
            </button>
            <button onClick={() => setShowMoreMenu(s => !s)}
              className="w-14 h-14 rounded-2xl bg-neutral-900 border border-white/10 text-neutral-400 font-black flex items-center justify-center active:scale-95 transition-all">
              •••
            </button>
          </div>
          {showMoreMenu && (
            <div className="absolute bottom-[90px] right-4 mb-2 bg-[#1a1b24] border border-[#1e2028] rounded-2xl overflow-hidden shadow-2xl flex flex-col min-w-[160px]">
              {isHalfTimeConfirmed ? (
                <button onClick={async () => {
                  const r = await fetch(`/api/matches/${matchId}/halftime`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'resume' })
                  });
                  if (r.ok) {
                    setMsg('▶ Match resumed! Second half started.');
                    await broadcastMatchEvent(matchId, 'STATE_REQ_RELOAD', {});
                    loadState();
                  } else {
                    const d = await r.json();
                    setMsg('❌ ' + d.error);
                  }
                  setShowMoreMenu(false);
                }}
                  className="flex items-center gap-3 px-5 py-3.5 text-sm font-bold text-green-400 hover:bg-white/5 border-b border-white/5 text-left w-full">
                  ▶ Resume Match
                </button>
              ) : (
                <button onClick={() => { handleHalfTime(); setShowMoreMenu(false); }}
                  className="flex items-center gap-3 px-5 py-3.5 text-sm font-bold text-blue-400 hover:bg-white/5 border-b border-white/5 text-left w-full">
                  ⏸ Half Time{halfTime?.calledByA || halfTime?.calledByB ? ' (pending)' : ''}
                </button>
              )}
              <button onClick={() => { handleFullTime(); setShowMoreMenu(false); }}
                className="flex items-center gap-3 px-5 py-3.5 text-sm font-bold text-amber-400 hover:bg-white/5 border-b border-white/5 text-left">
                🏁 Full Time
              </button>
              <button onClick={() => { setSheetType('OWN_GOAL'); setShowMoreMenu(false); }}
                className="flex items-center gap-3 px-5 py-3.5 text-sm font-bold text-orange-400 hover:bg-white/5 w-full text-left">
                ⚽ Own Goal
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Single Scorer Scorer Link Banner for OMCs ── */}
      {match.status === 'LIVE' && scoringMode === 'LIVE_SINGLE' && isOMC && (
        <div className="fixed bottom-0 left-0 right-0 z-[110] bg-[#0d0e14]/98 backdrop-blur-md border-t border-[#1e2028] px-4 py-5 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse shadow-[0_0_8px_#a78bfa]" />
            <p className="text-xs font-black text-purple-400 uppercase tracking-widest">Single Scorer Mode Active</p>
          </div>
          <p className="text-xs text-neutral-400 text-center max-w-xs mb-1">
            Copy the secure token link and share it with the scorer. They can score the match without logging in!
          </p>
          <button
            onClick={() => {
              const scorerUrl = `${window.location.origin}/${locale}/score/casual/${state.scorerToken}`;
              navigator.clipboard.writeText(scorerUrl);
              setMsg('📋 Scorer link copied to clipboard!');
            }}
            className="w-full max-w-xs py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-500 active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] border border-purple-500/35"
          >
            🔗 Copy Scorer Link
          </button>
        </div>
      )}

      {/* ── Single Scorer Notice (for non-OMCs, non-scorers) ── */}
      {match.status === 'LIVE' && scoringMode === 'LIVE_SINGLE' && !isOMC && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-[#0d0e14]/95 backdrop-blur-md border-t border-[#1e2028] px-4 py-6 text-center">
          <p className="text-sm font-bold text-[#a78bfa] animate-pulse">
            ⏳ Single Scorer is scoring for both teams.
          </p>
        </div>
      )}

      {/* ── Event Sheet ── */}
      {sheetType && (
        <EventSheet
          type={sheetType}
          myTeam={myTeam}
          opponentTeam={opponentTeam}
          isSingleScorer={isSingleScorer}
          matchId={matchId}
          currentMinute={currentMinute}
          rosterPicks={match.rosterPicks || []}
          onClose={() => setSheetType(null)}
          onSubmit={ev => setEvents(prev => {
            if (prev.some(e => e.id === ev.id)) return prev;
            return [...prev, ev];
          })}
        />
      )}

      {/* ── Score After Match: End Game dual-confirm bar ── */}
      {match.status === 'LIVE' && scoringMode === 'SCORE_AFTER' && isOMC && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-[#0d0e14]/95 backdrop-blur-md border-t border-[#1e2028] px-4 pt-4 pb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">📋 Score After Match</span>
            {myEndedGame && !opponentEndedGame && (
              <span className="text-[9px] text-neutral-500 font-bold">Waiting for {opponentTeam.name}…</span>
            )}
          </div>

          {/* I haven't pressed yet */}
          {!myEndedGame && (
            <button
              disabled={endGameLoading}
              onClick={async () => {
                setEndGameLoading(true);
                const r = await fetch(`/api/matches/${matchId}/fulltime`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
                const d = await r.json();
                if (r.ok) {
                  setMyEndedGame(true);
                  if (d.fullTimeConfirmed) { setTimerRunning(false); setShowScoreEntry(true); loadState(); }
                } else setMsg('❌ ' + d.error);
                setEndGameLoading(false);
              }}
              className="w-full py-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {endGameLoading ? <Loader2 size={14} className="animate-spin" /> : '🏁 End Match'}
            </button>
          )}

          {/* I pressed, waiting for opponent */}
          {myEndedGame && !opponentEndedGame && (
            <div className="w-full py-4 rounded-2xl bg-neutral-800/60 border border-white/10 flex items-center justify-center gap-2">
              <Loader2 size={14} className="animate-spin text-amber-400" />
              <span className="text-sm font-black text-neutral-400">Waiting for {opponentTeam.name} to end…</span>
            </div>
          )}

          {/* Opponent pressed, I haven't — prompt me to confirm */}
          {!myEndedGame && opponentEndedGame && (
            <button
              disabled={endGameLoading}
              onClick={async () => {
                setEndGameLoading(true);
                const r = await fetch(`/api/matches/${matchId}/fulltime`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
                const d = await r.json();
                if (r.ok) {
                  setMyEndedGame(true);
                  if (d.fullTimeConfirmed) { setTimerRunning(false); setShowScoreEntry(true); loadState(); }
                } else setMsg('❌ ' + d.error);
                setEndGameLoading(false);
              }}
              className="w-full py-4 rounded-2xl bg-amber-500 text-black font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all animate-pulse disabled:opacity-50"
            >
              {endGameLoading ? <Loader2 size={14} className="animate-spin" /> : '🏁 Opponent ended — Tap to confirm!'}
            </button>
          )}
        </div>
      )}

      {/* ── Single Scorer Search Modal ── */}
      {showScorerSearch && isOMC && match.status === 'LIVE' && (
        <ScorerSearchModal
          myTeam={myTeam}
          opponentTeam={opponentTeam}
          onClose={() => { setShowScorerSearch(false); setShowModeGate(true); }}
          onSelect={(playerId) => {
            setShowScorerSearch(false);
            handleProposeMode('LIVE_SINGLE', playerId);
          }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════
           SHARED SCORING MODE NEGOTIATION SCREEN
           Shown to BOTH teams simultaneously until agreed
      ══════════════════════════════════════════════════════════════ */}
      {negStatus !== 'agreed' && match.status === 'LIVE' && isOMC && (
        <div className="fixed inset-0 z-[350] bg-black/92 backdrop-blur-md flex flex-col" style={{ animation: 'fadeInResult 0.3s ease-out' }}>
          <div className="flex-1 flex flex-col px-5 pt-8 pb-4 overflow-y-auto">

            {/* ── Presence Strip ── */}
            <div className="flex gap-3 mb-6">
              <div className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border ${teamAPresent ? 'bg-[#00ff41]/10 border-[#00ff41]/30' : 'bg-neutral-900 border-white/10'}`}>
                <span className={`w-2 h-2 rounded-full ${teamAPresent ? 'bg-[#00ff41] animate-pulse' : 'bg-neutral-600'}`} />
                <div className="min-w-0">
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Team A</p>
                  <p className={`text-xs font-black truncate ${teamAPresent ? 'text-[#00ff41]' : 'text-neutral-500'}`}>
                    {teamAPresent ? `🟢 ${match.teamA.name}` : `⏳ Waiting...`}
                  </p>
                </div>
              </div>
              <div className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border ${teamBPresent ? 'bg-[#00ff41]/10 border-[#00ff41]/30' : 'bg-neutral-900 border-white/10'}`}>
                <span className={`w-2 h-2 rounded-full ${teamBPresent ? 'bg-[#00ff41] animate-pulse' : 'bg-neutral-600'}`} />
                <div className="min-w-0">
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Team B</p>
                  <p className={`text-xs font-black truncate ${teamBPresent ? 'text-[#00ff41]' : 'text-neutral-500'}`}>
                    {teamBPresent ? `🟢 ${match.teamB.name}` : `⏳ Waiting...`}
                  </p>
                </div>
              </div>
            </div>

            {/* ── Header ── */}
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">⚙️</div>
              <h2 className="text-xl font-black text-white mb-1">Choose Scoring Mode</h2>
              <p className="text-sm text-neutral-500">This must be agreed by both teams. Tap to propose.</p>
            </div>

            {/* ── Conflict View: both proposals visible ── */}
            {proposalA && proposalB && proposalA.mode !== proposalB.mode && (
              <div className="mb-4 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4">
                <p className="text-yellow-400 text-xs font-black mb-1">⚡ Both teams proposed different modes</p>
                <div className="flex gap-2 text-xs text-neutral-400">
                  <span>{match.teamA.name}: <strong className="text-white">{proposalA.mode === 'after_match' ? 'Score After' : 'Live'}</strong></span>
                  <span>·</span>
                  <span>{match.teamB.name}: <strong className="text-white">{proposalB.mode === 'after_match' ? 'Score After' : 'Live'}</strong></span>
                </div>
                <p className="text-[10px] text-neutral-500 mt-1">Accept either proposal below to resolve.</p>
              </div>
            )}

            {/* ── Opponent's proposal: accept / suggest instead ── */}
            {(() => {
              const myProposal = state?.isTeamA ? proposalA : proposalB;
              const oppProposal = state?.isTeamA ? proposalB : proposalA;
              const oppTeamName = state?.isTeamA ? match.teamB.name : match.teamA.name;
              if (oppProposal && !isSuggestingInstead) {
                return (
                  <div className="mb-4 bg-[#111318] border border-[#00ff41]/20 rounded-2xl p-5" style={{ animation: 'slideUpSheet 0.2s ease-out' }}>
                    <p className="text-[10px] text-[#00ff41] font-black uppercase tracking-wider mb-3">{oppTeamName} proposed</p>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">{oppProposal.mode === 'after_match' ? '📋' : '⚡'}</span>
                      <div>
                        <p className="text-white font-black text-sm">{oppProposal.mode === 'after_match' ? 'Score After Match' : oppProposal.method === 'single_scorer' ? 'Live — Single Scorer' : 'Live — Individual'}</p>
                        <p className="text-neutral-400 text-xs">{oppProposal.mode === 'after_match' ? 'Both captains submit final scores after the match.' : oppProposal.method === 'single_scorer' ? 'One shared scorer logs events for both teams.' : 'Both teams log events individually on their devices.'}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handleAcceptOpponentProposal} disabled={modeGateLoading}
                        className="flex-1 py-3.5 rounded-2xl bg-[#00ff41] text-black font-black text-sm active:scale-95 transition-all disabled:opacity-50">
                        {modeGateLoading ? '...' : '✓ Accept'}
                      </button>
                      <button onClick={() => setIsSuggestingInstead(true)} disabled={modeGateLoading}
                        className="flex-1 py-3.5 rounded-2xl bg-neutral-800 border border-white/10 text-neutral-300 font-black text-sm active:scale-95 transition-all">
                        Suggest instead ▾
                      </button>
                    </div>
                  </div>
                );
              }
              if (myProposal && !isSuggestingInstead) {
                return (
                  <div className="mb-4 bg-[#111318] border border-[#00ff41]/30 rounded-2xl p-4">
                    <p className="text-xs text-[#00ff41] font-black">⏳ Proposal sent — waiting for {oppTeamName}</p>
                    <p className="text-[10px] text-neutral-500 mt-1">You proposed: {myProposal.mode === 'after_match' ? 'Score After Match' : myProposal.method === 'single_scorer' ? 'Live — Single Scorer' : 'Live — Individual'}</p>
                  </div>
                );
              }
              return null;
            })()}

            {/* ── Mode Cards (always visible; collapsed if waiting, expanded if suggesting instead) ── */}
            {(!proposalA || !proposalB || isSuggestingInstead) && !liveScoringSubMenu && (
              <div className="flex flex-col gap-3">
                <button onClick={() => setLiveScoringSubMenu(true)} disabled={modeGateLoading}
                  className="w-full p-5 rounded-2xl bg-[#111318] border border-white/10 text-left active:scale-[0.98] transition-all disabled:opacity-50 relative overflow-hidden">
                  <span className="absolute top-3 right-3 text-[9px] font-black text-[#00ff41] border border-[#00ff41]/40 rounded px-1.5 py-0.5">REAL-TIME</span>
                  <p className="text-white font-black text-base mb-1">⚡ Live Scoring</p>
                  <p className="text-neutral-400 text-xs">Goals, cards and subs logged in real-time.</p>
                </button>
                <button onClick={() => handleProposeMode('after_match', undefined)} disabled={modeGateLoading}
                  className="w-full p-5 rounded-2xl bg-[#111318] border border-white/10 text-left active:scale-[0.98] transition-all disabled:opacity-50">
                  <p className="text-white font-black text-base mb-1">📋 Score After Match</p>
                  <p className="text-neutral-400 text-xs">Both captains submit final scores and stats after the match ends.</p>
                </button>
              </div>
            )}

            {/* ── Live Scoring Sub-menu ── */}
            {liveScoringSubMenu && (
              <div className="flex flex-col gap-3">
                <button onClick={() => setLiveScoringSubMenu(false)} className="flex items-center gap-2 text-neutral-400 mb-2">
                  <ChevronLeft size={18} /><span className="text-sm">Back</span>
                </button>
                <p className="text-xs font-black text-neutral-400 uppercase tracking-wider mb-1">Choose live method</p>
                <button onClick={() => { handleProposeMode('live', 'individual'); setLiveScoringSubMenu(false); }} disabled={modeGateLoading}
                  className="w-full p-5 rounded-2xl bg-[#111318] border border-white/10 text-left active:scale-[0.98] transition-all disabled:opacity-50">
                  <p className="text-white font-black text-base mb-1">🏃 Individual Scoring</p>
                  <p className="text-neutral-400 text-xs">Both teams log events independently on their own devices.</p>
                </button>
                <button onClick={() => { setShowScorerSearch(true); setShowModeGate(false); setLiveScoringSubMenu(false); }} disabled={modeGateLoading}
                  className="w-full p-5 rounded-2xl bg-[#111318] border border-white/10 text-left active:scale-[0.98] transition-all disabled:opacity-50">
                  <p className="text-white font-black text-base mb-1">👤 Single Scorer</p>
                  <p className="text-neutral-400 text-xs">Share a secure link — one person scores for both teams.</p>
                </button>
              </div>
            )}

            {modeGateLoading && <p className="text-center text-neutral-500 text-xs mt-4 animate-pulse">Sending proposal...</p>}

            {/* ── 10-min timeout fallback ── */}
            {timeoutPromptVisible && (
              <div className="mt-6 bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4">
                <p className="text-orange-400 text-xs font-black mb-2">⏱ No agreement yet — default to Score After Match?</p>
                <button onClick={() => handleProposeMode('after_match', undefined)}
                  className="w-full py-3 rounded-xl bg-orange-500 text-white font-black text-sm active:scale-95 transition-all">
                  Yes, use Score After Match
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ── Score Entry Panel (Score After Match only) ── */}
      {showScoreEntry && match.status === 'SCORE_ENTRY' && scoringMode === 'SCORE_AFTER' && (
        <div className="fixed inset-0 z-[300] bg-[#08090f]/98 backdrop-blur-sm flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center px-6">

            {/* ── Phase 3: Score Comparison (both submitted + agreed) ── */}
            {scoresRevealed ? (
              <div className="w-full max-w-sm flex flex-col items-center gap-6">
                <div className="text-center">
                  <div className="text-5xl mb-3">🏁</div>
                  <h2 className="text-2xl font-black text-white mb-1">Final Score</h2>
                  <p className="text-sm text-neutral-500">Both teams submitted the same score. Accept to finalise.</p>
                </div>

                {/* Big scoreline */}
                <div className="flex items-center gap-6 w-full justify-center py-4">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-white/10 overflow-hidden flex items-center justify-center">
                      {match.teamA.logoUrl ? <img src={match.teamA.logoUrl} className="w-full h-full object-cover" alt="" /> : <Shield size={16} className="text-neutral-500" />}
                    </div>
                    <span className="text-[10px] font-black text-neutral-500 truncate max-w-[70px] text-center">{match.teamA.name}</span>
                  </div>
                  <span className="text-6xl font-black text-white tabular-nums">{scoresRevealed.scoreA}</span>
                  <span className="text-2xl font-black text-neutral-600">:</span>
                  <span className="text-6xl font-black text-white tabular-nums">{scoresRevealed.scoreB}</span>
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-white/10 overflow-hidden flex items-center justify-center">
                      {match.teamB.logoUrl ? <img src={match.teamB.logoUrl} className="w-full h-full object-cover" alt="" /> : <Shield size={16} className="text-neutral-500" />}
                    </div>
                    <span className="text-[10px] font-black text-neutral-500 truncate max-w-[70px] text-center">{match.teamB.name}</span>
                  </div>
                </div>

                {/* Accept/dispute or waiting */}
                {!myAccepted ? (
                  <div className="flex gap-3 w-full">
                    <button onClick={() => handleAcceptScore(true)} disabled={acceptLoading}
                      className="flex-1 py-3.5 rounded-2xl border border-red-500/30 text-red-400 font-black text-sm active:scale-95 transition-all disabled:opacity-50">
                      ⚠️ Dispute
                    </button>
                    <button onClick={() => handleAcceptScore(false)} disabled={acceptLoading}
                      className="flex-2 flex-grow py-3.5 rounded-2xl bg-[#00ff41] text-black font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
                      {acceptLoading ? <Loader2 size={14} className="animate-spin" /> : '✓ Accept & Finalise'}
                    </button>
                  </div>
                ) : (
                  <div className={`w-full p-4 rounded-2xl border text-center ${opponentAccepted ? 'bg-[#00ff41]/10 border-[#00ff41]/30' : 'bg-neutral-800 border-white/10'}`}>
                    {opponentAccepted
                      ? <p className="text-[#00ff41] font-black text-sm">✓ Both accepted — finalising…</p>
                      : <div className="flex items-center justify-center gap-2"><Loader2 size={13} className="animate-spin text-neutral-400" /><p className="text-neutral-400 text-sm font-bold">Waiting for {opponentTeam.name} to accept…</p></div>
                    }
                  </div>
                )}
              </div>

            /* ── Phase 2: Submitted, waiting for opponent ── */
            ) : mySubmittedScore ? (
              <div className="w-full max-w-xs">
                <div className="text-5xl mb-4 text-center">📋</div>
                <div className="p-5 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded-2xl text-center mb-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#00ff41] mb-2">Your Submission</p>
                  <p className="text-4xl font-black text-white">{mySubmittedScore.us} — {mySubmittedScore.them}</p>
                  <p className="text-xs text-neutral-500 mt-1">{myTeam.name} — {opponentTeam.name}</p>
                </div>
                <div className={`p-4 rounded-2xl border text-center ${opponentSubmitted ? 'bg-green-500/10 border-green-500/30' : 'bg-neutral-800 border-white/10'}`}>
                  {opponentSubmitted
                    ? <p className="text-green-400 font-black text-sm">✓ Opponent submitted — comparing…</p>
                    : <div className="flex items-center justify-center gap-2"><Loader2 size={13} className="animate-spin text-neutral-400" /><p className="text-neutral-400 text-sm font-bold">Waiting for {opponentTeam.name}…</p></div>
                  }
                </div>
              </div>

            /* ── Phase 1: Enter score ── */
            ) : isOMC ? (
              <div className="w-full max-w-xs flex flex-col gap-6">
                <div className="text-center">
                  <div className="text-5xl mb-3">📋</div>
                  <h2 className="text-2xl font-black text-white mb-1">Final Score</h2>
                  <p className="text-sm text-neutral-500">Enter from <strong className="text-white">{myTeam.name}</strong>'s perspective</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{myTeam.name}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setScoreEntryUs(s => Math.max(0, s - 1))} className="w-10 h-10 rounded-xl bg-neutral-800 border border-white/10 text-white font-black text-lg flex items-center justify-center active:scale-90">−</button>
                      <span className="text-4xl font-black text-white w-10 text-center tabular-nums">{scoreEntryUs}</span>
                      <button onClick={() => setScoreEntryUs(s => s + 1)} className="w-10 h-10 rounded-xl bg-[#00ff41]/20 border border-[#00ff41]/40 text-[#00ff41] font-black text-lg flex items-center justify-center active:scale-90">+</button>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{opponentTeam.name}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setScoreEntryThem(s => Math.max(0, s - 1))} className="w-10 h-10 rounded-xl bg-neutral-800 border border-white/10 text-white font-black text-lg flex items-center justify-center active:scale-90">−</button>
                      <span className="text-4xl font-black text-white w-10 text-center tabular-nums">{scoreEntryThem}</span>
                      <button onClick={() => setScoreEntryThem(s => s + 1)} className="w-10 h-10 rounded-xl bg-neutral-800 border border-white/10 text-white font-black text-lg flex items-center justify-center active:scale-90">+</button>
                    </div>
                  </div>
                </div>
                {/* Who Played Checklist */}
                <div className="w-full flex flex-col gap-2 bg-neutral-900 border border-white/5 p-4 rounded-2xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-1">
                    👥 Who Played? (MMR Gating)
                  </p>
                  <p className="text-[9px] text-neutral-500 mb-2 leading-snug">
                    Checked players will receive player MMR change. Unchecked bench players will receive ±0 MMR.
                  </p>
                  <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto pr-1">
                    {(() => {
                      const myPicksList = match.rosterPicks?.filter((p: any) => p.teamId === myTeam.id) || [];
                      return myPicksList.map((pick: any) => {
                        const member = myTeam.members.find((m: any) => m.id === pick.memberId);
                        if (!member || !member.player) return null;
                        const isChecked = playedMemberIds.includes(pick.memberId);
                        return (
                          <label key={pick.id} className="flex items-center gap-2.5 py-1.5 px-2 rounded-xl bg-neutral-950/40 border border-white/[0.03] select-none cursor-pointer active:scale-[0.99] transition-all">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setPlayedMemberIds(prev => [...prev, pick.memberId]);
                                } else {
                                  setPlayedMemberIds(prev => prev.filter(id => id !== pick.memberId));
                                }
                              }}
                              className="w-3.5 h-3.5 accent-[#00ff41] rounded bg-neutral-800 border-white/10"
                            />
                            <div className="flex items-center gap-2">
                              {member.player.avatarUrl ? (
                                <img src={member.player.avatarUrl} className="w-5 h-5 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
                                  <User size={10} className="text-neutral-500" />
                                </div>
                              )}
                              <span className="text-xs font-bold text-white line-clamp-1">{member.player.fullName}</span>
                              {pick.isStarter && (
                                <span className="px-1 py-0.2 bg-neutral-800 border border-white/10 text-[8px] font-black text-neutral-400 uppercase rounded tracking-wider">Start</span>
                              )}
                            </div>
                          </label>
                        );
                      });
                    })()}
                  </div>
                </div>

                <button onClick={handleSubmitScore} disabled={scoreSubmitting}
                  className="w-full py-4 rounded-2xl bg-[#00ff41] text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50">
                  {scoreSubmitting ? <Loader2 size={16} className="animate-spin" /> : '✓ Submit Score'}
                </button>
              </div>
            ) : (
              <p className="text-neutral-500 text-sm text-center">Waiting for your OMC to submit the score…</p>
            )}
          </div>
        </div>
      )}

      {/* ── Undo Toast ── */}
      {undoToast && (
        <div className="fixed bottom-[96px] left-4 right-4 z-[200] bg-[#1a1c23]/95 border border-[#00ff41]/30 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between shadow-[0_0_20px_rgba(0,255,65,0.15)] animate-[slideUpSheet_0.2s_ease-out_forwards]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00ff41] animate-pulse" />
            <p className="text-xs font-black text-white">{undoToast.msg} · {undoTimer}s</p>
          </div>
          <button onClick={handleUndo} className="px-3.5 py-1.5 rounded-xl bg-[#00ff41]/20 border border-[#00ff41]/40 text-[#00ff41] text-xs font-black uppercase tracking-wider active:scale-95 transition-all">
            Undo
          </button>
        </div>
      )}

      {/* ── Quick Log Team Picker ── */}
      {showQuickLogTeamPicker && (
        <div className="fixed inset-0 z-[250] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowQuickLogTeamPicker(false)} />
          <div className="relative bg-[#111318] rounded-t-3xl border-t border-[#1e2028] w-full max-w-md p-5 pb-10"
            style={{ animation: 'slideUpSheet 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
            <h3 className="text-base font-black text-white mb-1">Quick Log Goal</h3>
            <p className="text-xs text-neutral-500 mb-4">Select team that scored. Details can be backfilled later.</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => handleQuickLog(match.teamA_Id)}
                className="w-full py-3.5 rounded-2xl bg-neutral-900 border border-white/5 text-white font-black text-xs uppercase tracking-wider active:scale-[0.98] transition-all">
                ⚽ {match.teamA.name}
              </button>
              <button onClick={() => handleQuickLog(match.teamB_Id)}
                className="w-full py-3.5 rounded-2xl bg-neutral-900 border border-white/5 text-white font-black text-xs uppercase tracking-wider active:scale-[0.98] transition-all">
                ⚽ {match.teamB.name}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Post Match Stats & Badges Modal ── */}
      {showStatsModal && state && (
        <PostMatchStatsModal
          matchId={matchId}
          myTeam={myTeam}
          opponentTeam={opponentTeam}
          agreedScore={state.isTeamA ? scoreA : scoreB}
          playedPlayerIds={(() => {
            const picks = match?.rosterPicks || [];
            const starters = picks.filter((p: any) => p.isStarter).map((p: any) => p.memberId);
            const startersPlayerIds = [
              ...myTeam.members.filter((m: any) => starters.includes(m.id)).map((m: any) => m.playerId),
              ...opponentTeam.members.filter((m: any) => starters.includes(m.id)).map((m: any) => m.playerId)
            ];
            const subEvents = events?.filter((e: any) => e.status === 'CONFIRMED' && (e.type === 'SUB' || e.type === 'SUBSTITUTION')) || [];
            const subOnIds = subEvents.map((e: any) => e.playerOnId).filter(Boolean) as string[];
            return Array.from(new Set([...startersPlayerIds, ...subOnIds]));
          })()}
          onDone={(statsPayload) => {
            setShowStatsModal(false);
            setBadgesDismissed(true);
            loadState();
            if (statsPayload) {
              const earnedBadges = statsPayload
                .filter((s: any) => s.badgeKey && s.badgeKey !== 'NONE')
                .map((s: any) => ({ playerId: s.playerId, badgeKey: s.badgeKey }));
              setSharedBadges(earnedBadges);
              setShowShareCard(true);
            }
          }}
        />
      )}

      {/* ── Share Summary Card Modal ── */}
      {showShareCard && state && (
        <ShareCard
          match={match}
          scoreA={scoreA}
          scoreB={scoreB}
          events={events}
          players={[...myTeam.members, ...opponentTeam.members]}
          badges={sharedBadges.length > 0 ? sharedBadges : matchStats.filter(s => s.badge !== 'NONE').map(s => ({ playerId: s.playerId, badgeKey: s.badge }))}
          onClose={() => setShowShareCard(false)}
        />
      )}

      {/* ── Completed Match continuous flow footer ── */}
      {match.status === 'COMPLETED' && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-[#0d0e14]/95 backdrop-blur-md border-t border-[#1e2028] px-4 pt-4 pb-8 flex flex-col gap-2">
          {isOMC && !matchStats.some(s => s.teamId === myTeamId && s.badge !== 'NONE') && (
            <button onClick={() => setShowStatsModal(true)}
              className="w-full py-4 rounded-2xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_15px_rgba(219,39,119,0.2)]">
              🏅 Award Badges & Stats
            </button>
          )}
          <button onClick={() => setShowShareCard(true)}
            className="w-full py-4 rounded-2xl bg-[#00ff41] hover:bg-[#00e038] text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,255,65,0.2)]">
            📁 Share Summary Card
          </button>
        </div>
      )}

      {/* ── Opponent Proposed Half Time Modal ── */}
      {(() => {
        const opponentCalledHT = halfTime && (
          (state?.isTeamA && halfTime.calledByB && !halfTime.calledByA) ||
          (!state?.isTeamA && halfTime.calledByA && !halfTime.calledByB)
        );
        if (!opponentCalledHT || !isOMC) return null;
        return (
          <div className="fixed inset-0 z-[290] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-[#111318] rounded-3xl border border-[#1e2028] w-full max-w-sm p-6 text-center shadow-2xl animate-[slideUpSheet_0.2s_ease-out_forwards]">
              <div className="text-4xl mb-3">⏸</div>
              <h3 className="text-lg font-black text-white mb-2">Half Time Proposed</h3>
              <p className="text-xs text-neutral-400 mb-6">
                Opponent team has proposed calling Half Time. Confirm to pause the match.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    const r = await fetch(`/api/matches/${matchId}/halftime`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ minute: currentMinute })
                    });
                    if (r.ok) {
                      setMsg('⏸ Half time confirmed!');
                      await broadcastMatchEvent(matchId, 'STATE_REQ_RELOAD', {});
                      loadState();
                    } else {
                      const d = await r.json();
                      setMsg('❌ ' + d.error);
                    }
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-[#00ff41] text-black font-black text-xs uppercase tracking-wider active:scale-95 transition-all shadow-[0_0_15px_rgba(0,255,65,0.2)]"
                >
                  Confirm HT
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Opponent Proposed Full Time Modal ── */}
      {opponentEndedGame && !myEndedGame && isOMC && match.status === 'LIVE' && (
        <div className="fixed inset-0 z-[290] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-[#111318] rounded-3xl border border-[#1e2028] w-full max-w-sm p-6 text-center shadow-2xl animate-[slideUpSheet_0.2s_ease-out_forwards]">
            <div className="text-4xl mb-3">🏁</div>
            <h3 className="text-lg font-black text-white mb-2">Full Time Proposed</h3>
            <p className="text-xs text-neutral-400 mb-6">
              Opponent team has proposed calling Full Time. Confirm to end the match at the current score.
            </p>
            <div className="flex gap-3">
              <button
                disabled={endGameLoading}
                onClick={async () => {
                  setEndGameLoading(true);
                  const r = await fetch(`/api/matches/${matchId}/fulltime`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: '{}'
                  });
                  const d = await r.json();
                  if (r.ok) {
                    setMyEndedGame(true);
                    if (d.fullTimeConfirmed) {
                      setTimerRunning(false);
                      if (d.scoreAfterMode) {
                        setShowScoreEntry(true);
                        await broadcastMatchEvent(matchId, 'SCORE_ENTRY_OPEN', {});
                      } else {
                        setScoreA(d.scoreA); setScoreB(d.scoreB);
                        setShowSignOff(true);
                        await broadcastMatchEvent(matchId, 'FULL_TIME', { scoreA: d.scoreA, scoreB: d.scoreB });
                      }
                      loadState();
                    }
                  } else {
                    setMsg('❌ ' + d.error);
                  }
                  setEndGameLoading(false);
                }}
                className="flex-1 py-3.5 rounded-2xl bg-[#00ff41] text-black font-black text-xs uppercase tracking-wider active:scale-95 transition-all shadow-[0_0_15px_rgba(0,255,65,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {endGameLoading && <Loader2 size={12} className="animate-spin" />}
                Accept Full Time
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
