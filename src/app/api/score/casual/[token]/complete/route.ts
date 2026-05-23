import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateCasualScorerToken } from '@/lib/match/token-generator';
import { calcTeamMMR, calcPlayerBaseMMR } from '@/lib/mmrCalculator';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Validate token and get match ID
    const matchId = validateCasualScorerToken(token);
    if (!matchId) {
      return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: {
          include: {
            members: { select: { playerId: true, role: true } },
          }
        },
        teamB: {
          include: {
            members: { select: { playerId: true, role: true } },
          }
        },
        rosterPicks: true,
      }
    });

    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    if (match.status === 'COMPLETED' || match.status === 'CANCELLED') {
      return NextResponse.json({ success: false, error: 'Match is already finished' }, { status: 400 });
    }

    // Compute scores from CONFIRMED events in the database
    const events = await prisma.matchEvent.findMany({
      where: { matchId, status: 'CONFIRMED', type: { in: ['GOAL', 'PENALTY_SCORED', 'OWN_GOAL'] } }
    });

    let scoreA = 0, scoreB = 0;
    events.forEach(e => {
      if (e.type === 'OWN_GOAL') {
        if (e.teamId === match.teamA_Id) scoreB++; else scoreA++;
      } else {
        if (e.teamId === match.teamA_Id) scoreA++; else scoreB++;
      }
    });

    const winnerId = scoreA > scoreB ? match.teamA_Id
                   : scoreB > scoreA ? match.teamB_Id
                   : null;

    const sportType = match.teamA.sportType as any;
    const { mmrChangeA, mmrChangeB, mmrField } = calcTeamMMR(match.teamA_Id, match.teamB_Id, winnerId, sportType);

    // MMR cap check: max 2 games per week between same teams
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentCount = await prisma.match.count({
      where: {
        status: 'COMPLETED', createdAt: { gte: oneWeekAgo },
        OR: [
          { teamA_Id: match.teamA_Id, teamB_Id: match.teamB_Id },
          { teamA_Id: match.teamB_Id, teamB_Id: match.teamA_Id },
        ]
      }
    });

    const effectiveMmrChangeA = recentCount >= 2 ? 0 : mmrChangeA;
    const effectiveMmrChangeB = recentCount >= 2 ? 0 : mmrChangeB;

    // Gather all rostered players
    const rosterMemberIds = match.rosterPicks.map(r => r.memberId);
    const rosterMembers = await prisma.teamMember.findMany({
      where: { id: { in: rosterMemberIds } },
      select: { playerId: true, teamId: true },
    });

    // Calculate base player MMR
    const playerBaseResults = calcPlayerBaseMMR(
      rosterMembers.map(m => ({ playerId: m.playerId, teamId: m.teamId })),
      recentCount >= 2 ? null : winnerId,
      sportType,
    );

    // Prepare upserts for PlayerMatchStat
    const statUpserts = rosterMembers.map(m => prisma.playerMatchStat.upsert({
      where: { matchId_playerId: { matchId, playerId: m.playerId } },
      create: {
        matchId,
        playerId: m.playerId,
        teamId: m.teamId,
        mmrChange: playerBaseResults.find(r => r.playerId === m.playerId)?.mmrChange ?? 0,
      },
      update: {
        mmrChange: playerBaseResults.find(r => r.playerId === m.playerId)?.mmrChange ?? 0,
      },
    }));

    // Apply player MMR updates
    const playerMmrUpdates = playerBaseResults.map(r =>
      prisma.player.update({
        where: { id: r.playerId },
        data: {
          [r.mmrField]: { increment: r.mmrChange },
          mmr         : { increment: r.mmrChange }, // keep legacy sync
        },
      })
    );

    // Run transaction
    await prisma.$transaction([
      prisma.match.update({
        where: { id: matchId },
        data: { 
          status: 'COMPLETED', 
          scoreA, 
          scoreB, 
          winnerId, 
          mmrChangeA: effectiveMmrChangeA, 
          mmrChangeB: effectiveMmrChangeB, 
          finalOutcome: 'agreed' 
        }
      }),
      prisma.team.update({ where: { id: match.teamA_Id }, data: { [mmrField]: { increment: effectiveMmrChangeA }, teamMmr: { increment: effectiveMmrChangeA } } }),
      prisma.team.update({ where: { id: match.teamB_Id }, data: { [mmrField]: { increment: effectiveMmrChangeB }, teamMmr: { increment: effectiveMmrChangeB } } }),
      ...statUpserts,
      ...playerMmrUpdates,
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error completing casual match:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
