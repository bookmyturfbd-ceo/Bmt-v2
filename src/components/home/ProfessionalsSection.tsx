'use client';

import { useState } from 'react';
import { Sparkles, MapPin, ChevronRight } from 'lucide-react';
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

  // Get unique professional types that exist in the active professionals list
  const availableTypesSet = new Set<string>();
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
  const availableTypes = Array.from(availableTypesSet).sort();

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
          <Sparkles size={16} className="text-blue-400" />
          <h3 className="text-base font-black tracking-tight text-white">{t('hireProfessionals')}</h3>
        </div>
        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
          {filteredProfessionals.length} {t('active')}
        </span>
      </div>

      {/* Professional Type Filter Pills */}
      {availableTypes.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 snap-x">
          <button
            onClick={() => setSelectedType('ALL')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black shrink-0 transition-all border snap-start whitespace-nowrap
              ${selectedType === 'ALL'
                ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:border-blue-500/30'
              }`}
          >
            All
          </button>
          {availableTypes.map(type => {
            const isActive = selectedType === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black shrink-0 transition-all border snap-start whitespace-nowrap
                  ${isActive
                    ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
                    : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:border-blue-500/30'
                  }`}
              >
                {type}
              </button>
            );
          })}
        </div>
      )}

      {/* Professionals List Carousel */}
      {filteredProfessionals.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border border-dashed border-white/5 bg-white/[0.01] text-center">
          <p className="text-xs font-semibold text-neutral-500">No professionals available for this type</p>
        </div>
      ) : (
        <div className="flex gap-3.5 overflow-x-auto no-scrollbar pb-1.5 snap-x snap-mandatory">
          {filteredProfessionals.map((pro: any) => {
            const img = pro.imageUrls?.[0] || pro.logoUrl;
            return (
              <a
                key={pro.id}
                href={`/${locale}/turf/${pro.id}`}
                className="shrink-0 w-[42vw] max-w-[170px] snap-start block active:scale-[0.98] transition-all duration-300 hover:-translate-y-0.5 group"
              >
                <div className="relative glass-panel border border-white/5 rounded-3xl overflow-hidden flex flex-col shadow-lg group-hover:border-blue-500/30 transition-all duration-300">
                  {/* Ambient card background glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/0 to-blue-500/5 group-hover:to-blue-500/10 transition-all duration-300" />
                  
                  {/* Photo Container */}
                  <div className="relative h-32 w-full bg-neutral-950 shrink-0 flex items-center justify-center overflow-hidden">
                    {img ? (
                      <>
                        <img
                          src={img}
                          alt={pro.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent" />
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-600/10 to-blue-900/10 flex items-center justify-center border-b border-white/5">
                        <span className="text-2xl font-black text-blue-400">
                          {getInitials(pro.name)}
                        </span>
                      </div>
                    )}
                    
                    {/* Overlay Role Badge */}
                    <div className="absolute top-2 left-2">
                      <span className="inline-block text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-500/80 text-white backdrop-blur-sm border border-blue-400/20 shadow-sm">
                        {pro.coachType || 'PRO'}
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-3 flex flex-col gap-0.5 relative z-10">
                    <h4 className="text-xs font-black truncate text-white group-hover:text-blue-400 transition-colors leading-snug">
                      {pro.name}
                    </h4>
                    <div className="flex items-center gap-1 text-[9px] text-[var(--muted)] font-semibold truncate mt-0.5">
                      <MapPin size={9} className="text-blue-400 shrink-0" />
                      <span>{pro.area || 'BD'}</span>
                    </div>
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[9.5px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-0.5 group-hover:brightness-110 transition-all">
                        {t('bookSession')} <ChevronRight size={10} className="transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </section>
  );
}
