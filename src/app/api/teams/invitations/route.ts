import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { mapEnumToSport } from '../route';

function getPlayerId(req: NextRequest): string | null {
  return req.cookies.get('bmt_player_id')?.value ?? null;
}

export async function GET(req: NextRequest) {
  const playerId = getPlayerId(req);
  if (!playerId) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  try {
    const invitations = await prisma.teamInvitation.findMany({
      where: {
        playerId,
        status: 'PENDING',
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            sportType: true,
            teamType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = invitations.map((invite) => ({
      id: invite.id,
      teamId: invite.teamId,
      status: invite.status,
      createdAt: invite.createdAt,
      team: {
        ...invite.team,
        sport: mapEnumToSport(invite.team.sportType),
      },
    }));

    return NextResponse.json({ invitations: formatted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Exception' }, { status: 500 });
  }
}
