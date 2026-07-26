'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { Shield, ChevronRight } from 'lucide-react';

interface CoachMannaProps {
  id?: string;
  name?: string;
  coachType?: string | null;
  area?: string | null;
  imageUrls?: string[];
  logoUrl?: string | null;
}

export default function GkAcademyBanner({ coachManna }: { coachManna?: CoachMannaProps | null }) {
  const locale = useLocale();
  const coachName = coachManna?.name || 'Coach Nahidur Rahman Manna';
  const coachLocation = coachManna?.area || 'Uttara, Dhaka';

  return (
    <div className="px-4">
      <Link
        href={`/${locale}/gk-academy`}
        className="group relative block w-full rounded-2xl overflow-hidden p-3.5 sm:p-4 bg-gradient-to-r from-amber-950/60 via-neutral-900 to-emerald-950/60 border border-amber-500/35 hover:border-amber-400/60 shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_15px_rgba(245,158,11,0.12)] hover:shadow-[0_6px_25px_rgba(0,0,0,0.6),0_0_20px_rgba(245,158,11,0.22)] transition-all duration-300 active:scale-[0.98] text-left cursor-pointer"
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        <div className="flex items-center justify-between gap-3 relative z-10">
          {/* Left Icon & Text */}
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-500/25 to-emerald-500/25 border border-amber-400/40 shrink-0 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
              <Shield className="w-5.5 h-5.5 text-amber-400 group-hover:text-amber-300 transition-colors" />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black text-white tracking-tight group-hover:text-amber-200 transition-colors truncate">
                  Join Goalkeeper Academy
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Pre-Registration
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-medium truncate mt-0.5 flex items-center gap-1">
                <span>With {coachName}</span>
                <span className="text-neutral-600">•</span>
                <span className="text-amber-300/80 font-semibold">{coachLocation}</span>
              </p>
            </div>
          </div>

          {/* Right Action Badge */}
          <div className="shrink-0 flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-black group-hover:bg-amber-500 group-hover:text-black transition-all duration-300">
            <span>Register</span>
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Link>
    </div>
  );
}
