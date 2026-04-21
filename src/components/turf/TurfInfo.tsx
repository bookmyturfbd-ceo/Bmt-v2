'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MapPin, FileText, X } from 'lucide-react';

export default function TurfInfo({ turf }: { turf: any }) {
  const t = useTranslations('TurfDetails');
  const [showRules, setShowRules] = useState(false);
  
  return (
    <div className="px-5 pb-6 flex flex-col gap-6">
      {/* Sports Layout */}
      {turf.sportsList && turf.sportsList.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {turf.sportsList.map((sport: string) => (
             <div key={sport} className="bg-accent/20 border border-accent/40 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase text-accent shadow-sm">
               {sport}
             </div>
          ))}
        </div>
      )}

      {/* Address & Map */}
      <div className="flex items-center justify-between gap-4 glass p-4 rounded-2xl border border-white/5 shadow-sm">
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-start gap-2">
            <MapPin size={18} className="text-accent mt-0.5 shrink-0" />
            <p className="text-sm font-semibold text-neutral-300 leading-tight">{turf.address}</p>
          </div>
          {turf.mapLink && (
            <a href={turf.mapLink} target="_blank" rel="noopener noreferrer" 
               className="ml-6 inline-flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors w-fit">
              <span className="underline underline-offset-2">Open in Google Maps</span> ↗
            </a>
          )}
        </div>
      </div>

      {/* Amenities & Rules */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <h3 className="text-[13px] font-bold tracking-widest uppercase text-neutral-400">{t('amenities')}</h3>
          <div className="flex flex-wrap gap-2">
            {turf.amenities.map((amenity: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-full shadow-inner">
                <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_5px_rgba(0,255,0,0.8)]" />
                <span className="text-xs font-bold text-neutral-300 tracking-wide">{amenity}</span>
              </div>
            ))}
          </div>
        </div>

        {/* House Rules Button */}
        {turf.rules && (
          <button onClick={() => setShowRules(true)} className="flex items-center gap-2 px-4 py-3 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400 w-full hover:bg-orange-500/20 transition-colors">
            <FileText size={16} />
            <span className="text-sm font-bold">House Rules & Terms</span>
          </button>
        )}
      </div>

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowRules(false)} />
          <div className="relative w-full max-w-sm glass border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <FileText size={20} className="text-accent" /> House Rules
              </h3>
              <button onClick={() => setShowRules(false)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-y-auto whitespace-pre-wrap text-sm text-neutral-300 leading-relaxed custom-scrollbar pr-2">
              {turf.rules}
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 shrink-0">
              <button onClick={() => setShowRules(false)} className="w-full py-3 bg-accent text-black font-black rounded-xl">
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
