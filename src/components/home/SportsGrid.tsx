import { useTranslations } from 'next-intl';
import { 
  Trophy, // Fallback icon
  Target, // Cricket
  CircleDot, // Billiard
  Waves, // Swimming
  Wind, // Badminton
  Activity // Futsal
} from 'lucide-react';

export default function SportsGrid() {
  const t = useTranslations('Home');

  const sports = [
    { id: 'futsal5', icon: Activity, titleKey: 'futsal5', badgeKey: 'popular', badgeColor: 'bg-accent text-black' },
    { id: 'futsal6', icon: Activity, titleKey: 'futsal6' },
    { id: 'cricket7', icon: Target, titleKey: 'cricket7', badgeKey: 'hot', badgeColor: 'bg-red-500 text-white' },
    { id: 'badminton', icon: Wind, titleKey: 'badminton' },
    { id: 'billiard', icon: CircleDot, titleKey: 'billiard' },
    { id: 'swimming', icon: Waves, titleKey: 'swimming', badgeKey: 'new', badgeColor: 'bg-blue-500 text-white' },
  ];

  return (
    <section className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold tracking-tight">{t('sportsTitle')}</h3>
        <span className="text-xs font-bold text-neutral-500 tracking-wider uppercase">
          {t('sportsAvailable')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {sports.map((sport) => {
          const IconObj = sport.icon;
          return (
            <div key={sport.id} className="relative glass py-2 pr-3 pl-2 rounded-full flex items-center gap-3 bg-gradient-to-b from-neutral-800 to-neutral-900 border border-neutral-600 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_6px_rgba(0,0,0,0.5)] hover:from-neutral-700 hover:to-neutral-800 transition-all cursor-pointer active:scale-95">
              
              {sport.badgeKey && (
                <div className={`absolute -top-1.5 right-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold tracking-wider z-10 shadow-lg border border-black/20 ${sport.badgeColor}`}>
                  {t(`badges.${sport.badgeKey}`)}
                </div>
              )}
              
              <div className="w-10 h-10 shrink-0 rounded-full bg-neutral-950 flex items-center justify-center border border-neutral-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                <IconObj size={18} className={sport.badgeKey === 'popular' ? 'text-accent' : 'text-white'} />
              </div>
              <span className="text-[11px] font-bold leading-tight">
                {t(`sports.${sport.titleKey}`)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
