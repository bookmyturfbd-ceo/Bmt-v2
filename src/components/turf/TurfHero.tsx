'use client';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { useRouter } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export default function TurfHero({ turf }: { turf: any }) {
  const router = useRouter();
  const t = useTranslations('TurfDetails');

  return (
    <div className="relative w-full h-72 bg-neutral-900 border-b border-white/5 shadow-2xl overflow-hidden">
      
      {/* Native CSS Snap Gallery */}
      <div className="w-full h-full flex overflow-x-auto snap-x snap-mandatory hide-scrollbar">
        {turf.images && turf.images.length > 0 ? (
          turf.images.map((img: string, idx: number) => (
            <img key={idx} src={img} alt={`${turf.name} ${idx + 1}`} className="w-full h-full object-cover shrink-0 snap-center" />
          ))
        ) : (
          <div className="w-full h-full bg-neutral-800 shrink-0 snap-center flex flex-col justify-center items-center text-neutral-600">
             <span className="text-xs font-black tracking-widest uppercase">No Images Provided</span>
          </div>
        )}
      </div>

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/95 via-black/20 to-black/30" />
      
      {/* Top Navbar */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10 pt-safe pointer-events-none">
        <button 
          onClick={() => router.back()} 
          className="pointer-events-auto w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10 backdrop-blur-md active:scale-95 shadow-md bg-black/40"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>
        <div className="pointer-events-auto px-3 py-1.5 rounded-full glass flex items-center gap-1.5 border border-white/10 backdrop-blur-md shadow-md bg-black/40">
           <svg className="w-3.5 h-3.5 text-yellow-500 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
           <span className="text-xs font-black text-white">{turf.rating.toFixed(1)}</span>
           <span className="text-[10px] font-bold text-neutral-400">({turf.reviewCount})</span>
        </div>
      </div>

      {/* Gallery Indicators (if multiple) */}
      {turf.images && turf.images.length > 1 && (
        <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-1.5 z-10 pointer-events-none">
           {turf.images.map((_: any, idx: number) => (
             <div key={idx} className="w-1.5 h-1.5 rounded-full bg-white/50 backdrop-blur-md shadow" />
           ))}
        </div>
      )}

      {/* Bottom Content */}
      <div className="absolute bottom-8 left-5 right-5 flex flex-col gap-1.5 z-10 pointer-events-none">
        <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-lg leading-none">{turf.name}</h1>
      </div>
    </div>
  );
}
