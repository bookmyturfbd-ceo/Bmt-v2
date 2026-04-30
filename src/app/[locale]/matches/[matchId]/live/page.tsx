'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Loader2, ChevronLeft, Target, CreditCard, ArrowLeftRight,
  CheckCircle, Clock, Flag, X, Shield,
  Zap, Search
} from 'lucide-react';
import { subscribeToMatchChannel, broadcastMatchEvent } from '@/lib/supabaseRealtime';
import PostMatchStatsModal from '@/components/matches/PostMatchStatsModal';
import { useMatchResult } from '@/context/MatchResultContext';

// ─── Types ────────────────────────────────────────────────────────────────────
type MatchEvent = {
  id: string; matchId: string; type: string; teamId: string;
  playerId?: string; assistPlayerId?: string; playerOnId?: string;
  minute: number; status: 'PENDING' | 'CONFIRMED' | 'DISPUTED' | 'REMOVED';
  disputedByTeamId?: string; createdAt: string;
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

function EventSheet({ type, myTeam, opponentTeam, isSingleScorer, matchId, currentMinute, rosterPicks, onClose, onSubmit }: {
  type: SheetType; myTeam: Team; opponentTeam: Team; isSingleScorer: boolean;
  matchId: string; currentMinute: number;
  rosterPicks: RosterPick[];
  onClose: () => void; onSubmit: (event: MatchEvent) => void;
}) {
  const [step, setStep] = useState(0);
  const [scorerId, setScorerId] = useState<string | null>(null);
  const [assistId, setAssistId] = useState<string | null>(null);
  const [playerOffId, setPlayerOffId] = useState<string | null>(null);
  const [playerOnId2, setPlayerOnId2] = useState<string | null>(null);
  const [minute, setMinute] = useState(currentMinute);
  const [cardType, setCardType] = useState<'YELLOW' | 'RED'>('YELLOW');
  const [penaltyScored, setPenaltyScored] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const [selectedTeamId, setSelectedTeamId] = useState<string>(myTeam.id);

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

    const body: any = { type: eventType, minute, teamId: activeTeam.id };
    if (type === 'GOAL' || type === 'PENALTY') body.scorerPlayerId = scorerId;
    if (type === 'GOAL') body.assistPlayerId = assistId;
    if (type === 'CARD') body.scorerPlayerId = scorerId;
    if (type === 'SUB') { body.scorerPlayerId = playerOffId; body.playerOnId = playerOnId2; }

    const r = await fetch(`/api/matches/${matchId}/events`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const d = await r.json();
    if (r.ok) {
      await broadcastMatchEvent(matchId, 'EVENT_CREATED', { event: d.event });
      onSubmit(d.event);
      onClose();
    } else setErr(d.error || 'Failed');
    setLoading(false);
  };

  // PlayerList — NO internal scroll. The parent body div owns all scrolling.
  const PlayerList = ({ members, selected, onSelect, label }: {
    members: Member[]; selected: string | null; onSelect: (id: string) => void; label: string;
  }) => (
    <div className="flex flex-col gap-2">
      {label ? <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">{label}</p> : null}
      {members.length === 0 && (
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
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Minute</p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => setMinute(m => Math.max(0, m - 1))}
          className="w-14 h-14 rounded-2xl bg-neutral-800 border border-white/10 text-2xl font-black text-white flex items-center justify-center active:scale-90 shrink-0"
        >−</button>
        <input
          type="number"
          value={minute}
          onChange={e => setMinute(Number(e.target.value))}
          className="w-20 text-center text-4xl font-black text-white bg-transparent outline-none"
          style={{ MozAppearance: 'textfield' }}
        />
        <button
          onClick={() => setMinute(m => m + 1)}
          className="w-14 h-14 rounded-2xl bg-[#00ff41]/20 border border-[#00ff41]/40 text-2xl font-black text-[#00ff41] flex items-center justify-center active:scale-90 shrink-0"
        >+</button>
      </div>
    </div>
  );

  const title = type === 'GOAL' ? ['Who scored?', 'Assist?', 'Minute?'][step]
    : type === 'PENALTY' ? 'Penalty'
    : type === 'CARD' ? 'Card Event'
    : type === 'SUB' ? ['Player Off?', 'Player On?', 'Minute?'][step]
    : 'Own Goal';

  const canNext = type === 'GOAL'
    ? step === 0 ? !!scorerId : true
    : type === 'SUB'
    ? step === 0 ? !!playerOffId : step === 1 ? !!playerOnId2 : true
    : true;

  const canSubmit = type === 'GOAL'
    ? step === 2 && !!scorerId
    : type === 'CARD' ? !!scorerId
    : type === 'PENALTY' ? (penaltyScored ? !!scorerId : true)
    : type === 'SUB' ? step === 2 && !!playerOffId && !!playerOnId2
    : true;

  const totalSteps = type === 'GOAL' ? 3 : type === 'SUB' ? 3 : 1;

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
          {isSingleScorer && (
            <div className="flex bg-[#000] p-1 rounded-2xl w-full">
              <button onClick={() => { setSelectedTeamId(myTeam.id); setScorerId(null); setAssistId(null); setPlayerOffId(null); setPlayerOnId2(null); }}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all truncate px-2 ${selectedTeamId === myTeam.id ? 'bg-[#00ff41] text-black' : 'text-neutral-500 hover:text-white'}`}>{myTeam.name}</button>
              <button onClick={() => { setSelectedTeamId(opponentTeam.id); setScorerId(null); setAssistId(null); setPlayerOffId(null); setPlayerOnId2(null); }}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all truncate px-2 ${selectedTeamId === opponentTeam.id ? 'bg-[#ef4444] text-white' : 'text-neutral-500 hover:text-white'}`}>{opponentTeam.name}</button>
            </div>
          )}
        </div>

        {/*
          Body: the ONE and ONLY scrollable container.
          flex-1 min-h-0 = takes remaining height without overflowing.
          overscrollBehavior contain = momentum stays here, never reaches the backdrop.
        */}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-4"
          style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
        >
          {type === 'GOAL' && step === 0 && <PlayerList members={myMembers} selected={scorerId} onSelect={setScorerId} label="Goalscorer" />}
          {type === 'GOAL' && step === 1 && (
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
          {type === 'GOAL' && step === 2 && <MinuteInput />}

          {type === 'PENALTY' && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <button onClick={() => setPenaltyScored(true)} className={`flex-1 py-3 rounded-xl font-black text-sm border transition-all ${penaltyScored ? 'bg-[#00ff41]/10 border-[#00ff41]/40 text-[#00ff41]' : 'bg-neutral-900 border-white/5 text-neutral-400'}`}>Scored</button>
                <button onClick={() => setPenaltyScored(false)} className={`flex-1 py-3 rounded-xl font-black text-sm border transition-all ${!penaltyScored ? 'bg-red-500/10 border-red-500/40 text-red-400' : 'bg-neutral-900 border-white/5 text-neutral-400'}`}>Missed</button>
              </div>
              {penaltyScored && <PlayerList members={myMembers} selected={scorerId} onSelect={setScorerId} label="Penalty Taker" />}
              <MinuteInput />
            </div>
          )}

          {type === 'CARD' && (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2">
                <button onClick={() => setCardType('YELLOW')} className={`flex-1 py-3 rounded-xl font-black text-sm border transition-all ${cardType === 'YELLOW' ? 'bg-yellow-500/10 border-yellow-500/40 text-yellow-400' : 'bg-neutral-900 border-white/5 text-neutral-400'}`}>🟨 Yellow</button>
                <button onClick={() => setCardType('RED')} className={`flex-1 py-3 rounded-xl font-black text-sm border transition-all ${cardType === 'RED' ? 'bg-red-500/10 border-red-500/40 text-red-400' : 'bg-neutral-900 border-white/5 text-neutral-400'}`}>🟥 Red</button>
              </div>
              <PlayerList members={myMembers} selected={scorerId} onSelect={setScorerId} label="Player Booked" />
              <MinuteInput />
            </div>
          )}

          {/* SUB — starters come off, subs come on */}
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
          {type === 'SUB' && step === 2 && <MinuteInput />}

          {type === 'OWN_GOAL' && (
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                <p className="text-sm font-bold text-orange-400">⚠️ Own Goal — will add 1 goal to <strong>{opponentTeam.name}</strong></p>
              </div>
              <MinuteInput />
            </div>
          )}
          {err && <p className="text-red-400 text-xs font-bold">{err}</p>}
        </div>

        {/* Footer — always visible, never scrolls away */}
        <div className="px-5 pb-8 pt-3 border-t border-[#1e2028] shrink-0 flex gap-2">
          {totalSteps > 1 && step < totalSteps - 1 && (
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext}
              className="flex-1 py-4 rounded-2xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-sm disabled:opacity-40 transition-all">
              Next →
            </button>
          )}
          {(totalSteps === 1 || step === totalSteps - 1) && (
            <button onClick={submit} disabled={!canSubmit || loading}
              className="flex-1 py-4 rounded-2xl bg-[#00ff41] text-black font-black text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
              {loading ? <Loader2 size={16} className="animate-spin" /> : 'Submit ✓'}
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
      setResults(d.players || []);
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
  } | null>(null);

  // ── Score After Match state ────────────────────────────────────────────────
  const [scoringMode, setScoringMode]             = useState<'LIVE' | 'LIVE_SINGLE' | 'SCORE_AFTER'>('LIVE');
  const [scoreModeAgreed, setScoreModeAgreed]     = useState(false);
  const [scoreModeRequest, setScoreModeRequest]   = useState<{ mode: string; fromTeamId: string; singleScorerId?: string } | null>(null);
  const [showModeGate, setShowModeGate]           = useState(false);
  const [modeGateLoading, setModeGateLoading]     = useState(false);
  // Score entry panel
  const [showScoreEntry, setShowScoreEntry]       = useState(false);
  const [mySubmittedScore, setMySubmittedScore]   = useState<{ us: number; them: number } | null>(null);
  const [opponentSubmitted, setOpponentSubmitted] = useState(false);
  const [scoreEntryUs, setScoreEntryUs]           = useState(0);
  const [scoreEntryThem, setScoreEntryThem]       = useState(0);
  const [scoreSubmitting, setScoreSubmitting]     = useState(false);
  // Post-match stats modal (Score After only)
  const [showStatsModal, setShowStatsModal]       = useState(false);

  // Single Scorer Mode State
  const [liveScoringSubMenu, setLiveScoringSubMenu] = useState(false);
  const [showScorerSearch, setShowScorerSearch]     = useState(false);

  const loadState = useCallback(async () => {
    const r = await fetch(`/api/matches/${matchId}/state`);
    const d = await r.json();
    if (!r.ok) { router.push(`/${locale}/interact`); return; }
    setState(d);
    setEvents(d.events || []);
    setSignOffs(d.signOffs || []);
    setScoreA(d.scoreA ?? 0);
    setScoreB(d.scoreB ?? 0);
    setHalfTime(d.halfTime || null);
    // Scoring mode
    setScoringMode(d.scoringMode ?? 'LIVE');
    setScoreModeAgreed(d.scoreModeAgreed ?? false);
    setOpponentSubmitted(
      d.isTeamA ? (d.scoreSubmittedByB ?? false) : (d.scoreSubmittedByA ?? false)
    );
    // Surface accept/reject ONLY to the opponent (not the proposer)
    if (d.scoreModeRequestedBy && d.scoreModeRequestedBy !== d.myTeamId && !d.scoreModeAgreed) {
      setScoreModeRequest({ mode: d.scoringMode, fromTeamId: d.scoreModeRequestedBy, singleScorerId: d.match?.proposedSingleScorerId });
      setShowModeGate(false); // opponent sees accept/reject, not the gate
    } else if (d.scoreModeRequestedBy && d.scoreModeRequestedBy === d.myTeamId && !d.scoreModeAgreed) {
      // Proposer: clear any stale request notification, keep gate hidden
      setScoreModeRequest(null);
      setShowModeGate(false);
    }
    setLoading(false);

    if (d.match?.status === 'LIVE') {
      const lsKey = `matchTimerStart_${matchId}`;
      let startMs = Number(sessionStorage.getItem(lsKey));
      const now = Date.now();
      if (!startMs) {
        startMs = now;
        sessionStorage.setItem(lsKey, String(startMs));
      }
      setTimerSecs(prev => {
        if (prev > 0) return prev;
        let elapsed = Math.floor((now - startMs) / 1000);
        if (d.events?.length > 0) {
          const maxMin = Math.max(...d.events.map((e: any) => e.minute));
          if (maxMin * 60 > elapsed) elapsed = maxMin * 60;
        }
        return Math.max(0, elapsed);
      });
      setTimerRunning(true);
      // Show mode gate only if: OMC, no mode agreed, and no pending proposal from anyone
      if (d.isOMC && !d.scoreModeAgreed && !d.scoreModeRequestedBy) {
        setShowModeGate(true);
      }
    }
    if (d.match?.status === 'SCORE_ENTRY') {
      if (d.scoringMode === 'SCORE_AFTER') {
        setShowScoreEntry(true);
      } else {
        setShowSignOff(true);
      }
    }
  }, [matchId, locale]);

  useEffect(() => { loadState(); }, [loadState]);

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
        // Show accept/reject modal only to the opponent
        if (data.fromTeamId !== stateRef.current?.myTeamId) {
          setScoreModeRequest({ mode: data.mode, fromTeamId: data.fromTeamId, singleScorerId: data.singleScorerId });
        }
      }
      if (event === 'SCORE_MODE_AGREED') {
        setScoringMode(data.mode);
        setScoreModeAgreed(true);
        setScoreModeRequest(null);
        setShowModeGate(false);
      }
      if (event === 'SCORE_MODE_REJECTED') {
        setScoringMode('LIVE');
        setScoreModeAgreed(false);
        setScoreModeRequest(null);
        setMsg('⚠️ Mode rejected — defaulting to Live Scoring.');
      }
      if (event === 'SCORE_ENTRY_OPEN') {
        setShowScoreEntry(true);
        setTimerRunning(false);
      }
      if (event === 'OPPONENT_SUBMITTED') {
        setOpponentSubmitted(true);
      }
      if (event === 'BOTH_AGREED') {
        setMatchResult(data);
        setShowScoreEntry(false);
      }
      if (event === 'SCORE_DISPUTED') {
        setMsg('⚠️ Score mismatch! Match is now in dispute.');
        loadState();
      }
    });
    return () => { channel?.unsubscribe?.(); };
  }, [matchId, loadState]);

  // Timer
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => setTimerSecs(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning]);

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const currentMinute = Math.floor(timerSecs / 60);

  // ── Trigger global rank modal when match result lands ──────────────────────────
  useEffect(() => {
    if (!matchResult || !state) return;
    const { match: m, myTeamId: tid, isTeamA: amA, isOMC: isOMCState } = state;
    if (!m || !tid) return;

    const mmrDelta  = amA ? matchResult.mmrChangeA : matchResult.mmrChangeB;
    const sportType = m.teamA?.sportType ?? 'FUTSAL_5';
    const myTeam    = amA ? m.teamA : m.teamB;
    const oppTeam   = amA ? m.teamB : m.teamA;
    const currentMmr = myTeam?.footballMmr ?? myTeam?.teamMmr ?? 1000;

    const outcome: 'win' | 'loss' | 'draw' =
      matchResult.winnerId === null ? 'draw' :
      matchResult.winnerId === tid ? 'win' : 'loss';

    const onDismissPath = (scoringMode === 'SCORE_AFTER' && isOMCState) 
        ? `/${locale}/matches/${matchId}/stats` 
        : `/${locale}/arena?tab=history`;

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
  const visibleEvents = events.filter(e => e.status !== 'REMOVED');
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
    const r = await fetch(`/api/matches/${matchId}/halftime`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
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

  const handleProposeMode = async (mode: 'LIVE' | 'LIVE_SINGLE' | 'SCORE_AFTER', singleScorerId?: string) => {
    setModeGateLoading(true);
    const r = await fetch(`/api/matches/${matchId}/mode`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, singleScorerId }),
    });
    if (r.ok) {
      setScoringMode(mode);
      setShowModeGate(false);
      // Optimistically reflect that WE are the proposer — shows the waiting banner
      setState((prev: any) => prev ? { ...prev, scoreModeRequestedBy: prev.myTeamId } : prev);
    } else {
      const d = await r.json();
      // If already agreed (another edge case), silently refresh
      if (r.status === 200) { loadState(); }
      else setMsg('❌ ' + d.error);
    }
    setModeGateLoading(false);
  };

  const handleRespondMode = async (accept: boolean) => {
    const r = await fetch(`/api/matches/${matchId}/mode`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accept }),
    });
    if (r.ok) {
      const d = await r.json();
      if (d.agreed) {
        setScoringMode(d.mode);
        setScoreModeAgreed(true);
        await broadcastMatchEvent(matchId, 'SCORE_MODE_AGREED', { mode: d.mode });
      } else {
        await broadcastMatchEvent(matchId, 'SCORE_MODE_REJECTED', { fromTeamId: myTeamId });
      }
      setScoreModeRequest(null);
    } else {
      const d = await r.json();
      setMsg('❌ ' + d.error);
    }
  };

  const handleSubmitScore = async () => {
    setScoreSubmitting(true);
    const r = await fetch(`/api/matches/${matchId}/submit-score`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scoreForUs: scoreEntryUs, scoreForThem: scoreEntryThem }),
    });
    const d = await r.json();
    if (r.ok) {
      setMySubmittedScore({ us: scoreEntryUs, them: scoreEntryThem });
      if (d.agreed) {
        // Both agreed — result shown via BOTH_AGREED broadcast (or set directly)
        setMatchResult({ scoreA: d.scoreA, scoreB: d.scoreB, winnerId: d.winnerId, mmrChangeA: d.mmrChangeA, mmrChangeB: d.mmrChangeB });
        setShowScoreEntry(false);
      }
    } else {
      setMsg('❌ ' + d.error);
    }
    setScoreSubmitting(false);
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
        <div className="flex items-center justify-between px-4 pb-4 pt-1">
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-white/10 overflow-hidden flex items-center justify-center">
              {match.teamA.logoUrl ? <img src={match.teamA.logoUrl} className="w-full h-full object-cover" alt="" /> : <Shield size={16} className="text-neutral-500" />}
            </div>
            <p className="text-[10px] font-black text-neutral-400 text-center truncate max-w-[80px]">{match.teamA.name}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 px-2">
            <span key={`sA-${scoreA}`} className="text-7xl font-black text-white tabular-nums" style={{ animation: 'scorePop 0.4s ease-out' }}>{scoreA}</span>
            <span className="text-2xl font-black text-neutral-600">:</span>
            <span key={`sB-${scoreB}`} className="text-7xl font-black text-white tabular-nums" style={{ animation: 'scorePop 0.4s ease-out' }}>{scoreB}</span>
          </div>
          <div className="flex flex-col items-center gap-1 flex-1">
            <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-white/10 overflow-hidden flex items-center justify-center">
              {match.teamB.logoUrl ? <img src={match.teamB.logoUrl} className="w-full h-full object-cover" alt="" /> : <Shield size={16} className="text-neutral-500" />}
            </div>
            <p className="text-[10px] font-black text-neutral-400 text-center truncate max-w-[80px]">{match.teamB.name}</p>
          </div>
        </div>

        {/* Timer */}
        {match.status === 'LIVE' && (
          <div className="flex items-center justify-center pb-3">
            <span className="text-sm font-black text-neutral-400 font-mono">{formatTime(timerSecs)}'</span>
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
                <p className="text-sm">No events yet. First goal incoming!</p>
              </div>
            )}
            {[...visibleEvents].reverse().map(ev => {
              const meta       = EVENT_META[ev.type] || { icon: '•', label: ev.type, color: '#94a3b8' };
              const isMyTeam   = ev.teamId === myTeamId;
              const playerName = getPlayerName(ev.playerId);
              const assistName = getPlayerName(ev.assistPlayerId);
              const isPending  = ev.status === 'PENDING';
              const isDisputed = ev.status === 'DISPUTED';
              const isConfirmed = ev.status === 'CONFIRMED';
              const canAct     = !isMyTeam && (isOMC || isScorer) && isPending;

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
                  <div className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl flex flex-col gap-0.5 ${
                    isMyTeam
                      ? isDisputed ? 'bg-orange-500/10 border border-orange-500/30 rounded-tl-sm'
                        : isPending ? 'bg-amber-500/8 border border-amber-500/25 border-dashed rounded-tl-sm'
                        : 'bg-[#00ff41]/10 border border-[#00ff41]/20 rounded-tl-sm'
                      : isDisputed ? 'bg-orange-500/10 border border-orange-500/30 rounded-tr-sm'
                        : isPending ? 'bg-neutral-800/80 border border-white/10 border-dashed rounded-tr-sm'
                        : 'bg-[#1a1d24] border border-white/8 rounded-tr-sm'
                  }`}>
                    {/* Event type row */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-base leading-none">{meta.icon}</span>
                      <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: meta.color }}>
                        {meta.label}
                      </span>
                      {isPending && (
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black ${isMyTeam ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          PENDING
                        </span>
                      )}
                      {isDisputed && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full font-black bg-orange-500/20 text-orange-400">
                          DISPUTED
                        </span>
                      )}
                      {isConfirmed && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full font-black bg-[#00ff41]/15 text-[#00ff41]">
                          ✓
                        </span>
                      )}
                    </div>

                    {/* Player */}
                    {playerName && (
                      <p className="text-sm font-black text-white leading-tight">{playerName}</p>
                    )}
                    {assistName && (
                      <p className="text-[10px] text-neutral-500">⚡ {assistName}</p>
                    )}
                  </div>

                  {/* Agree / Dispute — only for opponent events */}
                  {canAct && (
                    <div className="flex gap-2 max-w-[78%] w-full">
                      <button onClick={() => handleEventAction(ev.id, 'confirm')}
                        className="flex-1 py-1.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 font-black text-xs flex items-center justify-center gap-1">
                        <CheckCircle size={11} /> Agree
                      </button>
                      <button onClick={() => handleEventAction(ev.id, 'dispute')}
                        className="flex-1 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400 font-black text-xs flex items-center justify-center gap-1">
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
      {match.status === 'LIVE' && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-[#0d0e14]/95 backdrop-blur-md border-t border-[#1e2028]">
          <div className="flex gap-2 px-4 pt-4 pb-6">
            <button onClick={() => setSheetType('GOAL')}
              className="flex-1 h-14 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41] font-black text-sm flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform">
              <Target size={18} /><span className="text-[10px]">Goal</span>
            </button>
            <button onClick={() => setSheetType('CARD')}
              className="flex-1 h-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-black text-sm flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform">
              <CreditCard size={18} /><span className="text-[10px]">Card</span>
            </button>
            <button onClick={() => setSheetType('SUB')}
              className="flex-1 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 font-black text-sm flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform">
              <ArrowLeftRight size={18} /><span className="text-[10px]">Sub</span>
            </button>
            <button onClick={() => setSheetType('PENALTY')}
              className="flex-1 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 font-black text-sm flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform">
              <Zap size={18} /><span className="text-[10px]">Penalty</span>
            </button>
            <button onClick={() => setShowMoreMenu(s => !s)}
              className="w-14 h-14 rounded-2xl bg-neutral-900 border border-white/10 text-neutral-400 font-black flex items-center justify-center active:scale-95 transition-transform">
              •••
            </button>
          </div>
          {showMoreMenu && (
            <div className="absolute bottom-[90px] right-4 mb-2 bg-[#1a1b24] border border-[#1e2028] rounded-2xl overflow-hidden shadow-2xl flex flex-col min-w-[160px]">
              <button onClick={() => { handleHalfTime(); setShowMoreMenu(false); }}
                className="flex items-center gap-3 px-5 py-3.5 text-sm font-bold text-blue-400 hover:bg-white/5 border-b border-white/5 text-left">
                ⏸ Half Time{halfTime?.calledByA || halfTime?.calledByB ? ' (pending)' : ''}
              </button>
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
          onSubmit={ev => setEvents(prev => [...prev, ev])}
        />
      )}

      {/* ── Score After Match: minimal action bar (replaces event buttons) ── */}
      {match.status === 'LIVE' && scoringMode === 'SCORE_AFTER' && isOMC && (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-[#0d0e14]/95 backdrop-blur-md border-t border-[#1e2028] px-4 pt-4 pb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">📋 Score After Match Mode</span>
          </div>
          <button onClick={handleFullTime}
            className="w-full py-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all">
            🏁 End Match
          </button>
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

      {/* ── Mode Selection Gate (OMC picks mode before first action) ── */}
      {showModeGate && isOMC && match.status === 'LIVE' && (
        <div className="fixed inset-0 z-[350] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm" style={{ animation: 'fadeInResult 0.3s ease-out' }}>
            {!liveScoringSubMenu ? (
              <>
                <div className="text-center mb-8">
                  <div className="text-5xl mb-3">⚙️</div>
                  <h2 className="text-2xl font-black text-white mb-1">Choose Scoring Mode</h2>
                  <p className="text-sm text-neutral-500">This must be agreed by both teams. Choose one to propose it.</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={() => setLiveScoringSubMenu(true)} disabled={modeGateLoading}
                    className="w-full p-5 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/30 text-left active:scale-[0.98] transition-all disabled:opacity-50">
                    <p className="text-[#00ff41] font-black text-base mb-1">⚡ Live Scoring</p>
                    <p className="text-neutral-400 text-xs">Log goals, cards and subs in real-time as they happen.</p>
                  </button>
                  <button onClick={() => handleProposeMode('SCORE_AFTER')} disabled={modeGateLoading}
                    className="w-full p-5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-left active:scale-[0.98] transition-all disabled:opacity-50">
                    <p className="text-blue-400 font-black text-base mb-1">📋 Score After Match</p>
                    <p className="text-neutral-400 text-xs">Both captains submit the final score and player stats after the match ends.</p>
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="text-center mb-8 relative">
                  <button onClick={() => setLiveScoringSubMenu(false)} className="absolute left-0 top-1 text-neutral-400 hover:text-white">
                    <ChevronLeft size={24} />
                  </button>
                  <div className="text-5xl mb-3">⚡</div>
                  <h2 className="text-2xl font-black text-white mb-1">Live Scoring Method</h2>
                  <p className="text-sm text-neutral-500">How would you like to log events?</p>
                </div>
                <div className="flex flex-col gap-3">
                  <button onClick={() => handleProposeMode('LIVE')} disabled={modeGateLoading}
                    className="w-full p-5 rounded-2xl bg-neutral-800/80 border border-white/10 text-left active:scale-[0.98] transition-all disabled:opacity-50">
                    <p className="text-white font-black text-base mb-1">Individual Scoring</p>
                    <p className="text-neutral-400 text-xs">Both teams individually score for themselves on their own phones.</p>
                  </button>
                  <button onClick={() => { setShowModeGate(false); setShowScorerSearch(true); }} disabled={modeGateLoading}
                    className="w-full p-5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-left active:scale-[0.98] transition-all disabled:opacity-50">
                    <p className="text-purple-400 font-black text-base mb-1">Single Scorer</p>
                    <p className="text-neutral-400 text-xs">Invite one person from either team (or search) to officially score for BOTH teams.</p>
                  </button>
                </div>
              </>
            )}
            {modeGateLoading && <p className="text-center text-neutral-500 text-xs mt-4">Sending proposal...</p>}
          </div>
        </div>
      )}

      {/* ── Proposer "waiting" banner (shown after proposing, instead of mode gate) ── */}
      {!showModeGate && !scoreModeAgreed && state?.scoreModeRequestedBy && state.scoreModeRequestedBy === state?.myTeamId && match.status === 'LIVE' && isOMC && (
        <div className="fixed bottom-28 left-4 right-4 z-[200] pointer-events-none">
          <div className="w-full bg-[#111318]/95 border border-[#00ff41]/20 rounded-2xl px-5 py-4 flex items-center gap-3 backdrop-blur-md shadow-2xl">
            <div className="w-8 h-8 rounded-full bg-[#00ff41]/10 border border-[#00ff41]/30 flex items-center justify-center shrink-0">
              <span className="text-lg animate-pulse">⏳</span>
            </div>
            <div>
              <p className="text-xs font-black text-[#00ff41]">Proposal Sent</p>
              <p className="text-[10px] text-neutral-400">Waiting for opponent to accept scoring mode...</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Mode Request Notification (opponent receives proposal) ── */}
      {scoreModeRequest && !showModeGate && isOMC && scoreModeRequest.fromTeamId !== state?.myTeamId && (
        <div className="fixed inset-0 z-[350] bg-black/85 backdrop-blur-md flex items-end justify-center p-4">
          <div className="w-full max-w-sm bg-[#111318] border border-[#1e2028] rounded-3xl p-6 mb-4"
            style={{ animation: 'slideUpSheet 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">
                {scoreModeRequest.mode === 'SCORE_AFTER' ? '📋' : scoreModeRequest.mode === 'LIVE_SINGLE' ? '👤' : '⚡'}
              </div>
              <h3 className="text-xl font-black text-white mb-1">Mode Proposed</h3>
              <p className="text-sm text-neutral-400">
                {scoreModeRequest.mode === 'LIVE_SINGLE' ? (
                  <>Opponent wants to invite a <strong className="text-white">Single Scorer</strong> to score for both teams.</>
                ) : (
                  <>Opponent wants to use <strong className="text-white">
                    {scoreModeRequest.mode === 'SCORE_AFTER' ? 'Score After Match' : 'Live Scoring'}
                  </strong></>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleRespondMode(true)}
                className="flex-1 py-4 rounded-2xl bg-[#00ff41] text-black font-black text-sm active:scale-95 transition-all">
                ✓ Accept
              </button>
              <button onClick={() => handleRespondMode(false)}
                className="flex-1 py-4 rounded-2xl bg-neutral-800 border border-white/10 text-neutral-300 font-black text-sm active:scale-95 transition-all">
                ✕ Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Score Entry Panel (Score After Match only) ── */}
      {showScoreEntry && match.status === 'SCORE_ENTRY' && scoringMode === 'SCORE_AFTER' && (
        <div className="fixed inset-0 z-[300] bg-[#08090f]/98 backdrop-blur-sm flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-2xl font-black text-white mb-1 text-center">Final Score</h2>
            <p className="text-sm text-neutral-500 mb-8 text-center">
              Enter the score from <strong className="text-white">{myTeam.name}</strong>'s perspective
            </p>

            {mySubmittedScore ? (
              <div className="w-full max-w-xs">
                <div className="p-5 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded-2xl text-center mb-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#00ff41] mb-2">Your Submission</p>
                  <p className="text-4xl font-black text-white">
                    {mySubmittedScore.us} — {mySubmittedScore.them}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">{myTeam.name} — {opponentTeam.name}</p>
                </div>
                <div className={`p-4 rounded-2xl border text-center ${opponentSubmitted ? 'bg-green-500/10 border-green-500/30' : 'bg-neutral-800 border-white/10'}`}>
                  {opponentSubmitted
                    ? <p className="text-green-400 font-black text-sm">✓ Opponent submitted — comparing...</p>
                    : <p className="text-neutral-400 text-sm font-bold">Waiting for {opponentTeam.name} to submit...</p>
                  }
                </div>
              </div>
            ) : isOMC ? (
              <div className="w-full max-w-xs flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  {/* My score */}
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{myTeam.name}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setScoreEntryUs(s => Math.max(0, s - 1))}
                        className="w-10 h-10 rounded-xl bg-neutral-800 border border-white/10 text-white font-black text-lg flex items-center justify-center active:scale-90">−</button>
                      <span className="text-4xl font-black text-white w-10 text-center tabular-nums">{scoreEntryUs}</span>
                      <button onClick={() => setScoreEntryUs(s => s + 1)}
                        className="w-10 h-10 rounded-xl bg-[#00ff41]/20 border border-[#00ff41]/40 text-[#00ff41] font-black text-lg flex items-center justify-center active:scale-90">+</button>
                    </div>
                  </div>
                  {/* Their score */}
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">{opponentTeam.name}</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setScoreEntryThem(s => Math.max(0, s - 1))}
                        className="w-10 h-10 rounded-xl bg-neutral-800 border border-white/10 text-white font-black text-lg flex items-center justify-center active:scale-90">−</button>
                      <span className="text-4xl font-black text-white w-10 text-center tabular-nums">{scoreEntryThem}</span>
                      <button onClick={() => setScoreEntryThem(s => s + 1)}
                        className="w-10 h-10 rounded-xl bg-neutral-800 border border-white/10 text-white font-black text-lg flex items-center justify-center active:scale-90">+</button>
                    </div>
                  </div>
                </div>
                <button onClick={handleSubmitScore} disabled={scoreSubmitting}
                  className="w-full py-4 rounded-2xl bg-[#00ff41] text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50">
                  {scoreSubmitting ? <Loader2 size={16} className="animate-spin" /> : '✓ Submit Score'}
                </button>
              </div>
            ) : (
              <p className="text-neutral-500 text-sm text-center">Waiting for your OMC to submit the score...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
