'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Shield, Loader2, CheckCircle, X, AlertTriangle, RotateCcw, ScrollText, Pause, XCircle, MoreHorizontal, Flag } from 'lucide-react';
import { subscribeToMatchChannel, broadcastMatchEvent } from '@/lib/supabaseRealtime';
import { useMatchResult } from '@/context/MatchResultContext';

// ─── Types ────────────────────────────────────────────────────────────────────
type ViewState =
  | 'LOADING'
  | 'ACCESS_DENIED'
  | 'TOSS_SETUP'
  | 'TOSS_PENDING_CONFIRM'
  | 'OVERS_AGREEMENT'
  | 'INNINGS_SETUP'
  | 'LIVE_SCORING'
  | 'OVER_COMPLETE'
  | 'WICKET_FLOW'
  | 'INNINGS_SIGNOFF'
  | 'SECOND_INNINGS_SETUP'
  | 'SUPER_OVER_PROMPT'
  | 'MATCH_END';

type DeliveryType = 'LEGAL' | 'WIDE' | 'NO_BALL';
type DismissalType = 'BOWLED' | 'CAUGHT' | 'LBW' | 'RUN_OUT' | 'STUMPED' | 'HIT_WICKET';

// ─── Delivery dot display ─────────────────────────────────────────────────────
function DeliveryDot({ d }: { d: any }) {
  if (!d) return <div className="w-8 h-8 rounded-full border-2 border-[#1a1d26]" />;

  const runs        = d.runs ?? 0;
  const isWicket    = d.isWicket;
  const isWide      = d.deliveryType === 'WIDE';
  const isNoBall    = d.deliveryType === 'NO_BALL';
  const isPending   = d.status === 'PENDING';
  const isConflict  = d.status === 'CONFLICTED';

  let bg = '#1a1d26', textColor = '#6b7280', label = '•', ring = '';
  if (isPending) { bg = '#f59e0b22'; textColor = '#f59e0b'; label = '?'; ring = 'border-amber-500'; }
  else if (isConflict) { bg = '#f9731622'; textColor = '#f97316'; label = '!'; ring = 'border-orange-500'; }
  else if (isWicket) { bg = '#ef444433'; textColor = '#ef4444'; label = 'W'; ring = 'border-red-500'; }
  else if (isWide)   { bg = '#a78bfa22'; textColor = '#a78bfa'; label = runs > 1 ? `Wd${runs}` : 'Wd'; ring = 'border-purple-400'; }
  else if (isNoBall) { bg = '#a78bfa22'; textColor = '#a78bfa'; label = runs > 0 ? `Nb${runs}` : 'Nb'; ring = 'border-purple-400'; }
  else if (runs === 6) { bg = '#f59e0b33'; textColor = '#f59e0b'; label = '6'; ring = 'border-amber-400'; }
  else if (runs === 4) { bg = '#3b82f633'; textColor = '#3b82f6'; label = '4'; ring = 'border-blue-400'; }
  else if (runs > 0)   { bg = '#ffffff18'; textColor = '#ffffff'; label = String(runs); }

  return (
    <div
      className={`w-8 h-8 rounded-full border-2 ${ring || 'border-transparent'} flex items-center justify-center text-[10px] font-black transition-all`}
      style={{ backgroundColor: bg, color: textColor,
        animation: isWicket && d.status === 'CONFIRMED' ? 'wicketFlash 0.5s ease-out' : undefined }}
    >
      {label}
    </div>
  );
}

