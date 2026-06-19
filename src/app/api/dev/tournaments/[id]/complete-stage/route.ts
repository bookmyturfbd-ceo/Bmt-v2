import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { computeFootballStandings, computeCricketStandings } from '@/lib/tournament/standing-calculator';
import { advanceKnockoutWinner } from '@/lib/tournament/advancement';
import { distributeTournamentMmr } from '@/lib/tournament/mmr-distributor';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'This testing utility is not permitted in production environments.' },
      { status: 403 }
    );
  }

  try {
    const { id: tournamentId } = await params;
    const body = await request.json();
    const { stage } = body;

    if (!stage) {
      return NextResponse.json({ success: false, error: 'Stage parameter is required' }, { status: 400 });
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { groups: true }
    });

    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 });
    }

    // 1. Get all matches for this stage that are not completed/cancelled
    const matchesToComplete = await prisma.tournamentMatch.findMany({
      where: {
        tournamentId,
        stage,
        status: { notIn: ['COMPLETED', 'WALKOVER', 'CANCELLED'] }
      }
    });

    if (matchesToComplete.length === 0) {
      return NextResponse.json({
        success: false,
        error: `No incomplete matches found for stage ${stage} to simulate.`
      }, { status: 400 });
    }

    // Check if any team is TBD (which means brackets aren't fully populated yet)
    const hasTbd = matchesToComplete.some(m => m.teamAId === 'TBD' || m.teamBId === 'TBD');
    if (hasTbd) {
      return NextResponse.json({
        success: false,
        error: `Cannot simulate stage ${stage} yet; some matchups are still TBD.`
      }, { status: 400 });
    }

    // 2. Simulate scores and complete matches
    for (const match of matchesToComplete) {
      const scoreA = Math.floor(Math.random() * 5);
      // Avoid draws in knockout stages
      let scoreB = Math.floor(Math.random() * 5);
      if (stage !== 'GROUP' && scoreA === scoreB) {
        scoreB += 1;
      }
      
      const winnerId = scoreA > scoreB ? match.teamAId : match.teamBId;

      const isCricket = tournament.sport === 'CRICKET';
      const resultSummary: any = isCricket 
        ? {
            runsA: scoreA * 10 + 20,
            runsB: scoreB * 10 + 20,
            wicketsA: Math.floor(Math.random() * 7),
            wicketsB: Math.floor(Math.random() * 7),
            oversA: 7,
            oversB: 7,
            winnerId
          }
        : {
            goalsA: scoreA,
            goalsB: scoreB,
            scoreA,
            scoreB,
            winnerId
          };

      await prisma.tournamentMatch.update({
        where: { id: match.id },
        data: {
          status: 'COMPLETED',
          winnerId,
          resultSummary
        }
      });

      if (stage !== 'GROUP') {
        // Knockout match: advance winner to the next round automatically in DB
        await advanceKnockoutWinner(tournamentId, match.id, winnerId);
      }

      // Distribute MMR (optional, since it's a dev route)
      await distributeTournamentMmr(match.id).catch(() => {});
    }

    // 3. Batch standings update for GROUP matches
    if (stage === 'GROUP') {
      for (const group of tournament.groups) {
        const allGroupMatches = await prisma.tournamentMatch.findMany({
          where: { groupId: group.id }
        });
        
        const newStandings = tournament.sport === 'CRICKET' 
          ? computeCricketStandings(allGroupMatches as any[], group.id, tournamentId, group.teamIds)
          : computeFootballStandings(allGroupMatches as any[], group.id, tournamentId, group.teamIds);

        for (const standing of newStandings) {
          await prisma.tournamentStanding.upsert({
            where: {
              tournamentId_groupId_teamId: {
                tournamentId,
                groupId: group.id,
                teamId: standing.teamId
              }
            },
            update: standing,
            create: standing
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully simulated and completed ${matchesToComplete.length} matches for stage ${stage}.`
    });
  } catch (error: any) {
    console.error(`Error simulating stage:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
