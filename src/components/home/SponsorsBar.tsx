'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface Sponsor {
  id: string;
  imageUrl: string;
  ctaText?: string | null;
  ctaLink?: string | null;
}
interface SponsorSettings {
  autoSlide: boolean;
  intervalMs: number;
}

export default function SponsorsBar({ 
  sponsors, settings, compact = false 
}: { 
  sponsors: Sponsor[]; settings: SponsorSettings; compact?: boolean;
}) {
  const t = useTranslations('Home');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (compact || !settings.autoSlide || !sponsors || sponsors.length <= 1) return;

    const interval = setInterval(() => {
      if (!scrollRef.current) return;
      const el = scrollRef.current;
      const maxScroll = el.scrollWidth - el.clientWidth;

      if (el.scrollLeft >= maxScroll - 5) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: 100, behavior: 'smooth' });
      }
    }, settings.intervalMs);

    return () => clearInterval(interval);
  }, [settings.autoSlide, settings.intervalMs, sponsors, compact]);

  if (!sponsors || sponsors.length === 0) return null;

  if (compact) {
    return (
      <div className="mx-4 mt-2 mb-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 text-center mb-2.5">Partners</p>
        <div className="flex items-center justify-center gap-4 py-1 overflow-x-auto hide-scrollbar [&::-webkit-scrollbar]:hidden flex-wrap">
          {sponsors.map((sponsor) => {
            const content = (
              <div className="h-6 w-16 opacity-40 hover:opacity-100 transition-opacity shrink-0 flex items-center justify-center">
                <img 
                  src={sponsor.imageUrl} 
                  alt="Partner Logo" 
                  className="max-w-full max-h-full object-contain filter grayscale hover:grayscale-0 transition-all" 
                />
              </div>
            );

            if (sponsor.ctaLink) {
              return (
                <a 
                  key={sponsor.id} 
                  href={sponsor.ctaLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="outline-none"
                >
                  {content}
                </a>
              );
            }
            return (
              <div key={sponsor.id}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 mt-6 mb-2">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">{t('ourPartners')}</h3>
      </div>

      <div 
        ref={scrollRef}
        className="flex items-center gap-2 md:gap-3 py-1 overflow-x-auto hide-scrollbar [&::-webkit-scrollbar]:hidden scroll-smooth snap-x snap-mandatory justify-start sm:justify-center"
      >
        {sponsors.map((sponsor) => {
          const content = (
            <div className="w-full aspect-square rounded-2xl md:rounded-3xl border border-[var(--panel-border)] bg-white/[0.02] backdrop-blur-md p-1.5 md:p-2 flex flex-col items-center justify-between hover:border-accent/40 hover:bg-white/[0.04] transition-all shadow-lg group">
              <div className="flex-1 w-full flex items-center justify-center p-1 relative min-h-0">
                <img src={sponsor.imageUrl} alt="Partner Logo" className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-2xl" />
              </div>
              {sponsor.ctaLink && (
                <div className="w-full mt-1.5 shrink-0">
                  <span className="block w-full py-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black text-center text-white group-hover:bg-accent group-hover:text-black group-hover:border-accent transition-all uppercase tracking-widest shadow-[0_0_15px_rgba(0,255,65,0)] group-hover:shadow-[0_0_15px_rgba(0,255,65,0.2)]">
                    {sponsor.ctaText || t('explore')}
                  </span>
                </div>
              )}
            </div>
          );

          if (sponsor.ctaLink) {
            return (
              <a 
                key={sponsor.id} 
                href={sponsor.ctaLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex-1 min-w-[85px] max-w-[110px] shrink-0 snap-center outline-none"
                draggable={false}
              >
                {content}
              </a>
            );
          }
          return (
            <div 
              key={sponsor.id} 
              className="flex-1 min-w-[85px] max-w-[110px] shrink-0 snap-center"
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
