'use client';
import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Building2, MapPin, ChevronRight } from 'lucide-react';
import { useLocale } from 'next-intl';

interface Sport { id: string; name: string; category?: string; }
interface Turf  { id: string; name: string; sportIds: string[]; cityId: string; area?: string; logoUrl?: string; imageUrls?: string[]; status: string; }

const SPORT_EMOJI: Record<string, string> = {
  default: '🏟', futsal: '⚽', football: '⚽', cricket: '🏏',
  badminton: '🏸', basketball: '🏀', tennis: '🎾', swimming: '🏊',
  billiard: '🎱', snooker: '🎱', volleyball: '🏐', rugby: '🏉',
};
function sportEmoji(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, val] of Object.entries(SPORT_EMOJI)) {
    if (lower.includes(key)) return val;
  }
  return SPORT_EMOJI.default;
}

const FALLBACK = 'https://images.unsplash.com/photo-1518605368461-1ee18cd30f6b?auto=format&fit=crop&q=80';

export default function SportsTurfSection({
  initialSports = [],
  initialTurfs  = [],
}: {
  initialSports: Sport[];
  initialTurfs:  Turf[];
}) {
  const t      = useTranslations('Home');
  const locale = useLocale();

  // Build unique sport items from DB (deduplicated by name)
  const sportItems = Array.from(
    new Map(initialSports.map(s => [s.name, s])).values()
  );

  const [selected, setSelected] = useState<string | null>(null); // null = All

  const publishedTurfs = initialTurfs;
  const filteredTurfs  = selected
    ? (() => {
        const sportIds = initialSports
          .filter(s => s.name === selected)
          .map(s => s.id);
        return publishedTurfs.filter(t =>
          Array.isArray(t.sportIds) && t.sportIds.some(id => sportIds.includes(id))
        );
      })()
    : publishedTurfs;

  return (
    <>
      {/* ── Sports Pill Row ── */}
      <section className="pt-5 pb-2">
        <div className="flex items-center justify-between px-4 mb-3">
          <h3 className="text-xl font-bold tracking-tight">Sports</h3>
          <span className="text-xs font-bold text-neutral-500 tracking-wider uppercase">
            {sportItems.length} {sportItems.length === 1 ? 'sport' : 'sports'}
          </span>
        </div>

        {/* Horizontal scroll pill row */}
        <div className="flex gap-2.5 overflow-x-auto green-scrollbar px-4 pb-3 snap-x">
          {/* All button */}
          <button
            onClick={() => setSelected(null)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full shrink-0 transition-all active:scale-95 snap-start border text-xs font-black whitespace-nowrap
              ${!selected
                ? 'bg-accent text-black border-accent shadow-[0_0_12px_rgba(0,255,65,0.3)]'
                : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:border-accent/40'
              }`}
          >
            <span>🏟</span> All Turfs
          </button>

          {sportItems.map(sport => {
            const isActive = selected === sport.name;
            return (
              <button
                key={sport.id}
                onClick={() => setSelected(sport.name)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full shrink-0 transition-all active:scale-95 snap-start border text-xs font-black whitespace-nowrap
                  ${isActive
                    ? 'bg-accent text-black border-accent shadow-[0_0_12px_rgba(0,255,65,0.3)]'
                    : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:border-accent/40'
                  }`}
              >
                <span>{sportEmoji(sport.name)}</span>
                {sport.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Turf Carousel ── */}
      <section className="pb-6">
        <div className="flex items-center justify-between px-4 mb-3">
          <h3 className="text-sm font-black tracking-tight">
            {selected ? `${selected} Turfs` : 'Available Turfs'}
          </h3>
          <span className="text-xs text-[var(--muted)] font-semibold">
            {filteredTurfs.length} {filteredTurfs.length === 1 ? 'turf' : 'turfs'}
          </span>
        </div>

        {filteredTurfs.length === 0 ? (
          <div className="mx-4 flex flex-col items-center justify-center gap-2 py-10 rounded-2xl border border-dashed border-[var(--panel-border)] text-center">
            <Building2 size={28} className="text-[var(--muted)] opacity-40" />
            <p className="text-sm font-semibold text-[var(--muted)]">No turfs for this sport yet</p>
            <p className="text-xs text-[var(--muted)] opacity-60">Check back later!</p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto green-scrollbar px-4 pb-4 snap-x snap-mandatory">
            {filteredTurfs.map(turf => {
              const coverImage = turf.imageUrls?.[0] || turf.logoUrl || FALLBACK;
              // Sport badge: 0 = no badge | 1 = sport name | 2+ = Multisports
              const sportIds = turf.sportIds ?? [];
              const badgeLabel: string | null = selected
                ? selected
                : sportIds.length === 0
                  ? null
                  : sportIds.length === 1
                    ? (initialSports.find(s => s.id === sportIds[0])?.name ?? null)
                    : 'Multisports';

              return (
                <a
                  key={turf.id}
                  href={`/${locale}/turf/${turf.id}`}
                  className="shrink-0 w-[60vw] max-w-[240px] snap-start block active:scale-[0.97] transition-transform"
                >
                  <div className="glass-panel rounded-3xl overflow-hidden flex flex-col border border-[var(--panel-border)] shadow-md">
                    {/* Cover image */}
                    <div className="relative h-32 w-full bg-neutral-900 shrink-0">
                      <img
                        src={coverImage}
                        alt={turf.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                      {/* Sport badge — only shown when a label exists */}
                      {badgeLabel && (
                        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase text-white border border-white/10">
                          {badgeLabel}
                        </div>
                      )}
                      {/* Logo overlay */}
                      {turf.logoUrl && (
                        <div className="absolute -bottom-5 right-4 w-11 h-11 rounded-full bg-neutral-800 border-[3px] border-black overflow-hidden shadow-lg z-10">
                          <img src={turf.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className={`px-4 pb-4 flex flex-col gap-1 ${turf.logoUrl ? 'pt-7' : 'pt-4'}`}>
                      <h4 className="text-[15px] font-bold tracking-tight truncate text-foreground">
                        {turf.name}
                      </h4>
                      <div className="flex items-center gap-1 text-[11px] text-[var(--muted)] font-semibold">
                        <MapPin size={10} className="text-accent shrink-0" />
                        <span className="truncate">{turf.area || 'Location not set'}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2.5 border-t border-[var(--panel-border)]">
                        <span className="text-[11px] font-black text-accent">Tap to book</span>
                        <ChevronRight size={14} className="text-[var(--muted)]" />
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
