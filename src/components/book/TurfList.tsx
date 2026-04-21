import { useTranslations } from 'next-intl';
import { Building2 } from 'lucide-react';

export default function TurfList({ turfs = [], cities = [], sports = [] }: { turfs: any[], cities: any[], sports: any[] }) {
  const t = useTranslations('Book.turfCard');

  if (turfs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/4 border border-white/8 flex items-center justify-center">
          <Building2 size={28} className="text-neutral-600" />
        </div>
        <div>
          <p className="font-bold text-white">No turfs listed yet</p>
          <p className="text-sm text-neutral-500 mt-0.5">
            Turfs will appear here once owners register and admin approves them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {turfs.map((turf) => {
        const primarySportId = turf.sportIds?.[0];
        const sportName = sports.find(s => s.id === primarySportId)?.name || 'Multi-Sport';
        const cityName = cities.find(c => c.id === turf.cityId)?.name || 'Local';
        const locationString = turf.area ? `${turf.area}, ${cityName}` : cityName;
        const coverImage = turf.imageUrls?.[0] || turf.logoUrl || "https://images.unsplash.com/photo-1518605368461-1ee18cd30f6b?auto=format&fit=crop&q=80";

        return (
          <a href={`/en/turf/${turf.id}`} key={turf.id} className="block active:scale-[0.98] transition-transform">
            <div className="glass rounded-3xl overflow-hidden flex flex-col border border-white/5 shadow-md">
              <div className="relative h-44 w-full bg-neutral-900">
                <img src={coverImage} alt={turf.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase text-white border border-white/10 shadow-sm">
                  {sportName}
                </div>
                {turf.logoUrl && (
                  <div className="absolute -bottom-5 right-4 w-12 h-12 rounded-full bg-neutral-800 border-[3px] border-[#0a0a0a] overflow-hidden shadow-lg z-10">
                    <img src={turf.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
              <div className="p-4 pt-7 flex flex-col gap-1">
                <h3 className="text-[17px] font-bold text-white tracking-tight">{turf.name}</h3>
                <p className="text-xs text-neutral-400 font-semibold">{locationString}</p>
                <div className="flex items-center justify-between mt-1 pt-3 border-t border-white/5">
                  <span className="text-xs font-bold text-accent">Tap to book a slot</span>
                  <span className="text-[11px] font-bold text-white">⭐ 5.0</span>
                </div>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
