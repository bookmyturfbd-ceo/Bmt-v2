import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { notify } from '@/lib/notificationService';

function getPlayerId(req: NextRequest): string | null {
  return req.cookies.get('bmt_player_id')?.value ?? null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const playerId = getPlayerId(req);
  if (!playerId) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const invite = await prisma.teamInvitation.findUnique({
      where: { id },
      include: { team: true, player: true },
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invite.playerId !== playerId) {
      return NextResponse.json({ error: 'Unauthorized to respond to this invitation' }, { status: 403 });
    }

    if (invite.status !== 'PENDING') {
      return NextResponse.json({ error: 'Invitation is no longer pending' }, { status: 400 });
    }

    const body = await req.json();
    const { action } = body;

    if (action !== 'accept' && action !== 'decline') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (action === 'decline') {
      await prisma.teamInvitation.update({
        where: { id },
        data: { status: 'DENIED' },
      });

      return NextResponse.json({ ok: true, status: 'DENIED' });
    }

    // On accept:
    // 1. Double check team is not already full
    const maxRosterSize = 15; // Unified max roster size

    const currentMembersCount = await prisma.teamMember.count({
      where: { teamId: invite.teamId },
    });

    if (currentMembersCount >= maxRosterSize) {
      return NextResponse.json({ error: `Roster is full. Maximum ${maxRosterSize} players allowed.` }, { status: 400 });
    }

    // 2. Check player isn't already a member of this team
    const alreadyMember = await prisma.teamMember.findUnique({
      where: {
        teamId_playerId: {
          teamId: invite.teamId,
          playerId: invite.playerId,
        },
      },
    });

    if (alreadyMember) {
      // Just update status to ACCEPTED since they are already in the team
      await prisma.teamInvitation.update({
        where: { id },
        data: { status: 'ACCEPTED' },
      });
      return NextResponse.json({ ok: true, status: 'ACCEPTED' });
    }

    // 3. Check not already in another team of the same sport category
    const inSameSport = await prisma.teamMember.findFirst({
      where: {
        playerId: invite.playerId,
        team: {
          OR: [
            { sportType: invite.team.sportType },
            ...(invite.team.sportType === 'FUTSAL' ? [{ sportType: 'FUTSAL_5' as any }, { sportType: 'FUTSAL_6' as any }, { sportType: 'FUTSAL_7' as any }] : []),
            ...(invite.team.sportType === 'CRICKET' ? [{ sportType: 'CRICKET_7' as any }, { sportType: 'CRICKET_FULL' as any }] : []),
            ...(invite.team.sportType === 'FOOTBALL' ? [{ sportType: 'FOOTBALL_FULL' as any }] : []),
          ]
        }
      },
      include: { team: { select: { name: true, sportType: true } } }
    });
    if (inSameSport) {
      return NextResponse.json({ error: `You are already in a ${inSameSport.team.name} team (${inSameSport.team.name}). Leave it first.` }, { status: 400 });
    }

    // 4. Create Member and set invitation status to ACCEPTED
    await prisma.$transaction([
      prisma.teamMember.create({
        data: {
          teamId: invite.teamId,
          playerId: invite.playerId,
          role: 'member',
        },
      }),
      prisma.teamInvitation.update({
        where: { id },
        data: { status: 'ACCEPTED' },
      }),
    ]);

    const { syncTournamentTeamMmr } = await import('@/lib/teamMmr');
    await syncTournamentTeamMmr(invite.teamId);

    // Notify the team owner that a new member has joined
    await notify({
      userIds: [invite.team.ownerId],
      type: 'team_member_joined',
      url: `/en/teams/${invite.teamId}`,
      params: { playerName: invite.player.fullName, teamName: invite.team.name },
      actorId: invite.playerId
    });

    return NextResponse.json({ ok: true, status: 'ACCEPTED' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Exception' }, { status: 500 });
  }
}
