import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function pid(req: NextRequest) {
  return req.cookies.get('bmt_player_id')?.value ?? null;
}

async function resolveMatch(matchId: string, playerId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      teamA: { include: { members: { select: { playerId: true, role: true } } } },
      teamB: { include: { members: { select: { playerId: true, role: true } } } },
    },
  });
  if (!match) return null;
  const isA = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
  const isB = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);

  const isAssignedScorer = await prisma.matchScorer.findFirst({ where: { matchId, playerId } });

  if (!isA && !isB && !isAssignedScorer) return null;

  const myTeam = isA ? match.teamA : isB ? match.teamB : match.teamA; // Default to teamA if only scorer
  const myRole = myTeam.members.find(m => m.playerId === playerId)?.role
    ?? (myTeam.ownerId === playerId ? 'owner' : 'member');
  const isOMC = (isA || isB) ? ['owner', 'manager', 'captain'].includes(myRole) : false;
  return { match, isA, isB, isOMC, myTeamId: isA ? match.teamA_Id : isB ? match.teamB_Id : match.teamA_Id };
}

// GET /api/matches/[matchId]/state — full match state for reconnect
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const playerId = pid(req);
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const ctx = await resolveMatch(matchId, playerId);
  if (!ctx) return NextResponse.json({ error: 'Not found or not in match' }, { status: 404 });

  const [match, scorers, events, signOffs, halfTime] = await Promise.all([
    prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: {
          select: { id: true, name: true, logoUrl: true, sportType: true, teamMmr: true, ownerId: true,
            members: { select: { id: true, playerId: true, role: true, sportRole: true,
              player: { select: { id: true, fullName: true, avatarUrl: true, mmr: true } } } } }
        },
        teamB: {
          select: { id: true, name: true, logoUrl: true, sportType: true, teamMmr: true, ownerId: true,
            members: { select: { id: true, playerId: true, role: true, sportRole: true,
              player: { select: { id: true, fullName: true, avatarUrl: true, mmr: true } } } } }
        },
        rosterPicks: true,
      }
    }),
    prisma.matchScorer.findMany({ where: { matchId } }),
    prisma.matchEvent.findMany({ where: { matchId }, orderBy: { createdAt: 'asc' } }),
    prisma.matchSignOff.findMany({ where: { matchId } }),
    prisma.matchHalfTime.findUnique({ where: { matchId } }),
  ]);

  // Compute scores from CONFIRMED events
  const confirmedGoalEvents = events.filter(e =>
    ['GOAL', 'PENALTY_SCORED', 'OWN_GOAL'].includes(e.type) && e.status === 'CONFIRMED'
  );
  let scoreA = 0, scoreB = 0;
  confirmedGoalEvents.forEach(e => {
    if (e.type === 'OWN_GOAL') {
      // OWN_GOAL: teamId is the CONCEDING team → the other team scores
      if (e.teamId === match!.teamA_Id) scoreB++; else scoreA++;
    } else {
      if (e.teamId === match!.teamA_Id) scoreA++; else scoreB++;
    }
  });

  // Is this player the assigned scorer for their team?
  const myScorer = scorers.find(s => s.teamId === ctx.myTeamId);
  const isScorer = (myScorer?.playerId === playerId || scorers.some(s => s.playerId === playerId)) && match?.status === 'LIVE';
  const isSingleScorer = match?.scoringMode === 'LIVE_SINGLE' && scorers.filter(s => s.playerId === playerId).length === 2;

  return NextResponse.json({
    match, scorers, events, signOffs, halfTime,
    scoreA, scoreB,
    myTeamId: ctx.myTeamId, isTeamA: ctx.isA, isOMC: ctx.isOMC,
    currentPlayerId: playerId,
    isScorer, isSingleScorer,
    // Score After Match fields
    scoringMode: match?.scoringMode ?? 'LIVE',
    scoreModeRequestedBy: match?.scoreModeRequestedBy ?? null,
    scoreModeAgreed: match?.scoreModeAgreed ?? false,
    scoreSubmittedByA: match?.scoreSubmittedByA ?? false,
    scoreSubmittedByB: match?.scoreSubmittedByB ?? false,
  });
}
