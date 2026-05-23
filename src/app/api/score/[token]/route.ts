import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateScorerToken } from '@/lib/tournament/token-generator';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Validate token and get match ID
    const matchId = await validateScorerToken(token);

    // Fetch match data
    const match = await prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: {
        tournament: {
          include: {
            registrations: {
              select: {
                id: true,
                entityId: true,
                entityType: true,
                registeredAt: true,
                status: true,
                entryFeePaid: true,
              },
              orderBy: { registeredAt: 'asc' },
            }
          }
        }
      }
    });

    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    // Enrich registrations manually just like in the tournament detail route
    const registrations = match.tournament.registrations;
    const teamIds = registrations.filter((r: any) => r.entityType === 'TEAM').map((r: any) => r.entityId);
    const playerIds = registrations.filter((r: any) => r.entityType === 'PLAYER').map((r: any) => r.entityId);

    const [teams, players] = await Promise.all([
      teamIds.length > 0 ? prisma.team.findMany({
        where: { id: { in: teamIds } },
        include: {
          members: {
            include: {
              player: { select: { id: true, fullName: true, avatarUrl: true } }
            }
          }
        }
      }) : Promise.resolve([]),
      playerIds.length > 0 ? prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, fullName: true, avatarUrl: true }
      }) : Promise.resolve([])
    ]);

    const teamMap = new Map(teams.map(t => [t.id, t]));
    const playerMap = new Map(players.map(p => [p.id, p]));

    const enrichedRegistrations = registrations.map((r: any) => ({
      ...r,
      team: r.entityType === 'TEAM' ? teamMap.get(r.entityId) : null,
      player: r.entityType === 'PLAYER' ? playerMap.get(r.entityId) : null,
    }));

    // Construct response data with enriched registrations
    const enrichedMatch = {
      ...match,
      tournament: {
        ...match.tournament,
        registrations: enrichedRegistrations
      }
    };

    return NextResponse.json({ success: true, data: enrichedMatch });
  } catch (error: any) {
    console.error('Error validating scorer token:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
