import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import ArenaClient from './ArenaClient';

export const revalidate = 0; // force dynamic rendering to ensure fresh database query on every page load

export default async function ArenaPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  
  const cookieStore = await cookies();
  const auth = cookieStore.has('bmt_auth');
  const role = cookieStore.get('bmt_role')?.value;
  const playerId = cookieStore.get('bmt_player_id')?.value;
  
  const isAuthed = auth && (!role || role === 'player');

  // Server-side fetching in parallel
  let avatar = '';
  let initials = 'P';
  let myTeams: any[] = [];
  let received: any[] = [];
  let upcoming: any[] = [];
  let scorerMatches: any[] = [];

  const promises: Promise<any>[] = [];

  // 1. Fetch Player profile details
  if (isAuthed && playerId) {
    promises.push(
      prisma.player.findUnique({
        where: { id: playerId },
        select: { fullName: true, avatarUrl: true }
      }).then(p => {
        if (p) {
          avatar = p.avatarUrl || '';
          initials = p.fullName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'P';
        }
      })
    );

    // 2. Fetch My Teams
    promises.push(
      prisma.team.findMany({
        where: {
          isDisbanded: false,
          teamType: 'REGULAR',
          OR: [
            { ownerId: playerId },
            {
              members: {
                some: {
                  playerId: playerId,
                  role: { in: ['owner', 'manager', 'captain'] }
                }
              }
            }
          ]
        },
        select: {
          id: true,
          name: true,
          logoUrl: true,
          sportType: true,
          teamMmr: true,
          ownerId: true,
          isSubscribed: true,
          isVerified: true,
          teamCode: true
        }
      }).then(t => {
        myTeams = t;
      })
    );

    // 3. Fetch Scorer Entries
    promises.push(
      prisma.matchScorer.findMany({
        where: { playerId },
        select: { matchId: true }
      }).then(async (entries) => {
        const scorerMatchIds = entries.map(s => s.matchId);
        if (scorerMatchIds.length > 0) {
          scorerMatches = await prisma.match.findMany({
            where: {
              id: { in: scorerMatchIds },
              status: { notIn: ['CANCELLED', 'COMPLETED', 'DISPUTED'] },
            },
            select: { id: true, status: true }
          });
        }
      })
    );
  }

  // 4. Fetch Tournaments
  let tournaments: any[] = [];
  promises.push(
    prisma.tournament.findMany({
      where: {
        OR: [
          { status: { not: 'DRAFT' } },
          { status: 'DRAFT', isRegistrationOpen: true },
          { status: 'DRAFT', registrationOpenAt: { not: null } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        sport: true,
        status: true,
        entryFee: true,
        formatConfig: true,
      },
      take: 3
    }).then(t => {
      tournaments = t;
    })
  );

  // Wait for initial DB calls
  await Promise.all(promises);

  // 5. Fetch Challenges once team IDs are known
  if (myTeams.length > 0) {
    const myTeamIds = myTeams.map(t => t.id);
    const challengePromises = [
      prisma.match.findMany({
        where: {
          status: { notIn: ['CANCELLED'] },
          teamB_Id: { in: myTeamIds },
        },
        select: { id: true, status: true }
      }).then(r => { received = r; }),

      prisma.match.findMany({
        where: {
          status: { in: ['SCHEDULED', 'LIVE', 'SCORE_ENTRY', 'COMPLETED', 'DISPUTED'] },
          OR: [{ teamA_Id: { in: myTeamIds } }, { teamB_Id: { in: myTeamIds } }],
        },
        select: { id: true, status: true }
      }).then(u => { upcoming = u; })
    ];
    await Promise.all(challengePromises);
  }

  const challenges = {
    received,
    upcoming: [
      ...upcoming,
      ...scorerMatches.filter(sm => !upcoming.some(u => u.id === sm.id))
    ]
  };

  return (
    <ArenaClient
      initials={initials}
      avatar={avatar}
      isAuthed={isAuthed}
      myTeams={myTeams}
      challenges={challenges}
      tournaments={tournaments}
      locale={locale}
    />
  );
}
