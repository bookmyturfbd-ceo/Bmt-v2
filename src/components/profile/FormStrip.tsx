'use client';

import { motion } from 'framer-motion';

interface FormEntry {
  outcome: 'W' | 'L' | 'D';
  mmrDelta: number;
}

interface FormStripProps {
  last5: FormEntry[];
  mmrDeltaMonth: number;
}

export function FormStrip({ last5, mmrDeltaMonth }: FormStripProps) {
  const outcomeStyles: Record<string, { bg: string; text: string; label: string }> = {
    W: { bg: 'bg-accent/20 border-accent/40', text: 'text-accent', label: 'W' },
    L: { bg: 'bg-red-500/20 border-red-500/40', text: 'text-red-400', label: 'L' },
    D: { bg: 'bg-white/10 border-white/20', text: 'text-white/50', label: 'D' },
  };

  const deltaSign = mmrDeltaMonth > 0 ? '↑' : mmrDeltaMonth < 0 ? '↓' : '';
  const deltaColor = mmrDeltaMonth > 0 ? 'text-accent' : mmrDeltaMonth < 0 ? 'text-red-400' : 'text-white/40';

  if (last5.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="w-7 h-7 rounded-full bg-white/[0.01] border border-white/10" />
          ))}
        </div>
        <p className="text-[10px] text-white/30 font-medium italic">
          Your last 5 results will show here
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      {/* Last 5 dots */}
      <div className="flex items-center gap-1.5">
        {last5.map((entry, i) => {
          const s = outcomeStyles[entry.outcome];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08, duration: 0.25 }}
              className={`w-7 h-7 rounded-full border flex items-center justify-center ${s.bg}`}
              title={`${entry.outcome} · ${entry.mmrDelta >= 0 ? '+' : ''}${entry.mmrDelta} MMR`}
            >
              <span className={`text-[9px] font-black ${s.text}`}>{s.label}</span>
            </motion.div>
          );
        })}
        {/* Pad remaining slots if < 5 */}
        {last5.length < 5 &&
          Array.from({ length: 5 - last5.length }).map((_, i) => (
            <div key={`pad-${i}`} className="w-7 h-7 rounded-full bg-white/[0.01] border border-white/10" />
          ))}
      </div>

      {/* Monthly MMR delta (only shown when player has history) */}
      <div className="flex items-center gap-1">
        <span className={`text-xs font-black ${deltaColor}`}>
          {deltaSign} {Math.abs(mmrDeltaMonth)} MMR
        </span>
        <span className="text-[10px] text-white/30 font-medium">this month</span>
      </div>
    </div>
  );
}
