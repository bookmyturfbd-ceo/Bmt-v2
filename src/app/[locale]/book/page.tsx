import { Suspense } from 'react';
import BookEngine from '@/components/book/BookEngine';
import prisma from '@/lib/prisma';

export default async function BookPage() {
  const [turfsRaw, sports, cities, slots] = await Promise.all([
    prisma.turf.findMany({ 
       where: { status: 'published' },
       include: { sports: true }
    }),
    prisma.sport.findMany(),
    prisma.city.findMany(),
    prisma.slot.findMany()
  ]);

  const turfs = turfsRaw.map(t => ({
    ...t,
    sportIds: t.sports.map(ts => ts.sportId)
  }));

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24 pt-4 selection:bg-accent/30 selection:text-accent">
      <div className="w-full max-w-md mx-auto relative flex flex-col px-4">
        <h1 className="text-xl font-black mb-4 tracking-wider uppercase drop-shadow-md">Bookings</h1>
        <Suspense fallback={<div className="py-20 text-center text-[var(--muted)] text-sm animate-pulse">Loading…</div>}>
          <BookEngine turfs={turfs} sports={sports} cities={cities} slots={slots} />
        </Suspense>
      </div>
    </div>
  );
}
