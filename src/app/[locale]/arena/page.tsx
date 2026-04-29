'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Swords, Users, Trophy, ArrowLeftRight, BarChart2,
  Plus, User, ChevronRight, Shield, Flame, Star, Zap, Sun, Moon, Video
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { Link } from '@/i18n/routing';

export default function ArenaPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'en';
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [challenges, setChallenges] = useState<{ received: any[]; upcoming: any[] }>({ received: [], upcoming: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/interact/market').then(r => r.json()).catch(() => ({ myTeams: [] })),
      fetch('/api/interact/challenge').then(r => r.json()).catch(() => ({ received: [], upcoming: [] })),
    ]).then(([market, ch]) => {
      setMyTeams(market.myTeams || []);
      setChallenges({ received: ch.received || [], upcoming: ch.upcoming || [] });
      setLoading(false);
    });
    setMounted(true);
  }, []);

  const pendingReceived = challenges.received.filter((c: any) => c.status === 'PENDING').length;
  const liveMatches = challenges.upcoming.filter((c: any) => c.status === 'LIVE').length;

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Swords size={20} className="text-fuchsia-400" />
          <h1 className="font-black text-xl tracking-tight">Arena</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-10 h-10 rounded-full bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors shadow-sm"
          >
            {mounted && theme === 'dark' ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-blue-500" />}
          </button>
          
          <Link href="/profile"
            className="w-10 h-10 rounded-full bg-white dark:bg-white/5 border border-neutral-200 dark:border-white/10 flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-white/10 transition-colors shadow-sm">
            <User size={18} className="text-[var(--muted)]" />
          </Link>
        </div>
      </header>

      <div className="px-4 pt-5 flex flex-col gap-4">

        {/* ── Hero: Challenge Market ── */}
        <button
          onClick={() => router.push(`/${locale}/interact`)}
          className="relative w-full rounded-3xl overflow-hidden border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-950/80 via-purple-900/60 to-zinc-900 p-6 text-left group hover:border-fuchsia-400/50 transition-all active:scale-[0.99] shadow-[0_0_40px_rgba(168,85,247,0.12)]"
        >
          {/* Glow orb */}
          <div className="absolute right-6 top-0 bottom-0 flex items-center opacity-30 group-hover:opacity-50 transition-opacity pointer-events-none">
            <div className="w-40 h-40 rounded-full bg-fuchsia-500 blur-3xl" />
          </div>

          <div className="relative z-10 flex items-start justify-between">
            <div className="flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center">
                <Swords size={22} className="text-fuchsia-300" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-fuchsia-400/70 mb-1">Competitive</p>
                <h2 className="text-2xl font-black text-white leading-tight">Challenge Market</h2>
                <p className="text-sm text-fuchsia-200/60 mt-1 max-w-[200px] leading-relaxed">Browse & challenge rival teams in ranked matches</p>
              </div>
              {pendingReceived > 0 && (
                <div className="inline-flex items-center gap-2 bg-fuchsia-500/20 border border-fuchsia-500/30 rounded-full px-3 py-1.5 w-fit">
                  <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse" />
                  <span className="text-xs font-black text-fuchsia-300">{pendingReceived} challenge{pendingReceived > 1 ? 's' : ''} waiting</span>
                </div>
              )}
              {liveMatches > 0 && (
                <div className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-full px-3 py-1.5 w-fit">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                  <span className="text-xs font-black text-red-300">{liveMatches} LIVE</span>
                </div>
              )}
            </div>
            <ChevronRight size={22} className="text-fuchsia-400/40 group-hover:text-fuchsia-400 transition-colors mt-1 shrink-0" />
          </div>

          {/* Bottom stats bar */}
          <div className="relative z-10 mt-5 pt-4 border-t border-fuchsia-500/20 flex items-center gap-5">
            <div className="flex flex-col">
              <span className="text-[10px] text-fuchsia-400/50 font-bold uppercase tracking-wider">My Teams</span>
              <span className="font-black text-lg text-white">{loading ? '—' : myTeams.length}</span>
            </div>
            <div className="w-px h-8 bg-fuchsia-500/20" />
            <div className="flex flex-col">
              <span className="text-[10px] text-fuchsia-400/50 font-bold uppercase tracking-wider">Active Matches</span>
              <span className="font-black text-lg text-white">{loading ? '—' : challenges.upcoming.filter((c: any) => ['LIVE','SCHEDULED','SCORE_ENTRY'].includes(c.status)).length}</span>
            </div>
            <div className="ml-auto">
              <span className="text-[11px] font-black text-fuchsia-300 bg-fuchsia-500/10 border border-fuchsia-500/20 px-3 py-1.5 rounded-full">Open Arena →</span>
            </div>
          </div>
        </button>

        {/* ── Middle Row: My Teams + Tourneys ── */}
        <div className="grid grid-cols-2 gap-4">

          {/* My Teams */}
          <button
            onClick={() => router.push(`/${locale}/teams`)}
            className="relative rounded-3xl bg-zinc-900 border border-white/10 p-5 text-left group hover:border-accent/30 hover:bg-zinc-900/80 transition-all active:scale-[0.98] shadow-lg flex flex-col gap-4 min-h-[180px]"
          >
            <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Shield size={18} className="text-accent" />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <p className="font-black text-base text-white leading-tight">My Teams</p>
              {!loading && myTeams.length > 0 ? (
                <div className="flex flex-col gap-1.5 mt-1">
                  {myTeams.slice(0, 2).map((t: any) => (
                    <div key={t.id} className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-neutral-800 border border-white/10 overflow-hidden flex-shrink-0">
                        {t.logoUrl ? <img src={t.logoUrl} className="w-full h-full object-cover" /> : <Shield size={8} className="m-auto text-accent" />}
                      </div>
                      <span className="text-[11px] text-[var(--muted)] truncate font-medium">{t.name}</span>
                    </div>
                  ))}
                  {myTeams.length > 2 && <span className="text-[10px] text-[var(--muted)] opacity-60">+{myTeams.length - 2} more</span>}
                </div>
              ) : (
                <p className="text-xs text-[var(--muted)] opacity-60 mt-1">Manage your squads</p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-accent">{loading ? '—' : myTeams.length}</span>
              <ChevronRight size={16} className="text-accent/40 group-hover:text-accent transition-colors" />
            </div>
          </button>

          {/* Play with Friends */}
          <button
            onClick={() => router.push(`/${locale}/play`)}
            className="relative rounded-3xl bg-zinc-900 border border-white/10 p-5 text-left group hover:border-cyan-500/30 hover:bg-zinc-900/80 transition-all active:scale-[0.98] shadow-lg flex flex-col gap-4 min-h-[180px] overflow-hidden"
          >
            <div className="absolute bottom-0 right-0 w-20 h-20 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center relative z-10">
              <Users size={18} className="text-cyan-400" />
            </div>
            <div className="flex flex-col gap-1 flex-1 relative z-10">
              <p className="font-black text-base text-white leading-tight">Play with Friends</p>
              <p className="text-xs text-[var(--muted)] opacity-60 mt-1">Create a group & split turf costs</p>
            </div>
            <div className="flex items-center justify-between relative z-10">
              <span className="text-[11px] text-cyan-400/70 font-black bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 rounded-full">New ✦</span>
              <ChevronRight size={16} className="text-cyan-500/40 group-hover:text-cyan-400 transition-colors" />
            </div>
          </button>
        </div>

        {/* ── Highlights & Reels ── */}
        <button
          onClick={() => router.push(`/${locale}/interact/reels`)}
          className="w-full rounded-3xl bg-zinc-900 border border-white/10 p-5 text-left group hover:border-[#00ff41]/30 transition-all active:scale-[0.99] flex items-center gap-5 overflow-hidden relative"
        >
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#00ff41]/5 to-transparent pointer-events-none" />
          <div className="w-12 h-12 rounded-2xl bg-[#00ff41]/10 border border-[#00ff41]/20 flex items-center justify-center shrink-0">
            <Video size={20} className="text-[#00ff41]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-base text-white">Highlights</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">Watch and upload global player reels</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-[#00ff41]/70 font-black bg-[#00ff41]/10 border border-[#00ff41]/20 px-2 py-1 rounded-full">Watch</span>
            <ChevronRight size={16} className="text-[#00ff41]/40 group-hover:text-[#00ff41] transition-colors" />
          </div>
        </button>

        {/* ── Bottom Banners ── */}

        {/* Transfer Market */}
        <button
          onClick={() => router.push(`/${locale}/interact?tab=transfer`)}
          className="w-full rounded-3xl bg-zinc-900 border border-white/10 p-5 text-left group hover:border-blue-500/30 transition-all active:scale-[0.99] flex items-center gap-5 overflow-hidden relative"
        >
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-blue-500/5 to-transparent pointer-events-none" />
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <ArrowLeftRight size={20} className="text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-base text-white">Transfer Market</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">Buy and sell players between teams</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-blue-400/70 font-black bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-full">Browse</span>
            <ChevronRight size={16} className="text-blue-500/40 group-hover:text-blue-400 transition-colors" />
          </div>
        </button>

        {/* Leaderboards */}
        <button
          onClick={() => router.push(`/${locale}/leaderboard`)}
          className="w-full rounded-3xl bg-zinc-900 border border-white/10 p-5 text-left group hover:border-orange-500/30 transition-all active:scale-[0.99] flex items-center gap-5 overflow-hidden relative"
        >
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-orange-500/5 to-transparent pointer-events-none" />
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
            <BarChart2 size={20} className="text-orange-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-base text-white">Leaderboards</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">See top-ranked teams & players</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-orange-400/70 font-black bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-full">View All</span>
            <ChevronRight size={16} className="text-orange-500/40 group-hover:text-orange-400 transition-colors" />
          </div>
        </button>

        {/* Tourneys */}
        <button
          onClick={() => router.push(`/${locale}/tourney`)}
          className="w-full rounded-3xl bg-zinc-900 border border-white/10 p-5 text-left group hover:border-yellow-500/30 transition-all active:scale-[0.99] flex items-center gap-5 overflow-hidden relative"
        >
          <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-yellow-500/5 to-transparent pointer-events-none" />
          <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
            <Trophy size={20} className="text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-base text-white">Tournaments</p>
            <p className="text-xs text-[var(--muted)] mt-0.5">Compete in official tournaments</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-yellow-500/70 font-black bg-yellow-500/10 border border-yellow-500/20 px-2 py-1 rounded-full">Coming Soon</span>
            <ChevronRight size={16} className="text-yellow-500/40 group-hover:text-yellow-400 transition-colors" />
          </div>
        </button>

      </div>

      {/* ── Floating Action Button (Create Team) ── */}
      <button
        onClick={() => router.push(`/${locale}/teams?create=1`)}
        className="fixed bottom-24 right-5 z-50 w-14 h-14 rounded-full bg-accent text-black flex items-center justify-center shadow-[0_0_30px_rgba(0,255,65,0.4)] hover:brightness-110 active:scale-95 transition-all"
        title="Create New Team"
      >
        <Plus size={24} strokeWidth={3} />
      </button>
    </div>
  );
}
