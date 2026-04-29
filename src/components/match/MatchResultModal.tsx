'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMatchResult } from '@/context/MatchResultContext';
import { getRankData } from '@/lib/rankUtils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sportLabel(sportType: string): string {
  if (sportType === 'FUTSAL_5')      return '5-a-side Futsal';
  if (sportType === 'FUTSAL_6')      return '6-a-side Futsal';
  if (sportType === 'FUTSAL_7')      return '7-a-side Futsal';
  if (sportType === 'CRICKET_7')     return '7-a-side Cricket';
  if (sportType === 'CRICKET_FULL')  return 'Cricket';
  if (sportType === 'FOOTBALL_FULL') return 'Football';
  return sportType;
}

function sportEmoji(sportType: string): string {
  if (sportType?.includes('CRICKET')) return '🏏';
  return '⚽';
}

function isCricket(sportType: string): boolean {
  return sportType?.includes('CRICKET');
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MatchResultModal() {
  const { result, clearResult } = useMatchResult();
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string || 'en';

  const handleDismiss = () => {
    clearResult();
    router.push(`/${locale}/arena?tab=history`);
  };

  // Animation phases: 'hidden' | 'stamp' | 'stats' | 'mmr' | 'visible'
  const [phase,     setPhase]     = useState<'hidden'|'stamp'|'stats'|'mmr'>('hidden');
  const [animMMR,   setAnimMMR]   = useState(0);
  const [animWidth, setAnimWidth] = useState(0);
  const [countdown, setCountdown] = useState(15);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Phase sequencing
  useEffect(() => {
    if (!result) { setPhase('hidden'); return; }
    setPhase('stamp');
    const t1 = setTimeout(() => setPhase('stats'), 700);
    const t2 = setTimeout(() => setPhase('mmr'),   1300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [result]);

  // MMR counter animation
  useEffect(() => {
    if (!result || phase !== 'mmr') return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    const newMmr = result.currentMmr;
    const delta  = result.mmrDelta;
    const oldMmr = newMmr - delta;
    const sign   = delta >= 0 ? 1 : -1;
    const target = Math.abs(delta);

    setAnimMMR(oldMmr);
    const ir = getRankData(oldMmr);
    setAnimWidth(Math.min(100, Math.max(0, ((oldMmr - ir.min) / (ir.next - ir.min)) * 100)));

    if (target === 0) { setAnimMMR(newMmr); return; }

    let cur = 0;
    const step = Math.max(1, Math.ceil(target / 50));
    intervalRef.current = setInterval(() => {
      cur = Math.min(cur + step, target);
      const dyn  = oldMmr + sign * cur;
      setAnimMMR(dyn);
      const dynR = getRankData(dyn);
      setAnimWidth(Math.min(100, Math.max(0, ((dyn - dynR.min) / (dynR.next - dynR.min)) * 100)));
      if (cur >= target && intervalRef.current) clearInterval(intervalRef.current);
    }, 30);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [result, phase]);

  // Countdown auto-dismiss (only starts when fully visible = phase mmr)
  useEffect(() => {
    if (!result || phase !== 'mmr') { setCountdown(15); return; }
    setCountdown(15);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { handleDismiss(); return 15; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [result, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!result || phase === 'hidden') return null;

  // ── Derived values ───────────────────────────────────────────────────────────
  const { outcome, sportType, victoryString,
          myTeamName, oppTeamName, myScore, oppScore,
          myWickets, oppWickets, myOvers, oppOvers,
          mmrDelta, currentMmr, } = result;

  const isWin  = outcome === 'win';
  const isDraw = outcome === 'draw';

  const outcomeLabel = isDraw ? 'DRAW' : isWin ? 'VICTORY' : 'DEFEAT';
  const outcomeColor = isDraw ? '#3b82f6' : isWin ? '#00ff41' : '#ef4444';
  const outcomeMuted = isDraw ? 'rgba(59,130,246,0.15)' : isWin ? 'rgba(0,255,65,0.12)' : 'rgba(239,68,68,0.12)';
  const outcomeGlow  = isDraw ? 'rgba(59,130,246,0.5)' : isWin ? 'rgba(0,255,65,0.5)' : 'rgba(239,68,68,0.5)';
  const outcomeEmoji = isDraw ? '🤝' : isWin ? '🏆' : '💀';

  const cricket     = isCricket(sportType);
  const dynRank     = getRankData(animMMR);
  const rankColor   = dynRank.color;

  return (
    <>
      {/* ── CSS Keyframes ─────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes bmt-stamp {
          0%   { opacity:0; transform: scale(3.5) rotate(-15deg); filter: blur(4px); }
          60%  { transform: scale(0.92) rotate(2deg); }
          100% { opacity:1; transform: scale(1) rotate(0deg); filter: blur(0); }
        }
        @keyframes bmt-slide-up {
          from { opacity:0; transform: translateY(60px); }
          to   { opacity:1; transform: translateY(0); }
        }
        @keyframes bmt-fade-in {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes bmt-float {
          0%,100% { transform: translateY(0px); }
          50%     { transform: translateY(-8px); }
        }
        @keyframes bmt-glow-pulse {
          0%,100% { box-shadow: 0 0 30px ${outcomeGlow}, 0 0 60px ${outcomeMuted}; }
          50%     { box-shadow: 0 0 60px ${outcomeGlow}, 0 0 120px ${outcomeMuted}; }
        }
        @keyframes bmt-rank-glow {
          0%,100% { box-shadow: 0 0 20px rgba(${dynRank.glow},0.4), 0 0 40px rgba(${dynRank.glow},0.2); }
          50%     { box-shadow: 0 0 40px rgba(${dynRank.glow},0.7), 0 0 80px rgba(${dynRank.glow},0.3); }
        }
        @keyframes bmt-bar-fill {
          from { width: 0%; }
        }
        @keyframes bmt-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      {/* ── Full-screen overlay ───────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-between py-10 px-6 overflow-hidden"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${outcomeMuted} 0%, #07080e 55%), #07080e`,
          animation: 'bmt-fade-in 0.3s ease-out forwards',
        }}
      >
        {/* ── Background ambient particles ────────────────────────────────────── */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl"
            style={{ background: outcomeColor }} />
        </div>

        {/* ── Sport label ─────────────────────────────────────────────────────── */}
        <div className="relative z-10 flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md"
          style={{ animation: 'bmt-fade-in 0.5s ease-out 0.2s both' }}>
          <span className="text-base">{sportEmoji(sportType)}</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{sportLabel(sportType)}</span>
        </div>

        {/* ── Phase 1: Outcome Stamp ───────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col items-center"
          style={{ animation: 'bmt-stamp 0.65s cubic-bezier(0.175,0.885,0.32,1.275) forwards' }}>
          <div className="text-[88px] leading-none mb-3"
            style={{ filter: `drop-shadow(0 0 24px ${outcomeColor}80)` }}>
            {outcomeEmoji}
          </div>
          <h1 className="text-[56px] font-black uppercase tracking-tighter leading-none"
            style={{ color: outcomeColor, textShadow: `0 0 40px ${outcomeColor}90` }}>
            {outcomeLabel}
          </h1>
          <p className="text-[11px] font-bold text-white/70 mt-3 uppercase tracking-widest bg-white/8 px-4 py-1.5 rounded-full border border-white/15 backdrop-blur-md text-center max-w-[85vw]">
            {victoryString}
          </p>
        </div>

        {/* ── Phase 2: Score Card ──────────────────────────────────────────────── */}
        <div className="relative z-10 w-full max-w-xs"
          style={{ animation: phase === 'stats' || phase === 'mmr' ? 'bmt-slide-up 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none', opacity: phase === 'stamp' ? 0 : 1 }}>
          <div className="rounded-2xl border border-white/10 overflow-hidden backdrop-blur-xl"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            {/* Score row */}
            <div className="flex items-stretch">
              {/* My team */}
              <div className="flex-1 flex flex-col items-center justify-center py-5 px-4"
                style={{ background: isWin ? 'rgba(0,255,65,0.06)' : isDraw ? 'rgba(59,130,246,0.06)' : 'rgba(239,68,68,0.06)' }}>
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1 truncate max-w-[100px] text-center">{myTeamName}</p>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-4xl font-black text-white">{myScore}</span>
                  {cricket && myWickets != null && <span className="text-xl font-bold text-white/40">/{myWickets}</span>}
                </div>
                {cricket && myOvers != null && <p className="text-[9px] text-white/30 font-bold mt-1 uppercase tracking-wider">({myOvers} Ovs)</p>}
              </div>
              {/* Divider */}
              <div className="flex items-center justify-center px-3 border-l border-r border-white/8">
                <span className="text-white/20 font-black text-sm">VS</span>
              </div>
              {/* Opp team */}
              <div className="flex-1 flex flex-col items-center justify-center py-5 px-4 bg-white/2">
                <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-1 truncate max-w-[100px] text-center">{oppTeamName}</p>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-4xl font-black text-white">{oppScore}</span>
                  {cricket && oppWickets != null && <span className="text-xl font-bold text-white/40">/{oppWickets}</span>}
                </div>
                {cricket && oppOvers != null && <p className="text-[9px] text-white/30 font-bold mt-1 uppercase tracking-wider">({oppOvers} Ovs)</p>}
              </div>
            </div>
          </div>
        </div>

        {/* ── Phase 3: MMR + Rank Badge ─────────────────────────────────────────── */}
        <div className="relative z-10 w-full max-w-xs"
          style={{ animation: phase === 'mmr' ? 'bmt-slide-up 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards' : 'none', opacity: phase === 'mmr' ? 1 : 0 }}>

          {/* MMR Delta pill */}
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 px-5 py-2 rounded-full border"
              style={{
                background: `rgba(${mmrDelta > 0 ? '0,255,65' : mmrDelta < 0 ? '239,68,68' : '59,130,246'},0.12)`,
                borderColor: `rgba(${mmrDelta > 0 ? '0,255,65' : mmrDelta < 0 ? '239,68,68' : '59,130,246'},0.35)`,
              }}>
              <span className="text-2xl font-black"
                style={{ color: mmrDelta > 0 ? '#00ff41' : mmrDelta < 0 ? '#ef4444' : '#3b82f6' }}>
                {mmrDelta > 0 ? `+${mmrDelta}` : mmrDelta}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">MMR</span>
            </div>
          </div>

          {/* Rank badge card */}
          <div className="rounded-2xl border border-white/10 p-4 backdrop-blur-xl flex items-center gap-4"
            style={{ background: 'rgba(255,255,255,0.04)', animation: phase === 'mmr' ? 'bmt-float 4s ease-in-out infinite' : 'none' }}>
            {/* Badge icon with glow */}
            <div className="relative shrink-0 w-16 h-16 rounded-xl flex items-center justify-center"
              style={{
                background: `rgba(${dynRank.glow},0.1)`,
                border: `2px solid rgba(${dynRank.glow},0.35)`,
                animation: phase === 'mmr' ? 'bmt-rank-glow 3s ease-in-out infinite' : 'none',
              }}>
              <img src={dynRank.icon} alt={dynRank.label} className="w-10 h-10 object-contain" />
            </div>

            {/* MMR info */}
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color: rankColor }}>{dynRank.label}</p>
              <p className="text-2xl font-black text-white leading-none">
                {Math.floor(animMMR)} <span className="text-xs text-white/30 font-bold">MMR</span>
              </p>
              {/* Progress bar within tier */}
              <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-100"
                  style={{
                    width: `${animWidth}%`,
                    background: `linear-gradient(90deg, ${rankColor}80, ${rankColor})`,
                    boxShadow: `0 0 8px ${rankColor}80`,
                  }} />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[8px] text-white/20 font-bold">{dynRank.min}</span>
                <span className="text-[8px] text-white/20 font-bold">{dynRank.next > 9000 ? '∞' : dynRank.next}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Dismiss button + countdown ─────────────────────────────────────────── */}
        <div className="relative z-10 w-full max-w-xs flex flex-col items-center gap-3"
          style={{ animation: phase === 'mmr' ? 'bmt-fade-in 0.5s ease-out 0.3s both' : 'none', opacity: phase === 'mmr' ? 1 : 0 }}>

          {/* Countdown bar */}
          <div className="w-full h-0.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-white/30 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / 15) * 100}%` }} />
          </div>

          <button
            onClick={handleDismiss}
            className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${outcomeColor}22, ${outcomeColor}11)`,
              border: `1.5px solid ${outcomeColor}40`,
              color: outcomeColor,
            }}>
            Got it →
          </button>
        </div>
      </div>
    </>
  );
}
