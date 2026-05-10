'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocale } from 'next-intl';

interface Slide {
  id: string;
  imageUrl: string;
  ctaText?: string | null;
  ctaLink?: string | null;
  active: boolean;
}
interface Settings { autoSlide: boolean; intervalMs: number; }

const FALLBACK: Slide = {
  id: 'fallback',
  imageUrl: 'https://images.unsplash.com/photo-1579899388836-39a5ca2cd3eb?q=80&w=2670&auto=format&fit=crop',
  active: true,
};

export default function HeroBanner({
  slides: initialSlides = [],
  settings: initialSettings = { autoSlide: true, intervalMs: 3500 },
}: {
  slides?: Slide[];
  settings?: Settings;
}) {
  const locale = useLocale();
  const activeSlides = initialSlides.filter(s => s.active);
  const slides = activeSlides.length > 0 ? activeSlides : [FALLBACK];

  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() =>
    setCurrent(c => (c + 1) % slides.length), [slides.length]);

  const prev = () => setCurrent(c => (c - 1 + slides.length) % slides.length);

  // Auto-slide
  useEffect(() => {
    if (!initialSettings.autoSlide || slides.length <= 1) return;
    timerRef.current = setInterval(next, initialSettings.intervalMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [initialSettings.autoSlide, initialSettings.intervalMs, next, slides.length]);

  const slide = slides[current];

  return (
    <section className="px-4 py-2">
      <div className="w-full h-64 rounded-3xl relative overflow-hidden group">

        {/* Background image with smooth transition */}
        {slides.map((s, i) => (
          <div
            key={s.id}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === current ? 1 : 0 }}
          >
            <img
              src={s.imageUrl}
              alt={s.ctaText || `Slide ${i + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
          {/* CTA Button */}
          {slide.ctaText && (
            <a
              href={slide.ctaLink ? `/${locale}${slide.ctaLink.startsWith('/') ? slide.ctaLink : '/' + slide.ctaLink}` : '#'}
              className="px-6 py-2.5 bg-accent text-black text-sm font-black rounded-full shadow-[0_0_20px_rgba(0,255,65,0.4)] hover:brightness-110 active:scale-95 transition-all"
            >
              {slide.ctaText}
            </a>
          )}
        </div>

        {/* Dot indicators */}
        {slides.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current
                    ? 'bg-accent w-5 shadow-[0_0_6px_rgba(0,255,65,0.8)]'
                    : 'bg-white/40 w-1.5 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}

        {/* Prev / Next arrows — visible on hover on larger screens */}
        {slides.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-black/70"
            >
              <span className="text-white text-sm font-black">‹</span>
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-black/70"
            >
              <span className="text-white text-sm font-black">›</span>
            </button>
          </>
        )}
      </div>
    </section>
  );
}
