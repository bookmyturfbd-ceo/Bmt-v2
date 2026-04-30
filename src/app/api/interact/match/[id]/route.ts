import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastMatchEvent } from '@/lib/supabaseRealtime';

function getPlayerId(req: NextRequest) {
  return req.cookies.get('bmt_player_id')?.value ?? null;
}

// ─── GET: Full match state (interaction board) ────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await params;
  const playerId = getPlayerId(req);
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: {
          select: {
            id: true, name: true, logoUrl: true, sportType: true, teamMmr: true, ownerId: true,
            members: { select: { id: true, playerId: true, role: true, sportRole: true, player: { select: { id: true, fullName: true, avatarUrl: true, mmr: true } } } }
          }
        },
        teamB: {
          select: {
            id: true, name: true, logoUrl: true, sportType: true, teamMmr: true, ownerId: true,
            members: { select: { id: true, playerId: true, role: true, sportRole: true, player: { select: { id: true, fullName: true, avatarUrl: true, mmr: true } } } }
          }
        },
        rosterPicks: true,
        venueSuggestions: { include: {} },
        chatMessages: {
          orderBy: { createdAt: 'asc' },
          include: { player: { select: { id: true, fullName: true, avatarUrl: true } } }
        },
        scorers: true,
      }
    });

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });

    const isTeamA = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
    const isTeamB = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);

    if (!isTeamA && !isTeamB) return NextResponse.json({ error: 'You are not part of this match' }, { status: 403 });

    const myTeamId = isTeamA ? match.teamA_Id : match.teamB_Id;
    const myTeam = isTeamA ? match.teamA : match.teamB;
    const myRole = myTeam.members.find(m => m.playerId === playerId)?.role
      ?? (myTeam.ownerId === playerId ? 'owner' : 'member');
    const isOMC = ['owner', 'manager', 'captain'].includes(myRole);

    // Enrich venue suggestions
    const enrichedSuggestions = await Promise.all(
      match.venueSuggestions.map(async (s) => {
        const turf = await prisma.turf.findUnique({ where: { id: s.turfId }, select: { id: true, name: true, area: true } });
        const slot = await prisma.slot.findUnique({ where: { id: s.slotId }, select: { id: true, startTime: true, endTime: true, price: true } });
        return { ...s, turf, slot };
      })
    );

    // Enrich rosterPicks
    const enrichedPicks = await Promise.all(
      match.rosterPicks.map(async (pick: any) => {
        const teamForPick = pick.teamId === match.teamA_Id ? match.teamA : match.teamB;
        const member = teamForPick.members.find((m: any) => m.id === pick.memberId);
        return { ...pick, player: member?.player, role: member?.role, sportRole: member?.sportRole };
      })
    );

    // Check if the player is the assigned scorer for their team
    const myScorer = match.scorers?.find((s: any) => s.teamId === myTeamId);
    const isScorer = myScorer?.playerId === playerId;
    // A scorer who is not a team member can still view if assigned
    const canView = isTeamA || isTeamB || isScorer;

    // Enrich selected BMT slot with turf + time info (so both sides see it on reload)
    let selectedSlotInfo: { turfName: string; startTime: string; endTime: string; price: number } | null = null;
    if (match.selectedSlotId) {
      const slot = await prisma.slot.findUnique({
        where: { id: match.selectedSlotId },
        include: { ground: { include: { turf: { select: { name: true } } } } },
      });
      if (slot) {
        selectedSlotInfo = {
          turfName:  slot.ground.turf.name,
          startTime: slot.startTime,
          endTime:   slot.endTime,
          price:     slot.price,
        };
      }
    }

    return NextResponse.json({
      match: { ...match, venueSuggestions: enrichedSuggestions, rosterPicks: enrichedPicks, selectedSlotInfo },
      myTeamId,
      isTeamA,
      isOMC,
      isScorer,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ─── PATCH: Interaction board lifecycle (roster, venue, start match) ──────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await params;
  const playerId = getPlayerId(req);
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    const body = await req.json();
    const { action } = body;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: { include: { members: { select: { playerId: true, role: true } } } },
        teamB: { include: { members: { select: { playerId: true, role: true } } } },
      }
    });

    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    console.log(`[Interaction PATCH] Action: ${action} | Match: ${matchId} | Player: ${playerId}`);

    const isTeamA = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
    const isTeamB = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);
    if (!isTeamA && !isTeamB) return NextResponse.json({ error: 'Not in this match' }, { status: 403 });

    const myTeamId = isTeamA ? match.teamA_Id : match.teamB_Id;
    const myTeam = isTeamA ? match.teamA : match.teamB;
    const myRole = myTeam.members.find(m => m.playerId === playerId)?.role
      ?? (myTeam.ownerId === playerId ? 'owner' : 'member');
    const isOMC = ['owner', 'manager', 'captain'].includes(myRole);

    // Also check if the player is the assigned scorer
    const myScorer = await prisma.matchScorer.findUnique({ where: { matchId_teamId: { matchId, teamId: myTeamId } } });
    const isScorer = myScorer?.playerId === playerId;

    // ── lock_roster ──────────────────────────────────────────────────────────
    if (action === 'lock_roster') {
      if (!isOMC) return NextResponse.json({ error: 'Only OMC can lock roster' }, { status: 403 });
      const { picks, formation } = body;
      const teamId = isTeamA ? match.teamA_Id : match.teamB_Id;
      await prisma.$transaction([
        prisma.matchRosterPick.deleteMany({ where: { matchId, teamId } }),
        ...picks.map((p: any) => prisma.matchRosterPick.create({
          data: { matchId, teamId, memberId: p.memberId, isStarter: p.isStarter }
        }))
      ]);
      const updateData = isTeamA
        ? { formationA: formation, rosterLockedA: true }
        : { formationB: formation, rosterLockedB: true };
      const updated = await prisma.match.update({ where: { id: matchId }, data: updateData });
      return NextResponse.json({ ok: true, match: updated });
    }

    // ── suggest_venue ────────────────────────────────────────────────────────
    if (action === 'suggest_venue') {
      if (!isOMC || !isTeamA) return NextResponse.json({ error: 'Only challenger OMC can suggest venues' }, { status: 403 });
      const { suggestions } = body;
      if (!suggestions || suggestions.length !== 3) return NextResponse.json({ error: 'Must suggest exactly 3 venues' }, { status: 400 });
      await prisma.$transaction([
        prisma.matchVenueSuggestion.deleteMany({ where: { matchId } }),
        ...suggestions.map((s: any) => prisma.matchVenueSuggestion.create({
          data: { matchId, turfId: s.turfId, slotId: s.slotId, date: s.date, priority: s.priority }
        }))
      ]);
      return NextResponse.json({ ok: true });
    }

    // ── select_venue ─────────────────────────────────────────────────────────
    if (action === 'select_venue') {
      if (!isOMC || !isTeamB) return NextResponse.json({ error: 'Only challenged OMC can select venue' }, { status: 403 });
      const { suggestionId } = body;
      const suggestion = await prisma.matchVenueSuggestion.findUnique({ where: { id: suggestionId } });
      if (!suggestion || suggestion.matchId !== matchId) return NextResponse.json({ error: 'Invalid suggestion' }, { status: 400 });
      await prisma.match.update({
        where: { id: matchId },
        data: { selectedSlotId: suggestion.slotId, matchDate: suggestion.date }
      });
      return NextResponse.json({ ok: true });
    }

    // ── unlock_roster ─────────────────────────────────────────────────────────
    if (action === 'unlock_roster') {
      if (!isOMC) return NextResponse.json({ error: 'Only OMC can edit roster' }, { status: 403 });
      if (match.venueBookedAt) return NextResponse.json({ error: 'Cannot edit roster after venue is booked' }, { status: 400 });
      const teamId = isTeamA ? match.teamA_Id : match.teamB_Id;
      const updateData = isTeamA
        ? { rosterLockedA: false, formationA: null }
        : { rosterLockedB: false, formationB: null };
      await prisma.$transaction([
        prisma.matchRosterPick.deleteMany({ where: { matchId, teamId } }),
        prisma.match.update({ where: { id: matchId }, data: updateData }),
      ]);
      return NextResponse.json({ ok: true, message: 'Roster unlocked — you can now re-select your lineup' });
    }

    // ── book_venue ────────────────────────────────────────────────────────────
    if (action === 'book_venue') {
      if (!isOMC || !isTeamA) return NextResponse.json({ error: 'Only challenger OMC can confirm booking' }, { status: 403 });
      if (!match.selectedSlotId || !match.matchDate) return NextResponse.json({ error: 'No venue selected yet' }, { status: 400 });
      if (!match.rosterLockedA || !match.rosterLockedB) return NextResponse.json({ error: 'Both teams must lock rosters before booking' }, { status: 400 });

      const slot = await prisma.slot.findUnique({
        where: { id: match.selectedSlotId },
        include: { ground: { include: { turf: { select: { id: true, name: true, revenueModelType: true, revenueModelValue: true } } } } }
      });
      if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 });

      const existing = await prisma.booking.findFirst({
        where: { slotId: match.selectedSlotId, date: match.matchDate, status: { not: 'cancelled' } }
      });
      if (existing) {
        return NextResponse.json({
          error: `This slot (${slot.startTime}–${slot.endTime}) is already booked for ${match.matchDate}. The opponent must select a different venue.`
        }, { status: 409 });
      }

      const halfCost = slot.price / 2;
      const ownerA = await prisma.player.findUnique({ where: { id: match.teamA.ownerId } });
      const ownerB = await prisma.player.findUnique({ where: { id: match.teamB.ownerId } });
      const shortfalls: string[] = [];
      if ((ownerA?.walletBalance ?? 0) < halfCost)
        shortfalls.push(`${match.teamA.name} owner is short ৳${(halfCost - (ownerA?.walletBalance ?? 0)).toFixed(0)}`);
      if ((ownerB?.walletBalance ?? 0) < halfCost)
        shortfalls.push(`${match.teamB.name} owner is short ৳${(halfCost - (ownerB?.walletBalance ?? 0)).toFixed(0)}`);
      if (shortfalls.length > 0) return NextResponse.json({ error: `Insufficient wallet balance: ${shortfalls.join('; ')}` }, { status: 400 });

      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      const turf = slot.ground.turf;
      const pctModel = turf.revenueModelType === 'percentage' && turf.revenueModelValue;
      const bmtCutA = pctModel ? Math.round(halfCost * (turf.revenueModelValue! / 100)) : 0;
      const ownerShareA = halfCost - bmtCutA;
      const bmtCutB = bmtCutA;
      const ownerShareB = halfCost - bmtCutB;
      const notes = `Challenge Market — ${match.teamA.name} vs ${match.teamB.name}`;

      await prisma.$transaction([
        prisma.booking.create({ data: { playerId: match.teamA.ownerId, slotId: match.selectedSlotId!, turfId: turf.id, date: match.matchDate!, price: halfCost, ownerShare: ownerShareA, bmtCut: bmtCutA, status: 'confirmed', selectedSport: match.teamA.sportType, bookingCode: code, source: 'challenge_market', notes } }),
        prisma.booking.create({ data: { playerId: match.teamB.ownerId, slotId: match.selectedSlotId!, turfId: turf.id, date: match.matchDate!, price: halfCost, ownerShare: ownerShareB, bmtCut: bmtCutB, status: 'confirmed', selectedSport: match.teamB.sportType, bookingCode: code, source: 'challenge_market', notes } }),
        prisma.player.update({ where: { id: match.teamA.ownerId }, data: { walletBalance: { decrement: halfCost } } }),
        prisma.player.update({ where: { id: match.teamB.ownerId }, data: { walletBalance: { decrement: halfCost } } }),
        prisma.owner.updateMany({ where: { turfs: { some: { id: turf.id } } }, data: { walletBalance: { increment: ownerShareA + ownerShareB } } }),
        prisma.match.update({ where: { id: matchId }, data: { status: 'SCHEDULED', venueBookedAt: new Date(), bookingCode: code } }),
      ]);

      return NextResponse.json({ ok: true, bookingCode: code, halfCost, message: `Venue booked! Booking code: ${code}` });
    }

    // ── start_match ───────────────────────────────────────────────────────────
    if (action === 'start_match') {
      if (!isOMC && !isScorer) return NextResponse.json({ error: 'Only OMC or assigned scorer can start the match' }, { status: 403 });
      if (match.status !== 'SCHEDULED') return NextResponse.json({ error: 'Match is not scheduled yet' }, { status: 400 });
      const updateData = isTeamA ? { matchStartedByA: true } : { matchStartedByB: true };
      const updated = await prisma.match.update({ where: { id: matchId }, data: updateData });
      if (updated.matchStartedByA && updated.matchStartedByB) {
        await prisma.match.update({ where: { id: matchId }, data: { status: 'LIVE' } });
      }
      return NextResponse.json({ ok: true, match: updated });
    }

    // ── set_venue_type ────────────────────────────────────────────────────────
    if (action === 'set_venue_type') {
      if (!isOMC || !isTeamA) return NextResponse.json({ error: 'Only challenger OMC can set venue type' }, { status: 403 });
      if (!match.rosterLockedA || !match.rosterLockedB) return NextResponse.json({ error: 'Both rosters must be locked first' }, { status: 400 });
      const { venueType } = body;
      if (!['BMT', 'OPEN_WBT'].includes(venueType)) return NextResponse.json({ error: 'Invalid venue type' }, { status: 400 });
      await prisma.match.update({ where: { id: matchId }, data: { venueType, venueConfirmedByB: false } });
      await broadcastMatchEvent(matchId, 'venue_type_set', { venueType });
      return NextResponse.json({ ok: true });
    }

    // ── respond_venue_type ────────────────────────────────────────────────────
    // Team B (challenged) accepts or rejects Team A's venue type proposal
    if (action === 'respond_venue_type') {
      if (!isOMC || !isTeamB) return NextResponse.json({ error: 'Only challenged OMC can respond' }, { status: 403 });
      if (!match.venueType) return NextResponse.json({ error: 'No venue type proposed yet' }, { status: 400 });
      const { accept } = body;
      if (accept) {
        await prisma.match.update({ where: { id: matchId }, data: { venueConfirmedByB: true } });
        await broadcastMatchEvent(matchId, 'venue_type_confirmed', { venueType: match.venueType });
      } else {
        // Rejected — clear so Team A can re-choose
        await prisma.match.update({ where: { id: matchId }, data: { venueType: null, venueConfirmedByB: false } });
        await broadcastMatchEvent(matchId, 'venue_type_rejected', {});
      }
      return NextResponse.json({ ok: true });
    }

    // ── clear_venue_type ──────────────────────────────────────────────────────
    // Team A changes their mind before Team B accepts
    if (action === 'clear_venue_type') {
      if (!isOMC || !isTeamA) return NextResponse.json({ error: 'Only challenger OMC can clear venue type' }, { status: 403 });
      if ((match as any).venueConfirmedByB) return NextResponse.json({ error: 'Opponent already accepted' }, { status: 400 });
      await prisma.match.update({ where: { id: matchId }, data: { venueType: null, venueConfirmedByB: false } });
      await broadcastMatchEvent(matchId, 'venue_type_cleared', {});
      return NextResponse.json({ ok: true });
    }


    // ── book_bmt_slot ─────────────────────────────────────────────────────────
    // Challenger picks a slot and sends it to opponent for accept/decline
    if (action === 'book_bmt_slot') {
      if (!isOMC || !isTeamA) return NextResponse.json({ error: 'Only challenger OMC can select slot' }, { status: 403 });
      const { slotId, date } = body;
      const slot = await prisma.slot.findUnique({ where: { id: slotId }, include: { ground: { include: { turf: true } } } });
      if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
      // Check availability
      const existing = await prisma.booking.findFirst({ where: { slotId, date, status: { not: 'cancelled' } } });
      if (existing) return NextResponse.json({ error: 'Slot already booked for this date' }, { status: 409 });
      await prisma.match.update({ where: { id: matchId }, data: { selectedSlotId: slotId, matchDate: date } });
      await broadcastMatchEvent(matchId, 'bmt_slot_selected', {
        slotId, date,
        turfName: slot.ground.turf.name,
        startTime: slot.startTime,
        endTime: slot.endTime,
        price: slot.price,
        halfCost: slot.price / 2,
      });
      return NextResponse.json({ ok: true });
    }

    // ── clear_bmt_slot ────────────────────────────────────────────────────────
    // Challenger cancels their pending slot pick so they can choose again
    if (action === 'clear_bmt_slot') {
      if (!isOMC || !isTeamA) return NextResponse.json({ error: 'Only challenger OMC can clear slot' }, { status: 403 });
      await prisma.match.update({ where: { id: matchId }, data: { selectedSlotId: null, matchDate: null } });
      await broadcastMatchEvent(matchId, 'bmt_slot_cleared', {});
      return NextResponse.json({ ok: true });
    }

    // ── bmt_slot_respond ──────────────────────────────────────────────────────
    // Challenged accepts or declines the slot
    if (action === 'bmt_slot_respond') {
      if (!isOMC || !isTeamB) return NextResponse.json({ error: 'Only challenged OMC can respond' }, { status: 403 });
      const { accept } = body;
      if (!accept) {
        // Decline — clear selected slot so challenger can pick another
        await prisma.match.update({ where: { id: matchId }, data: { selectedSlotId: null, matchDate: null } });
        await broadcastMatchEvent(matchId, 'bmt_slot_response', { accepted: false });
        return NextResponse.json({ ok: true, message: 'Slot declined' });
      }
      // Accept — run the full booking logic
      if (!match.selectedSlotId || !match.matchDate) return NextResponse.json({ error: 'No slot pending' }, { status: 400 });
      if (!match.rosterLockedA || !match.rosterLockedB) return NextResponse.json({ error: 'Both rosters must be locked' }, { status: 400 });

      const slot = await prisma.slot.findUnique({
        where: { id: match.selectedSlotId },
        include: { ground: { include: { turf: { select: { id: true, name: true, revenueModelType: true, revenueModelValue: true } } } } }
      });
      if (!slot) return NextResponse.json({ error: 'Slot not found' }, { status: 404 });

      const halfCost = slot.price / 2;
      const ownerA = await prisma.player.findUnique({ where: { id: match.teamA.ownerId } });
      const ownerB = await prisma.player.findUnique({ where: { id: match.teamB.ownerId } });
      const shortfalls: string[] = [];
      if ((ownerA?.walletBalance ?? 0) < halfCost) shortfalls.push(`${match.teamA.name} owner short ৳${(halfCost - (ownerA?.walletBalance ?? 0)).toFixed(0)}`);
      if ((ownerB?.walletBalance ?? 0) < halfCost) shortfalls.push(`${match.teamB.name} owner short ৳${(halfCost - (ownerB?.walletBalance ?? 0)).toFixed(0)}`);
      if (shortfalls.length) return NextResponse.json({ error: `Insufficient balance: ${shortfalls.join('; ')}` }, { status: 400 });

      const code = Math.random().toString(36).substring(2, 6).toUpperCase();
      const turf = slot.ground.turf;
      const pct = turf.revenueModelType === 'percentage' && turf.revenueModelValue ? turf.revenueModelValue / 100 : 0;
      const bmtCut = Math.round(halfCost * pct);
      const ownerShare = halfCost - bmtCut;
      const notes = `Challenge Market — ${match.teamA.name} vs ${match.teamB.name}`;

      await prisma.$transaction([
        prisma.booking.create({ data: { playerId: match.teamA.ownerId, slotId: match.selectedSlotId!, turfId: turf.id, date: match.matchDate!, price: halfCost, ownerShare, bmtCut, status: 'confirmed', selectedSport: match.teamA.sportType, bookingCode: code, source: 'challenge_market', notes } }),
        prisma.booking.create({ data: { playerId: match.teamB.ownerId, slotId: match.selectedSlotId!, turfId: turf.id, date: match.matchDate!, price: halfCost, ownerShare, bmtCut, status: 'confirmed', selectedSport: match.teamB.sportType, bookingCode: code, source: 'challenge_market', notes } }),
        prisma.player.update({ where: { id: match.teamA.ownerId }, data: { walletBalance: { decrement: halfCost } } }),
        prisma.player.update({ where: { id: match.teamB.ownerId }, data: { walletBalance: { decrement: halfCost } } }),
        prisma.owner.updateMany({ where: { turfs: { some: { id: turf.id } } }, data: { walletBalance: { increment: ownerShare * 2 } } }),
        prisma.match.update({ where: { id: matchId }, data: { status: 'SCHEDULED', venueBookedAt: new Date(), bookingCode: code } }),
      ]);

      await broadcastMatchEvent(matchId, 'bmt_slot_response', { accepted: true, bookingCode: code });
      return NextResponse.json({ ok: true, bookingCode: code });
    }

    // ── select_wbt_turf ───────────────────────────────────────────────────────
    if (action === 'select_wbt_turf') {
      if (!isOMC || !isTeamA) return NextResponse.json({ error: 'Only challenger OMC can select WBT turf' }, { status: 403 });
      const { wbtTurfId, wbtFrom, wbtTo, matchDate } = body;
      if (!wbtTurfId || !wbtFrom || !wbtTo || !matchDate) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
      const turf = await prisma.wbtTurf.findUnique({ where: { id: wbtTurfId }, include: { division: true, city: true } });
      if (!turf) return NextResponse.json({ error: 'WBT Turf not found' }, { status: 404 });
      await prisma.match.update({ where: { id: matchId }, data: { wbtTurfId, wbtTurfName: turf.name, wbtFrom, wbtTo, matchDate } });
      await broadcastMatchEvent(matchId, 'wbt_turf_selected', { wbtTurfId, turfName: turf.name, wbtFrom, wbtTo, matchDate, city: turf.city.name });
      return NextResponse.json({ ok: true });
    }

    // ── apply_wbt_coupon ──────────────────────────────────────────────────────
    if (action === 'apply_wbt_coupon') {
      if (!isOMC) return NextResponse.json({ error: 'Only OMC can apply coupon' }, { status: 403 });
      const { couponCode } = body;
      const coupon = await prisma.wbtCoupon.findUnique({ where: { code: couponCode?.toUpperCase() } });
      if (!coupon || !coupon.active) return NextResponse.json({ error: 'Invalid or inactive coupon' }, { status: 400 });
      if (coupon.expiresAt && new Date() > coupon.expiresAt) return NextResponse.json({ error: 'Coupon expired' }, { status: 400 });
      if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return NextResponse.json({ error: 'Coupon max uses reached' }, { status: 400 });

      // Get match fee
      const feeSetting = await prisma.platformSetting.findUnique({ where: { key: 'wbt_match_fee_taka' } });
      const fee = feeSetting ? parseFloat(feeSetting.value) : 500;
      const discount = coupon.discountType === 'percentage'
        ? Math.round((fee / 2) * coupon.discountValue / 100) // per team
        : Math.min(coupon.discountValue / 2, fee / 2);        // split flat discount

      await prisma.match.update({ where: { id: matchId }, data: { wbtCouponCode: coupon.code, wbtCouponDiscount: discount } });
      await broadcastMatchEvent(matchId, 'wbt_coupon_applied', { couponCode: coupon.code, discountPerTeam: discount });
      return NextResponse.json({ ok: true, discount });
    }

    // ── pay_wbt ───────────────────────────────────────────────────────────────
    if (action === 'pay_wbt') {
      if (!isOMC) return NextResponse.json({ error: 'Only OMC can confirm payment' }, { status: 403 });
      const feeSetting = await prisma.platformSetting.findUnique({ where: { key: 'wbt_match_fee_taka' } });
      const fee = feeSetting ? parseFloat(feeSetting.value) : 500;

      // Re-fetch fresh match for coupon discount
      const freshMatch = await prisma.match.findUnique({ where: { id: matchId } });
      if (!freshMatch) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
      const perTeam = (fee / 2) - (freshMatch.wbtCouponDiscount ?? 0);
      if (perTeam < 0) return NextResponse.json({ error: 'Invalid fee calculation' }, { status: 400 });

      const ownerId = isTeamA ? match.teamA.ownerId : match.teamB.ownerId;
      const owner = await prisma.player.findUnique({ where: { id: ownerId } });
      if ((owner?.walletBalance ?? 0) < perTeam) return NextResponse.json({ error: `Insufficient wallet balance. Need ৳${perTeam.toFixed(0)}` }, { status: 400 });

      const updateFlag = isTeamA ? { wbtPaymentA: true } : { wbtPaymentB: true };
      await prisma.$transaction([
        prisma.player.update({ where: { id: ownerId }, data: { walletBalance: { decrement: perTeam } } }),
        prisma.match.update({ where: { id: matchId }, data: updateFlag }),
      ]);

      // Check if both paid
      const updatedMatch = await prisma.match.findUnique({ where: { id: matchId } });
      if (updatedMatch?.wbtPaymentA && updatedMatch?.wbtPaymentB) {
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();
        // Increment coupon usage if applied
        if (freshMatch.wbtCouponCode) {
          await prisma.wbtCoupon.update({ where: { code: freshMatch.wbtCouponCode }, data: { usedCount: { increment: 1 } } });
        }
        await prisma.match.update({ where: { id: matchId }, data: { status: 'SCHEDULED', venueBookedAt: new Date(), bookingCode: code } });
        await broadcastMatchEvent(matchId, 'wbt_booking_complete', { bookingCode: code });
        return NextResponse.json({ ok: true, bookingCode: code, bothPaid: true });
      }

      await broadcastMatchEvent(matchId, 'wbt_payment_update', { teamA: updatedMatch?.wbtPaymentA, teamB: updatedMatch?.wbtPaymentB });
      return NextResponse.json({ ok: true, bothPaid: false });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (e: any) {
    console.error('[match PATCH]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

