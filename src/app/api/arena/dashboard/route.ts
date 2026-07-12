import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const revalidate = 0; // Disable server-side caching

export async function GET(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch user managed teams (captained/owned)
    const myTeams = await prisma.team.findMany({
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
        teamMmr: true
      }
    });

    const myTeamIds = myTeams.map(t => t.id);

    // 2. Fetch matches for Zone 1 (Up Next)
    let upNext: any = null;
    let upNextType: 'LIVE' | 'SCHEDULED' | 'INTERACTION' | null = null;

    if (myTeamIds.length > 0) {
      const activeMatches = await prisma.match.findMany({
        where: {
          OR: [
            { teamA_Id: { in: myTeamIds } },
            { teamB_Id: { in: myTeamIds } }
          ],
          status: { in: ['LIVE', 'SCHEDULED', 'INTERACTION'] }
        },
        include: {
          teamA: { select: { id: true, name: true, logoUrl: true } },
          teamB: { select: { id: true, name: true, logoUrl: true } }
        },
        orderBy: {
          matchDate: 'asc'
        }
      });

      // Find highest priority: LIVE -> SCHEDULED -> INTERACTION
      const liveMatch = activeMatches.find(m => m.status === 'LIVE');
      const scheduledMatch = activeMatches.find(m => m.status === 'SCHEDULED');
      const interactionMatch = activeMatches.find(m => m.status === 'INTERACTION');

      const targetMatch = liveMatch || scheduledMatch || interactionMatch;

      if (targetMatch) {
        let selectedSlotInfo = null;
        if (targetMatch.selectedSlotId) {
          const slot = await prisma.slot.findUnique({
            where: { id: targetMatch.selectedSlotId },
            include: { ground: { include: { turf: { select: { name: true } } } } }
          });
          if (slot) {
            selectedSlotInfo = {
              turfName: slot.ground.turf.name,
              startTime: slot.startTime,
              endTime: slot.endTime,
              price: slot.price
            };
          }
        }

        upNext = {
          ...targetMatch,
          selectedSlotInfo
        };
        upNextType = targetMatch.status as any;
      }
    }

    // 3. Fetch Zone 2 attention metrics
    let attention = {
      challengesReceived: 0,
      proposalsAwaitingConfirm: 0,
      scoreVerificationPending: 0,
      badgeDistributionPending: 0
    };

    if (myTeamIds.length > 0) {
      // Challenges Received (PENDING, teamB in myTeams)
      attention.challengesReceived = await prisma.match.count({
        where: {
          status: 'PENDING',
          teamB_Id: { in: myTeamIds }
        }
      });

      // Proposals awaiting confirm (INTERACTION, teamB in myTeams, venue not confirmed or slot not booked)
      attention.proposalsAwaitingConfirm = await prisma.match.count({
        where: {
          status: 'INTERACTION',
          teamB_Id: { in: myTeamIds },
          OR: [
            { venueConfirmedByB: false, venueType: { not: null } },
            { venueBookedAt: null, selectedSlotId: { not: null } }
          ]
        }
      });

      // Score verification pending (SCORE_ENTRY, user team hasn't agreed)
      const pendingScoreMatches = await prisma.match.findMany({
        where: {
          status: 'SCORE_ENTRY',
          OR: [
            { teamA_Id: { in: myTeamIds } },
            { teamB_Id: { in: myTeamIds } }
          ]
        },
        select: {
          teamA_Id: true,
          teamB_Id: true,
          agreedByA: true,
          agreedByB: true,
          scoreSubmittedByA: true,
          scoreSubmittedByB: true
        }
      });

      let verificationCount = 0;
      pendingScoreMatches.forEach(m => {
        const isTeamA = myTeamIds.includes(m.teamA_Id);
        if (isTeamA) {
          if (!m.agreedByA || !m.scoreSubmittedByA) {
            verificationCount++;
          }
        } else {
          if (!m.agreedByB || !m.scoreSubmittedByB) {
            verificationCount++;
          }
        }
      });
      attention.scoreVerificationPending = verificationCount;

      // Badge distribution pending (COMPLETED, badgeBonusApplied is false)
      attention.badgeDistributionPending = await prisma.match.count({
        where: {
          status: 'COMPLETED',
          badgeBonusApplied: false,
          OR: [
            { teamA_Id: { in: myTeamIds } },
            { teamB_Id: { in: myTeamIds } }
          ]
        }
      });
    }

    // 4. Fetch Zone 4 Discover widgets
    // Open challenges posted by OTHERS
    const openChallenges = await prisma.openChallenge.findMany({
      where: {
        status: 'open',
        teamId: { notIn: myTeamIds }
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            teamMmr: true
          }
        }
      },
      orderBy: {
        windowStart: 'asc'
      },
      take: 3
    });

    // Upcoming/Ongoing Tournament
    const tournament = await prisma.tournament.findFirst({
      where: {
        status: { notIn: ['COMPLETED', 'CANCELLED', 'DRAFT'] }
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        sport: true,
        status: true,
        entryFee: true,
        formatConfig: true
      }
    });

    // Top 3 Teams Leaderboard
    const leaderboard = await prisma.team.findMany({
      where: {
        isDisbanded: false,
        teamType: 'REGULAR'
      },
      orderBy: {
        teamMmr: 'desc'
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        teamMmr: true
      },
      take: 3
    });

    return NextResponse.json({
      myTeams,
      upNext,
      upNextType,
      attention,
      discover: {
        openChallenges,
        tournament,
        leaderboard
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