// ─── Scorecard header ─────────────────────────────────────────────────────────
function ScorecardHeader({ innings, match, agreedOvers, myTeamId, onSwap, allInnings }: any) {
  if (!innings) return null;

  const battingTeam = match.teamA_Id === innings.battingTeamId ? match.teamA : match.teamB;
  const isBattingMyTeam = innings.battingTeamId === myTeamId;

  // Find current batsmen
  const findPlayer = (pid: string) => {
    const m = [...match.teamA.members, ...match.teamB.members].find((m: any) => m.playerId === pid);
    return m?.player?.fullName ?? 'Unknown';
  };

  const striker    = innings.currentStrikerId    ? findPlayer(innings.currentStrikerId)    : '—';
  const nonStriker = innings.currentNonStrikerId ? findPlayer(innings.currentNonStrikerId) : '—';
  const bowler     = innings.currentBowlerId     ? findPlayer(innings.currentBowlerId)     : '—';

  // Current over deliveries split by legality
  const currentOverDeliveries = innings.deliveries?.filter((d: any) => d.overNumber === innings.currentOverNumber) ?? [];
  const legalDeliveries = currentOverDeliveries.filter((d: any) => d.deliveryType === 'LEGAL');
  const extraDeliveries = currentOverDeliveries.filter((d: any) => d.deliveryType !== 'LEGAL');
  const paddedLegal = [
    ...legalDeliveries,
    ...Array(Math.max(0, 6 - legalDeliveries.length)).fill(null)
  ];

  // Batting perf for current batsmen
  const strikerPerf    = innings.battingPerfs?.find((p: any) => p.playerId === innings.currentStrikerId);
  const nonStrikerPerf = innings.battingPerfs?.find((p: any) => p.playerId === innings.currentNonStrikerId);

  // Bowling perf for current bowler
  const bowlerPerf = innings.bowlingPerfs?.find((p: any) => p.playerId === innings.currentBowlerId);
  const bowlerOvers = bowlerPerf ? `${Math.floor(bowlerPerf.legalBalls / 6)}.${bowlerPerf.legalBalls % 6}` : '0.0';

  // Overs bowled
  const legalBallsBowled = innings.deliveries?.filter((d: any) => d.deliveryType === 'LEGAL').length ?? 0;
  const oversBowled = legalBallsBowled / 6; // e.g. 1.5 = 9 balls
  const oversDisplay = `${Math.floor(oversBowled)}.${legalBallsBowled % 6}`;

  // Run rates
  const crr = oversBowled > 0 ? (innings.totalRuns / oversBowled).toFixed(2) : '0.00';

  // Second innings target & RRR
  const isChasing = innings.inningsNumber === 2;
  const firstInnings = allInnings?.find((i: any) => i.inningsNumber === 1);
  const target = isChasing && firstInnings ? firstInnings.totalRuns + 1 : null;
  const runsNeeded = target ? target - innings.totalRuns : null;
  const legalBallsRemaining = isChasing ? (agreedOvers * 6) - legalBallsBowled : null;
  const oversRemaining = legalBallsRemaining != null ? legalBallsRemaining / 6 : null;
  const rrr = (isChasing && oversRemaining && oversRemaining > 0 && runsNeeded != null)
    ? (runsNeeded / oversRemaining).toFixed(2)
    : null;

  return (
    <div className="bg-[#0f1117] border-b border-[#1a1d26] pb-2">
      {/* Team name + score */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-neutral-800 overflow-hidden shrink-0 flex items-center justify-center">
            {battingTeam.logoUrl
              ? <img src={battingTeam.logoUrl} className="w-full h-full object-cover" alt="" />
              : <Shield size={12} className="text-neutral-500" />}
          </div>
          <span className="text-xs font-black text-neutral-300 uppercase tracking-wide">{battingTeam.name}</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-5xl font-black text-white tabular-nums" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {innings.totalRuns}
          </span>
          <span className="text-2xl font-black text-neutral-500">/{innings.totalWickets}</span>
          <span className="text-sm font-bold text-neutral-500 ml-1">{oversDisplay} ov</span>
        </div>
      </div>

      {/* Target / Run Rate strip */}
      <div className="mx-4 mb-1 px-3 py-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-3">
        {isChasing && target != null ? (
          <>
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-neutral-600 uppercase tracking-widest font-black">Target</span>
              <span className="text-sm font-black text-amber-400">{target}</span>
            </div>
            <div className="w-px h-6 bg-white/5" />
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-neutral-600 uppercase tracking-widest font-black">Need</span>
              <span className="text-sm font-black text-white whitespace-nowrap">
                {Math.max(0, runsNeeded ?? 0)}
                <span className="text-[9px] font-bold text-neutral-500 ml-1 tracking-tight">({legalBallsRemaining}b)</span>
              </span>
            </div>
            <div className="w-px h-6 bg-white/5" />
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-neutral-600 uppercase tracking-widest font-black">CRR</span>
              <span className="text-sm font-black text-[#00ff41]">{crr}</span>
            </div>
            <div className="w-px h-6 bg-white/5" />
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-neutral-600 uppercase tracking-widest font-black">RRR</span>
              <span className={`text-sm font-black ${rrr && parseFloat(rrr) > parseFloat(crr) ? 'text-red-400' : 'text-[#00ff41]'}`}>{rrr ?? '—'}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-neutral-600 uppercase tracking-widest font-black">CRR</span>
              <span className="text-sm font-black text-[#00ff41]">{crr}</span>
            </div>
            <div className="w-px h-6 bg-white/5" />
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-neutral-600 uppercase tracking-widest font-black">Overs Left</span>
              <span className="text-sm font-black text-white">{Math.max(0, agreedOvers - Math.floor(oversBowled))}.{Math.max(0, (agreedOvers * 6) - legalBallsBowled) % 6}</span>
            </div>
            <div className="w-px h-6 bg-white/5" />
            <div className="flex flex-col items-center">
              <span className="text-[8px] text-neutral-600 uppercase tracking-widest font-black">Projected</span>
              <span className="text-sm font-black text-neutral-300">{oversBowled > 0 ? Math.round(parseFloat(crr) * agreedOvers) : '—'}</span>
            </div>
          </>
        )}
      </div>

      {/* Current batsmen */}
      <div className="px-4 py-1.5 flex items-center justify-between gap-1">
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <span className="text-[9px] text-[#3b82f6] font-black shrink-0">●</span>
          <span className="text-xs font-bold text-white truncate">{striker}</span>
          <span className="text-xs font-black text-white ml-auto">{strikerPerf?.runs ?? 0}</span>
          <span className="text-[10px] text-neutral-500">({strikerPerf?.ballsFaced ?? 0})</span>
        </div>
        
        {isBattingMyTeam && onSwap ? (
          <button onClick={onSwap} className="mx-1 px-1.5 py-1 bg-white/5 hover:bg-white/10 rounded border border-white/10 text-[10px] text-neutral-400 font-bold transition-colors">
            ⇄
          </button>
        ) : (
          <div className="w-px h-5 mx-2 bg-[#1a1d26] shrink-0" />
        )}
        
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <span className="text-[9px] text-neutral-500 font-black shrink-0">○</span>
          <span className="text-xs font-bold text-neutral-400 truncate">{nonStriker}</span>
          <span className="text-xs font-black text-neutral-400 ml-auto">{nonStrikerPerf?.runs ?? 0}</span>
          <span className="text-[10px] text-neutral-600">({nonStrikerPerf?.ballsFaced ?? 0})</span>
        </div>
      </div>

      {/* Current over dots */}
      <div className="px-4 py-2 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mr-1 w-6">Ov {innings.currentOverNumber}</span>
          {paddedLegal.map((d: any, i: number) => <DeliveryDot key={`l-${i}`} d={d} />)}
          {currentOverDeliveries.some((d: any) => d && d.deliveryType === 'NO_BALL' && !currentOverDeliveries.slice(currentOverDeliveries.indexOf(d) + 1).some((afterd: any) => afterd?.deliveryType === 'LEGAL')) && (
            <span className="ml-2 text-[9px] font-black bg-pink-500 text-white px-2 py-0.5 rounded-full animate-pulse shadow-[0_0_10px_rgba(236,72,153,0.5)] uppercase tracking-wide">
              Free Hit
            </span>
          )}
        </div>
        {extraDeliveries.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pl-[34px]">
            <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest mr-1">Ext</span>
            {extraDeliveries.map((d: any, i: number) => <DeliveryDot key={`e-${i}`} d={d} />)}
          </div>
        )}
      </div>

      {/* Current bowler */}
      <div className="px-4 py-1 flex items-center gap-2 border-t border-[#1a1d26] pt-1.5">
        <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">Bowling:</span>
        <span className="text-[11px] font-bold text-neutral-300 flex-1 truncate">{bowler}</span>
        {bowlerPerf && (
          <span className="text-[10px] text-neutral-500 font-mono">
            {bowlerOvers}ov · {bowlerPerf.runs}r · {bowlerPerf.wickets}w
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Toss Screen ──────────────────────────────────────────────────────────────
function TossView({ match, myTeamId, isOMC, onAction, toss, msg, liveToss }: any) {
  const [callChoice, setCallChoice] = useState<'HEADS' | 'TAILS' | ''>('');
  const [winner, setWinner]         = useState('');
  const [elected, setElected]       = useState<'BAT' | 'BOWL' | ''>('');
  const [loading, setLoading]       = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);

  // Use liveToss (from WS event) OR the toss from state — liveToss wins for instant animation
  const effectiveToss = liveToss ?? toss;
  const isSkipped = effectiveToss?.coinLandedOn === 'SKIPPED';
  const [showResult, setShowResult] = useState(!!effectiveToss?.coinLandedOn && !isSkipped);

  const teamA = match.teamA, teamB = match.teamB;
  const isVisiting = myTeamId === match.teamB_Id;
  const isHome = myTeamId === match.teamA_Id;
  const iWonToss = effectiveToss?.winnerTeamId === myTeamId;

  // Trigger coin animation when liveToss arrives (WS-driven — fires on BOTH screens)
  useEffect(() => {
    if (effectiveToss?.coinLandedOn && effectiveToss.coinLandedOn !== 'SKIPPED' && !showResult && !isFlipping) {
      setIsFlipping(true);
      setTimeout(() => {
        setIsFlipping(false);
        setShowResult(true);
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([50, 50, 50]);
      }, 3000);
    }
  }, [effectiveToss?.coinLandedOn]); // eslint-disable-line react-hooks/exhaustive-deps

  const oppProposedSkip = effectiveToss?.tossCall === (isHome ? 'SKIP_PROPOSED_B' : 'SKIP_PROPOSED_A');
  const iProposedSkip = effectiveToss?.tossCall === (isHome ? 'SKIP_PROPOSED_A' : 'SKIP_PROPOSED_B');

  // Manual Toss Block
  if (isSkipped) {
    const myConfirmed = isHome ? effectiveToss.confirmedByA : effectiveToss.confirmedByB;
    const canConfirm = isOMC && !myConfirmed && !effectiveToss.confirmedAt;

    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6 animate-in zoom-in duration-300">
        <div className="text-5xl">🤝</div>
        <h2 className="text-2xl font-black text-white text-center">Manual Toss</h2>
        
        {!effectiveToss.winnerTeamId && isOMC && (
          <div className="w-full flex flex-col gap-4">
            <p className="text-xs text-neutral-500 text-center font-bold uppercase tracking-wider">Who won the real-world toss?</p>
            <div className="flex gap-3">
              {[teamA, teamB].map((t: any) => (
                <button key={t.id} onClick={() => setWinner(t.id)}
                  className={`flex-1 py-3.5 rounded-2xl border font-black text-sm transition-all ${winner === t.id ? 'bg-[#3b82f6]/15 border-[#3b82f6]/50 text-[#3b82f6]' : 'bg-neutral-900 border-white/5 text-neutral-400'}`}>
                  {t.name}
                </button>
              ))}
            </div>

            {winner && (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-neutral-500 text-center font-bold uppercase tracking-wider">Elected to…</p>
                <div className="flex gap-3">
                  {(['BAT', 'BOWL'] as const).map(e => (
                    <button key={e} onClick={() => setElected(e)}
                      className={`flex-1 py-3.5 rounded-2xl border font-black text-sm transition-all ${elected === e ? 'bg-[#00ff41]/10 border-[#00ff41]/40 text-[#00ff41]' : 'bg-neutral-900 border-white/5 text-neutral-400'}`}>
                      {e === 'BAT' ? '🏏 Bat' : '⚾ Bowl'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              disabled={!winner || !elected || loading}
              onClick={async () => {
                setLoading(true);
                try { await onAction('record_manual_toss', { winnerTeamId: winner, electedTo: elected }); } finally { setLoading(false); }
              }}
              className="w-full py-4 rounded-2xl bg-[#3b82f6] text-white font-black text-sm disabled:opacity-40 transition-all">
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Record Manually'}
            </button>
          </div>
        )}

        {effectiveToss.winnerTeamId && !effectiveToss.confirmedAt && (
          <div className="w-full flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-[#3b82f6]/10 border border-[#3b82f6]/30 text-center">
              <p className="text-xs text-neutral-500 mb-1 uppercase tracking-widest font-bold">Manual Result</p>
              <p className="text-lg font-black text-white">
                {[teamA, teamB].find((t: any) => t.id === effectiveToss.winnerTeamId)?.name} won the toss
              </p>
              <p className="text-sm font-bold text-[#3b82f6] mt-1">
                Elected to {effectiveToss.electedTo === 'BAT' ? 'BAT' : 'BOWL'}
              </p>
            </div>
            {canConfirm && (
              <button onClick={async () => {
                setLoading(true);
                try { await onAction('confirm_manual_toss', {}); } finally { setLoading(false); }
              }}
                disabled={loading}
                className="w-full py-4 rounded-2xl bg-[#00ff41] text-black font-black text-sm disabled:opacity-40">
                {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : '✓ Confirm Result'}
              </button>
            )}
            {myConfirmed && <p className="text-center text-sm text-neutral-500 font-bold">✓ Waiting for opponent to confirm…</p>}
          </div>
        )}

        {effectiveToss?.confirmedAt && (
          <div className="text-center">
            <p className="text-[#00ff41] font-black text-lg">✓ Toss Confirmed!</p>
            <p className="text-neutral-500 text-sm mt-1">Setting up innings…</p>
          </div>
        )}

        {msg && <p className="text-xs text-amber-400 text-center font-bold">{msg}</p>}
      </div>
    );
  }

  // Auto/Digital Block
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6">
      <style>{`
        .coin-container { perspective: 1000px; width: 140px; height: 140px; margin: 0 auto; }
        .coin {
          width: 100%; height: 100%; position: relative;
          transform-style: preserve-3d;
        }
        .coin.animating { transition: transform 3s cubic-bezier(0.2, 0.8, 0.2, 1); }
        .coin.flipping-heads { transform: rotateY(1800deg); }
        .coin.flipping-tails { transform: rotateY(1980deg); }
        .coin.landed-tails { transform: rotateY(180deg); }
        .coin-face {
          position: absolute; width: 100%; height: 100%;
          border-radius: 50%; backface-visibility: hidden;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          font-family: sans-serif; font-weight: 900;
          border: 4px solid #fff;
          box-shadow: 0 0 20px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.5);
        }
        .coin-heads { background: radial-gradient(circle at top left, #fbbf24, #b45309); color: white; transform: rotateY(0deg); }
        .coin-tails { background: radial-gradient(circle at top left, #94a3b8, #334155); color: white; transform: rotateY(180deg); }
      `}</style>

      <h2 className="text-2xl font-black text-white text-center">Match Toss</h2>

      {/* Synchronous 3D Coin Asset */}
      <div className="coin-container my-4">
        <div className={`coin ${isFlipping ? 'animating ' + (effectiveToss?.coinLandedOn === 'HEADS' ? 'flipping-heads' : 'flipping-tails') : (showResult && effectiveToss?.coinLandedOn === 'TAILS' ? 'landed-tails' : '')}`}>
          <div className="coin-face coin-heads">
            <span className="text-3xl">BMT</span>
            <span className="text-[10px] tracking-widest mt-1">HEADS</span>
          </div>
          <div className="coin-face coin-tails">
            <span className="text-3xl">BMT</span>
            <span className="text-[10px] tracking-widest mt-1">TAILS</span>
          </div>
        </div>
      </div>

      {!effectiveToss?.coinLandedOn && (
        <div className="w-full flex flex-col gap-4">
          <p className="text-xs text-neutral-500 text-center font-bold uppercase tracking-wider">
            {isVisiting ? 'Visiting Captain: Call the toss' : 'Waiting for visiting captain to call...'}
          </p>

          {isVisiting && isOMC && (
            <>
              <div className="flex gap-3">
                <button onClick={() => setCallChoice('HEADS')} className={`flex-1 py-3.5 rounded-2xl border font-black text-sm transition-all ${callChoice === 'HEADS' ? 'bg-amber-500/20 border-amber-500/50 text-amber-500' : 'bg-neutral-900 border-white/5 text-neutral-400'}`}>HEADS</button>
                <button onClick={() => setCallChoice('TAILS')} className={`flex-1 py-3.5 rounded-2xl border font-black text-sm transition-all ${callChoice === 'TAILS' ? 'bg-slate-400/20 border-slate-400/50 text-slate-300' : 'bg-neutral-900 border-white/5 text-neutral-400'}`}>TAILS</button>
              </div>
              <button
                disabled={!callChoice || loading}
                onClick={async () => {
                  setLoading(true);
                  try { await onAction('flip_coin', { call: callChoice }); } finally { setLoading(false); }
                }}
                className="w-full py-4 rounded-2xl bg-[#3b82f6] text-white font-black text-sm disabled:opacity-40 transition-all">
                {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'FLIP COIN'}
              </button>
            </>
          )}

          {isOMC && !oppProposedSkip && !iProposedSkip && (
            <button onClick={() => onAction('skip_toss_proposal', {})} className="w-full py-3 rounded-2xl border border-white/10 text-neutral-400 font-bold text-xs hover:bg-white/5 transition-all">
              Skip Digital Toss (Input Manually)
            </button>
          )}

          {iProposedSkip && (
            <p className="text-center text-xs text-amber-500 font-bold mt-2">Waiting for opponent to agree to skip...</p>
          )}

          {isOMC && oppProposedSkip && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col gap-3">
              <p className="text-amber-500 text-xs font-bold text-center">Opponent wants to skip the digital toss and input manually.</p>
              <button onClick={() => onAction('accept_toss_skip', {})} className="w-full py-3 rounded-xl bg-amber-500 text-black font-black text-xs">
                Agree to Skip
              </button>
            </div>
          )}
        </div>
      )}

      {isFlipping && <p className="text-sm font-black text-amber-400 animate-pulse text-center">Flipping...</p>}

      {showResult && !effectiveToss?.confirmedAt && (
        <div className="w-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-4 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/30 text-center">
            <p className="text-[10px] text-neutral-500 mb-1 uppercase tracking-widest font-bold">Toss Winner</p>
            <p className="text-xl font-black text-white">
              {[teamA, teamB].find((t: any) => t.id === effectiveToss.winnerTeamId)?.name}
            </p>
          </div>

          {isOMC ? (
            iWonToss ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-[#00ff41] text-center font-bold uppercase tracking-wider">You won! Elect to:</p>
                <div className="flex gap-3 mb-2">
                  <button onClick={() => setElected('BAT')} className={`flex-1 py-4 rounded-2xl border font-black text-sm transition-all ${elected === 'BAT' ? 'bg-[#00ff41]/20 border-[#00ff41]/50 text-[#00ff41]' : 'bg-neutral-900 border-white/5 text-neutral-400'}`}>🏏 BAT</button>
                  <button onClick={() => setElected('BOWL')} className={`flex-1 py-4 rounded-2xl border font-black text-sm transition-all ${elected === 'BOWL' ? 'bg-[#3b82f6]/20 border-[#3b82f6]/50 text-[#3b82f6]' : 'bg-neutral-900 border-white/5 text-neutral-400'}`}>⚾ BOWL</button>
                </div>
                <button
                  disabled={!elected || loading}
                  onClick={async () => {
                    setLoading(true);
                    try { await onAction('elect_toss', { electedTo: elected }); } finally { setLoading(false); }
                  }}
                  className="w-full py-4 rounded-2xl bg-[#00ff41] text-black font-black text-sm disabled:opacity-40">
                  {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : '✓ Confirm Election'}
                </button>
              </div>
            ) : (
               <p className="text-center text-sm text-neutral-500 font-bold uppercase">Waiting for opponent to elect...</p>
            )
          ) : null}
        </div>
      )}

      {effectiveToss?.confirmedAt && showResult && (
        <div className="text-center animate-in zoom-in duration-500">
          <p className="text-[#00ff41] font-black text-lg mb-1">
            {[teamA, teamB].find((t: any) => t.id === effectiveToss.winnerTeamId)?.name} elected to {effectiveToss.electedTo === 'BAT' ? 'bat' : 'bowl'}!
          </p>
          <p className="text-neutral-500 text-xs">Setting up innings…</p>
        </div>
      )}

      {msg && <p className="text-xs text-amber-400 text-center font-bold mt-2">{msg}</p>}
    </div>
  );
}

// ─── Overs Agreement View ───────────────────────────────────────────────────────────
function OversAgreementView({ match, toss, isOMC, isTeamA, onAction, msg }: any) {
  const [overs, setOvers] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);

  const myProposed  = isTeamA ? toss?.proposedOversA : toss?.proposedOversB;
  const oppProposed = isTeamA ? toss?.proposedOversB : toss?.proposedOversA;

  // Auto-fill input with opponent's number so captain can Accept immediately
  useEffect(() => {
    if (oppProposed && !overs) setOvers(oppProposed);
  }, [oppProposed]); // eslint-disable-line react-hooks/exhaustive-deps

  const isMatch = overs && oppProposed && Number(overs) === oppProposed;

  const handlePropose = async () => {
    if (!overs) return;
    setLoading(true);
    try { await onAction('propose_overs', { overs: Number(overs) }); } finally { setLoading(false); }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-5">
      <div className="text-5xl">⏱️</div>
      <h2 className="text-2xl font-black text-white text-center">Match Length</h2>
      <p className="text-sm text-neutral-400 text-center max-w-xs">
        Both captains agree on the number of overs.
      </p>

      {/* Opponent proposal banner */}
      {oppProposed && (
        <div className="w-full p-4 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/30 text-center animate-in zoom-in duration-300">
          <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold mb-1">Opponent Proposed</p>
          <p className="text-4xl font-black text-[#00ff41]">{oppProposed}</p>
          <p className="text-xs text-neutral-400 mt-1">overs</p>
        </div>
      )}

      {isOMC && (
        <div className="w-full flex flex-col gap-3">
          <div className="relative">
            <input
              type="number" min={1} max={50} value={overs}
              onChange={e => setOvers(parseInt(e.target.value) || '')}
              placeholder={oppProposed ? `Enter ${oppProposed} to accept` : 'Enter overs (e.g. 7)'}
              className="w-full bg-neutral-900 border border-white/10 rounded-2xl px-4 py-4 text-center text-3xl font-black text-white focus:border-[#3b82f6]/60 focus:outline-none transition-colors"
            />
          </div>

          <button
            disabled={!overs || loading}
            onClick={handlePropose}
            className={`w-full py-4 rounded-2xl font-black text-sm disabled:opacity-40 transition-all ${
              isMatch
                ? 'bg-[#00ff41] text-black shadow-[0_0_20px_rgba(0,255,65,0.3)]'
                : oppProposed
                ? 'bg-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                : 'bg-[#3b82f6] text-white'
            }`}
          >
            {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 
             isMatch ? `✓ Accept ${oppProposed} Overs` :
             oppProposed ? 'Counter Propose' :
             myProposed ? 'Update Proposal' : 'Propose Overs'}
          </button>
        </div>
      )}

      {myProposed && !oppProposed && (
        <p className="text-sm text-neutral-500 font-bold italic">Waiting for opponent to enter overs...</p>
      )}

      {msg && <p className="text-xs text-amber-400 text-center font-bold">{msg}</p>}
    </div>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────
const MatchPlayerCard = ({ member, onClick, assignedPos, isSelected, isDisabled, statusText, statusColor }: any) => (
  <button onClick={onClick} disabled={isDisabled} className={`relative flex flex-col items-center rounded-2xl p-3 transition-all text-center ${
    isDisabled ? 'bg-neutral-900 border border-red-500/10 opacity-60 cursor-not-allowed' :
    isSelected ? 'bg-[#3b82f6]/10 border border-[#3b82f6] shadow-[0_0_15px_rgba(59,130,246,0.15)] ring-1 ring-[#3b82f6]' :
    'bg-[#07080e] border border-white/10 hover:bg-neutral-900'
  }`}>
    {assignedPos && (
      <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#3b82f6] rounded-full flex items-center justify-center border-2 border-black text-[10px] font-black text-white shadow-lg">
        {assignedPos}
      </div>
    )}
    <div className={`w-12 h-12 rounded-xl bg-neutral-800 mb-2 overflow-hidden shrink-0 ${isSelected ? 'ring-2 ring-[#3b82f6] ring-offset-2 ring-offset-black' : 'shadow-inner'}`}>
      {member.player.avatarUrl ? (
        <img src={member.player.avatarUrl} className="w-full h-full object-cover" alt="" />
      ) : (
        <div className="w-full h-full flex items-center justify-center font-black text-white/30 text-lg">{member.player.fullName[0]}</div>
      )}
    </div>
    <p className={`text-xs font-bold leading-tight truncate w-full ${isSelected ? 'text-[#3b82f6]' : 'text-white'}`}>
      {member.player.fullName.split(' ')[0]}
    </p>
    
    <div className="flex flex-col items-center mt-1 w-full gap-1">
      <span className="text-[8px] bg-white/5 text-neutral-400 px-2 py-0.5 rounded-full uppercase truncate max-w-full">
        {member.sportRole || 'PLAYER'}
      </span>
      {statusText ? (
        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${statusColor ? statusColor : 'text-neutral-400 bg-white/5'}`}>
          {statusText}
        </span>
      ) : (
        <span className="text-[9px] font-bold text-amber-500">MMR {member.player.mmr ?? 1000}</span>
      )}
    </div>
  </button>
);

// ─── Innings Setup View ───────────────────────────────────────────────────────
function InningsSetupView({ match, innings, myTeamId, isOMC, onAction, agreedOvers, msg }: any) {
  // We'll use a Record mapping position number (1-11) to the assigned member object
  const [positions, setPositions] = useState<Record<number, any>>({});
  const [selectedBowlerId, setSelectedBowlerId] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Modal state for assigning batting positions
  const [assigningMember, setAssigningMember] = useState<any>(null);

  const isSecondInnings = (match.cricketInnings?.length === 1 && match.cricketInnings[0].status === 'SIGNED_OFF') || innings?.inningsNumber === 2;
  const firstBattingTeamId = match.cricketToss?.electedTo === 'BAT' 
    ? match.cricketToss.winnerTeamId 
    : (match.cricketToss?.winnerTeamId === match.teamA_Id ? match.teamB_Id : match.teamA_Id);

  let activeBattingId = firstBattingTeamId;
  let activeBowlingId = activeBattingId === match.teamA_Id ? match.teamB_Id : match.teamA_Id;

  if (innings?.battingTeamId) {
    activeBattingId = innings.battingTeamId;
    activeBowlingId = innings.bowlingTeamId;
  } else if (isSecondInnings) {
    activeBattingId = firstBattingTeamId === match.teamA_Id ? match.teamB_Id : match.teamA_Id;
    activeBowlingId = activeBattingId === match.teamA_Id ? match.teamB_Id : match.teamA_Id;
  }

  const isBatting = activeBattingId === myTeamId;
  const isBowling = activeBowlingId === myTeamId;

  const battingTeamId = activeBattingId;
  const bowlingTeamId = activeBowlingId;
  const battingTeam   = battingTeamId === match.teamA_Id ? match.teamA : match.teamB;
  const bowlingTeam   = bowlingTeamId === match.teamA_Id ? match.teamA : match.teamB;

  const battingSubmitted  = innings && (innings.battingOrder as any[])?.length > 0;
  const bowlingSubmitted  = innings?.openingBowlerId;

  // Sorted Batters: Batsman -> Allrounder -> Wicket Keeper -> Bowler
  const getBatterWeight = (role: string) => {
    const r = (role || '').toLowerCase();
    if (r.includes('bat')) return 1;
    if (r.includes('all')) return 2;
    if (r.includes('wicket') || r.includes('wkt')) return 3;
    if (r.includes('bowl')) return 4;
    return 5;
  };

  // Sorted Bowlers: Bowler -> Allrounder -> Batsman -> Wicket Keeper
  const getBowlerWeight = (role: string) => {
    const r = (role || '').toLowerCase();
    if (r.includes('bowl')) return 1;
    if (r.includes('all')) return 2;
    if (r.includes('bat')) return 3;
    if (r.includes('wicket') || r.includes('wkt')) return 4;
    return 5;
  };

  const availableBatters = (battingTeam?.members || [])
    .filter((m: any) => !Object.values(positions).some((p: any) => p.playerId === m.playerId))
    .sort((a: any, b: any) => getBatterWeight(a.sportRole) - getBatterWeight(b.sportRole));

  const availableBowlers = (bowlingTeam?.members || [])
    .sort((a: any, b: any) => getBowlerWeight(a.sportRole) - getBowlerWeight(b.sportRole));

  const handleAssignPosition = (pos: number) => {
    if (!assigningMember) return;
    setPositions({ ...positions, [pos]: assigningMember });
    setAssigningMember(null);
  };

  const handleRemovePosition = (pos: number) => {
    const newPos = { ...positions };
    delete newPos[pos];
    setPositions(newPos);
  };

  // For submission, we need Striker and Non-Striker natively computed from positions 1 and 2
  const strikerId = positions[1]?.playerId;
  const nonStrikerId = positions[2]?.playerId;

  const PlayerCard = ({ member, onClick, assignedPos }: { member: any, onClick: () => void, assignedPos?: number }) => (
    <button onClick={onClick} className="relative flex flex-col items-center bg-[#07080e] border border-white/10 rounded-2xl p-3 hover:bg-neutral-900 transition-all text-center">
      {assignedPos && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-[#3b82f6] rounded-full flex items-center justify-center border-2 border-black text-[10px] font-black text-white shadow-lg">
          {assignedPos}
        </div>
      )}
      <div className="w-12 h-12 rounded-xl bg-neutral-800 mb-2 overflow-hidden shadow-inner shrink-0">
        {member.player.avatarUrl ? (
          <img src={member.player.avatarUrl} className="w-full h-full object-cover" alt="" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-black text-white/30 text-lg">{member.player.fullName[0]}</div>
        )}
      </div>
      <p className="text-xs font-bold text-white truncate w-full">{member.player.fullName.split(' ')[0]}</p>
      <div className="flex flex-col items-center mt-1 w-full relative">
        <span className="text-[8px] bg-white/5 text-neutral-400 px-2 py-0.5 rounded-full uppercase truncate max-w-full">
          {member.sportRole || 'PLAYER'}
        </span>
        <span className="text-[9px] font-bold text-amber-500 mt-1">MMR {member.player.mmr ?? 1000}</span>
      </div>
    </button>
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6 relative">
      <div className="text-center">
        <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
          {innings?.inningsNumber >= 3 ? `Super Over (Innings ${innings.inningsNumber}) Setup` : innings?.inningsNumber === 2 ? '2nd Innings Setup' : '1st Innings Setup'}
        </p>
        <p className="text-sm text-white font-black mt-1">Target: {agreedOvers} overs</p>
      </div>

      {isBatting && (
        <div className="bg-[#0f1117] rounded-3xl border border-[#1a1d26] p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-black uppercase tracking-widest text-[#3b82f6]">🏏 Batting Order</p>
            {battingSubmitted && <span className="text-[10px] bg-[#00ff41]/15 text-[#00ff41] px-3 py-1 rounded-full font-black">✓ SUBMITTED</span>}
          </div>

          {!battingSubmitted ? (
            <div className="flex flex-col gap-6">
              
              {/* Squad Selection Grid */}
              <div>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-3">Available Squad <span className="text-neutral-600 normal-case">(Tap to assign)</span></p>
                <div className="grid grid-cols-3 gap-3">
                  {availableBatters.map((m: any) => (
                    <MatchPlayerCard key={m.playerId} member={m} onClick={() => setAssigningMember(m)} />
                  ))}
                  {availableBatters.length === 0 && <p className="text-xs text-neutral-600 italic px-2 col-span-3">All available players have been assigned!</p>}
                </div>
              </div>

              {/* Lineup Construction */}
              <div>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-3">Starting Lineup <span className="text-neutral-600 normal-case">(Tap to remove)</span></p>
                <div className="grid grid-cols-2 gap-3 bg-black/40 p-3 rounded-2xl border border-white/5">
                  {/* Specifically highlight Opening Batsmen */}
                  <div className="col-span-2">
                    <p className="text-[10px] text-[#3b82f6] font-black uppercase mb-2 ml-1">Opening Batsmen</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2].map(pos => positions[pos] ? (
                        <MatchPlayerCard key={pos} member={positions[pos]} assignedPos={pos} onClick={() => handleRemovePosition(pos)} />
                      ) : (
                         <div key={pos} className="border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-4 h-[120px]">
                           <span className="text-3xl opacity-20 font-black">{pos}</span>
                           <span className="text-[9px] text-neutral-600 uppercase mt-2 text-center">Unassigned</span>
                         </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-2 mt-2">
                    <p className="text-[10px] text-neutral-500 font-black uppercase mb-2 ml-1">Middle Order</p>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.keys(positions).map(Number).filter(pos => pos > 2).sort((a,b) => a-b).map(pos => (
                        <MatchPlayerCard key={pos} member={positions[pos]} assignedPos={pos} onClick={() => handleRemovePosition(pos)} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button
                disabled={loading || !strikerId || !nonStrikerId}
                onClick={async () => {
                  setLoading(true);
                  // Build array mapped properly
                  const batOrder = Object.entries(positions).map(([pos, m]) => ({
                    playerId: m.playerId,
                    position: Number(pos)
                  })).sort((a,b) => a.position - b.position);

                  await onAction('submit_batting_order', {
                    battingOrder: batOrder,
                    currentStrikerId: strikerId,
                    currentNonStrikerId: nonStrikerId
                  });
                  setLoading(false);
                }}
                className={`w-full py-5 rounded-2xl font-black text-sm transition-all ${
                  (!strikerId || !nonStrikerId) 
                  ? 'bg-neutral-900 text-neutral-500 border border-white/5 opacity-50' 
                  : 'bg-[#3b82f6] text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                }`}>
                {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : `Submit Batters (${Object.keys(positions).length})`}
              </button>
               {(!strikerId || !nonStrikerId) && <p className="text-[10px] text-red-400 font-bold text-center -mt-3">Must assign Opening Batsmen (Positions 1 & 2)</p>}
            </div>
          ) : (
            <p className="text-xs text-neutral-500 italic text-center py-6">
              Batting order submitted. Preparing Scoreboard...
            </p>
          )}
        </div>
      )}

      {isBowling && (
        <div className="bg-[#0f1117] rounded-3xl border border-[#1a1d26] p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-black uppercase tracking-widest text-[#ef4444]">⚾ Opening Bowler</p>
            {bowlingSubmitted && <span className="text-[10px] bg-[#00ff41]/15 text-[#00ff41] px-3 py-1 rounded-full font-black">✓ SELECTED</span>}
          </div>

          {!bowlingSubmitted ? (
            <div className="flex flex-col gap-6">
              <div>
                <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-3">Bowling Roster <span className="text-neutral-600 normal-case">(Tap to select)</span></p>
                <div className="grid grid-cols-3 gap-3">
                  {availableBowlers.map((m: any) => (
                    <MatchPlayerCard
                      key={m.playerId}
                      member={m}
                      onClick={() => setSelectedBowlerId(m.playerId)}
                      isSelected={selectedBowlerId === m.playerId}
                    />
                  ))}
                </div>
              </div>

              <button
                disabled={!selectedBowlerId || loading}
                onClick={async () => {
                  setLoading(true);
                  await onAction('submit_opening_bowler', { openingBowlerId: selectedBowlerId });
                  setLoading(false);
                }}
                className="w-full py-5 rounded-2xl bg-[#ef4444] text-white font-black text-sm disabled:opacity-40 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
                {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirm Opening Bowler'}
              </button>
            </div>
          ) : (
            <p className="text-xs text-neutral-500 italic text-center py-6">
              Opening bowler confirmed. Preparing Scoreboard...
            </p>
          )}
        </div>
      )}

      {/* Waiting Status Indicators */}
      {isBatting && battingSubmitted && !bowlingSubmitted && (
         <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center animate-pulse">
           <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest text-center">Waiting for opponent to pick Opening Bowler...</p>
         </div>
      )}
      {isBowling && bowlingSubmitted && !battingSubmitted && (
         <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center animate-pulse">
           <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest text-center">Waiting for batting team to lock their lineup...</p>
         </div>
      )}

      {msg && <p className="text-xs text-amber-400 text-center font-bold mt-2">{msg}</p>}

      {/* Batting Position Modal */}
      {assigningMember && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-[#0f1117] border border-white/10 rounded-3xl p-6 w-full max-w-sm flex flex-col items-center relative overflow-hidden shadow-2xl">
            <button onClick={() => setAssigningMember(null)} className="absolute top-4 right-4 text-white/40 hover:text-white p-2">✕</button>
            
            <div className="w-16 h-16 rounded-2xl overflow-hidden mb-3">
              {assigningMember.player.avatarUrl ? <img src={assigningMember.player.avatarUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full bg-neutral-800 flex items-center justify-center font-black text-2xl">{assigningMember.player.fullName[0]}</div>}
            </div>
            <h3 className="text-lg font-black text-white">{assigningMember.player.fullName}</h3>
            <p className="text-xs text-[#3b82f6] font-black uppercase tracking-widest mt-1 mb-6">Assign Position</p>
            
            <div className="grid grid-cols-4 gap-3 w-full">
               {[1,2,3,4,5,6,7,8,9,10,11].map(num => (
                 <button key={num}
                   disabled={!!positions[num]}
                   onClick={() => handleAssignPosition(num)}
                   className={`h-12 flex flex-col items-center justify-center rounded-xl border font-black text-lg transition-all ${
                     positions[num] ? 'bg-white/5 border-white/5 text-white/20' : 
                     num <= 2 ? 'bg-[#3b82f6]/10 border-[#3b82f6]/30 text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white' : 
                     'bg-neutral-900 border-white/10 text-white hover:bg-white hover:text-black'
                   }`}>
                   {num}
                   {num <= 2 && !positions[num] && <span className="text-[6px] uppercase tracking-widest absolute bottom-1">Open</span>}
                 </button>
               ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── Scoring Action Pad (Batting scorer / Maker) ─────────────────────────────
function ScoringActionPad({ innings, match, myTeamId, onSubmit, pendingDelivery, onOpenLog, onPropose }: any) {
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('LEGAL');
  const [runs, setRuns]                 = useState(0);
  const [isWicket, setIsWicket]         = useState(false);
  const [dismissal, setDismissal]       = useState<DismissalType | ''>('');
  const [fielderId, setFielderId]       = useState('');
  const [loading, setLoading]           = useState(false);
  const [isBye, setIsBye]               = useState(false);
  const [whoIsOut, setWhoIsOut]         = useState<'striker' | 'nonStriker'>('striker');
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [showFielderModal, setShowFielderModal] = useState(false);
  const [showDismissalTypeModal, setShowDismissalTypeModal] = useState(false);
  const [customNextBatsman, setCustomNextBatsman] = useState<string>('');
  const [changingOrder, setChangingOrder] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // The Bowling team is needed for fielder selection
  const bowlingTeam = match.teamA_Id === innings.bowlingTeamId ? match.teamA : match.teamB;
  const battingTeam = match.teamA_Id === innings.battingTeamId ? match.teamA : match.teamB;

  const RUN_BUTTONS = [0, 1, 2, 3, 4, 6];
  const DISMISSALS: DismissalType[] = ['BOWLED', 'CAUGHT', 'LBW', 'RUN_OUT', 'STUMPED', 'HIT_WICKET'];

  const needsFielder = ['CAUGHT', 'RUN_OUT', 'STUMPED'].includes(dismissal);

  const getUnbattedPlayers = () => {
    return battingTeam.members.filter((m: any) => {
      const perf = innings.battingPerfs?.find((p: any) => p.playerId === m.playerId);
      return !perf || (!perf.hasBatted && !perf.isOut);
    }).map((m: any) => {
      const orderEntry = (innings.battingOrder as any[]).find((b: any) => b.playerId === m.playerId);
      return { ...m, position: orderEntry?.position ?? 999 };
    }).sort((a: any, b: any) => a.position - b.position);
  };

  const submit = async (nextBatsmanId?: string) => {
    setLoading(true);
    await onSubmit({
      deliveryType,
      runs,
      isWicket: isWicket && !!dismissal,
      dismissalType: isWicket ? dismissal : undefined,
      dismissedPlayerId: isWicket ? (dismissal === 'RUN_OUT' && whoIsOut === 'nonStriker' ? innings.currentNonStrikerId : innings.currentStrikerId) : undefined,
      fielderId: needsFielder ? fielderId : undefined,
      bowlerCredited: !['RUN_OUT'].includes(dismissal),
      isBye,
      nextBatsmanId
    });
    // Reset
    setDeliveryType('LEGAL'); setRuns(0); setIsWicket(false); setDismissal(''); setFielderId(''); setIsBye(false); setShowWicketModal(false); setShowFielderModal(false); setShowDismissalTypeModal(false); setChangingOrder(false); setCustomNextBatsman('');
    setLoading(false);
  };

  const cancelWicketFlow = () => {
      setIsWicket(false);
      setDismissal('');
      setFielderId('');
      setShowDismissalTypeModal(false);
      setShowFielderModal(false);
      setShowWicketModal(false);
  };

  const handleInitialSubmitClick = () => {
      submit();
  };

  // Lock UI if delivery is awaiting bowling ack
  if (pendingDelivery) {
    return (
      <div className="px-4 py-8 bg-black border-t border-white/5 flex flex-col items-center gap-4 text-center">
        <div className="text-4xl animate-pulse">⏳</div>
        <div>
          <p className="text-[#3b82f6] font-black text-xl mb-1 uppercase tracking-widest">Awaiting Confirmation</p>
          <p className="text-sm text-neutral-400">The Bowling Captain must acknowledge the Wicket.</p>
        </div>
      </div>
    );
  }

  // Find auto-suggested next batsman
  const unbatted = getUnbattedPlayers();
  const autoNextBatsmanId = unbatted[0]?.playerId;
  const activeNextBatsmanId = customNextBatsman || autoNextBatsmanId;
  const nextBatsmanName = battingTeam.members.find((m: any) => m.playerId === activeNextBatsmanId)?.player?.fullName || 'No assigned batters left';

  // Disable pad if bowler is missing
  if (!innings.currentBowlerId) {
    return (
      <div className="border-t border-[#1a1d26] bg-[#07080e] px-4 py-8 text-center text-neutral-500 font-bold text-xs uppercase tracking-widest">
        Waiting for next bowler selection...
      </div>
    );
  }

  return (
    <div className="border-t border-[#1a1d26] bg-[#07080e] px-4 pt-2 pb-4 relative shrink-0">
      <div className="flex gap-2 mb-2">
        {(['LEGAL', 'WIDE', 'NO_BALL'] as DeliveryType[]).map(t => (
          <button key={t} onClick={() => { setDeliveryType(t); if (t !== 'LEGAL') { setRuns(1); setIsWicket(false); } }}
            className={`flex-1 py-2 rounded-xl font-black text-xs uppercase tracking-wide border transition-all ${deliveryType === t
              ? t === 'LEGAL' ? 'bg-[#00ff41]/10 border-[#00ff41]/40 text-[#00ff41]'
                : 'bg-[#a78bfa]/10 border-[#a78bfa]/40 text-[#a78bfa]'
              : 'bg-neutral-900 border-white/5 text-neutral-500'}`}>
            {t === 'NO_BALL' ? 'No Ball' : t}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-2">
        {RUN_BUTTONS.map(r => (
          <button key={r} onClick={() => setRuns(r)}
            className={`flex-1 py-2 rounded-xl font-black text-base border transition-all ${runs === r
              ? r === 4 ? 'bg-[#3b82f6]/20 border-[#3b82f6] text-[#3b82f6] shadow-[0_0_12px_rgba(59,130,246,0.35)]'
                : r === 6 ? 'bg-amber-400/20 border-amber-400 text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                : 'bg-[#00ff41]/10 border-[#00ff41] text-[#00ff41] shadow-[0_0_12px_rgba(0,255,65,0.3)]'
              : 'bg-neutral-900 border-white/5 text-neutral-400'}`}>
            {r}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-2">
        <button onClick={() => setIsBye(b => !b)}
          className={`flex-1 py-2 rounded-xl font-black text-xs border transition-all ${isBye ? 'bg-neutral-700 border-white/20 text-white' : 'bg-neutral-900 border-white/5 text-neutral-600'}`}>
          Bye / Leg Bye
        </button>
        <button onClick={() => setShowMoreMenu(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-xs border border-white/10 bg-neutral-900 text-neutral-400 hover:bg-neutral-800 transition-all">
          <MoreHorizontal size={14} /> More
        </button>
      </div>

      <button onClick={() => { setIsWicket(true); setShowDismissalTypeModal(true); setDismissal(''); setFielderId(''); }}
        className="w-full py-2.5 rounded-xl font-black text-sm border mb-2 transition-all bg-neutral-900 border-white/5 text-neutral-500 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30">
        🏏 Wicket
      </button>

      {/* Dismissal Type Centered Modal */}
      {showDismissalTypeModal && (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in zoom-in-95 duration-200" onClick={cancelWicketFlow}>
          <div className="bg-[#0f1117] border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-white text-center mb-1">Dismissal Type</h3>
            <p className="text-xs text-neutral-400 text-center mb-6">How was the batsman dismissed?</p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {DISMISSALS.map(d => (
                <button key={d} onClick={() => {
                    setDismissal(d);
                    if (d !== 'RUN_OUT') {
                        setShowDismissalTypeModal(false);
                        if (['CAUGHT', 'STUMPED'].includes(d)) setShowFielderModal(true);
                        else {
                            if (unbatted[0]?.position === 999) setChangingOrder(true);
                            setShowWicketModal(true);
                        }
                    }
                  }}
                  className={`py-4 rounded-xl border font-black text-xs uppercase tracking-wide transition-all ${dismissal === d ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : 'bg-neutral-900 border-white/5 text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
                  {d.replace('_', ' ')}
                </button>
              ))}
            </div>

            {dismissal === 'RUN_OUT' && (
               <div className="p-4 bg-neutral-900 rounded-2xl border border-white/5 mb-4 animate-in slide-in-from-top-2">
                 <p className="text-[10px] text-red-500 uppercase tracking-widest font-black mb-3 text-center">Who is out?</p>
                 <div className="flex gap-2 mb-4">
                   <button onClick={() => setWhoIsOut('striker')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${whoIsOut === 'striker' ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'bg-black text-neutral-400 border border-white/5'}`}>Striker</button>
                   <button onClick={() => setWhoIsOut('nonStriker')} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${whoIsOut === 'nonStriker' ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'bg-black text-neutral-400 border border-white/5'}`}>Non-Striker</button>
                 </div>
                 <button onClick={() => {
                     setShowDismissalTypeModal(false);
                     setShowFielderModal(true); // Run out needs a fielder
                 }} className="w-full py-3 rounded-xl bg-white text-black font-black text-xs hover:bg-neutral-200 transition-all">Continue →</button>
               </div>
            )}

            <button onClick={cancelWicketFlow} className="w-full py-3 text-xs font-bold text-neutral-500 hover:text-white transition-all underline decoration-neutral-500/30">Cancel Wicket</button>
          </div>
        </div>
      )}

      {/* Fielder Selection Bottom Sheet Overlay */}
      {showFielderModal && (
        <div className="fixed inset-0 z-[80] flex items-end bg-black/80 backdrop-blur-sm" onClick={cancelWicketFlow}>
          <div className="w-full bg-[#0f1117] border-t border-[#1a1d26] rounded-t-3xl p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-5 duration-300 relative" onClick={e => e.stopPropagation()}>
             <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/10 rounded-full"/>
             <h3 className="text-xl font-black text-white text-center mt-3 mb-1">Select Fielder</h3>
             <p className="text-xs text-neutral-400 text-center mb-5">Who made the {dismissal.replace('_', ' ').toLowerCase()}?</p>

             <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto mb-4 custom-scrollbar pb-6">
                 {bowlingTeam.members.map((m: any) => (
                     <button key={m.playerId} onClick={() => { 
                         setFielderId(m.playerId); 
                         setShowFielderModal(false); 
                         if (unbatted[0]?.position === 999) setChangingOrder(true);
                         setShowWicketModal(true);
                     }} className="w-full flex items-center p-3 rounded-2xl bg-[#14171f] border border-white/5 hover:border-[#00ff41]/50 hover:bg-[#00ff41]/10 transition-all text-left group">
                         <div className="w-12 h-12 rounded-xl overflow-hidden mr-4 bg-neutral-800 border-2 border-white/10 shrink-0 group-hover:border-[#00ff41]/50 transition-colors">
                             <img src={m.player.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${m.player.fullName}`} alt={m.player.fullName} className="w-full h-full object-cover" />
                         </div>
                         <div className="flex-1 min-w-0">
                             <p className="text-base font-black text-white leading-tight truncate">{m.player.fullName}</p>
                             <p className="text-xs text-neutral-500 uppercase tracking-wider truncate">{m.role.replace('_', ' ')}</p>
                         </div>
                         <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#00ff41] group-hover:text-black transition-colors">
                             <span className="text-[10px] font-black">✓</span>
                         </div>
                     </button>
                 ))}
             </div>
             <button onClick={cancelWicketFlow} className="mt-2 text-xs text-neutral-500 font-bold underline decoration-neutral-500/30 w-full text-center py-2">
                 Cancel Wicket
             </button>
          </div>
        </div>
      )}

      {/* Wicket Bottom Sheet Overlay */}
      {showWicketModal && (
        <div className="fixed inset-0 z-[90] flex items-end bg-black/80 backdrop-blur-sm" onClick={cancelWicketFlow}>
          <div className="w-full bg-[#0f1117] border-t border-[#1a1d26] rounded-t-3xl p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-5 duration-300 relative" onClick={e => e.stopPropagation()}>
             <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1 bg-white/10 rounded-full"/>
             
             {/* WICKET SUMMARY */}
             <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-center mt-3">
                 <p className="text-xl font-black text-red-400 uppercase tracking-widest mb-1">{dismissal.replace('_', ' ')}</p>
                 {needsFielder && fielderId && (
                     <p className="text-sm text-red-300 font-bold">
                         {dismissal === 'CAUGHT' ? 'Caught by' : dismissal === 'STUMPED' ? 'Stumped by' : 'Run out by'}: {bowlingTeam.members.find((m: any) => m.playerId === fielderId)?.player.fullName}
                     </p>
                 )}
                 {dismissal === 'RUN_OUT' && (
                     <p className="text-xs text-red-300 font-bold mt-1 uppercase tracking-widest">Out: {whoIsOut === 'striker' ? 'Striker' : 'Non-Striker'}</p>
                 )}
             </div>

             <h3 className="text-lg font-black text-white text-center mb-1">Incoming Batsman</h3>
             <p className="text-xs text-neutral-400 text-center mb-5">Select or confirm who replaces the dismissed player.</p>

             {changingOrder ? (
                 <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto mb-4 custom-scrollbar">
                     {unbatted.map((b: any) => {
                         const matchM = battingTeam.members.find((m: any) => m.playerId === b.playerId);
                         return (
                             <button key={b.playerId} onClick={() => { setCustomNextBatsman(b.playerId); setChangingOrder(false); }} className="w-full flex items-center p-3 rounded-2xl bg-[#14171f] border border-white/5 hover:border-[#00ff41]/50 hover:bg-[#00ff41]/10 transition-all text-left group">
                                 <div className="w-12 h-12 rounded-xl overflow-hidden mr-4 bg-neutral-800 border-2 border-white/10 shrink-0 group-hover:border-[#00ff41]/50 transition-colors">
                                     <img src={matchM?.player?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${matchM?.player?.fullName || 'Unknown'}`} alt={matchM?.player?.fullName} className="w-full h-full object-cover" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                     <p className="text-base font-black text-white leading-tight truncate">{matchM?.player?.fullName}</p>
                                     <p className="text-xs text-[#00ff41] uppercase tracking-wider truncate font-bold">Position {b.position}</p>
                                 </div>
                                 <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#00ff41] group-hover:text-black transition-colors">
                                     <span className="text-[10px] font-black">✓</span>
                                 </div>
                             </button>
                         )
                     })}
                 </div>
             ) : (
                 <div className="flex flex-col items-center mb-6">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black mb-3">Auto-Suggested</p>
                    <div className="w-full p-4 rounded-2xl bg-gradient-to-r from-[#00ff41]/20 to-[#00ff41]/5 border border-[#00ff41]/30 flex items-center gap-4 shadow-[0_0_20px_rgba(0,255,65,0.1)]">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-black border-2 border-[#00ff41]/50 shrink-0 relative">
                            <img src={battingTeam.members.find((m: any) => m.playerId === activeNextBatsmanId)?.player?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${nextBatsmanName}`} alt={nextBatsmanName} className="w-full h-full object-cover" />
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#00ff41] rounded-full border-2 border-black flex items-center justify-center">
                                <span className="text-[10px]">🏏</span>
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-lg font-black text-white truncate">{nextBatsmanName}</p>
                            <p className="text-xs text-[#00ff41] font-bold uppercase tracking-wider truncate">
                                Position {unbatted.find((u: any) => u.playerId === activeNextBatsmanId)?.position ?? '?'}
                            </p>
                        </div>
                    </div>
                 </div>
             )}

             {!changingOrder && (
                 <div className="flex flex-col gap-2">
                     <button onClick={() => submit(activeNextBatsmanId)} disabled={loading || !activeNextBatsmanId} className="w-full py-4 rounded-2xl bg-[#00ff41] text-black font-black text-sm transition-all hover:opacity-90 flex justify-center items-center">
                         {loading ? <Loader2 size={16} className="animate-spin" /> : '✓ Confirm & Send Wicket'}
                     </button>
                     <button onClick={() => setChangingOrder(true)} className="w-full py-3 rounded-2xl bg-white/5 text-white border border-white/10 font-black text-xs hover:bg-white/10 transition-all">
                         Change Batsman
                     </button>
                     <button onClick={cancelWicketFlow} className="mt-2 text-xs text-neutral-500 font-bold underline decoration-neutral-500/30 w-full text-center py-2">
                         Cancel Wicket
                     </button>
                 </div>
             )}
          </div>
        </div>
      )}

      {!isWicket && (
          <button
            disabled={loading}
            onClick={handleInitialSubmitClick}
            className="w-full py-3 rounded-2xl bg-[#3b82f6] text-white font-black text-sm uppercase tracking-wide disabled:opacity-40 transition-all active:scale-[0.98]">
            {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Log Delivery →'}
          </button>
      )}

      {/* More menu sheet */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowMoreMenu(false)}>
          <div className="w-full bg-[#0f1117] rounded-t-3xl border-t border-[#1a1d26] p-6 flex flex-col gap-3 shadow-2xl"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUpSheet 0.25s ease-out' }}>
            <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-2" />
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest text-center mb-2">Match Controls</p>

            {/* Log */}
            <button onClick={() => { setShowMoreMenu(false); onOpenLog?.(); }}
              className="flex items-center gap-3 w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <ScrollText size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="font-black text-sm text-white">Delivery Log</p>
                <p className="text-[10px] text-neutral-500">View full match history for both teams</p>
              </div>
            </button>

            {/* Pause */}
            <button onClick={() => { setShowMoreMenu(false); onPropose?.('pause_proposal'); }}
              className="flex items-center gap-3 w-full p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-left hover:bg-amber-500/10 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Pause size={18} className="text-amber-400" />
              </div>
              <div>
                <p className="font-black text-sm text-white">Request Pause</p>
                <p className="text-[10px] text-neutral-500">Propose a match pause — opponent must agree</p>
              </div>
            </button>

            {/* Cancel */}
            <button onClick={() => { setShowMoreMenu(false); onPropose?.('cancel_proposal'); }}
              className="flex items-center gap-3 w-full p-4 rounded-2xl bg-red-500/5 border border-red-500/20 text-left hover:bg-red-500/10 transition-all">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <XCircle size={18} className="text-red-400" />
              </div>
              <div>
                <p className="font-black text-sm text-white">Cancel Match</p>
                <p className="text-[10px] text-neutral-500">Propose cancellation — opponent must agree</p>
              </div>
            </button>

            <button onClick={() => setShowMoreMenu(false)} className="text-xs text-neutral-600 font-bold py-2 text-center mt-1">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared Delivery Chat Bubble ─────────────────────────────────────────────
function DeliveryBubble({ d, idx, match, isBowlingTeamView, handleDispute, disputingId }: any) {
  const overN  = d.overNumber ?? Math.floor((d.ballNumber ?? idx) / 6) + 1;
  const ballN  = d.deliveryType === 'LEGAL' ? (d.ballNumber ?? idx) % 6 : null;
  const stamp  = ballN !== null ? `Ov ${overN} · Ball ${ballN}` : `Ov ${overN} · Extra`;
  const ts     = d.createdAt ? new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  const isW    = d.isWicket;
  const isFour = !isW && d.runs === 4;
  const isSix  = !isW && d.runs === 6;
  const isWide = d.deliveryType === 'WIDE';
  const isNB   = d.deliveryType === 'NO_BALL';
  const isConflict = d.status === 'CONFLICTED';
  const isVoided   = d.status === 'VOIDED';

  let bubbleBg = 'bg-[#0f1117] border-white/8';
  let dotColor = '#6b7280';
  let mainLabel = '';
  let mainColor = 'text-white';
  let badge: string | null = null;
  let badgeColor = '';

  if (isVoided)      { bubbleBg = 'bg-neutral-900/40 border-white/5'; mainColor = 'text-neutral-600'; }
  else if (isConflict){ bubbleBg = 'bg-orange-500/8 border-orange-500/25'; mainColor = 'text-white'; badge = 'Disputed'; badgeColor = 'text-orange-400 border-orange-500/40'; }
  else if (isW)       { bubbleBg = 'bg-red-500/10 border-red-500/20'; mainColor = 'text-red-300'; dotColor = '#ef4444'; }
  else if (isSix)     { bubbleBg = 'bg-amber-500/10 border-amber-500/20'; mainColor = 'text-amber-300'; dotColor = '#f59e0b'; }
  else if (isFour)    { bubbleBg = 'bg-blue-500/10 border-blue-500/20'; mainColor = 'text-blue-300'; dotColor = '#3b82f6'; }
  else if (isWide || isNB) { bubbleBg = 'bg-purple-500/8 border-purple-500/20'; mainColor = 'text-purple-300'; dotColor = '#a78bfa'; }

  if (isW) mainLabel = `🏏 WICKET — ${d.dismissalType?.replace('_',' ') ?? ''}`;
  else if (isSix)   mainLabel = '6 — SIX!';
  else if (isFour)  mainLabel = '4 — FOUR!';
  else if (isWide)  mainLabel = `Wide +${d.runs}`;
  else if (isNB)    mainLabel = `No Ball +${d.runs}`;
  else mainLabel = d.runs === 0 ? 'Dot ball' : `${d.runs} run${d.runs !== 1 ? 's' : ''}`;
  if (d.isBye) mainLabel += ' (Bye)';
  if (isVoided) mainLabel += ' — VOIDED';

  // Extract names
  const bowlerName = match ? [...(match.teamA?.members || []), ...(match.teamB?.members || [])].find((m: any) => m.playerId === d.bowlerId)?.player?.fullName : 'Bowler';
  const batsmanName = match ? [...(match.teamA?.members || []), ...(match.teamB?.members || [])].find((m: any) => m.playerId === d.strikerId)?.player?.fullName : 'Batsman';

  return (
    <div className={`flex items-end gap-2 animate-in slide-in-from-bottom-1 duration-200`}
      style={{ opacity: isVoided ? 0.45 : 1 }}>
      {/* Dot avatar */}
      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-2 text-[10px] font-black mb-0.5"
        style={{ background: dotColor + '22', borderColor: dotColor, color: dotColor }}>
        {isW ? 'W' : isSix ? '6' : isFour ? '4' : isWide ? 'Wd' : isNB ? 'Nb' : String(d.runs)}
      </div>
      {/* Bubble */}
      <div className={`flex-1 rounded-2xl rounded-bl-none px-3 py-2 border ${bubbleBg}`}>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs font-black leading-tight ${mainColor}`}>{mainLabel}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            {badge && (
              <span className={`text-[9px] font-black border px-1.5 py-0.5 rounded-md uppercase ${badgeColor}`}>{badge}</span>
            )}
            {isBowlingTeamView && !isConflict && !isVoided && (
               <button onClick={() => handleDispute(d)} disabled={disputingId === d.id}
                  className="flex items-center gap-1 px-2 py-0.5 rounded border border-white/10 bg-white/5 hover:bg-orange-500/20 hover:text-orange-400 hover:border-orange-500/30 text-neutral-500 text-[9px] font-black transition-all disabled:opacity-40">
                  {disputingId === d.id ? <Loader2 size={9} className="animate-spin" /> : <Flag size={9} />} Dispute
               </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-1 text-[10px]">
          <span className="text-neutral-300 font-bold max-w-[100px] truncate">{bowlerName}</span>
          <span className="text-neutral-600">to</span>
          <span className="text-neutral-300 font-bold max-w-[100px] truncate">{batsmanName}</span>
        </div>
        <p className="text-[9px] text-neutral-600 mt-0.5 font-bold">{stamp}{ts ? ` · ${ts}` : ''}</p>
      </div>
    </div>
  );
}

// ─── Bowling Live View (Feed + ACK + Tabs + More) ────────────────────────────
function BowlingLiveView({ delivery, innings, match, myTeamId, onConfirm, onDispute, onOpenLog, onPropose, onOpenDisputes }: any) {
  const [loading, setLoading] = useState(false);
  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  const allDeliveries: any[] = innings?.deliveries ?? [];
  const recentConfirmed = allDeliveries
    .filter((d: any) => ['CONFIRMED', 'CONFLICTED'].includes(d.status))
    .reverse();
  const conflicted = allDeliveries.filter((d: any) => d.status === 'CONFLICTED');

  const isMajor = (d: any) => d?.runs >= 4 || d?.deliveryType === 'NO_BALL' || d?.deliveryType === 'WIDE';

  const handleDispute = async (d: any) => {
    setDisputingId(d.id);
    await onDispute(d.id);
    setDisputingId(null);
  };

  const isFirstBall = allDeliveries.length === 0 && !delivery;

  return (
    <div className="border-t border-[#1a1d26] flex-1 flex flex-col min-h-0 bg-[#07080e] relative">
      {/* Header */}
      <div className="px-4 pt-2 pb-2 flex items-center justify-between border-b border-white/5">
        <p className="text-xs font-black uppercase tracking-widest text-neutral-500">Live Feed</p>
        <div className="flex items-center gap-3">
          <button onClick={onOpenDisputes}
             className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                 conflicted.length > 0
                   ? 'bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20'
                   : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10'
             }`}>
             Disputes
             {conflicted.length > 0 && (
               <span className="w-4 h-4 rounded-full bg-orange-500 text-black text-[8px] flex items-center justify-center font-black">{conflicted.length}</span>
             )}
          </button>
          <button onClick={() => onOpenLog?.()} className="flex items-center gap-1 text-[10px] text-neutral-600 hover:text-neutral-400 font-bold">
            <ScrollText size={11} /> Log
          </button>
        </div>
      </div>
          {/* Pending non-wicket delivery */}
          {delivery && !delivery.isWicket && (
            <div className="mx-4 mt-3 p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3 animate-in slide-in-from-top-2">
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
              <DeliveryDot d={delivery} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-blue-300">Incoming delivery</p>
                <p className="text-[10px] text-neutral-500 truncate">
                  {delivery.deliveryType === 'WIDE' ? 'Wide' : delivery.deliveryType === 'NO_BALL' ? 'No Ball' : 'Legal'} · {delivery.runs} run{delivery.runs !== 1 ? 's' : ''}
                </p>
              </div>
              {isMajor(delivery) && (
                <button onClick={() => handleDispute(delivery)} disabled={!!disputingId}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-black disabled:opacity-40">
                  <Flag size={10} /> Dispute
                </button>
              )}
            </div>
          )}

          <div ref={feedRef} className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
            {isFirstBall && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12 text-neutral-700">
                <div className="text-4xl">🏏</div>
                <p className="text-sm font-black">First ball incoming 🏏</p>
                <div className="w-2 h-2 rounded-full bg-neutral-800 animate-ping mt-1" />
              </div>
            )}
            {!isFirstBall && recentConfirmed.length === 0 && !delivery && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-8 text-neutral-700">
                <div className="w-3 h-3 rounded-full bg-neutral-800 animate-ping" />
                <p className="text-xs uppercase tracking-widest font-black">Feed Active. Awaiting Batting Scorer…</p>
              </div>
            )}
            {recentConfirmed.map((d: any, idx: number) => (
              <DeliveryBubble key={d.id} d={d} idx={idx} match={match} isBowlingTeamView={true} handleDispute={handleDispute} disputingId={disputingId} />
            ))}
          </div>
      {/* More button — bottom right corner */}
      <button onClick={() => setShowMoreMenu(true)}
        className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 border border-white/10 text-neutral-400 text-[11px] font-black hover:bg-neutral-800 transition-all shadow-lg">
        <MoreHorizontal size={14} /> More
      </button>

      {/* More menu sheet */}
      {showMoreMenu && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowMoreMenu(false)}>
          <div className="w-full bg-[#0f1117] rounded-t-3xl border-t border-[#1a1d26] p-6 flex flex-col gap-3 shadow-2xl"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUpSheet 0.25s ease-out' }}>
            <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-2" />
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest text-center mb-2">Match Controls</p>

            <button onClick={() => { setShowMoreMenu(false); onOpenLog?.(); }}
              className="flex items-center gap-3 w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <ScrollText size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="font-black text-sm text-white">Delivery Log</p>
                <p className="text-[10px] text-neutral-500">View full match history</p>
              </div>
            </button>

            <button onClick={() => { setShowMoreMenu(false); onPropose?.('pause_proposal'); }}
              className="flex items-center gap-3 w-full p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-left hover:bg-amber-500/10 transition-all">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Pause size={18} className="text-amber-400" />
              </div>
              <div>
                <p className="font-black text-sm text-white">Request Pause</p>
                <p className="text-[10px] text-neutral-500">Propose a match pause — opponent must agree</p>
              </div>
            </button>

            <button onClick={() => { setShowMoreMenu(false); onPropose?.('cancel_proposal'); }}
              className="flex items-center gap-3 w-full p-4 rounded-2xl bg-red-500/5 border border-red-500/20 text-left hover:bg-red-500/10 transition-all">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <XCircle size={18} className="text-red-400" />
              </div>
              <div>
                <p className="font-black text-sm text-white">Cancel Match</p>
                <p className="text-[10px] text-neutral-500">Propose cancellation — opponent must agree</p>
              </div>
            </button>

            <button onClick={() => setShowMoreMenu(false)} className="text-xs text-neutral-600 font-bold py-2 text-center mt-1">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Over Complete Modal ──────────────────────────────────────────────────────
function OverCompleteModal({ over, innings, match, myTeamId, isOMC, onConfirmOver, onSelectBowler }: any) {
  const [selectedBowlerId, setSelectedBowlerId] = useState('');
  const [loading, setLoading]                   = useState(false);

  const bowlingTeamId = innings?.bowlingTeamId;
  const isBowlingOMC  = isOMC && myTeamId === bowlingTeamId;
  const myConfirmed   = myTeamId === bowlingTeamId ? over?.confirmedByBowling : over?.confirmedByBatting;
  const bothConfirmed = over?.confirmedByBowling && over?.confirmedByBatting;

  const bowlingTeam = match.teamA_Id === bowlingTeamId ? match.teamA : match.teamB;

  // Get bowler max overs
  const sport = match.teamA.sportType;
  const agreedOvers = (match as any).agreedOvers ?? (sport === 'CRICKET_7' ? 7 : 20);
  const maxBowlerOvers = sport === 'CRICKET_7' ? 2 : Math.ceil(agreedOvers / 5);

  const strikerName = match.teamA.members.concat(match.teamB.members).find((m: any) => m.playerId === innings?.currentStrikerId)?.player?.fullName || 'Striker';
  const nonStrikerName = match.teamA.members.concat(match.teamB.members).find((m: any) => m.playerId === innings?.currentNonStrikerId)?.player?.fullName || 'Non-Striker';
  const bowlerName = match.teamA.members.concat(match.teamB.members).find((m: any) => m.playerId === over?.bowlerId)?.player?.fullName || 'Bowler';

  const strikerPerf = innings?.battingPerfs?.find((p: any) => p.playerId === innings?.currentStrikerId);
  const nonStrikerPerf = innings?.battingPerfs?.find((p: any) => p.playerId === innings?.currentNonStrikerId);
  const bowlerPerf = innings?.bowlingPerfs?.find((p: any) => p.playerId === over?.bowlerId);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end">
      <div className="w-full bg-[#0f1117] rounded-t-3xl border-t border-[#1a1d26] p-6 flex flex-col gap-4"
        style={{ animation: 'slideUpSheet 0.3s ease-out' }}>
        <style>{`@keyframes slideUpSheet { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        <div className="text-center">
          <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-black">Over {over?.overNumber} Complete</p>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-4">
            <div className="text-center">
              <p className="text-4xl font-black text-white">{over?.runs}</p>
              <p className="text-[9px] text-neutral-500 uppercase tracking-wider font-bold mt-1">Runs</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-black text-red-400">{over?.wickets}</p>
              <p className="text-[9px] text-neutral-500 uppercase tracking-wider font-bold mt-1">Wkts</p>
            </div>
            {over?.wides > 0 && (
              <div className="text-center">
                <p className="text-4xl font-black text-[#a78bfa]">{over.wides}</p>
                <p className="text-[9px] text-neutral-500 uppercase tracking-wider font-bold mt-1">Wides</p>
              </div>
            )}
            {over?.noBalls > 0 && (
              <div className="text-center">
                <p className="text-4xl font-black text-amber-500">{over.noBalls}</p>
                <p className="text-[9px] text-neutral-500 uppercase tracking-wider font-bold mt-1">No Balls</p>
              </div>
            )}
          </div>
        </div>

        {/* Current Players Status */}
        <div className="flex flex-col gap-2 my-2 bg-white/5 border border-white/10 rounded-2xl p-4">
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div className="flex-1 truncate pr-2">
              <p className="text-xs font-black text-white truncate">🏏 {strikerName} *</p>
            </div>
            <p className="text-xs font-black text-white text-right">{strikerPerf?.runs ?? 0} <span className="text-[10px] text-neutral-500 font-bold">({strikerPerf?.ballsFaced ?? 0})</span></p>
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-white/5">
            <div className="flex-1 truncate pr-2">
              <p className="text-xs font-bold text-neutral-400 truncate">🏏 {nonStrikerName}</p>
            </div>
            <p className="text-xs font-bold text-neutral-400 text-right">{nonStrikerPerf?.runs ?? 0} <span className="text-[10px] text-neutral-600 font-bold">({nonStrikerPerf?.ballsFaced ?? 0})</span></p>
          </div>
          <div className="flex justify-between items-center pt-1">
            <div className="flex-1 truncate pr-2">
              <p className="text-xs font-black text-[#3b82f6] truncate">⚾ {bowlerName}</p>
            </div>
            <p className="text-xs font-black text-[#3b82f6] text-right">
              {Math.floor((bowlerPerf?.legalBalls ?? 0)/6)}.{ (bowlerPerf?.legalBalls ?? 0)%6 } <span className="text-[10px] text-[#3b82f6]/60 font-bold">ov</span> · {bowlerPerf?.wickets ?? 0}/{bowlerPerf?.runs ?? 0}
            </p>
          </div>
        </div>

        {!myConfirmed && isOMC && (
          <button onClick={async () => { setLoading(true); await onConfirmOver(); setLoading(false); }}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-[#3b82f6] text-white font-black text-sm disabled:opacity-40">
            ✓ Confirm Over
          </button>
        )}
        {myConfirmed && !bothConfirmed && (
          <p className="text-center text-sm text-neutral-500 font-bold">✓ Waiting for opponent…</p>
        )}
        {bothConfirmed && isBowlingOMC && !innings?.currentBowlerId && (
          <div className="flex flex-col gap-2 mt-2">
            <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest text-center mb-1">Select Next Bowler</p>
            <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
              {bowlingTeam.members.map((m: any) => {
                const perf = innings?.bowlingPerfs?.find((p: any) => p.playerId === m.playerId);
                const overs = perf ? Math.floor(perf.legalBalls / 6) : 0;
                
                const isLastBowler = m.playerId === over?.bowlerId;
                const isQuotaMet   = overs >= maxBowlerOvers;
                const isDisabled   = isLastBowler || isQuotaMet;

                let statusText = `${overs}/${maxBowlerOvers} ov`;
                let statusColor = 'text-neutral-400 bg-white/5';

                if (isLastBowler) { statusText = 'Last Over'; statusColor = 'text-amber-500 bg-amber-500/10'; }
                else if (isQuotaMet) { statusText = 'Quota Met'; statusColor = 'text-red-400 bg-red-500/10'; }
                else if (selectedBowlerId === m.playerId) { statusColor = 'text-[#3b82f6] bg-[#3b82f6]/20'; }

                return (
              <MatchPlayerCard
                    key={m.playerId}
                    member={m}
                    onClick={() => !isDisabled && setSelectedBowlerId(m.playerId)}
                    isSelected={selectedBowlerId === m.playerId}
                    isDisabled={isDisabled}
                    statusText={statusText}
                    statusColor={statusColor}
                  />
                );
              })}
            </div>
            <button
              disabled={!selectedBowlerId || loading}
              onClick={async () => { setLoading(true); await onSelectBowler(selectedBowlerId); setLoading(false); }}
              className="w-full py-4 rounded-2xl bg-[#00ff41] text-black font-black text-sm disabled:opacity-40 mt-4 shadow-lg active:scale-95 transition-all">
              {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Start Next Over →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reusable SignOff Button ──────────────────────────────────────────────────
function SignOffButton({ onClick, label }: { onClick: () => void; label: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <button
      disabled={loading}
      onClick={async () => { setLoading(true); await onClick(); setLoading(false); }}
      className="w-full py-4 rounded-2xl bg-[#3b82f6] text-white font-black text-sm uppercase tracking-wide disabled:opacity-40 active:scale-95 transition-all">
      {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : label}
    </button>
  );
}

// ─── Match End Overlay ────────────────────────────────────────────────────────
function MatchEndOverlay({ result, rawMatchResult, match, myTeamId, isTeamA, onSignOff, onBack, alreadySigned }: any) {
  const [loading, setLoading] = useState(false);

  // If rawMatchResult is null, the match is NOT YET fully signed off by both parties.
  if (!rawMatchResult) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#07080e] flex flex-col items-center justify-center px-6 text-white" style={{ animation: 'fadeIn 0.5s ease-out' }}>
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }`}</style>
        
        <div className="text-5xl mb-4">🏁</div>
        <p className="text-3xl font-black mb-2 text-white text-center">Match Concluded</p>
        
        <div className="flex items-center gap-4 my-6 p-6 rounded-3xl bg-white/5 border border-white/10 shadow-2xl">
          <div className="flex flex-col items-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Innings 1</p>
            <p className="text-3xl font-black text-white">{result.innings1Runs}</p>
          </div>
          <div className="text-neutral-600 font-black text-2xl mx-2">VS</div>
          <div className="flex flex-col items-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Innings 2</p>
            <p className="text-3xl font-black text-white">{result.innings2Runs}</p>
          </div>
        </div>

        <p className="text-sm text-neutral-500 mb-8 text-center max-w-xs leading-relaxed">
          Both captains must sign off on the final scorecard to lock in the result and distribute MMR.
        </p>

        {!alreadySigned ? (
          <button onClick={async () => { setLoading(true); await onSignOff(); setLoading(false); }} disabled={loading}
            className="w-full max-w-xs py-4 rounded-2xl bg-[#3b82f6] text-white font-black text-sm active:scale-95 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin mx-auto" /> : '✓ Sign Off Match Result'}
          </button>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full max-w-xs p-5 rounded-2xl bg-[#00ff41]/5 border border-[#00ff41]/20">
            <div className="w-12 h-12 rounded-full bg-[#00ff41]/10 flex items-center justify-center text-2xl text-[#00ff41]">✓</div>
            <p className="text-sm font-black text-[#00ff41]">Signed Off</p>
            <p className="text-xs text-neutral-400 text-center">Waiting for opponent to confirm the result...</p>
          </div>
        )}
      </div>
    );
  }

  // If rawMatchResult EXISTS, both have signed off! Show the Animated Rank Modal!
  const myMmrChange   = isTeamA ? rawMatchResult.mmrChangeA : rawMatchResult.mmrChangeB;
  const iWon          = rawMatchResult.winnerId === myTeamId;
  const isDraw        = rawMatchResult.winnerId === null;
  const outcomeLabel  = isDraw ? 'Draw' : iWon ? 'Victory' : 'Defeat';
  const outcomeColor  = isDraw ? '#94a3b8' : iWon ? '#00ff41' : '#ef4444';
  const victoryString = rawMatchResult.victoryString;

  return (
    <div className="fixed inset-0 z-[500] bg-[#07080e]/98 backdrop-blur-3xl flex flex-col items-center justify-center px-6 text-white overflow-hidden">
      <style>{`
        @keyframes stamp { 0% { opacity: 0; transform: scale(3) rotate(-20deg); } 100% { opacity: 1; transform: scale(1) rotate(0deg); } }
        @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
        @keyframes glowPulse { 0% { box-shadow: 0 0 40px ${outcomeColor}40; } 50% { box-shadow: 0 0 80px ${outcomeColor}80; } 100% { box-shadow: 0 0 40px ${outcomeColor}40; } }
      `}</style>
      
      {/* Background ambient glow */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle at center, ${outcomeColor} 0%, transparent 70%)` }} />

      <div style={{ animation: 'stamp 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }} className="flex flex-col items-center relative z-10">
         <div className="text-[100px] leading-none mb-4" style={{ filter: `drop-shadow(0 0 20px ${outcomeColor}80)` }}>
           {isDraw ? '🤝' : iWon ? '🏆' : '💀'}
         </div>
         <h1 className="text-6xl font-black uppercase tracking-tighter" style={{ color: outcomeColor, textShadow: `0 0 40px ${outcomeColor}80` }}>
           {outcomeLabel}
         </h1>
         <p className="text-sm font-bold text-white mt-3 uppercase tracking-widest bg-white/10 px-4 py-1.5 rounded-full border border-white/20 backdrop-blur-md text-center max-w-[90%]">
           {victoryString}
         </p>
      </div>

      <div className="mt-16 mb-16 flex flex-col items-center relative z-10" style={{ animation: 'float 4s ease-in-out infinite' }}>
        <div className={`w-48 h-48 rounded-[2.5rem] border-4 flex flex-col items-center justify-center relative backdrop-blur-xl ${
          myMmrChange > 0 ? 'border-[#00ff41] bg-[#00ff41]/10 text-[#00ff41]' : myMmrChange < 0 ? 'border-red-500 bg-red-500/10 text-red-500' : 'border-[#3b82f6] bg-[#3b82f6]/10 text-[#3b82f6]'
        }`} style={{ animation: 'glowPulse 3s infinite' }}>
           <div className={`absolute -top-4 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#07080e] border-2 shadow-xl ${
             myMmrChange > 0 ? 'border-[#00ff41]' : myMmrChange < 0 ? 'border-red-500' : 'border-[#3b82f6]'
           }`}>MMR Updated</div>
           
           <span className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Rank Change</span>
           <span className="text-7xl font-black tracking-tighter">
             {myMmrChange > 0 ? `+${myMmrChange}` : myMmrChange === 0 ? `+${myMmrChange}` : `${myMmrChange}`}
           </span>
        </div>
        
        <p className="text-xs text-neutral-400 mt-6 font-bold max-w-[240px] text-center leading-relaxed">
          {myMmrChange > 0 ? 'Incredible performance! Your team rank and personal MMR has increased.' : myMmrChange < 0 ? 'Tough match. Your team rank and personal MMR has decreased.' : 'A hard-fought draw. MMR split equally among both teams.'}
        </p>
      </div>

      <button onClick={onBack} className="w-full max-w-xs py-4 rounded-2xl bg-white text-black font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] relative z-10">
        Proceed to Match History →
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CricketScoringPage() {
  const params  = useParams();
  const router  = useRouter();
  const matchId = params.matchId as string;
  const locale  = (params.locale as string) || 'en';
  const { showMatchResult } = useMatchResult();

  const battingFeedRef = useRef<HTMLDivElement>(null);

  const [state, setState]           = useState<any>(null);
  const [view, setView]             = useState<ViewState>('LOADING');
  const [msg, setMsg]               = useState('');
  const [pendingDelivery, setPendingDelivery] = useState<any>(null);
  const [completedOver, setCompletedOver]     = useState<any>(null);
  const [matchResult, setMatchResult]         = useState<any>(null);
  const [alreadySigned, setAlreadySigned]     = useState(false);
  const [showLog, setShowLog]                 = useState(false);
  const [showDisputesModal, setShowDisputesModal] = useState(false);
  const [matchProposal, setMatchProposal]     = useState<{ type: 'pause' | 'cancel' | 'dispute_denial' | 'super_over'; fromTeamId?: string; deliveryId?: string } | null>(null);
  // liveToss: set directly from COIN_FLIPPED WS event so both screens animate simultaneously
  const [liveToss, setLiveToss]               = useState<any>(null);

  const loadState = useCallback(async () => {
    try {
      const r = await fetch(`/api/cricket/${matchId}/state?t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) {
        const err = await r.json().catch(() => ({ error: `HTTP ${r.status}` }));
        setMsg(err.error ?? `HTTP ${r.status}`);
        setView('ACCESS_DENIED');
        return;
      }
      const d = await r.json();
      setState(d);

      const { match, currentInnings, innings, matchResult: apiMatchResult } = d;

      if (apiMatchResult) {
        setMatchResult(apiMatchResult);
        setView('MATCH_END');
        return;
      }

      if (!match.agreedOvers) {
        setView('OVERS_AGREEMENT');
      } else if (!match.cricketToss?.confirmedAt) {
        setView('TOSS_SETUP');
      } else if (!currentInnings || currentInnings.status === 'PENDING') {
        setView('INNINGS_SETUP');
      } else if (currentInnings.status === 'IN_PROGRESS') {
        const pending = currentInnings.deliveries?.find((d: any) => d.status === 'PENDING');
        setPendingDelivery(pending ?? null);

        const latestOver = currentInnings.overs?.[currentInnings.overs.length - 1];
        const overJustCompleted = latestOver && latestOver.status === 'CONFIRMED' && !currentInnings.currentBowlerId;

        if (overJustCompleted) {
          setCompletedOver(latestOver);
          setView('OVER_COMPLETE');
        } else {
          setCompletedOver(null);
          setView('LIVE_SCORING');
        }
      } else if (currentInnings.status === 'COMPLETED') {
        setView('INNINGS_SIGNOFF');
      } else if (currentInnings.status === 'SIGNED_OFF') {
        const isTie2ndInnings = innings.length === 2 && innings[1].totalRuns === (innings[0].totalRuns);
        const allDoneNormal = innings.every((i: any) => i.status === 'SIGNED_OFF') && innings.length === 2;
        const allDoneSuperOver = innings.every((i: any) => i.status === 'SIGNED_OFF') && innings.length === 4;

        if (allDoneNormal && isTie2ndInnings) setView('SUPER_OVER_PROMPT');
        else if (allDoneNormal || allDoneSuperOver) setView('MATCH_END');
        else setView('SECOND_INNINGS_SETUP');
      }
    } catch (e: any) {
      console.error('Cricket loadState error:', e);
      setMsg(e?.message ?? 'Failed to load match state. Tap refresh.');
      setView('ACCESS_DENIED');
    }
  }, [matchId]);

  useEffect(() => { loadState(); }, [loadState]);

  // Auto-scroll batting feed on any innings state change
  useEffect(() => {
    if (battingFeedRef.current) {
      battingFeedRef.current.scrollTop = battingFeedRef.current.scrollHeight;
    }
  }, [state?.innings]);

  // Auto-poll while in INNINGS_SETUP so both teams transition without manual refresh
  useEffect(() => {
    if (view !== 'INNINGS_SETUP' && view !== 'SECOND_INNINGS_SETUP') return;
    const iv = setInterval(() => loadState(), 2500);
    return () => clearInterval(iv);
  }, [view, loadState]);

  // WebSocket
  useEffect(() => {
    if (!matchId) return;
    const ch = subscribeToMatchChannel(matchId, ({ event, data }) => {
      // Full state reload events
      if (['DELIVERY_SUBMITTED', 'DELIVERY_CONFIRMED', 'DELIVERY_CONFLICTED', 'DELIVERY_ACKNOWLEDGED',
           'WICKET_FALLEN',
           'INNINGS_STARTED', 'INNINGS_COMPLETE', 'INNINGS_SIGNED_OFF', 'INNINGS_SIGNOFF_PARTIAL',
           'MATCH_SIGNOFF_PARTIAL',
           'TOSS_RECORDED', 'TOSS_CONFIRMED', 'OVERS_PROPOSED', 'OVERS_AGREED', 'COIN_FLIPPED',
           'BATTING_ORDER_SUBMITTED', 'OPENING_BOWLER_SELECTED', 'NEXT_OVER_STARTED',
           'STRIKERS_SWAPPED', 'OVER_CONFIRM_PARTIAL', 'OVER_CONFIRMED',
           'DISPUTE_RESOLVED', 'DISPUTE_DENIED',
           'TOSS_SKIP_PROPOSED', 'TOSS_SKIP_ACCEPTED'].includes(event)) {
        loadState();
      }

      // Instant coin animation on both screens — don't wait for loadState()
      if (event === 'COIN_FLIPPED' && data.toss) {
        setLiveToss(data.toss);
      }

      if (event === 'DELIVERY_SUBMITTED') setPendingDelivery(data.delivery);
      if (event === 'DELIVERY_CONFIRMED') setPendingDelivery(null);

      // Over complete
      if (event === 'OVER_COMPLETE') {
        setPendingDelivery(null);
        loadState();
      }

      if (event === 'MATCH_COMPLETE')     { setMatchResult(data); setView('MATCH_END'); }
      if (event === 'PAUSE_PROPOSED')  setMatchProposal({ type: 'pause',   fromTeamId: data.proposingTeamId });
      if (event === 'CANCEL_PROPOSED') setMatchProposal({ type: 'cancel',  fromTeamId: data.proposingTeamId });
      if (event === 'DISPUTE_DENIAL_PROPOSED') setMatchProposal({ type: 'dispute_denial', deliveryId: data.deliveryId });
      if (event === 'SUPER_OVER_PROPOSAL') setMatchProposal({ type: 'super_over', fromTeamId: data.fromTeamId });
      if (event === 'SUPER_OVER_STARTED') {
         setMatchProposal(null);
         loadState();
      }
      if (event === 'PAUSE_ACCEPTED')  { setMatchProposal(null); setMsg('⏸️ Match paused by mutual agreement.'); }
      if (event === 'PAUSE_DENIED')    { setMatchProposal(null); setMsg('Pause request denied. Match continues.'); }
      if (event === 'CANCEL_ACCEPTED') { setMatchProposal(null); setMsg('❌ Match cancelled by mutual agreement.'); }
      if (event === 'CANCEL_DENIED')   { setMatchProposal(null); setMsg('Cancel request denied. Match continues.'); }
    });
    return () => { ch?.unsubscribe?.(); };
  }, [matchId, loadState]);

  // ── Trigger global rank modal when match result lands ──────────────────────────
  // matchResult is set by both the WS MATCH_COMPLETE event and loadState()
  useEffect(() => {
    if (!matchResult || !state) return;
    const { match: m, myTeamId: tid, isTeamA: amA } = state;
    if (!m || !tid) return;

    const mmrDelta  = amA ? matchResult.mmrChangeA : matchResult.mmrChangeB;
    const sportType = m.teamA?.sportType ?? 'CRICKET_7';
    const myTeam    = amA ? m.teamA : m.teamB;
    const oppTeam   = amA ? m.teamB : m.teamA;
    const isCricketMatch = sportType.includes('CRICKET');
    const currentMmr = isCricketMatch
      ? (myTeam?.cricketMmr ?? myTeam?.teamMmr ?? 1000)
      : (myTeam?.footballMmr ?? myTeam?.teamMmr ?? 1000);

    const outcome: 'win' | 'loss' | 'draw' =
      matchResult.winnerId === null ? 'draw' :
      matchResult.winnerId === tid ? 'win' : 'loss';

    showMatchResult({
      outcome,
      sportType,
      victoryString : matchResult.victoryString ?? (outcome === 'draw' ? 'Match Tied — MMR Split Equally' : ''),
      myTeamName    : myTeam?.name ?? '',
      oppTeamName   : oppTeam?.name ?? '',
      myScore       : amA ? m.scoreA : m.scoreB,
      oppScore      : amA ? m.scoreB : m.scoreA,
      myWickets     : isCricketMatch ? (amA ? m.wicketsA : m.wicketsB) : null,
      oppWickets    : isCricketMatch ? (amA ? m.wicketsB : m.wicketsA) : null,
      myOvers       : isCricketMatch ? (amA ? m.oversA : m.oversB) : null,
      oppOvers      : isCricketMatch ? (amA ? m.oversB : m.oversA) : null,
      mmrDelta,
      currentMmr,
      matchId       : m.id,
    });
  }, [matchResult, state, showMatchResult]); // Include dependencies to ensure it's up to date

  // ── Error / denied first — before state null check ──────────────────────────
  if (view === 'ACCESS_DENIED') {
    return (
      <div className="min-h-[100dvh] bg-[#07080e] flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-black text-white mb-2">Cannot Load Match</h1>
        {msg && <p className="text-sm text-red-400 mb-3 font-bold">{msg}</p>}
        <p className="text-sm text-neutral-500 mb-6">You must be an OMC of one of the two teams, and the match must be LIVE.</p>
        <button onClick={loadState} className="px-6 py-3 rounded-2xl bg-[#3b82f6] text-white font-black text-sm mb-3">↻ Retry</button>
        <button onClick={() => router.push(`/${locale}/interact`)} className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-neutral-400 font-black text-sm">← Back</button>
      </div>
    );
  }

  if (view === 'LOADING' || !state) {
    return (
      <div className="min-h-[100dvh] bg-[#07080e] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#3b82f6]" />
      </div>
    );
  }

  const { match, myTeamId, isTeamA, isOMC, currentInnings, innings, agreedOvers } = state;

  // ── Actions ────────────────────────────────────────────────────────────────
  const post = async (url: string, body: any) => {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => null);
      if (!r.ok) { setMsg(d?.error || 'Server error occurred'); return null; }
      return d;
    } catch (e: any) {
      setMsg(e?.message || 'Network error');
      return null;
    }
  };
  const patch = async (url: string, body: any) => {
    try {
      const r = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => null);
      if (!r.ok) { setMsg(d?.error || 'Server error occurred'); return null; }
      return d;
    } catch (e: any) {
      setMsg(e?.message || 'Network error');
      return null;
    }
  };

  const handleTossAction = async (action: string, payload: any = {}) => {
    await post(`/api/cricket/${matchId}/toss`, { action, ...payload });
    loadState();
  };

  const handleOversAction = async (action: string, payload: any = {}) => {
    await post(`/api/cricket/${matchId}/toss`, { action, ...payload });
    loadState();
  };

  const handleInningsAction = async (action: string, payload: any) => {
    if (action === 'start_innings') {
      const inningsNum = innings.length === 0 ? 1 : 2;
      await post(`/api/cricket/${matchId}/innings`, { action: 'start', inningsNumber: inningsNum });
    } else {
      const inningsNum = innings.length === 0 ? 1 : 2;
      await post(`/api/cricket/${matchId}/innings`, { action, inningsNumber: inningsNum, ...payload });
    }
    loadState();
  };

  const handleSubmitDelivery = async (deliveryData: any) => {
    if (!currentInnings) return;
    const d = await post(`/api/cricket/${matchId}/innings/${currentInnings.id}/delivery`, deliveryData);
    if (d?.delivery?.status === 'PENDING') {
      setPendingDelivery(d.delivery);
    }
  };

  const handleConfirmDelivery = async (payload: any) => {
    if (!pendingDelivery) return;
    const d = await patch(`/api/cricket/${matchId}/delivery/${pendingDelivery.id}`, { action: 'confirm', ...payload });
    if (d) {
      setPendingDelivery(null);
      await loadState();
      if (d.inningsOver)  { setView('INNINGS_SIGNOFF'); }
    }
  };

  const handleDisputeDelivery = async (deliveryId?: string) => {
    const dId = deliveryId ?? pendingDelivery?.id;
    if (!dId) return;
    await patch(`/api/cricket/${matchId}/delivery/${dId}`, { action: 'dispute', reason: 'Bowling team disputed' });
    if (!deliveryId) setPendingDelivery(null);
    await loadState();
  };

  const handleResolveDispute = async (deliveryId: string) => {
    await patch(`/api/cricket/${matchId}/delivery/${deliveryId}`, { action: 'resolve_dispute' });
    await loadState();
  };

  const handleDenyDispute = async (deliveryId: string) => {
    await patch(`/api/cricket/${matchId}/delivery/${deliveryId}`, { action: 'propose_deny_dispute' });
    setMsg('Denial proposed. Waiting for bowling team to drop dispute.');
    await loadState();
  };

  const handleProposal = async (action: string) => {
    if (!currentInnings?.deliveries?.length) return;
    const lastDelivery = currentInnings.deliveries[currentInnings.deliveries.length - 1];
    await patch(`/api/cricket/${matchId}/delivery/${lastDelivery.id}`, { action });
  };

  const handleProposalResponse = async (action: string) => {
    if (!currentInnings?.deliveries?.length) return;
    const lastDelivery = currentInnings.deliveries[currentInnings.deliveries.length - 1];
    await patch(`/api/cricket/${matchId}/delivery/${lastDelivery.id}`, { action });
    setMatchProposal(null);
  };

  const handleConfirmOver = async () => {
    if (!completedOver) return;
    const d = await post(`/api/cricket/${matchId}/over/${completedOver.id}/confirm`, { action: 'confirm' });
    if (d?.bothConfirmed) loadState();
  };

  const handleSelectBowler = async (bowlerId: string) => {
    if (!completedOver) return;
    await post(`/api/cricket/${matchId}/over/${completedOver.id}/confirm`, { action: 'select_bowler', nextBowlerId: bowlerId });
    setCompletedOver(null);
    setView('LIVE_SCORING');
    loadState();
  };

  const handleInningsSignOff = async () => {
    if (!currentInnings) return;
    await post(`/api/cricket/${matchId}/innings/${currentInnings.id}/signoff`, {});
    await loadState();
  };

  // For 2nd innings: sign off innings then immediately also signal match signoff
  const handleFinishMatch = async () => {
    if (!currentInnings) return;
    await post(`/api/cricket/${matchId}/innings/${currentInnings.id}/signoff`, {});
    // Also submit match-level signoff (backend is idempotent)
    await post(`/api/cricket/${matchId}/signoff`, {});
    await loadState();
  };

  const handleMatchSignOff = async () => {
    const d = await post(`/api/cricket/${matchId}/signoff`, {});
    if (d?.bothSigned) { /* already handled by WS */ }
    else { setAlreadySigned(true); }
  };

  const handleSwapStrikers = async () => {
    if (!currentInnings || !isOMC) return;
    await post(`/api/cricket/${matchId}/innings/${currentInnings.id}/swap`, {});
  };

  const isBowlingTeam = currentInnings?.bowlingTeamId === myTeamId;
  const isBattingTeam = currentInnings?.battingTeamId === myTeamId;

  return (
    <div className="min-h-[100dvh] bg-[#07080e] text-white flex flex-col" style={{ position: 'fixed', inset: 0, zIndex: 100, overflow: 'hidden' }}>
      <style>{`
        @keyframes wicketFlash { 0%{transform:scale(1.4);background:#ef444466;} 100%{transform:scale(1);} }
        @keyframes sixPop     { 0%{transform:scale(1.3);color:#f59e0b;} 100%{transform:scale(1);} }
        @keyframes fourRipple { 0%{transform:scale(1.2);color:#3b82f6;} 100%{transform:scale(1);} }
      `}</style>

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#1a1d26]">
        <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">
          <ChevronLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse" />
          <span className="text-[11px] font-black text-[#3b82f6] uppercase tracking-widest">
            {view === 'TOSS_SETUP' || view === 'TOSS_PENDING_CONFIRM' ? 'Toss'
              : view === 'OVERS_AGREEMENT' ? 'Overs'
              : view === 'INNINGS_SETUP' || view === 'SECOND_INNINGS_SETUP' ? 'Setup'
              : view === 'INNINGS_SIGNOFF' ? 'Sign Off'
              : view === 'MATCH_END' ? 'Full Time'
              : 'Live 🏏'}
          </span>
        </div>
        <button onClick={loadState} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">
          <RotateCcw size={14} className="text-neutral-500" />
        </button>
      </div>

      {/* Scorecard (only during live scoring) */}
      {view === 'LIVE_SCORING' && currentInnings && (
        <ScorecardHeader innings={currentInnings} match={match} agreedOvers={agreedOvers} myTeamId={myTeamId} onSwap={isOMC ? handleSwapStrikers : undefined} allInnings={innings} />
      )}

      {/* Status message */}
      {msg && (
        <div className="shrink-0 mx-4 mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p className="text-xs font-bold text-amber-400">{msg}</p>
        </div>
      )}

      {/* View content */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

        {(view === 'TOSS_SETUP' || view === 'TOSS_PENDING_CONFIRM') && (
          <TossView
            match={match}
            myTeamId={myTeamId}
            isOMC={isOMC}
            toss={match.cricketToss}
            liveToss={liveToss}
            onAction={handleTossAction}
            msg={msg}
          />
        )}

        {view === 'OVERS_AGREEMENT' && (
          <OversAgreementView
            match={match}
            toss={match.cricketToss}
            isTeamA={myTeamId === match.teamA_Id}
            isOMC={isOMC}
            onAction={handleOversAction}
            msg={msg}
          />
        )}

        {(view === 'INNINGS_SETUP' || view === 'SECOND_INNINGS_SETUP') && (
          <InningsSetupView
            match={match}
            innings={(view === 'SECOND_INNINGS_SETUP' && currentInnings?.inningsNumber === 1) ? null : currentInnings}
            myTeamId={myTeamId}
            isOMC={isOMC}
            onAction={handleInningsAction}
            agreedOvers={agreedOvers}
            msg={msg}
          />
        )}

        {view === 'LIVE_SCORING' && currentInnings && (
          <>
            {/* ── BOWLING TEAM: BowlingLiveView is the entire flex-1 content (tabs+feed+more unified) ── */}
            {isBowlingTeam && isOMC && (
              <BowlingLiveView
                delivery={pendingDelivery}
                innings={currentInnings}
                match={match}
                myTeamId={myTeamId}
                onConfirm={() => handleConfirmDelivery({ action: 'acknowledge_wicket' })}
                onDispute={handleDisputeDelivery}
                onOpenLog={() => setShowLog(true)}
                onPropose={handleProposal}
                onOpenDisputes={() => setShowDisputesModal(true)}
              />
            )}

            {/* ── BATTING TEAM + OBSERVER ── */}
            {!isBowlingTeam && (
              <>
                {/* Tab bar / Header — batting scorer only */}
                {isBattingTeam && isOMC && (() => {
                  const conflicted = currentInnings.deliveries?.filter((d: any) => d.status === 'CONFLICTED') ?? [];
                  return (
                    <div className="px-4 pt-2 pb-0 flex gap-2 mb-2 items-center justify-between shrink-0">
                      <p className="text-xs font-black uppercase tracking-widest text-neutral-500">Live Feed</p>
                      <button onClick={() => setShowDisputesModal(true)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                           conflicted.length > 0
                             ? 'bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20'
                             : 'bg-white/5 text-neutral-400 border-white/10 hover:bg-white/10'
                        }`}>
                        Disputes
                        {conflicted.length > 0 && (
                          <span className="w-4 h-4 rounded-full bg-orange-500 text-black text-[8px] flex items-center justify-center font-black">{conflicted.length}</span>
                        )}
                      </button>
                    </div>
                  );
                })()}

                {/* Content area */}
                <div ref={battingFeedRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-2 flex flex-col gap-2 custom-scrollbar" style={{ overscrollBehavior: 'contain' }}>

                  {/* LIVE tab — per-delivery chat bubbles */}
                  {(() => {
                    const allD: any[] = currentInnings.deliveries ?? [];
                    const confirmed = allD.filter((d: any) => ['CONFIRMED','CONFLICTED','VOIDED'].includes(d.status));
                    if (confirmed.length === 0) return (
                      <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3 text-neutral-700">
                        <div className="text-4xl">🏏</div>
                        <p className="text-sm font-black">First ball incoming</p>
                        <div className="w-2 h-2 rounded-full bg-neutral-800 animate-ping" />
                      </div>
                    );
                    return (
                      <div className="flex flex-col gap-2 pb-2">
                        {confirmed.map((d: any, idx: number) => (
                          <DeliveryBubble key={d.id} d={d} idx={idx} match={match} isBowlingTeamView={false} />
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Input panel — batting team */}
                {isBattingTeam && isOMC && (
                  <ScoringActionPad
                    innings={currentInnings}
                    match={match}
                    myTeamId={myTeamId}
                    onSubmit={handleSubmitDelivery}
                    pendingDelivery={pendingDelivery}
                    onOpenLog={() => setShowLog(true)}
                    onPropose={handleProposal}
                  />
                )}
                {!isOMC && (
                  <div className="border-t border-[#1a1d26] px-4 py-3 text-center text-neutral-600 text-xs">
                    Observer view — scoring managed by OMC
                  </div>
                )}
              </>
            )}
          </>
        )}




        {view === 'INNINGS_SIGNOFF' && currentInnings && (() => {
          // Work out who has signed from signOffs array
          const signOffs = currentInnings.signOffs ?? [];
          const mySigned = signOffs.some((s: any) => s.teamId === myTeamId);
          const bothSigned = signOffs.length >= 2;
          // Any disputed deliveries?
          const conflicted = currentInnings.deliveries?.filter((d: any) => d.status === 'CONFLICTED') ?? [];

          return (
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
              <div className="text-center">
                <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Innings {currentInnings.inningsNumber} Complete</p>
                <p className="text-5xl font-black text-white mt-2">
                  {currentInnings.totalRuns}/{currentInnings.totalWickets}
                </p>
                <p className="text-sm text-neutral-500 mt-1">
                  {(() => { const lb = currentInnings.deliveries?.filter((d: any) => d.deliveryType === 'LEGAL').length ?? 0; return `${Math.floor(lb/6)}.${lb%6}`; })()} overs
                </p>
              </div>

              {/* Dispute warning */}
              {conflicted.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 flex items-start gap-3">
                  <span className="text-lg mt-0.5">⚠️</span>
                  <div>
                    <p className="text-sm font-black text-red-400">Disputed Deliveries</p>
                    <p className="text-xs text-neutral-400 mt-0.5">There {conflicted.length === 1 ? 'is' : 'are'} {conflicted.length} disputed {conflicted.length === 1 ? 'delivery' : 'deliveries'} that must be resolved before sign-off.</p>
                  </div>
                </div>
              )}

              {/* Batting scorecard */}
              <div className="bg-[#0f1117] rounded-3xl border border-[#1a1d26] p-4 shadow-xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#3b82f6] mb-3">🏏 Batting Scorecard</p>
                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/5 text-[9px] font-black text-neutral-500 uppercase tracking-widest">
                  <span className="flex-1">Batter</span>
                  <span className="w-8 text-right">R</span>
                  <span className="w-6 text-right">B</span>
                  <span className="w-6 text-right">4s</span>
                  <span className="w-6 text-right">6s</span>
                  <span className="w-12 text-right">SR</span>
                </div>
                {currentInnings.battingPerfs?.filter((p: any) => p.hasBatted || p.isOut).map((p: any) => {
                  const name = [...match.teamA.members, ...match.teamB.members].find((m: any) => m.playerId === p.playerId)?.player?.fullName ?? 'Unknown';
                  const sr = p.ballsFaced > 0 ? ((p.runs / p.ballsFaced) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={p.id} className="flex flex-col py-1.5 border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white flex-1 truncate">{name}</span>
                        <span className="text-sm font-black text-white w-8 text-right">{p.runs}</span>
                        <span className="text-xs text-neutral-400 w-6 text-right">{p.ballsFaced}</span>
                        <span className="text-xs text-neutral-500 w-6 text-right">{p.fours ?? 0}</span>
                        <span className="text-xs text-neutral-500 w-6 text-right">{p.sixes ?? 0}</span>
                        <span className="text-[10px] font-bold text-neutral-400 w-12 text-right">{sr}</span>
                      </div>
                      <div className="mt-0.5">
                        {p.isOut && <span className="text-[9px] text-[#ef4444] font-black uppercase tracking-widest">{p.dismissalType?.replace('_', ' ') ?? 'out'}</span>}
                        {!p.isOut && p.hasBatted && <span className="text-[9px] text-[#00ff41] font-black uppercase tracking-widest">not out</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bowling Scorecard */}
              <div className="bg-[#0f1117] rounded-3xl border border-[#1a1d26] p-4 shadow-xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#ef4444] mb-3">⚾ Bowling Scorecard</p>
                <div className="flex items-center gap-2 pb-2 mb-2 border-b border-white/5 text-[9px] font-black text-neutral-500 uppercase tracking-widest">
                  <span className="flex-1">Bowler</span>
                  <span className="w-8 text-right">O</span>
                  <span className="w-6 text-right">M</span>
                  <span className="w-6 text-right">R</span>
                  <span className="w-6 text-right">W</span>
                  <span className="w-12 text-right">Econ</span>
                </div>
                {currentInnings.bowlingPerfs?.filter((p: any) => p.legalBalls > 0 || p.runs > 0).map((p: any) => {
                  const name = [...match.teamA.members, ...match.teamB.members].find((m: any) => m.playerId === p.playerId)?.player?.fullName ?? 'Unknown';
                  const oversF = `${Math.floor(p.legalBalls / 6)}.${p.legalBalls % 6}`;
                  const econ = p.legalBalls > 0 ? (p.runs / (p.legalBalls / 6)).toFixed(1) : '0.0';
                  return (
                    <div key={p.id} className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
                      <span className="text-xs font-bold text-white flex-1 truncate">{name}</span>
                      <span className="text-xs font-black text-neutral-300 w-8 text-right">{oversF}</span>
                      <span className="text-xs text-neutral-500 w-6 text-right">{p.maidens ?? 0}</span>
                      <span className="text-sm font-black text-[#f59e0b] w-6 text-right">{p.runs}</span>
                      <span className="text-sm font-black text-[#ef4444] w-6 text-right">{p.wickets}</span>
                      <span className="text-[10px] font-bold text-neutral-400 w-12 text-right">{econ}</span>
                    </div>
                  );
                })}
              </div>

              {/* Sign-off action */}
              {isOMC && conflicted.length === 0 && !mySigned && (
                <SignOffButton
                  onClick={currentInnings.inningsNumber === 2 ? handleFinishMatch : handleInningsSignOff}
                  label={currentInnings.inningsNumber === 2 ? '🏆 Sign Off Match' : '➡️ Next Innings'}
                />
              )}
              {isOMC && mySigned && !bothSigned && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-12 h-12 rounded-full bg-[#00ff41]/10 border border-[#00ff41]/30 flex items-center justify-center text-2xl">✓</div>
                  <p className="text-sm font-black text-[#00ff41]">Signed Off</p>
                  <p className="text-xs text-neutral-500 text-center">{currentInnings.inningsNumber === 2 ? 'Waiting for the opponent to confirm the final result…' : 'Waiting for the opponent team captain to sign off the scorecard…'}</p>
                  <button onClick={loadState} className="text-xs text-neutral-600 underline mt-1">↻ Refresh</button>
                </div>
              )}
              {conflicted.length > 0 && isOMC && (
                <p className="text-center text-xs text-red-400 font-bold">Resolve all disputed deliveries to enable sign-off.</p>
              )}
            </div>
          );
        })()}

        {view === 'SUPER_OVER_PROMPT' && (
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6 animate-in zoom-in duration-300">
            <div className="text-6xl">⚖️</div>
            <div className="text-center">
              <h2 className="text-3xl font-black text-white">MATCH TIED</h2>
              <p className="text-sm text-neutral-400 mt-2">Both teams scored exactly {innings[0]?.totalRuns} runs.</p>
            </div>
            
            <div className="w-full flex flex-col gap-3 mt-4">
              <button onClick={() => setView('MATCH_END')}
                className="w-full py-4 rounded-2xl bg-white/10 border border-white/20 text-white font-black text-sm hover:bg-white/20 transition-all">
                🤝 Split MMR (Draw)
              </button>
              <button onClick={async () => {
                await patch(`/api/cricket/${matchId}/delivery/dummy`, { action: 'super_over_proposal' });
                setMsg('Proposed Super Over to opponent...');
              }}
                className="w-full py-4 rounded-2xl bg-[#00ff41] text-black font-black text-sm hover:opacity-90 shadow-[0_0_20px_rgba(0,255,65,0.2)] transition-all">
                ⚔️ Propose Super Over
              </button>
            </div>
          </div>
        )}

        {view === 'MATCH_END' && (
          <MatchEndOverlay
            result={matchResult ?? { winnerId: null, mmrChangeA: 0, mmrChangeB: 0, innings1Runs: innings?.[0]?.totalRuns ?? 0, innings2Runs: innings?.[1]?.totalRuns ?? 0, target: innings?.[0] ? innings[0].totalRuns + 1 : 0, victoryString: 'Match Tied' }}
            rawMatchResult={null}
            match={match}
            myTeamId={myTeamId}
            isTeamA={isTeamA}
            onSignOff={handleMatchSignOff}
            onBack={(dest?: string) => dest === 'arena'
              ? router.push(`/${locale}/interact`)
              : router.push(`/${locale}/matches/${matchId}/history`)
            }
            alreadySigned={alreadySigned}
          />
        )}
      </div>

      {/* Over Complete Modal */}
      {view === 'OVER_COMPLETE' && completedOver && (
        <OverCompleteModal
          over={completedOver}
          innings={currentInnings}
          match={match}
          myTeamId={myTeamId}
          isOMC={isOMC}
          onConfirmOver={handleConfirmOver}
          onSelectBowler={handleSelectBowler}
        />
      )}

      {/* ── Delivery Log Overlay (shared by both teams) ── */}
      {showLog && (
        <div className="fixed inset-0 z-[60] bg-[#07080e] flex flex-col" style={{ animation: 'slideUpSheet 0.25s ease-out' }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b border-white/5 bg-[#07080e]/90 backdrop-blur-md shrink-0">
            <button onClick={() => setShowLog(false)} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <X size={16} />
            </button>
            <div className="flex-1">
              <p className="font-black text-base">Match Delivery Log</p>
              <p className="text-[10px] text-neutral-500">All innings history</p>
            </div>
          </div>

          {/* Chat feed — oldest at top, newest at bottom, grouped by Innings */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-6 custom-scrollbar">
            {innings?.map((inn: any) => {
              const innTeam = match.teamA_Id === inn.battingTeamId ? match.teamA : match.teamB;
              if (!inn.deliveries || inn.deliveries.length === 0) return null;
              
              // Deliveries are reversed in backend so older is last. We want oldest at top.
              const sortedDeliveries = [...inn.deliveries].reverse();

              return (
                <div key={inn.id} className="flex flex-col gap-3 relative">
                  <div className="sticky top-0 z-10 py-2 bg-[#07080e]/95 backdrop-blur-md border-b border-white/5 mb-1 -mx-4 px-4 shadow-sm">
                    <p className="text-xs font-black text-[#3b82f6] uppercase tracking-widest">Innings {inn.inningsNumber} · {innTeam.name}</p>
                    <p className="text-[10px] text-neutral-500 font-bold">{inn.totalRuns}/{inn.totalWickets} ({inn.totalOvers} ov)</p>
                  </div>
                  {sortedDeliveries.map((d: any, idx: number) => (
                    <DeliveryBubble key={d.id} d={d} idx={idx} match={match} isBowlingTeamView={false} />
                  ))}
                </div>
              );
            })}
            
            {(!innings || innings.length === 0 || innings.every((i: any) => !i.deliveries || i.deliveries.length === 0)) && (
              <div className="flex-1 flex items-center justify-center py-16 text-neutral-700">
                <p className="text-sm font-bold">No deliveries yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Match Proposal Overlay (Pause / Cancel from opponent) ── */}
      {matchProposal && (matchProposal.type === 'pause' || matchProposal.type === 'cancel') && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center px-6">
          <div className="w-full max-w-sm bg-[#0f1117] border border-white/10 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl animate-in zoom-in duration-300">
            <div className="text-center">
              <div className="text-4xl mb-3">{matchProposal.type === 'pause' ? '⏸️' : '❌'}</div>
              <p className="text-xl font-black text-white">
                {matchProposal.type === 'pause' ? 'Pause Requested' : 'Cancel Requested'}
              </p>
              <p className="text-sm text-neutral-400 mt-1">
                The opposing team wants to {matchProposal.type === 'pause' ? 'pause' : 'cancel'} the match. Do you agree?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleProposalResponse(matchProposal.type === 'pause' ? 'accept_pause' : 'accept_cancel')}
                className="flex-1 py-3.5 rounded-2xl bg-[#00ff41] text-black font-black text-sm">
                ✓ Agree
              </button>
              <button
                onClick={() => handleProposalResponse(matchProposal.type === 'pause' ? 'deny_pause' : 'deny_cancel')}
                className="flex-1 py-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 font-black text-sm">
                ✕ Deny
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Super Over Proposal Overlay ── */}
      {matchProposal && matchProposal.type === 'super_over' && matchProposal.fromTeamId !== myTeamId && (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center px-6">
           <div className="w-full max-w-sm bg-[#0f1117] border border-[#00ff41]/30 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl animate-in zoom-in duration-300">
             <div className="text-center">
               <div className="text-4xl mb-3">⚔️</div>
               <p className="text-xl font-black text-white">Super Over Proposed</p>
               <p className="text-sm text-neutral-400 mt-1">
                 The opponent wants to settle the tie with a Super Over. Do you accept?
               </p>
             </div>
             <div className="flex flex-col gap-3">
               <button onClick={async () => {
                   await fetch(`/api/cricket/${matchId}/super-over`, { method: 'POST', body: JSON.stringify({ action: 'accept' }) });
                   setMatchProposal(null);
               }} className="w-full py-3.5 rounded-2xl bg-[#00ff41] text-black font-black text-sm shadow-[0_0_15px_rgba(0,255,65,0.2)]">
                 ✓ Accept (Play Super Over)
               </button>
               <button onClick={() => {
                   setMatchProposal(null);
                   setView('MATCH_END'); // Deny defaults back to split MMR draw state
               }} className="w-full py-3.5 rounded-2xl bg-neutral-800 text-neutral-400 font-black text-sm hover:bg-neutral-700">
                 ✕ Deny (Split MMR)
               </button>
             </div>
           </div>
        </div>
      )}

      {/* ── Dispute Denial Overlay (For Bowling Team) ── */}
      {matchProposal && matchProposal.type === 'dispute_denial' && isBowlingTeam && (
        <div className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center px-6">
           <div className="w-full max-w-sm bg-[#0f1117] border border-orange-500/30 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl animate-in zoom-in duration-300">
             <div className="text-center">
               <div className="text-4xl mb-3">⚠️</div>
               <p className="text-xl font-black text-white">Dispute Rejected</p>
               <p className="text-sm text-neutral-400 mt-1">
                 The batting team denied your dispute. Do you agree to drop it and keep the score?
               </p>
             </div>
             <div className="flex flex-col gap-3">
               <button onClick={() => {
                   patch(`/api/cricket/${matchId}/delivery/${matchProposal.deliveryId}`, { action: 'deny_dispute' });
                   setMatchProposal(null);
               }} className="w-full py-3.5 rounded-2xl bg-[#00ff41] text-black font-black text-sm">
                 ✓ Drop Dispute (Agree)
               </button>
               <button onClick={() => {
                   setMatchProposal(null);
               }} className="w-full py-3.5 rounded-2xl bg-neutral-800 text-neutral-400 font-black text-sm hover:bg-neutral-700">
                 ✕ Force Dispute (Keep Active)
               </button>
             </div>
           </div>
        </div>
      )}
      {/* GLOBAL DISPUTES SIDE DRAWER */}
      {showDisputesModal && (() => {
         const conflicted = currentInnings?.deliveries?.filter((d: any) => d.status === 'CONFLICTED') ?? [];
         return (
          <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm" onClick={() => setShowDisputesModal(false)}>
            <div className="w-[85%] max-w-sm h-full bg-[#0f1117] border-l border-[#1a1d26] shadow-2xl animate-in slide-in-from-right duration-200 flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/20">
                <h3 className="font-black text-white text-lg flex items-center gap-2">
                  <Flag size={16} className="text-orange-500" /> Active Disputes
                </h3>
                <button onClick={() => setShowDisputesModal(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white transition-all">
                  ✕
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
                {conflicted.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3 text-neutral-700">
                    <Flag size={28} />
                    <p className="text-sm font-bold">No active disputes</p>
                    <p className="text-[10px] text-center text-neutral-500 mt-2 px-4">Bowling team can flag deliveries they believe are incorrect.</p>
                  </div>
                ) : conflicted.map((d: any) => {
                  const overLabel = `Ball ${Math.floor((d.ballNumber ?? 0) / 6)}.${(d.ballNumber ?? 0) % 6}`;
                  return (
                    <div key={d.id} className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex flex-col gap-2 animate-in slide-in-from-right-4">
                      <div className="flex items-center gap-2">
                        <DeliveryDot d={d} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-white truncate">
                            {d.deliveryType === 'WIDE' ? 'Wide' : d.deliveryType === 'NO_BALL' ? 'No Ball' : 'Legal'}
                            {d.isWicket ? ' · 🏏 Wicket' : ` · ${d.runs} run${d.runs !== 1 ? 's' : ''}`}
                          </p>
                          <p className="text-[10px] text-neutral-500 truncate">{overLabel} · Disputed by bowling team</p>
                        </div>
                      </div>
                      
                      {isBattingTeam && isOMC ? (
                        <div className="flex flex-col gap-2 mt-2">
                          <button onClick={() => handleResolveDispute(d.id)}
                            className="w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-black text-xs hover:bg-red-500/20 transition-all">
                            🗑️ Void Delivery
                          </button>
                          <button onClick={() => { handleResolveDispute(d.id); setShowDisputesModal(false); }}
                            className="w-full py-2.5 rounded-xl bg-[#00ff41]/10 border border-[#00ff41]/30 text-[#00ff41] font-black text-xs hover:bg-[#00ff41]/20 transition-all">
                            📝 Log Correct Score
                          </button>
                          <button onClick={() => handleDenyDispute(d.id)}
                            className="w-full mt-1 py-1.5 text-neutral-500 font-black text-[10px] hover:text-white transition-all underline decoration-neutral-500/30">
                            Deny Dispute
                          </button>
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center justify-center py-1.5 bg-orange-500/20 rounded-xl">
                           <span className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Awaiting Batting Team</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
         );
      })()}
    </div>
  );
}
