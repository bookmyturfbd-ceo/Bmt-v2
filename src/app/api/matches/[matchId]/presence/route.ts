import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastMatchEvent } from '@/lib/supabaseRealtime';
import { notify } from '@/lib/notificationService';

function pid(req: NextRequest) {
  return req.cookies.get('bmt_player_id')?.value ?? null;
}

// POST /api/matches/[matchId]/presence
// Updates heartbeat and calculates presence state. If both present and agreed, starts match.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const playerId = pid(req);
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      teamA: { select: { id: true, name: true, ownerId: true, members: { select: { playerId: true } } } },
      teamB: { select: { id: true, name: true, ownerId: true, members: { select: { playerId: true } } } },
    }
  });

  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

  const isA = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
  const isB = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);

  if (!isA && !isB) {
    return NextResponse.json({ error: 'Not a member of either team' }, { status: 403 });
  }

  const now = new Date();
  const cutoff = new Date(Date.now() - 15 * 1000);
  const rawM = match as any;

  // Determine current active flags
  const isAActive = isA || (rawM.teamA_LastActive && rawM.teamA_LastActive > cutoff);
  const isBActive = isB || (rawM.teamB_LastActive && rawM.teamB_LastActive > cutoff);

  // Detect transition from offline to online to fire match_opponent_joined notification
  const transitionedB = isB && !rawM.teamB_Present;
  const transitionedA = isA && !rawM.teamA_Present;

  const dataToUpdate: any = {
    teamA_Present: !!isAActive,
    teamB_Present: !!isBActive,
  };

  if (isA) {
    dataToUpdate.teamA_LastActive = now;
  }
  if (isB) {
    dataToUpdate.teamB_LastActive = now;
  }

  // If both present and agreed, start match
  const startMatch = isAActive && isBActive && (rawM.scoringNegotiationStatus === 'agreed' || rawM.scoreModeAgreed);
  if (startMatch && !rawM.matchStartedAt) {
    dataToUpdate.matchStartedAt = now;
    dataToUpdate.status = 'LIVE';
  }
  if (rawM.scoreModeAgreed && rawM.scoringNegotiationStatus !== 'agreed') {
    dataToUpdate.scoringNegotiationStatus = 'agreed';
  }

  const updatedMatch = await prisma.match.update({
    where: { id: matchId },
    data: dataToUpdate,
    include: {
      teamA: { select: { id: true, name: true, ownerId: true } },
      teamB: { select: { id: true, name: true, ownerId: true } },
    }
  });
  const rawUp = updatedMatch as any;

  // Notifications
  if (transitionedB && rawUp.teamA_Present) {
    // Team B captain joined. Notify Team A captain.
    await notify({
      userIds: [match.teamA.ownerId],
      type: 'match_opponent_joined',
      url: `/matches/${matchId}/live`,
      params: { teamName: match.teamB.name },
      actorId: playerId
    });
  } else if (transitionedA && rawUp.teamB_Present) {
    // Team A captain joined. Notify Team B captain.
    await notify({
      userIds: [match.teamB.ownerId],
      type: 'match_opponent_joined',
      url: `/matches/${matchId}/live`,
      params: { teamName: match.teamA.name },
      actorId: playerId
    });
  }

  if (startMatch && !rawM.matchStartedAt) {
    await broadcastMatchEvent(matchId, 'MATCH_STARTED', { match: updatedMatch });
  } else {
    await broadcastMatchEvent(matchId, 'PRESENCE_UPDATE', { match: updatedMatch });
  }

  return NextResponse.json({ ok: true, match: updatedMatch });
}
