import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { GuestProfileClient } from './GuestProfileClient';

export const revalidate = 0;

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const cookieStore = await cookies();
  const playerId = cookieStore.get('bmt_player_id')?.value;
  const auth = cookieStore.get('bmt_auth')?.value;

  if (!playerId || !auth) {
    return <GuestProfileClient />;
  }

  const player = await prisma.player.findUnique({
    where: { id: playerId },
    select: { playerCode: true },
  });

  if (player?.playerCode) {
    redirect(`/${locale}/player/${player.playerCode}`);
  }

  // Fallback if no player code yet
  redirect(`/${locale}/login`);
}
