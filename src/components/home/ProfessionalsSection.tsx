'use client';

import { useState } from 'react';
import { Sparkles, MapPin, ShieldCheck } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';

interface Professional {
  id: string;
  name: string;
  area?: string | null;
  imageUrls?: string[];
  logoUrl?: string | null;
  coachType?: string | null;
  professions?: string[];
  displayOrder?: number;
  isVerified?: boolean;
}

interface ProfessionalsSectionProps {
  initialProfessionals: Professional[];
}

export default function ProfessionalsSection({ initialProfessionals }: ProfessionalsSectionProps) {
  const t = useTranslations('Home');
  const locale = useLocale();

  const [selectedType, setSelectedType] = useState<string>('ALL');

  // Helper to get initials
  const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  // Get unique professional types
  const DEFAULT_PROFESSIONS = [
    'Cricket Coach',
    'Football Coach',
    'Physio',
    'Personal Trainer',
    'Referee'
  ];
  const availableTypesSet = new Set<string>(DEFAULT_PROFESSIONS);
  initialProfessionals.forEach(pro => {
    if (pro.coachType) {
      availableTypesSet.add(pro.coachType);
    }
    if (Array.isArray(pro.professions)) {
      pro.professions.forEach(p => {
        if (p) availableTypesSet.add(p);
      });
    }
  });
  const availableTypes = Array.from(availableTypesSet);

  // Filter professionals
  const filteredProfessionals = initialProfessionals.filter(pro => {
    if (selectedType === 'ALL') return true;
    const matchCoachType = pro.coachType?.toLowerCase() === selectedType.toLowerCase();
    const matchProfessions = Array.isArray(pro.professions) && pro.professions.some(p => p.toLowerCase() === selectedType.toLowerCase());
    return matchCoachType || matchProfessions;
  });

  return (
    <section className="px-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles size={16} className="text-accent" />
          <h3 className="text-base font-black tracking-tight text-white">{t('hireProfessionals')}</h3>
        </div>
        <span className="text-[10px] font-black text-accent uppercase tracking-widest bg-[#00ff41]/10 border border-[#00ff41]/20 px-2.5 py-0.5 rounded-full">
          {filteredProfessionals.length} {t('active')}
        </span>
      </div>

      {/* Professional Type Filter Pills */}
      {availableTypes.length > 0 && (
        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pb-2 snap-x py-1">
          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-4 py-2 rounded-2xl text-xs font-black shrink-0 transition-all border-2 snap-start whitespace-nowrap active:scale-95
              ${selectedType === 'ALL'
                ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_16px_rgba(59,130,246,0.4)] scale-[1.02]'
                : 'bg-neutral-900/90 border-blue-500/20 text-blue-300 hover:border-blue-400 hover:text-white shadow-sm'
              }`}
          >
            All Professionals
          </button>
          {availableTypes.map(type => {
            const isActive = selectedType === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-4 py-2 rounded-2xl text-xs font-black shrink-0 transition-all border-2 snap-start whitespace-nowrap active:scale-95
                  ${isActive
                    ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_16px_rgba(59,130,246,0.4)] scale-[1.02]'
                    : 'bg-neutral-900/90 border-blue-500/20 text-blue-300 hover:border-blue-400 hover:text-white shadow-sm'
                  }`}
              >
                {type}
              </button>
            );
          })}
        </div>
      )}

      {/* Professionals List Carousel */}
      <div className="flex gap-3 overflow-x-auto green-scrollbar pb-1.5 snap-x snap-mandatory">
        {filteredProfessionals.map((pro: any) => {
          const img = pro.imageUrls?.[0] || pro.logoUrl;
          return (
            <a
              key={pro.id}
              href={`/${locale}/turf/${pro.id}`}
              className="shrink-0 w-[70vw] max-w-[260px] snap-start block active:scale-[0.98] group"
            >
              <div className="relative glass-panel border border-white/5 hover:border-accent/30 rounded-2xl p-3 flex items-center gap-3 shadow-md group-active:border-accent/40 transition-all duration-300">
                {/* Ambient card background glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-accent/0 to-accent/[0.02] group-hover:to-accent/[0.04] transition-all duration-300 pointer-events-none" />
                
                {/* Avatar Container */}
                <div className="relative w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr from-blue-500 via-cyan-400 to-blue-600 shrink-0 shadow-md">
                  <div className="w-full h-full rounded-full bg-neutral-950 overflow-hidden flex items-center justify-center">
                    {img ? (
                      <img
                        src={img}
                        alt={pro.name}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <span className="text-xs font-black text-blue-400">
                        {getInitials(pro.name)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <h4 className="text-xs font-black truncate text-white group-hover:text-blue-400 transition-colors leading-snug flex items-center gap-1">
                    <span className="truncate">{pro.name}</span>
                    {pro.isVerified && <ShieldCheck size={12} className="text-blue-400 fill-current shrink-0" />}
                  </h4>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-block text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-[#00ff41]/10 border border-[#00ff41]/20 text-accent">
                      {pro.coachType || 'PRO'}
                    </span>
                    <span className="text-[9px] font-black text-neutral-400">⭐ 5.0</span>
                  </div>
                </div>
              </div>
            </a>
          );
        })}

        {/* Ghost placeholder cards if fewer than 3 professionals exist */}
        {filteredProfessionals.length < 3 && 
          Array.from({ length: 3 - filteredProfessionals.length }).map((_, i) => (
            <div 
              key={`ghost-${i}`} 
              className="shrink-0 w-[65vw] max-w-[220px] snap-start block opacity-30 select-none pointer-events-none relative overflow-hidden rounded-2xl border border-dashed border-white/5 bg-white/[0.01]"
            >
              <div className="absolute inset-0 backdrop-blur-[1px] bg-black/40 flex flex-col items-center justify-center p-3 text-center">
                <span className="text-[9px] font-black text-accent uppercase tracking-widest mb-1">Coming Soon</span>
                <span className="text-[8px] font-bold text-neutral-500 leading-tight">More coaches joining soon</span>
              </div>
              <div className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-900 border border-white/5 shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-2.5 w-16 bg-neutral-800 rounded" />
                  <div className="h-2 w-12 bg-neutral-900 rounded" />
                </div>
              </div>
            </div>
          ))
        }
      </div>
    </section>
  );
}
