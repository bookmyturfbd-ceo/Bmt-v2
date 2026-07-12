'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { getCookie } from '@/lib/cookies';
import { ArrowLeft, Lock } from 'lucide-react';
import { BADGES_BY_SPORT } from '@/lib/rankUtils';

// All possible badge keys across sports (deduped)
const ALL_BADGES = Array.from(
  new Map(
    Object.values(BADGES_BY_SPORT)
      .flat()
      .map(b => [b.key, b])
  ).values()
).filter(b => b.key !== 'NONE');

interface EarnedBadge {
  title: string;
  icon?: string;
  earnedAt?: string;
  isShowcased?: boolean;
}

export default function BadgesPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? 'en';
  const [earned, setEarned] = useState<EarnedBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerCode, setPlayerCode] = useState<string | null>(null);

  useEffect(() => {
    const id = getCookie('bmt_player_id');
    if (!id) { setLoading(false); return; }
    fetch(`/api/bmt/players/${id}`)
      .then(r => r.json())
      .then(d => {
        setEarned(d.badges ?? []);
        setPlayerCode(d.playerCode ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const earnedTitles = new Set(earned.map(b => b.title?.toLowerCase()));

  function isEarned(badgeLabel: string) {
    return earnedTitles.has(badgeLabel.toLowerCase());
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-5 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-black tracking-tight">Badge Catalog</h1>
          <p className="text-xs text-white/40 font-medium">{earned.length} earned</p>
        </div>
      </div>

      {/* Earned count banner */}
      <div className="mx-4 mb-5 rounded-2xl bg-accent/10 border border-accent/20 px-4 py-3 flex items-center gap-3">
        <span className="text-2xl">🏅</span>
        <div>
          <p className="text-sm font-black text-accent">{earned.length} / {ALL_BADGES.length} Badges Unlocked</p>
          <p className="text-[10px] text-white/30 font-medium">Earned by performing in ranked matches</p>
        </div>
      </div>

      {/* Per-sport groups */}
      {Object.entries(BADGES_BY_SPORT).map(([sportKey, badges]) => (
        <div key={sportKey} className="px-4 mb-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-3">
            {sportKey.replace('_', ' ')}
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {badges.filter(b => b.key !== 'NONE').map(badge => {
              const got = isEarned(badge.label);
              const earnedEntry = earned.find(e => e.title?.toLowerCase() === badge.label.toLowerCase());
              return (
                <div
                  key={badge.key}
                  className={`rounded-2xl border p-4 flex flex-col gap-2 transition-all ${
                    got
                      ? 'bg-accent/10 border-accent/25'
                      : 'bg-white/[0.025] border-white/[0.05] opacity-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{badge.emoji}</span>
                    {got ? (
                      <span className="text-[9px] font-black text-accent bg-accent/15 px-2 py-0.5 rounded-full">EARNED</span>
                    ) : (
                      <Lock size={12} className="text-white/20" />
                    )}
                  </div>
                  <div>
                    <p className={`text-sm font-black ${got ? 'text-white' : 'text-white/40'}`}>{badge.label}</p>
                    <p className="text-[10px] text-white/30 font-medium">+{badge.bonus} MMR bonus</p>
                    {got && earnedEntry?.earnedAt && (
                      <p className="text-[9px] text-accent/50 mt-0.5">
                        {new Date(earnedEntry.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
