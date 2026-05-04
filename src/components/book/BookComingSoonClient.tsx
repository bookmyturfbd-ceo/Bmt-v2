'use client';
import { useState, useEffect } from 'react';

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-16 h-16 rounded-2xl bg-black/60 border border-accent/30 flex items-center justify-center shadow-[0_0_20px_rgba(0,255,65,0.1)]">
        <span className="text-2xl font-black text-accent font-mono tabular-nums">{String(value).padStart(2, '0')}</span>
      </div>
      <span className="text-[9px] font-black uppercase tracking-widest text-neutral-500">{label}</span>
    </div>
  );
}

export default function BookComingSoonClient({ launchAt }: { launchAt: string }) {
  const [ct, setCt] = useState({ d: 0, h: 0, m: 0, s: 0, done: false });

  useEffect(() => {
    const tick = () => {
      const diff = new Date(launchAt).getTime() - Date.now();
      if (diff <= 0) { setCt({ d: 0, h: 0, m: 0, s: 0, done: true }); return; }
      setCt({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
        done: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [launchAt]);

  if (ct.done) {
    return (
      <div className="px-4 py-2 bg-accent/20 border border-accent/40 rounded-full text-accent font-black text-sm animate-pulse inline-block">
        🚀 Launching now — refresh!
      </div>
    );
  }

  return (
    <div className="flex items-end justify-center gap-3">
      <CountdownUnit value={ct.d} label="Days" />
      <span className="text-accent font-black text-2xl mb-4">:</span>
      <CountdownUnit value={ct.h} label="Hrs" />
      <span className="text-accent font-black text-2xl mb-4">:</span>
      <CountdownUnit value={ct.m} label="Min" />
      <span className="text-accent font-black text-2xl mb-4">:</span>
      <CountdownUnit value={ct.s} label="Sec" />
    </div>
  );
}
