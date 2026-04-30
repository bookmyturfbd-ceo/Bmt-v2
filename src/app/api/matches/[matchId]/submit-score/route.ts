import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastMatchEvent } from '@/lib/supabaseRealtime';
import { calcTeamMMR, calcPlayerBaseMMR } from '@/lib/mmrCalculator';

function pid(req: NextRequest) {
  return req.cookies.get('bmt_player_id')?.value ?? null;
}

/**
 * POST /api/matches/[matchId]/submit-score
 *
 * Used in SCORE_AFTER mode. Each OMC submits the scoreline they believe is correct:
 *   { scoreForUs: number, scoreForThem: number }
 *
 * When both teams have submitted:
 *  - If both scorelines agree → auto-finalise → COMPLETED + MMR awarded → broadcast BOTH_AGREED
 *  - If scorelines disagree  → DISPUTED → broadcast SCORE_DISPUTED
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  const playerId = pid(req);
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: { include: { members: { select: { playerId: true, role: true } } } },
        teamB: { include: { members: { select: { playerId: true, role: true } } } },
        rosterPicks: true,
      },
    });
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    // Must be in SCORE_ENTRY phase and SCORE_AFTER mode
    if (match.status !== 'SCORE_ENTRY') {
      return NextResponse.json({ error: 'Match must be in SCORE_ENTRY phase' }, { status: 400 });
    }
    if (match.scoringMode !== 'SCORE_AFTER') {
      return NextResponse.json({ error: 'Only for SCORE_AFTER matches' }, { status: 400 });
    }

    const isA = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
    const isB = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);
    if (!isA && !isB) return NextResponse.json({ error: 'Not in match' }, { status: 403 });

    const myTeam = isA ? match.teamA : match.teamB;
    const myTeamId = isA ? match.teamA_Id : match.teamB_Id;
    const myRole = myTeam.members.find(m => m.playerId === playerId)?.role
      ?? (myTeam.ownerId === playerId ? 'owner' : 'member');
    if (!['owner', 'manager', 'captain'].includes(myRole)) {
      return NextResponse.json({ error: 'Only OMC can submit score' }, { status: 403 });
    }

    const { scoreForUs, scoreForThem } = await req.json();
    if (typeof scoreForUs !== 'number' || typeof scoreForThem !== 'number' || scoreForUs < 0 || scoreForThem < 0) {
      return NextResponse.json({ error: 'Invalid score values' }, { status: 400 });
    }

    // Map submitted score to the A/B perspective
    // Team A: "us = A, them = B" | Team B: "us = B, them = A"
    const updateData: Record<string, unknown> = {};
    if (isA) {
      // Guard: don't re-submit
      if (match.scoreSubmittedByA) {
        return NextResponse.json({ error: 'Your team already submitted a score' }, { status: 409 });
      }
      updateData['scoreSubmittedByA'] = true;
      updateData['submittedScoreA'] = scoreForUs;
      updateData['submittedScoreB'] = scoreForThem;
    } else {
      if (match.scoreSubmittedByB) {
        return NextResponse.json({ error: 'Your team already submitted a score' }, { status: 409 });
      }
      updateData['scoreSubmittedByB'] = true;
      updateData['submittedScoreA2'] = scoreForThem; // Team B says: A scored this many
      updateData['submittedScoreB2'] = scoreForUs;   // Team B says: B scored this many
    }

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: updateData,
    });

    // Notify opponent that we submitted
    await broadcastMatchEvent(matchId, 'OPPONENT_SUBMITTED', { fromTeamId: myTeamId });

    // Check if both have now submitted
    const bothSubmitted = updated.scoreSubmittedByA && updated.scoreSubmittedByB;
    if (!bothSubmitted) {
      return NextResponse.json({ ok: true, waiting: true });
    }

    // ── Both submitted — compare ──────────────────────────────────────────────
    const sA1 = updated.submittedScoreA ?? 0;  // Team A says: A scored
    const sB1 = updated.submittedScoreB ?? 0;  // Team A says: B scored
    const sA2 = updated.submittedScoreA2 ?? 0; // Team B says: A scored
    const sB2 = updated.submittedScoreB2 ?? 0; // Team B says: B scored

    const agreed = sA1 === sA2 && sB1 === sB2;

    if (!agreed) {
      // Dispute — scores don't match
      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'DISPUTED', finalOutcome: 'disputed' },
      });
      await broadcastMatchEvent(matchId, 'SCORE_DISPUTED', {
        submittedByA: { scoreA: sA1, scoreB: sB1 },
        submittedByB: { scoreA: sA2, scoreB: sB2 },
      });
      return NextResponse.json({ ok: true, agreed: false, dispute: true });
    }

    // ── Agreed scores — reveal to both teams for acceptance ───────────────────
    // Finalization happens in /accept-score once both teams confirm
    await broadcastMatchEvent(matchId, 'SCORES_REVEALED', {
      scoreA: sA1,
      scoreB: sB1,
      submittedByA: { scoreA: sA1, scoreB: sB1 },
      submittedByB: { scoreA: sA2, scoreB: sB2 },
    });
    return NextResponse.json({ ok: true, agreed: true, waiting: true, scoreA: sA1, scoreB: sB1 });
  } catch (e: any) {
    console.error('[submit-score POST]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

