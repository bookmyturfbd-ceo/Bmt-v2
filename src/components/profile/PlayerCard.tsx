'use client';

import { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Lock, RefreshCw } from 'lucide-react';
import type { PlayerFacets } from '@/lib/playerFacets';
import type { RankData } from '@/lib/rankUtils';
import { FacetRadar } from './FacetRadar';

// ─── Position labels ──────────────────────────────────────────────────────────
const POSITION_LABELS: Record<string, { football: string; futsal: string }> = {
  GK:  { football: 'GK',  futsal: 'Goleiro' },
  DEF: { football: 'DEF', futsal: 'Fixo' },
  MID: { football: 'MID', futsal: 'Ala' },
  FWD: { football: 'FWD', futsal: 'Pivô' },
};

// Base background colors corresponding to card tiers
function getBaseColor(tier: string) {
  switch (tier) {
    case 'Bronze': return '#1a0e06';
    case 'Silver': return '#111111';
    case 'Gold': return '#0f0d00';
    case 'Platinum': return '#000d10';
    case 'Legend': return '#0d000d';
    default: return '#0b100c';
  }
}

// ─── Card tier styles (token-based, no hardcoded hex) ────────────────────────
function getCardStyle(tier: string) {
  const baseBgColor = getBaseColor(tier);
  switch (tier) {
    case 'Bronze':
      return {
        baseBgColor,
        bg: `linear-gradient(145deg, #2a1a0a 0%, #3d2510 40%, ${baseBgColor} 100%)`,
        border: '1px solid rgba(205,127,50,0.4)',
        shine: 'rgba(205,127,50,0.12)',
        textColor: '#cd7f32',
        nameBg: 'rgba(205,127,50,0.12)',
      };
    case 'Silver':
      return {
        baseBgColor,
        bg: `linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 40%, ${baseBgColor} 100%)`,
        border: '1px solid rgba(192,192,192,0.4)',
        shine: 'rgba(192,192,192,0.1)',
        textColor: '#c0c0c0',
        nameBg: 'rgba(192,192,192,0.08)',
      };
    case 'Gold':
      return {
        baseBgColor,
        bg: `linear-gradient(145deg, #1a1400 0%, #2d2400 40%, ${baseBgColor} 100%)`,
        border: '1px solid rgba(255,215,0,0.4)',
        shine: 'rgba(255,215,0,0.15)',
        textColor: '#ffd700',
        nameBg: 'rgba(255,215,0,0.10)',
      };
    case 'Platinum':
      return {
        baseBgColor,
        bg: `linear-gradient(145deg, #001a1f 0%, #002530 40%, ${baseBgColor} 100%)`,
        border: '1px solid rgba(0,229,255,0.4)',
        shine: 'rgba(0,229,255,0.12)',
        textColor: '#00e5ff',
        nameBg: 'rgba(0,229,255,0.08)',
      };
    case 'Legend':
      return {
        baseBgColor,
        bg: `linear-gradient(145deg, #1a001a 0%, #280028 40%, ${baseBgColor} 100%)`,
        border: '1px solid rgba(255,0,255,0.4)',
        shine: 'rgba(255,0,255,0.18)',
        textColor: '#ff00ff',
        nameBg: 'rgba(255,0,255,0.10)',
      };
    default: // Calibrating/Locked state
      return {
        baseBgColor: '#0b100c',
        bg: 'linear-gradient(145deg, #121914 0%, #0b100c 45%, #050705 100%)',
        border: '1px solid rgba(0, 255, 65, 0.25)',
        shine: 'rgba(0, 255, 65, 0.08)',
        textColor: '#00ff41',
        nameBg: 'rgba(0, 255, 65, 0.06)',
      };
  }
}

interface PlayerCardProps {
  player: {
    fullName: string;
    playerCode?: string | null;
    avatarUrl?: string | null;
    position?: string | null;
    footballMmr: number;
    cricketMmr: number;
  };
  facets: PlayerFacets;
  rankData: RankData;
  sport: 'football' | 'cricket';
  teamLogoUrl?: string | null;
  isFutsal?: boolean;
  isProvisional?: boolean;
}

