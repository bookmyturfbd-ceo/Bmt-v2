'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, Trophy, Users, Calendar, ChevronRight, Loader2, Flag } from 'lucide-react';

export default function TournamentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'en';

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'FOOTBALL' | 'CRICKET'>('all');

  useEffect(() => {
    fetch('/api/arena/tournaments')
      .then(r => r.json())
      .then(data => {
        if (data.success) setTournaments(data.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? tournaments : tournaments.filter(t => t.sport === filter);

  return (
    <div className="min-h-screen bg-background text-foreground pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-white/5 px-4 py-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="font-black text-xl tracking-tight">Tournaments</h1>
          <p className="text-xs text-[var(--muted)] font-bold">Official BMT Events</p>
        </div>
        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
          <Trophy size={16} className="text-yellow-400" />
        </div>
      </header>

      <div className="px-4 pt-5 flex flex-col gap-4">
        {/* Sport Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {(['all', 'FOOTBALL', 'CRICKET'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                filter === f
                  ? 'bg-yellow-500 text-black'
                  : 'bg-zinc-900 border border-white/10 text-[var(--muted)] hover:text-white'
              }`}
            >
              {f === 'all' ? 'All Sports' : f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-yellow-400 w-10 h-10" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-24 text-center flex flex-col items-center">
            <Trophy size={56} className="text-neutral-800 mb-4" />
            <h3 className="text-xl font-black text-white mb-2">No Tournaments</h3>
            <p className="text-neutral-500 font-bold text-sm">Check back soon for upcoming events.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map(t => (
              <button
                key={t.id}
                onClick={() => router.push(`/${locale}/tournaments/${t.id}`)}
                className="relative w-full rounded-3xl overflow-hidden border border-yellow-500/20 bg-zinc-900 p-5 text-left group hover:border-yellow-500/40 transition-all active:scale-[0.99]"
              >
                {/* Accent glow */}
                <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-yellow-500/5 to-transparent pointer-events-none" />

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                      <Trophy size={22} className="text-yellow-400" />
                    </div>
                    <div>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-1 inline-block ${
                        t.status === 'ACTIVE' ? 'bg-[#00ff41]/20 text-[#00ff41]' :
                        t.status === 'REGISTRATION_OPEN' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-neutral-800 text-neutral-400'
                      }`}>
                        {t.status === 'REGISTRATION_OPEN' ? '🟢 Open for Registration' : t.status === 'ACTIVE' ? '🔴 Live' : t.status.replace(/_/g, ' ')}
                      </span>
                      <h3 className="font-black text-lg text-white group-hover:text-yellow-300 transition-colors leading-tight">{t.name}</h3>
                      <p className="text-xs text-[var(--muted)] font-bold uppercase tracking-wider mt-0.5">{t.sport} · {t.formatType?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-yellow-400/30 group-hover:text-yellow-400 transition-colors shrink-0" />
                </div>

                <div className="flex items-center gap-5 pt-4 border-t border-white/5 text-xs font-bold text-[var(--muted)]">
                  <div className="flex items-center gap-1.5">
                    <Users size={14} />
                    <span>{t._count?.registrations || 0} / {t.maxParticipants} Teams</span>
                  </div>
                  {t.registrationDeadline && (
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      <span>Closes {new Date(t.registrationDeadline).toLocaleDateString()}</span>
                    </div>
                  )}
                  {t.prizePoolTotal > 0 && (
                    <div className="flex items-center gap-1.5 ml-auto text-yellow-400">
                      <Flag size={14} />
                      <span>{t.prizePoolTotal.toLocaleString()} Coins</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
