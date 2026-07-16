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
    gradient: 'from-neutral-900/60 to-neutral-900/40',
    glow: 'group-hover:shadow-accent/5',
  },
  PROFESSIONAL: {
    titleKey: 'organizerTitle',
    icon: Briefcase,
    gradient: 'from-neutral-900/60 to-neutral-900/40',
    glow: 'group-hover:shadow-accent/5',
  },
  COACH: {
    titleKey: 'coachTitle',
    icon: GraduationCap,
    gradient: 'from-neutral-900/60 to-neutral-900/40',
    glow: 'group-hover:shadow-accent/5',
  },
};

export default function JoinUsBentoSection({ compact = false }: { compact?: boolean }) {
  const t = useTranslations('Home');

  if (compact) {
    return (
      <section className="px-4 flex flex-col gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 text-center">Join BMT Platform</p>
        <div className="flex gap-2 justify-center items-center flex-wrap">
          {(Object.keys(TYPE_CONFIG) as RequestType[]).map(type => {
            const cfg = TYPE_CONFIG[type];
            const Icon = cfg.icon;
            return (
              <Link
                key={type}
                href={`/join?type=${type}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 border border-white/5 hover:border-accent/30 text-[10px] font-black text-white hover:text-accent transition-colors"
              >
                <Icon size={12} className="text-accent" />
                <span>{t(cfg.titleKey)}</span>
              </Link>
            );
          })}
        </div>
      </section>
    );
  }

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
              className={`group relative flex flex-col items-center text-center gap-2 p-3 rounded-2xl bg-gradient-to-b ${cfg.gradient} border border-white/5 hover:border-accent/30 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl ${cfg.glow}`}
            >
              <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center border border-accent/20 group-hover:scale-110 transition-transform duration-200">
                <Icon size={18} className="text-accent" />
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
