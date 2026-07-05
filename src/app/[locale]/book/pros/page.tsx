import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import BookProsClient from '@/components/pros/BookProsClient';

export const revalidate = 0; // Dynamic server fetching

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Book Professionals & Coaches | BMT Sports',
    description: 'Find and book top-rated verified coaches, personal trainers, referees, and physios. 1-on-1 private training sessions and monthly coaching packages.',
    openGraph: {
      title: 'Book Certified Coaches & Professionals | BMT',
      description: 'Book certified sports professionals for 1-on-1 private training sessions and monthly packages.',
      images: ['/bmt-logo.png'],
    },
  };
}

export default async function BookProsPage() {
  const [rawCoaches, cities, divisions, setting] = await Promise.all([
    prisma.turf.findMany({
      where: { isCoachProfile: true, status: 'published' },
      orderBy: { displayOrder: 'asc' },
    }),
    prisma.city.findMany({ select: { id: true, name: true, divisionId: true } }),
    prisma.division.findMany({ select: { id: true, name: true } }),
    prisma.turfServiceSetting.findUnique({ where: { id: 'singleton' } }),
  ]);

  const coaches = rawCoaches.map(c => ({
    id: c.id,
    name: c.name,
    status: c.status,
    cityId: c.cityId,
    divisionId: c.divisionId,
    area: c.area,
    imageUrls: c.imageUrls,
    isCoachProfile: c.isCoachProfile,
    coachType: c.coachType,
    professions: c.professions,
    displayOrder: c.displayOrder,
  }));

  const professions = setting?.professionTypes || [
    'Cricket Coach',
    'Football Coach',
    'Physio',
    'Personal Trainer',
    'Referee'
  ];

  return (
    <BookProsClient
      coaches={coaches}
      cities={cities}
      divisions={divisions}
      professions={professions}
    />
  );
}
