import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function pid(req: NextRequest) { return req.cookies.get('bmt_player_id')?.value ?? null; }

// POST /api/matches/[matchId]/scorer
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const playerId = pid(req);
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    const { scorerPlayerId } = await req.json();
    if (!scorerPlayerId) return NextResponse.json({ error: 'scorerPlayerId required' }, { status: 400 });

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: { include: { members: { select: { playerId: true, role: true } } } },
        teamB: { include: { members: { select: { playerId: true, role: true } } } },
        rosterPicks: true,
      }
    });
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    if (!['SCHEDULED', 'LIVE'].includes(match.status)) return NextResponse.json({ error: 'Match must be SCHEDULED or LIVE' }, { status: 400 });

    const isA = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
    const isB = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);
    if (!isA && !isB) return NextResponse.json({ error: 'Not in this match' }, { status: 403 });

    const myTeam  = isA ? match.teamA : match.teamB;
    const myRole  = myTeam.members.find(m => m.playerId === playerId)?.role
      ?? (myTeam.ownerId === playerId ? 'owner' : 'member');
    if (!['owner', 'manager', 'captain'].includes(myRole))
      return NextResponse.json({ error: 'Only OMC can assign scorer' }, { status: 403 });

    const myTeamId = isA ? match.teamA_Id : match.teamB_Id;

    // Validate scorer is on the roster pick list for this team
    const myRosterPicks = match.rosterPicks.filter(p => p.teamId === myTeamId);
    const myMembers = myTeam.members;
    const scorerMember = myMembers.find(m => m.playerId === scorerPlayerId);
    if (!scorerMember) return NextResponse.json({ error: 'Scorer must be a team member' }, { status: 400 });

    const scorer = await prisma.matchScorer.upsert({
      where: { matchId_teamId: { matchId, teamId: myTeamId } },
      create: { matchId, teamId: myTeamId, playerId: scorerPlayerId },
      update: { playerId: scorerPlayerId },
    });

    return NextResponse.json({ ok: true, scorer });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
