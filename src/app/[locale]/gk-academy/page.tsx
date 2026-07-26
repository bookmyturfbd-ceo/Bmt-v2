import prisma from '@/lib/prisma';
import GkAcademyClientPage from './GkAcademyClientPage';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Join Goalkeeper Academy | Coach Manna (Uttara) | Book My Turf',
  description: 'Pre-register for Goalkeeper Academy with Head Coach Nahidur Rahman Manna at Uttara, Dhaka. Reserve your slot now.',
  openGraph: {
    title: 'Join Goalkeeper Academy | Coach Manna (Uttara)',
    description: 'Pre-register for Goalkeeper Academy with Head Coach Nahidur Rahman Manna at Uttara, Dhaka. Reserve your slot now.',
    images: ['https://bvimgjnauzbpauyhjrky.supabase.co/storage/v1/object/public/bmt-public/turfs/kho2asb6ofs_1784475842437.jpg'],
  },
};

export default async function GkAcademyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  const coachManna = await prisma.turf.findFirst({
    where: {
      isCoachProfile: true,
      name: { contains: 'Manna', mode: 'insensitive' }
    },
    select: {
      id: true,
      name: true,
      coachType: true,
      area: true,
      imageUrls: true,
      logoUrl: true
    }
  });

  return (
    <GkAcademyClientPage
      locale={locale}
      coachManna={coachManna ? {
        id: coachManna.id,
        name: coachManna.name,
        coachType: coachManna.coachType,
        area: coachManna.area,
        imageUrls: coachManna.imageUrls,
        logoUrl: coachManna.logoUrl,
      } : null}
    />
  );
}
