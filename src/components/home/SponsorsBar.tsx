'use client';
import { useState, useEffect } from 'react';
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

// Facebook SVG Icon
function FacebookIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

// Instagram SVG Icon
function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

// TikTok SVG Icon
function TiktokIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.53.02c.11 0 .22.02.32.04 1.15.22 2.19.82 2.92 1.67.14.16.27.34.39.53.25.4.45.84.58 1.3.04.14.07.29.09.43.02.13.03.26.03.39v2.24c-.03.01-.06.01-.09.01-1.07 0-2.07-.37-2.88-1-.07-.05-.13-.11-.2-.17v6.62c0 4.14-3.36 7.5-7.5 7.5S2.14 16.22 2.14 12s3.36-7.5 7.5-7.5c.34 0 .68.02 1.01.07v3.08c-.33-.09-.67-.14-1.01-.14-2.43 0-4.4 1.97-4.4 4.4s1.97 4.4 4.4 4.4 4.4-1.97 4.4-4.4V0h4.49z" />
    </svg>
  );
}

// YouTube SVG Icon
function YoutubeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.107C19.522 3.5 12 3.5 12 3.5s-7.522 0-9.388.556a3.002 3.002 0 0 0-2.11 2.107C0 8.028 0 12 0 12s0 3.972.502 5.837a3.003 3.003 0 0 0 2.11 2.107C4.478 20.5 12 20.5 12 20.5s7.522 0 9.388-.556a3.002 3.002 0 0 0 2.11-2.107C24 15.972 24 12 24 12s0-3.972-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export default function SponsorsBar({ sponsors, settings }: { sponsors: Sponsor[]; settings: SponsorSettings }) {
  const t = useTranslations('Home');
  const [socials, setSocials] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/bmt/social-settings')
      .then(r => r.json())
      .then(d => setSocials(d))
      .catch(() => {});
  }, []);

  if (!sponsors || sponsors.length === 0) return null;

  return (
    <div className="mx-4 mt-6 mb-2">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">{t('ourPartners')}</h3>
        
        {/* Social Links beside Partners */}
        <div className="flex items-center gap-1.5 select-none bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-full">
          {socials.social_facebook && (
            <a href={socials.social_facebook} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-[#1877F2] transition-colors p-0.5" title="Facebook">
              <FacebookIcon size={12} />
            </a>
          )}
          {socials.social_instagram && (
            <a href={socials.social_instagram} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-[#E1306C] transition-colors p-0.5" title="Instagram">
              <InstagramIcon size={12} />
            </a>
          )}
          {socials.social_tiktok && (
            <a href={socials.social_tiktok} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-white transition-colors p-0.5" title="TikTok">
              <TiktokIcon size={12} />
            </a>
          )}
          {socials.social_youtube && (
            <a href={socials.social_youtube} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-[#FF0000] transition-colors p-0.5" title="YouTube">
              <YoutubeIcon size={12} />
            </a>
          )}
        </div>
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