export function PlayerCard({
  player,
  facets,
  rankData,
  sport,
  teamLogoUrl,
  isFutsal = false,
  isProvisional = false,
}: PlayerCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [shouldWobble, setShouldWobble] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D tilt on mouse/touch
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 150, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(springY, [-0.5, 0.5], ['8deg', '-8deg']);
  const rotateY = useTransform(springX, [-0.5, 0.5], ['-8deg', '8deg']);

  // Gentle wobble on first view hint
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasSeenFlip = localStorage.getItem('bmt_profile_has_seen_flip');
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!hasSeenFlip && !prefersReduced) {
        setShouldWobble(true);
        localStorage.setItem('bmt_profile_has_seen_flip', 'true');
        const t = setTimeout(() => setShouldWobble(false), 2000);
        return () => clearTimeout(t);
      }
    }
  }, []);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }
  function handleMouseLeave() {
    mouseX.set(0);
    mouseY.set(0);
  }

  const style = getCardStyle(isProvisional ? '' : rankData.tier);
  const positionLabel = player.position
    ? (isFutsal
        ? POSITION_LABELS[player.position]?.futsal
        : POSITION_LABELS[player.position]?.football) ?? player.position
    : 'GK';

  // Facet rows for display
  const footballFacets = [
    { abbr: 'ATT', val: facets.ATT, label: 'Attack' },
    { abbr: 'FRM', val: facets.FRM, label: 'Form' },
    { abbr: 'PLY', val: facets.PLY, label: 'Playmaking' },
    { abbr: 'WIN', val: facets.WIN, label: 'Win Rate' },
    { abbr: 'REL', val: facets.REL, label: 'Reliability' },
    { abbr: 'EXP', val: facets.EXP, label: 'Experience' },
  ];
  const cricketFacets = [
    { abbr: 'BAT', val: facets.ATT, label: 'Batting' },
    { abbr: 'FRM', val: facets.FRM, label: 'Form' },
    { abbr: 'BWL', val: facets.PLY, label: 'Bowling' },
    { abbr: 'WIN', val: facets.WIN, label: 'Win Rate' },
    { abbr: 'REL', val: facets.REL, label: 'Reliability' },
    { abbr: 'EXP', val: facets.EXP, label: 'Experience' },
  ];
  const displayFacets = sport === 'cricket' ? cricketFacets : footballFacets;
  const leftCol = displayFacets.slice(0, 3);
  const rightCol = displayFacets.slice(3);

  const placementCount = Math.min(3, facets.matchCount || 0);

  return (
    <div
      className="perspective-1000 w-full select-none"
      style={{ perspective: '1000px' }}
    >
      <motion.div
        ref={cardRef}
        className="relative w-full cursor-pointer animate-wobble subpixel-antialiased"
        style={{
          rotateX: flipped ? '0deg' : rotateX,
          rotateY: flipped ? '180deg' : rotateY,
          transformStyle: 'preserve-3d',
          transition: flipped ? 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)' : undefined,
          aspectRatio: '2/3',
        }}
        animate={shouldWobble ? {
          rotateY: [0, -12, 8, -4, 0],
          rotateX: [0, 4, -3, 1, 0],
        } : undefined}
        transition={shouldWobble ? {
          duration: 1.6,
          ease: "easeInOut"
        } : undefined}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => setFlipped(f => !f)}
        whileTap={{ scale: 0.98 }}
      >
        {/* ── Card Front ─────────────────────────────────────────────────── */}
        <div
          className="absolute inset-0 rounded-3xl overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] flex flex-col justify-between subpixel-antialiased"
          style={{
            background: style.bg,
            border: style.border,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'translateZ(1px)',
            WebkitFontSmoothing: 'subpixel-antialiased',
          }}
        >
          {/* Card sheen sweeps */}
          {isProvisional ? (
            <motion.div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                background: 'linear-gradient(105deg, transparent 35%, rgba(0,255,65,0.06) 50%, transparent 65%)',
                backgroundSize: '200% 100%',
              }}
              animate={{ backgroundPosition: ['150% 0', '-150% 0'] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
            />
          ) : rankData.tier === 'Legend' ? (
            <motion.div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                background: 'linear-gradient(105deg, transparent 35%, rgba(255,0,255,0.12) 50%, transparent 65%)',
                backgroundSize: '200% 100%',
              }}
              animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <div
              className="absolute inset-0 pointer-events-none bmt-shimmer z-10"
              style={{ opacity: 0.4 }}
            />
          )}

          {/* ── ZONE 1: PHOTO ZONE (top 55% of card height) ── */}
          <div className="h-[55%] w-full relative overflow-hidden bg-black/10">
            {player.avatarUrl ? (
              <div className="relative w-full h-full">
                <img
                  src={player.avatarUrl}
                  className="w-full h-full object-cover object-top filter saturate-[85%] contrast-[105%]"
                  alt={player.fullName}
                />
                {/* Bottom gradient fade starting around 65% of the photo height */}
                <div 
                  className="absolute inset-x-0 bottom-0 h-[35%] pointer-events-none z-10"
                  style={{
                    background: `linear-gradient(to top, ${style.baseBgColor} 0%, transparent 100%)`
                  }}
                />
              </div>
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-4xl font-black bg-black/20"
                style={{ color: style.textColor, opacity: 0.25 }}
              >
                {isProvisional ? '?' : player.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            )}

            {/* Overlays on the photo top-left (Rating Corner) */}
            <div className="absolute top-3 left-3 z-20">
              {isProvisional ? (
                <div className="flex flex-col items-center leading-none bg-black/45 p-1.5 rounded-2xl border border-white/5 backdrop-blur-[2px]">
                  <svg width="40" height="40" className="-rotate-90">
                    <circle cx="20" cy="20" r="15" fill="transparent" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                    <circle
                      cx="20"
                      cy="20"
                      r="15"
                      fill="transparent"
                      stroke="#ffd700"
                      strokeWidth="2.5"
                      strokeDasharray="94.2"
                      strokeDashoffset={94.2 - (placementCount / 3) * 94.2}
                      strokeLinecap="round"
                    />
                    <text
                      x="20"
                      y="-18"
                      transform="rotate(90)"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffd700"
                      className="text-sm font-black"
                    >
                      ?
                    </text>
                  </svg>
                  <span className="text-[9px] font-black mt-0.5" style={{ color: '#ffd700' }}>
                    {placementCount}/3
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center leading-none bg-black/45 p-2 rounded-2xl border border-white/5 backdrop-blur-[2px]">
                  <span
                    className="text-3xl font-black tabular-nums"
                    style={{ color: style.textColor }}
                  >
                    {facets.overall}
                  </span>
                  <span
                    className="text-[9px] font-black uppercase tracking-widest mt-0.5 text-white/70"
                  >
                    {positionLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Overlays on the photo top-right (Flip Affordance) */}
            <div className="absolute top-3 right-3 z-20 w-6 h-6 rounded-full bg-black/45 border border-white/10 flex items-center justify-center backdrop-blur-sm pointer-events-none">
              <RefreshCw size={10} className="text-white/60" />
            </div>
          </div>

          {/* ── ZONE 2: CONTENT ZONE (bottom 45% of card height, solid card material) ── */}
          <div className="h-[45%] w-full flex flex-col justify-between p-3.5 relative z-10 bg-transparent">
            {/* Name banner & rank icon */}
            <div className="flex items-center justify-between gap-2">
              <div
                className="flex-1 rounded-xl px-3 py-1.5 text-center border border-white/10 shadow-lg backdrop-blur-md"
                style={{ background: style.nameBg }}
              >
                <p className="text-sm font-black tracking-widest truncate text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {player.fullName.toUpperCase()}
                </p>
              </div>
              {!isProvisional && (
                <img
                  src={rankData.icon}
                  className="h-8 w-auto object-contain flex-shrink-0 drop-shadow-md"
                  alt={rankData.label}
                />
              )}
            </div>

            {/* Facet two-column grid with border separators using accent-soft */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 divide-x divide-accent/10 border-t border-accent/10 pt-2.5 mt-1">
              <div className="flex flex-col gap-0.5">
                {leftCol.map((f) => (
                  <div key={f.abbr} className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">
                      {f.abbr}
                    </span>
                    {isProvisional ? (
                      <span className="text-xs font-black opacity-60 animate-pulse text-[#ffd700] pr-1">
                        🔒
                      </span>
                    ) : (
                      <span
                        className="text-xs font-black tabular-nums pr-1"
                        style={{ color: style.textColor }}
                      >
                        {f.val}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-0.5 pl-3">
                {rightCol.map((f) => (
                  <div key={f.abbr} className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider">
                      {f.abbr}
                    </span>
                    {isProvisional ? (
                      <span className="text-xs font-black opacity-60 animate-pulse text-[#ffd700]">
                        🔒
                      </span>
                    ) : (
                      <span
                        className="text-xs font-black tabular-nums"
                        style={{ color: style.textColor }}
                      >
                        {f.val}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Unlock hint */}
            {isProvisional && (
              <div className="text-center py-0.5 bg-black/45 border border-white/5 rounded-lg backdrop-blur-[1px] mt-1">
                <span className="text-[8px] font-black tracking-wider uppercase" style={{ color: style.textColor }}>
                  Play {Math.max(1, 3 - placementCount)} more {Math.max(1, 3 - placementCount) === 1 ? 'match' : 'matches'} to reveal
                </span>
              </div>
            )}

            {/* Bottom footer strip */}
            <div className="flex items-center justify-between mt-1 z-10 relative">
              {teamLogoUrl ? (
                <img src={teamLogoUrl} className="h-6 w-6 rounded-full object-cover border border-white/10" alt="Team" />
              ) : (
                <div
                  className="h-6 w-6 rounded-full border flex items-center justify-center text-[8px] font-black bg-black/40"
                  style={{ borderColor: style.textColor, color: style.textColor, opacity: 0.4 }}
                >
                  BMT
                </div>
              )}
              <span
                className="text-[8px] font-black tracking-widest opacity-40"
                style={{ color: style.textColor }}
              >
                BOOK MY TURF
              </span>
              <span
                className="text-[8px] font-black font-mono opacity-50"
                style={{ color: style.textColor }}
              >
                {player.playerCode ?? '——'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Card Back ──────────────────────────────────────────────────── */}
        <div
          className="absolute inset-0 rounded-3xl overflow-hidden flex flex-col items-center justify-center gap-4 p-6 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] subpixel-antialiased"
          style={{
            background: style.bg,
            border: style.border,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg) translateZ(1px)',
            WebkitFontSmoothing: 'subpixel-antialiased',
          }}
        >
          {/* Corner Flip Affordance (Back) */}
          <div className="absolute top-4 right-4 z-20 w-6 h-6 rounded-full bg-black/45 border border-white/10 flex items-center justify-center backdrop-blur-sm pointer-events-none">
            <RefreshCw size={10} className="text-white/60" />
          </div>

          <p
            className="text-[10px] font-black uppercase tracking-widest mb-1"
            style={{ color: style.textColor, opacity: 0.5 }}
          >
            Attributes Radar
          </p>
          
          <FacetRadar
            facets={displayFacets.map(f => ({ label: f.abbr, value: f.val }))}
            color={style.textColor}
            size={180}
            provisional={isProvisional}
          />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-black text-white/80">
              {player.fullName}
            </span>
            <span
              className="text-[9px] font-black uppercase tracking-widest"
              style={{ color: style.textColor, opacity: 0.5 }}
            >
              {sport === 'cricket' ? '🏏 Cricket' : '⚽ Futsal / Football'}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
