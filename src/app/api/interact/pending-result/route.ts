import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function getPlayerId(req: NextRequest) {
  return req.cookies.get('bmt_player_id')?.value ?? null;
}

/**
 * GET /api/interact/pending-result
 *
 * Called once on app load (after splash screen). Returns the most recent
 * COMPLETED match the player was part of that they haven't seen yet.
 * Immediately marks it as seen so it only ever shows once.
 */
export async function GET(req: NextRequest) {
  const playerId = getPlayerId(req);
  if (!playerId) return NextResponse.json({ result: null });

  try {
    // Find player's team memberships
    const memberships = await prisma.teamMember.findMany({
      where: { playerId },
      select: { teamId: true },
    });
    const teamIds = memberships.map(m => m.teamId);
    if (teamIds.length === 0) return NextResponse.json({ result: null });

    // Find the most recent COMPLETED match where this player's team was involved
    // and where they haven't seen the result yet
    const match = await prisma.match.findFirst({
      where: {
        status: 'COMPLETED',
        OR: [
          { teamA_Id: { in: teamIds }, resultSeenByA: false },
          { teamB_Id: { in: teamIds }, resultSeenByB: false },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        teamA: { select: { id: true, name: true, sportType: true, teamMmr: true, footballMmr: true, cricketMmr: true } },
        teamB: { select: { id: true, name: true, sportType: true, teamMmr: true, footballMmr: true, cricketMmr: true } },
      },
    });

    if (!match) return NextResponse.json({ result: null });

    // Determine which side the current player is on
    const isTeamA = teamIds.includes(match.teamA_Id);

    // Double-check they haven't seen it yet
    if (isTeamA && match.resultSeenByA) return NextResponse.json({ result: null });
    if (!isTeamA && match.resultSeenByB) return NextResponse.json({ result: null });

    // Mark as seen immediately — prevents double popup
    await prisma.match.update({
      where: { id: match.id },
      data: isTeamA ? { resultSeenByA: true } : { resultSeenByB: true },
    });

    // Compute outcome
    const myTeamId  = isTeamA ? match.teamA_Id : match.teamB_Id;
    const myTeam    = isTeamA ? match.teamA : match.teamB;
    const oppTeam   = isTeamA ? match.teamB : match.teamA;
    const mmrDelta  = isTeamA ? match.mmrChangeA : match.mmrChangeB;
    const myScore   = isTeamA ? match.scoreA : match.scoreB;
    const oppScore  = isTeamA ? match.scoreB : match.scoreA;
    const myWickets = isTeamA ? match.wicketsA : match.wicketsB;
    const oppWickets= isTeamA ? match.wicketsB : match.wicketsA;
    const myOvers   = isTeamA ? match.oversA : match.oversB;
    const oppOvers  = isTeamA ? match.oversB : match.oversA;

    const outcome: 'win' | 'loss' | 'draw' =
      match.winnerId === null ? 'draw' :
      match.winnerId === myTeamId ? 'win' : 'loss';

    // Determine sport-specific current MMR
    const isCricket  = myTeam.sportType?.includes('CRICKET');
    const currentMmr = isCricket
      ? (myTeam.cricketMmr ?? myTeam.teamMmr ?? 1000)
      : (myTeam.footballMmr ?? myTeam.teamMmr ?? 1000);

    // Build the victory string
    let victoryString = outcome === 'draw' ? 'Match Tied — MMR Split Equally' : '';
    if (!victoryString) {
      const winnerTeam = match.winnerId === match.teamA_Id ? match.teamA : match.teamB;
      const loserTeam  = match.winnerId === match.teamA_Id ? match.teamB : match.teamA;
      if (isCricket) {
        // Check if chasing team won (by wickets) or defending team won (by runs)
        const chasingWon = match.winnerId === match.teamB_Id; // Team B always chases in standard format
        if (chasingWon) {
          const wicketsInHand = 10 - (match.wicketsB ?? 0);
          victoryString = `${winnerTeam.name} won by ${wicketsInHand} Wicket${wicketsInHand !== 1 ? 's' : ''}`;
        } else {
          const runMargin = match.scoreA - match.scoreB;
          victoryString = `${winnerTeam.name} won by ${runMargin} Run${runMargin !== 1 ? 's' : ''}`;
        }
      } else {
        const diff = match.scoreA - match.scoreB;
        const margin = Math.abs(diff);
        victoryString = `${winnerTeam.name} won ${margin}-${Math.min(match.scoreA, match.scoreB)}`;
      }
    }

    return NextResponse.json({
      result: {
        outcome,
        sportType    : myTeam.sportType,
        victoryString,
        myTeamName   : myTeam.name,
        oppTeamName  : oppTeam.name,
        myScore,
        oppScore,
        myWickets    : myWickets ?? null,
        oppWickets   : oppWickets ?? null,
        myOvers      : myOvers ?? null,
        oppOvers     : oppOvers ?? null,
        mmrDelta,
        currentMmr,
        matchId      : match.id,
      },
    });
  } catch (e: any) {
    console.error('[pending-result]', e);
    return NextResponse.json({ result: null });
  }
}
