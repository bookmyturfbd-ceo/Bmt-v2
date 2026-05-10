import { useTranslations } from 'next-intl';
import { Building2 } from 'lucide-react';

export default function TurfCarousel() {
  const t = useTranslations('Home');

  // Turfs are loaded from the database (published turfs only).
  // No hardcoded demo data — list will populate once admin approves turfs.
  const turfs: { id: number; name: string; image: string; distance: string }[] = [];

  return (
    <section className="px-0 py-4 mb-6">
      <div className="flex items-center justify-between px-4 mb-4">
        <h3 className="text-xl font-bold tracking-tight">{t('turfsTitle')}</h3>
        <a href="#" className="text-sm font-bold text-accent hover:underline">
          {t('viewAll')}
        </a>
      </div>

      {turfs.length === 0 ? (
        <div className="mx-4 flex flex-col items-center justify-center gap-2 py-10 rounded-2xl border border-dashed border-white/10 bg-white/2 text-center">
          <Building2 size={28} className="text-neutral-600" />
          <p className="text-sm font-semibold text-neutral-500">No turfs available yet</p>
          <p className="text-xs text-neutral-600">Check back soon — turfs are being onboarded!</p>
        </div>
      ) : (
        <div className="flex overflow-x-auto gap-4 px-4 pb-4 snap-x snap-mandatory hide-scrollbar [&::-webkit-scrollbar]:hidden">
          {turfs.map((turf) => (
            <div key={turf.id} className="min-w-[260px] md:min-w-[300px] flex-shrink-0 snap-center flex flex-col gap-2 cursor-pointer active:scale-95 transition-transform">
              <div className="w-full h-36 rounded-2xl overflow-hidden relative">
                <img src={turf.image} alt={turf.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-3">
                  <div className="text-xs font-bold bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-md border border-white/10">
                    {turf.distance}
                  </div>
                </div>
              </div>
              <h4 className="font-bold text-white tracking-wide truncate px-1">{turf.name}</h4>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
