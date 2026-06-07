'use client';
import { useTranslations } from 'next-intl';
import { Building2, Briefcase, GraduationCap, Send } from 'lucide-react';
import { Link } from '@/i18n/routing';

type RequestType = 'TURF_OWNER' | 'PROFESSIONAL' | 'COACH';

const TYPE_CONFIG: Record<RequestType, {
  titleKey: string;
  icon: typeof Building2;
  gradient: string;
  glow: string;
}> = {
  TURF_OWNER: {
    titleKey: 'turfOwnerTitle',
    icon: Building2,
    gradient: 'from-emerald-600/20 to-emerald-900/10',
    glow: 'group-hover:shadow-emerald-500/20',
  },
  PROFESSIONAL: {
    titleKey: 'organizerTitle',
    icon: Briefcase,
    gradient: 'from-blue-600/20 to-blue-900/10',
    glow: 'group-hover:shadow-blue-500/20',
  },
  COACH: {
    titleKey: 'coachTitle',
    icon: GraduationCap,
    gradient: 'from-fuchsia-600/20 to-fuchsia-900/10',
    glow: 'group-hover:shadow-fuchsia-500/20',
  },
};

export default function JoinUsBentoSection() {
  const t = useTranslations('Home');

  return (
    <section className="px-4 flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <Send size={15} className="text-accent" />
        <h3 className="text-base font-black tracking-tight text-white">{t('joinPlatform')}</h3>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {(Object.keys(TYPE_CONFIG) as RequestType[]).map(type => {
          const cfg = TYPE_CONFIG[type];
          const Icon = cfg.icon;
          return (
            <Link
              key={type}
              href={`/join?type=${type}`}
              className={`group relative flex flex-col items-center text-center gap-2 p-3 rounded-2xl bg-gradient-to-b ${cfg.gradient} border border-white/8 hover:border-white/20 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl ${cfg.glow}`}
            >
              <div className="w-9 h-9 rounded-xl bg-white/8 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-200">
                <Icon size={18} className="text-white" />
              </div>
              <p className="text-[9px] font-black text-white leading-tight">{t(cfg.titleKey)}</p>
              <span className="text-[8px] font-black uppercase tracking-widest text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full mt-auto">
                {t('joinUsBtn')} →
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

