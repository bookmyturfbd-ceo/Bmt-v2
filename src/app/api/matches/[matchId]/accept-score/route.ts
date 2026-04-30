import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastMatchEvent } from '@/lib/supabaseRealtime';
import { calcTeamMMR, calcPlayerBaseMMR } from '@/lib/mmrCalculator';

function pid(req: NextRequest) {
  return req.cookies.get('bmt_player_id')?.value ?? null;
}

/**
 * POST /api/matches/[matchId]/accept-score
 *
 * Called when an OMC accepts the revealed score comparison.
 * When both teams have accepted → finalize match, award MMR, broadcast BOTH_AGREED.
 * If an OMC disputes instead → DISPUTED status.
 *
 * Body: { dispute?: boolean }  — omit or false = accept, true = dispute
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const playerId = pid(req);
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const dispute = body.dispute === true;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: { include: { members: { select: { playerId: true, role: true } } } },
        teamB: { include: { members: { select: { playerId: true, role: true } } } },
        rosterPicks: true,
      },
    });
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    if (match.status !== 'SCORE_ENTRY') {
      return NextResponse.json({ error: 'Match must be in SCORE_ENTRY phase' }, { status: 400 });
    }
    if (match.scoringMode !== 'SCORE_AFTER') {
      return NextResponse.json({ error: 'Only for SCORE_AFTER matches' }, { status: 400 });
    }
    if (!match.scoreSubmittedByA || !match.scoreSubmittedByB) {
      return NextResponse.json({ error: 'Both teams must submit scores first' }, { status: 400 });
    }

    const isA = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
    const isB = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);
    if (!isA && !isB) return NextResponse.json({ error: 'Not in match' }, { status: 403 });

    const myTeam = isA ? match.teamA : match.teamB;
    const myTeamId = isA ? match.teamA_Id : match.teamB_Id;
    const myRole = myTeam.members.find(m => m.playerId === playerId)?.role
      ?? (myTeam.ownerId === playerId ? 'owner' : 'member');
    if (!['owner', 'manager', 'captain'].includes(myRole)) {
      return NextResponse.json({ error: 'Only OMC can accept/dispute score' }, { status: 403 });
    }

    // ── Dispute ───────────────────────────────────────────────────────────────
    if (dispute) {
      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'DISPUTED', finalOutcome: 'disputed' },
      });
      await broadcastMatchEvent(matchId, 'SCORE_DISPUTED', {
        fromTeamId: myTeamId,
        submittedByA: { scoreA: match.submittedScoreA, scoreB: match.submittedScoreB },
        submittedByB: { scoreA: match.submittedScoreA2, scoreB: match.submittedScoreB2 },
      });
      return NextResponse.json({ ok: true, disputed: true });
    }

    // ── Accept ────────────────────────────────────────────────────────────────
    const updateData = isA ? { agreedByA: true } : { agreedByB: true };
    const updated = await prisma.match.update({ where: { id: matchId }, data: updateData });

    // Notify opponent that we accepted
    await broadcastMatchEvent(matchId, 'SCORE_ACCEPTED', { fromTeamId: myTeamId });

    // Check if both have accepted
    if (!updated.agreedByA || !updated.agreedByB) {
      return NextResponse.json({ ok: true, waiting: true });
    }

    // ── Both accepted — finalize ───────────────────────────────────────────────
    const finalScoreA = updated.submittedScoreA ?? 0;
    const finalScoreB = updated.submittedScoreB ?? 0;
    const winnerId = finalScoreA > finalScoreB ? match.teamA_Id
                   : finalScoreB > finalScoreA ? match.teamB_Id
                   : null;

    const sportType = match.teamA.sportType as any;
    const { mmrChangeA, mmrChangeB, mmrField } = calcTeamMMR(match.teamA_Id, match.teamB_Id, winnerId, sportType);

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

    const rosterMemberIds = match.rosterPicks.map(r => r.memberId);
    const rosterMembers = await prisma.teamMember.findMany({
      where: { id: { in: rosterMemberIds } },
      select: { playerId: true, teamId: true },
    });

    const playerBaseResults = calcPlayerBaseMMR(
      rosterMembers.map(m => ({ playerId: m.playerId, teamId: m.teamId })),
      recentCount >= 2 ? null : winnerId,
      sportType,
    );

    const statUpserts = rosterMembers.map(m => prisma.playerMatchStat.upsert({
      where: { matchId_playerId: { matchId, playerId: m.playerId } },
      create: { matchId, playerId: m.playerId, teamId: m.teamId, mmrChange: playerBaseResults.find(r => r.playerId === m.playerId)?.mmrChange ?? 0 },
      update: { mmrChange: playerBaseResults.find(r => r.playerId === m.playerId)?.mmrChange ?? 0 },
    }));

    const playerMmrUpdates = playerBaseResults.map(r =>
      prisma.player.update({
        where: { id: r.playerId },
        data: { [r.mmrField]: { increment: r.mmrChange }, mmr: { increment: r.mmrChange } },
      })
    );

    await prisma.$transaction([
      prisma.match.update({
        where: { id: matchId },
        data: {
          status: 'COMPLETED',
          scoreA: finalScoreA, scoreB: finalScoreB,
          goalsA: finalScoreA, goalsB: finalScoreB,
          winnerId,
          mmrChangeA: effectiveMmrChangeA, mmrChangeB: effectiveMmrChangeB,
          finalOutcome: 'agreed',
        },
      }),
      prisma.team.update({ where: { id: match.teamA_Id }, data: { [mmrField]: { increment: effectiveMmrChangeA }, teamMmr: { increment: effectiveMmrChangeA } } }),
      prisma.team.update({ where: { id: match.teamB_Id }, data: { [mmrField]: { increment: effectiveMmrChangeB }, teamMmr: { increment: effectiveMmrChangeB } } }),
      ...statUpserts,
      ...playerMmrUpdates,
    ]);

    const payload = { scoreA: finalScoreA, scoreB: finalScoreB, winnerId, mmrChangeA: effectiveMmrChangeA, mmrChangeB: effectiveMmrChangeB };
    await broadcastMatchEvent(matchId, 'BOTH_AGREED', payload);
    return NextResponse.json({ ok: true, finalized: true, ...payload });

  } catch (e: any) {
    console.error('[accept-score POST]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
