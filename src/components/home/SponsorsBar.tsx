'use client';
import Link from 'next/link';

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

export default function SponsorsBar({ sponsors, settings }: { sponsors: Sponsor[]; settings: SponsorSettings }) {
  if (!sponsors || sponsors.length === 0) return null;

  return (
    <div className="mx-4 mt-6 mb-2">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Our Partners</h3>
      </div>

      <div className="flex items-center justify-center gap-2 md:gap-3 py-1">
        {sponsors.map((sponsor) => {
          const content = (
            <div className="w-full aspect-square rounded-2xl md:rounded-3xl border border-[var(--panel-border)] bg-white/[0.02] backdrop-blur-md p-1.5 md:p-2 flex flex-col items-center justify-between hover:border-accent/40 hover:bg-white/[0.04] transition-all shadow-lg group">
              <div className="flex-1 w-full flex items-center justify-center p-1 relative min-h-0">
                <img src={sponsor.imageUrl} alt="Partner Logo" className="max-w-full max-h-full object-contain pointer-events-none drop-shadow-2xl" />
              </div>
              {sponsor.ctaLink && (
                <div className="w-full mt-1.5 shrink-0">
                  <span className="block w-full py-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black text-center text-white group-hover:bg-accent group-hover:text-black group-hover:border-accent transition-all uppercase tracking-widest shadow-[0_0_15px_rgba(0,255,65,0)] group-hover:shadow-[0_0_15px_rgba(0,255,65,0.2)]">
                    {sponsor.ctaText || 'EXPLORE'}
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
                className="flex-1 min-w-[70px] max-w-[110px] outline-none"
                draggable={false}
              >
                {content}
              </a>
            );
          }
          return <div key={sponsor.id} className="flex-1 min-w-[70px] max-w-[110px]">{content}</div>;
        })}
      </div>
    </div>
  );
}
