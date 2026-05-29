import { Suspense } from 'react';
import BookEngine from '@/components/book/BookEngine';
import prisma from '@/lib/prisma';
import { Clock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import BookComingSoonClient from '@/components/book/BookComingSoonClient';

// ── Inline coming-soon screen (server component, no state needed) ──────────────
async function BookComingSoon({ launchAt, locale }: { launchAt: Date | null; locale: string }) {
  const t = await getTranslations({ locale, namespace: 'Book' });
  return (
    <div className="flex flex-col min-h-screen bg-background pb-24 pt-4 selection:bg-accent/30 selection:text-accent">
      <div className="w-full max-w-md mx-auto relative flex flex-col px-4">
        <h1 className="text-xl font-black mb-4 tracking-wider uppercase drop-shadow-md">{t('comingSoon.title')}</h1>
        <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-b from-black/80 to-neutral-900/80 p-8 flex flex-col items-center text-center gap-5 mt-4 shadow-[0_0_60px_rgba(0,255,65,0.08)]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_-10%,rgba(0,255,65,0.08),transparent)] pointer-events-none" />
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-2">
              <Clock size={28} className="text-accent" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">{t('comingSoon.title')}</h2>
            <p className="text-accent font-black text-sm tracking-widest uppercase">{t('comingSoon.status')}</p>
            <p className="text-xs text-neutral-400 font-medium mt-1 max-w-[260px]">
              {t('comingSoon.description')}
            </p>
          </div>
          {launchAt && (
            <div className="relative z-10 w-full">
              <CountdownClient launchAt={launchAt.toISOString()} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CountdownClient({ launchAt }: { launchAt: string }) {
  return <BookComingSoonClient launchAt={launchAt} />;
}

export default async function BookPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Book' });

  const [turfsRaw, sports, cities, slots, turfServiceSetting] = await Promise.all([
    prisma.turf.findMany({
      where: { status: 'published' },
      include: { sports: true }
    }),
    prisma.sport.findMany(),
    prisma.city.findMany(),
    prisma.slot.findMany(),
    prisma.turfServiceSetting.findUnique({ where: { id: 'singleton' } }),
  ]);

  const serializedSetting = turfServiceSetting ? {
    isActive: turfServiceSetting.isActive,
    launchAt: turfServiceSetting.launchAt ? turfServiceSetting.launchAt.toISOString() : null
  } : null;

  const turfs = turfsRaw.map((t: typeof turfsRaw[number]) => ({
    ...t,
    sportIds: t.sports.map((ts: { sportId: string }) => ts.sportId)
  }));

  // If timer is active, display the translated coming soon screen
  if (turfServiceSetting?.isActive) {
    return <BookComingSoon launchAt={turfServiceSetting.launchAt} locale={locale} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24 pt-4 selection:bg-accent/30 selection:text-accent">
      <div className="w-full max-w-md mx-auto relative flex flex-col px-4">
        <h1 className="text-xl font-black mb-4 tracking-wider uppercase drop-shadow-md">{t('comingSoon.title')}</h1>
        <Suspense fallback={<div className="py-20 text-center text-[var(--muted)] text-sm animate-pulse">Loading…</div>}>
          <BookEngine turfs={turfs} sports={sports} cities={cities} slots={slots} turfServiceSetting={serializedSetting} />
        </Suspense>
      </div>
    </div>
  );
}
