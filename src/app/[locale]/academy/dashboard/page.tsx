import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import AcademyDashboardClient from './AcademyDashboardClient';

export const revalidate = 0;

export default async function AcademyDashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const cookieStore = await cookies();
  const playerId = cookieStore.get('bmt_player_id')?.value || null;
  const ownerId = cookieStore.get('bmt_owner_id')?.value || null;
  const role = cookieStore.get('bmt_role')?.value || null;
  const resolvedParams = await params;
  const { locale } = resolvedParams;

  if (!playerId && !ownerId) {
    redirect(`/${locale}/login`);
  }

  // Pre-load academy if exists
  const academy = await prisma.academy.findFirst({
    where: {
      OR: [
        ...(playerId ? [{ ownerPlayerId: playerId }] : []),
        ...(ownerId ? [{ ownerOwnerId: ownerId }] : [])
      ]
    },
    include: {
      media: { orderBy: { sortOrder: 'asc' } },
      programs: { orderBy: { sortOrder: 'asc' } },
      coaches: { orderBy: { sortOrder: 'asc' } },
      alumni: {
        include: {
          player: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              mmr: true,
              playerCode: true
            }
          }
        }
      }
    }
  });

  return (
    <AcademyDashboardClient
      initialAcademy={academy}
      isAuthed={true}
      role={role}
      locale={locale}
    />
  );
}
