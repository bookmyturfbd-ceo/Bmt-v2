import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastMatchEvent, broadcastInteractEvent } from '@/lib/supabaseRealtime';
import { calcTeamMMR, calcPlayerBaseMMR } from '@/lib/mmrCalculator';

export async function POST(req: NextRequest) {
  try {
    const { matchId, action } = await req.json();
    if (!matchId || !action) {
      return NextResponse.json({ error: 'Missing matchId or action' }, { status: 400 });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: { include: { members: { select: { playerId: true, role: true } } } },
        teamB: { include: { members: { select: { playerId: true, role: true } } } },
        rosterPicks: true,
        scorers: true,
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    // Restrict simulation only to the dummy teams to avoid messing up real production matches
    if (match.teamA_Id !== 'dummy_team_a' || match.teamB_Id !== 'dummy_team_b') {
      return NextResponse.json({ error: 'Simulation only allowed for dummy test match' }, { status: 400 });
    }

    // ── 1. accept_challenge ──
    if (action === 'accept_challenge') {
      if (match.status !== 'PENDING') {
        return NextResponse.json({ error: 'Match is not pending' }, { status: 400 });
      }
      const updated = await prisma.match.update({
        where: { id: matchId },
        data: { status: 'INTERACTION' },
      });
      await broadcastInteractEvent(matchId, 'challenge_accepted', {});
      return NextResponse.json({ ok: true, match: updated });
    }

    // ── 2. lock_roster ──
    if (action === 'lock_roster') {
      const teamBMembers = await prisma.teamMember.findMany({
        where: { teamId: 'dummy_team_b' },
      });

      // Clear any previous picks for Team B first
      await prisma.matchRosterPick.deleteMany({
        where: { matchId, teamId: 'dummy_team_b' },
      });

      // Add all members to roster picks
      await prisma.$transaction([
        ...teamBMembers.map((m) =>
          prisma.matchRosterPick.create({
            data: {
              matchId,
              teamId: 'dummy_team_b',
              memberId: m.id,
              isStarter: true,
            },
          })
        ),
      ]);

      const updated = await prisma.match.update({
        where: { id: matchId },
        data: {
          formationB: '1-2-1',
          rosterLockedB: true,
        },
      });

      await broadcastInteractEvent(matchId, 'roster_locked', { teamId: 'dummy_team_b' });
      return NextResponse.json({ ok: true, match: updated });
    }

    // ── 3. confirm_venue ──
    if (action === 'confirm_venue') {
      if (!match.rosterLockedA || !match.rosterLockedB) {
        return NextResponse.json({ error: 'Both teams must lock rosters first' }, { status: 400 });
      }

      if (match.venueType === 'BMT') {
        const slotId = match.selectedSlotId;
        const date = match.matchDate;
        if (!slotId || !date) {
          return NextResponse.json({ error: 'Team A has not selected a slot yet' }, { status: 400 });
        }

        const slot = await prisma.slot.findUnique({
          where: { id: slotId },
          include: { ground: { include: { turf: { select: { id: true, name: true, revenueModelType: true, revenueModelValue: true } } } } },
        });
        if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 });

        const halfCost = slot.price / 2;
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        const turf = slot.ground.turf;
        const pct = turf.revenueModelType === 'percentage' && turf.revenueModelValue ? turf.revenueModelValue / 100 : 0;
        const bmtCut = Math.round(halfCost * pct);
        const ownerShare = halfCost - bmtCut;
        const notes = `Challenge Market — ${match.teamA.name} vs ${match.teamB.name}`;

        await prisma.$transaction([
          prisma.booking.create({ data: { playerId: match.teamA.ownerId, slotId: slotId, turfId: turf.id, date: date, price: halfCost, ownerShare, bmtCut, status: 'confirmed', selectedSport: match.sportType ?? match.teamA.sportType, bookingCode: code, source: 'challenge_market', notes } }),
          prisma.booking.create({ data: { playerId: match.teamB.ownerId, slotId: slotId, turfId: turf.id, date: date, price: halfCost, ownerShare, bmtCut, status: 'confirmed', selectedSport: match.sportType ?? match.teamB.sportType, bookingCode: code, source: 'challenge_market', notes } }),
          prisma.player.update({ where: { id: match.teamA.ownerId }, data: { walletBalance: { decrement: halfCost } } }),
          prisma.player.update({ where: { id: match.teamB.ownerId }, data: { walletBalance: { decrement: halfCost } } }),
          prisma.owner.updateMany({ where: { turfs: { some: { id: turf.id } } }, data: { walletBalance: { increment: ownerShare * 2 } } }),
          prisma.match.update({ where: { id: matchId }, data: { status: 'SCHEDULED', venueBookedAt: new Date(), bookingCode: code } }),
        ]);

        await broadcastInteractEvent(matchId, 'bmt_slot_response', { accepted: true, bookingCode: code });
        return NextResponse.json({ ok: true, bookingCode: code });
      } else if (match.venueType === 'OPEN_WBT') {
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        const updated = await prisma.match.update({
          where: { id: matchId },
          data: {
            venueConfirmedByB: true,
            wbtPaymentB: true,
            status: 'SCHEDULED',
            venueBookedAt: new Date(),
            bookingCode: code,
          },
        });
        await broadcastInteractEvent(matchId, 'wbt_booking_complete', { bookingCode: code });
        return NextResponse.json({ ok: true, bookingCode: code, match: updated });
      } else {
        // If no venueType is set, default to booking a BMT slot directly for testing
        // Let's create dummy slot booking
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        const updated = await prisma.match.update({
          where: { id: matchId },
          data: {
            venueType: 'BMT',
            selectedSlotId: 'dummy_bmt_slot',
            matchDate: new Date().toISOString().split('T')[0],
            status: 'SCHEDULED',
            venueBookedAt: new Date(),
            bookingCode: code,
          },
        });
        await broadcastInteractEvent(matchId, 'bmt_slot_response', { accepted: true, bookingCode: code });
        return NextResponse.json({ ok: true, bookingCode: code, match: updated });
      }
    }

    // ── 4. start_match ──
    if (action === 'start_match') {
      if (match.status !== 'SCHEDULED') {
        return NextResponse.json({ error: 'Match must be scheduled first' }, { status: 400 });
      }
      const updated = await prisma.match.update({
        where: { id: matchId },
        data: { matchStartedByB: true },
      });
      if (updated.matchStartedByA && updated.matchStartedByB) {
        await prisma.match.update({
          where: { id: matchId },
          data: { status: 'LIVE' },
        });
        await broadcastInteractEvent(matchId, 'match_started', {});
      }
      return NextResponse.json({ ok: true, match: updated });
    }

    // ── 5. accept_mode ──
    if (action === 'accept_mode') {
      if (!match.scoreModeRequestedBy) {
        return NextResponse.json({ error: 'No pending mode proposed' }, { status: 400 });
      }

      if (match.scoringMode === 'LIVE_SINGLE' && match.proposedSingleScorerId) {
        await prisma.matchScorer.deleteMany({ where: { matchId } });
        await prisma.matchScorer.createMany({
          data: [
            { matchId, teamId: match.teamA_Id, playerId: match.proposedSingleScorerId },
            { matchId, teamId: match.teamB_Id, playerId: match.proposedSingleScorerId },
          ],
        });
      }

      const updated = await prisma.match.update({
        where: { id: matchId },
        data: { scoreModeAgreed: true, scoreModeRequestedBy: null },
      });

      await broadcastMatchEvent(matchId, 'SCORE_MODE_AGREED', { mode: match.scoringMode });
      return NextResponse.json({ ok: true, match: updated });
    }

    // ── 6. submit_score ──
    if (action === 'submit_score') {
      if (match.status !== 'SCORE_ENTRY') {
        return NextResponse.json({ error: 'Match is not in SCORE_ENTRY' }, { status: 400 });
      }

      // Read score submitted by Team A (the user)
      const submittedA = match.submittedScoreA ?? 3;
      const submittedB = match.submittedScoreB ?? 2;

      // Opponent Team B submits matching score:
      // submittedScoreA2 = what B thinks A scored (must match X)
      // submittedScoreB2 = what B thinks B scored (must match Y)
      const updated = await prisma.match.update({
        where: { id: matchId },
        data: {
          submittedScoreA2: submittedA,
          submittedScoreB2: submittedB,
          scoreSubmittedByB: true,
        },
      });

      await broadcastMatchEvent(matchId, 'OPPONENT_SUBMITTED', {});

      // If both submitted, broadcast scores revealed to match the real route behavior
      if (updated.scoreSubmittedByA && updated.scoreSubmittedByB) {
        await broadcastMatchEvent(matchId, 'SCORES_REVEALED', { scoreA: submittedA, scoreB: submittedB });
      }

      return NextResponse.json({ ok: true, match: updated });
    }

    // ── 7. accept_score (Finalization) ──
    if (action === 'accept_score') {
      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: { agreedByB: true },
      });

      await broadcastMatchEvent(matchId, 'SCORE_ACCEPTED', { fromTeamId: 'dummy_team_b' });

      if (updatedMatch.agreedByA && updatedMatch.agreedByB) {
        const finalScoreA = updatedMatch.submittedScoreA ?? 0;
        const finalScoreB = updatedMatch.submittedScoreB ?? 0;
        const winnerId = finalScoreA > finalScoreB ? 'dummy_team_a'
                       : finalScoreB > finalScoreA ? 'dummy_team_b'
                       : null;

        const sportType = (updatedMatch.sportType ?? 'FUTSAL_5') as any;
        const { mmrChangeA, mmrChangeB, mmrField } = calcTeamMMR('dummy_team_a', 'dummy_team_b', winnerId, sportType);

        const rosterMemberIds = match.rosterPicks.map(r => r.memberId);
        const rosterMembers = await prisma.teamMember.findMany({
          where: { id: { in: rosterMemberIds } },
          select: { playerId: true, teamId: true },
        });

        const playerBaseResults = calcPlayerBaseMMR(
          rosterMembers.map(m => ({ playerId: m.playerId, teamId: m.teamId })),
          winnerId,
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
              mmrChangeA, mmrChangeB,
              finalOutcome: 'agreed',
            },
          }),
          prisma.team.update({ where: { id: 'dummy_team_a' }, data: { [mmrField]: { increment: mmrChangeA }, teamMmr: { increment: mmrChangeA } } }),
          prisma.team.update({ where: { id: 'dummy_team_b' }, data: { [mmrField]: { increment: mmrChangeB }, teamMmr: { increment: mmrChangeB } } }),
          ...statUpserts,
          ...playerMmrUpdates,
        ]);

        const payload = { scoreA: finalScoreA, scoreB: finalScoreB, winnerId, mmrChangeA, mmrChangeB };
        await broadcastMatchEvent(matchId, 'BOTH_AGREED', payload);
        return NextResponse.json({ ok: true, finalized: true, ...payload });
      }

      return NextResponse.json({ ok: true, match: updatedMatch });
    }

    // ── 8. signoff ──
    if (action === 'signoff') {
      if (match.status !== 'SCORE_ENTRY') {
        return NextResponse.json({ error: 'Match is not in SCORE_ENTRY' }, { status: 400 });
      }

      await prisma.matchSignOff.upsert({
        where: { matchId_teamId: { matchId, teamId: 'dummy_team_b' } },
        create: { matchId, teamId: 'dummy_team_b' },
        update: { signedOffAt: new Date() },
      });

      const signOffs = await prisma.matchSignOff.findMany({ where: { matchId } });
      const bothSigned = signOffs.some(s => s.teamId === 'dummy_team_a')
                      && signOffs.some(s => s.teamId === 'dummy_team_b');

      if (bothSigned) {
        const scoreA = match.scoreA ?? 0;
        const scoreB = match.scoreB ?? 0;
        const winnerId = scoreA > scoreB ? 'dummy_team_a'
                       : scoreB > scoreA ? 'dummy_team_b'
                       : null;

        const sportType = (match.sportType ?? 'FUTSAL_5') as any;
        const { mmrChangeA, mmrChangeB, mmrField } = calcTeamMMR('dummy_team_a', 'dummy_team_b', winnerId, sportType);

        const rosterMemberIds = match.rosterPicks.map(r => r.memberId);
        const rosterMembers = await prisma.teamMember.findMany({
          where: { id: { in: rosterMemberIds } },
          select: { playerId: true, teamId: true },
        });

        const playerBaseResults = calcPlayerBaseMMR(
          rosterMembers.map(m => ({ playerId: m.playerId, teamId: m.teamId })),
          winnerId,
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
            data: { status: 'COMPLETED', winnerId, mmrChangeA, mmrChangeB, finalOutcome: 'agreed' }
          }),
          prisma.team.update({ where: { id: 'dummy_team_a' }, data: { [mmrField]: { increment: mmrChangeA }, teamMmr: { increment: mmrChangeA } } }),
          prisma.team.update({ where: { id: 'dummy_team_b' }, data: { [mmrField]: { increment: mmrChangeB }, teamMmr: { increment: mmrChangeB } } }),
          ...statUpserts,
          ...playerMmrUpdates,
        ]);

        const result = { scoreA, scoreB, winnerId, mmrChangeA, mmrChangeB };
        await broadcastMatchEvent(matchId, 'BOTH_SIGNED_OFF', result);
        return NextResponse.json({ ok: true, bothSigned: true, ...result });
      }

      await broadcastMatchEvent(matchId, 'SIGN_OFF', { bothSigned: false });
      return NextResponse.json({ ok: true, bothSigned: false });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
