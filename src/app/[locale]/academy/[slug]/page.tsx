import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import AcademyDetailClient from './AcademyDetailClient';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function AcademyDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { slug, locale } = resolvedParams;

  const academy = await prisma.academy.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      media: { orderBy: { sortOrder: 'asc' } },
      programs: { orderBy: { sortOrder: 'asc' } },
      coaches: {
        orderBy: { sortOrder: 'asc' },
        include: {
          coachPlayer: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              mmr: true,
              footballMmr: true,
              cricketMmr: true,
              playerCode: true
            }
          }
        }
      },
      alumni: {
        where: { confirmedByPlayer: true },
        include: {
          player: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              mmr: true,
              footballMmr: true,
              cricketMmr: true,
              playerCode: true
            }
          }
        }
      }
    }
  });

  if (!academy) {
    notFound();
  }

  // Count ranked alumni students (Silver or above is MMR >= 675)
  const silverOrAboveCount = academy.alumni.filter(a => {
    const mmr = Math.max(a.player.footballMmr, a.player.cricketMmr, a.player.mmr);
    return mmr >= 675;
  }).length;

  return (
    <AcademyDetailClient
      academy={academy}
      silverOrAboveCount={silverOrAboveCount}
      locale={locale}
    />
  );
}
