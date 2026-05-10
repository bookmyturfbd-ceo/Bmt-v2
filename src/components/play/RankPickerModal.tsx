'use client';
import { X } from 'lucide-react';

const TIERS = [
  { tier: 'Bronze',   icon: '/ranks/Bronze.svg',   color: '#cd7f32', glow: '165,80,0',    range: '0 – 674',    min: 0    },
  { tier: 'Silver',   icon: '/ranks/Silver.svg',   color: '#c0c0c0', glow: '180,180,180', range: '675 – 1349', min: 675  },
  { tier: 'Gold',     icon: '/ranks/Gold.svg',     color: '#ffd700', glow: '200,160,0',   range: '1350 – 2024',min: 1350 },
  { tier: 'Platinum', icon: '/ranks/Platinum.svg', color: '#00e5ff', glow: '0,200,220',   range: '2025 – 2699',min: 2025 },
  { tier: 'Legend',   icon: '/ranks/Legend.svg',   color: '#ff00ff', glow: '200,0,200',   range: '2700+',      min: 2700 },
] as const;

interface Props {
  sport: 'football' | 'cricket';
  currentMmr?: number;
  onSelect: (mmr: number, tierLabel: string) => void;
  onClose: () => void;
}

export function RankPickerModal({ sport, currentMmr, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm pb-[72px]" onClick={onClose}>
      <div className="w-full max-w-lg bg-[#111] border border-white/10 rounded-t-3xl p-5 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-black text-base">Minimum Rank</h2>
            <p className="text-[10px] text-neutral-500 mt-0.5">
              {sport === 'football' ? '⚽ Football MMR' : '🏏 Cricket MMR'} — players below this rank won&apos;t see your listing
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"><X size={16} /></button>
        </div>

        {/* Clear option */}
        <button onClick={() => { onSelect(0, 'Any'); onClose(); }}
          className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-neutral-400 font-black text-sm hover:bg-white/10 transition-all">
          No Minimum (Any Rank)
        </button>

        {/* Rank tier cards */}
        <div className="grid grid-cols-1 gap-2">
          {TIERS.map(t => {
            const active = currentMmr !== undefined && currentMmr === t.min;
            return (
              <button key={t.tier} onClick={() => { onSelect(t.min, t.tier); onClose(); }}
                className={`flex items-center gap-4 px-4 py-3 rounded-2xl border transition-all active:scale-[0.98] ${
                  active
                    ? 'border-opacity-80'
                    : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.07]'
                }`}
                style={active ? {
                  background: `rgba(${t.glow},0.12)`,
                  borderColor: t.color,
                  boxShadow: `0 0 16px rgba(${t.glow},0.25)`,
                } : {}}>
                {/* Big rank icon */}
                <div className="w-14 h-14 shrink-0 flex items-center justify-center"
                  style={active ? { filter: `drop-shadow(0 0 8px rgba(${t.glow},0.7))` } : {}}>
                  <img src={t.icon} alt={t.tier} className="w-14 h-14 object-contain" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-black text-base" style={{ color: t.color }}>{t.tier}</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">MMR {t.range}</p>
                </div>
                {active && (
                  <span className="text-[10px] font-black px-2 py-1 rounded-full" style={{ background: `rgba(${t.glow},0.2)`, color: t.color }}>
                    Selected
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
