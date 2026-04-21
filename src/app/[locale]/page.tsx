import HomeHeader from '@/components/home/HomeHeader';
import HeroBanner from '@/components/home/HeroBanner';
import SearchBar from '@/components/home/SearchBar';
import SportsTurfSection from '@/components/home/SportsTurfSection';
import prisma from '@/lib/prisma';

export default async function RootPage() {
  const [sports, turfs, bannerData] = await Promise.all([
    prisma.sport.findMany(),
    prisma.turf.findMany({
      where: { status: 'published' },
      include: {
        sports: { include: { sport: true } },
        grounds: { include: { slots: true } },
      },
    }),
    Promise.all([
      prisma.bannerSlide.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
      prisma.carouselSettings.findUnique({ where: { id: 'singleton' } }),
    ]),
  ]);

  const [bannerSlides, carouselSettings] = bannerData;

  // Build sportIds for each turf:
  // 1st priority: TurfSport join table (set by admin during approval)
  // 2nd priority: auto-derive from slot sports names (set by owner when creating slots)
  const turfsWithSportIds = turfs.map(t => {
    // Explicit join-table sports first
    let sportIds: string[] = t.sports.map((ts: any) => ts.sportId);

    if (sportIds.length === 0) {
      // Collect unique sport names from all slots across all grounds
      const slotSportNames = new Set<string>();
      t.grounds.forEach((g: any) =>
        g.slots.forEach((s: any) =>
          s.sports.forEach((n: string) => slotSportNames.add(n))
        )
      );

      // Match names → Sport IDs (case-insensitive partial match)
      sportIds = sports
        .filter(sp =>
          [...slotSportNames].some(n =>
            n.toLowerCase().includes(sp.name.toLowerCase()) ||
            sp.name.toLowerCase().includes(n.toLowerCase())
          )
        )
        .map(sp => sp.id);
    }

    return { ...t, sportIds };
  });

  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 pt-2 selection:bg-accent/30 selection:text-accent">
      <div className="w-full max-w-md mx-auto relative flex flex-col gap-2">
        <HomeHeader />
        <HeroBanner
          slides={bannerSlides}
          settings={carouselSettings ?? { autoSlide: true, intervalMs: 3500 }}
        />
        <SearchBar turfs={turfsWithSportIds as any} sports={sports} />
        <SportsTurfSection initialSports={sports} initialTurfs={turfsWithSportIds as any} />
      </div>
    </div>
  );
}
