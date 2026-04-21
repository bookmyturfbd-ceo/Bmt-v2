import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

function getPlayerId(req: NextRequest): string | null {
  return req.cookies.get('bmt_player_id')?.value ?? null;
}

function mapEnumToSport(enumValue: string): string {
  if (enumValue === 'FUTSAL_5') return '5-a-side Futsal';
  if (enumValue === 'FUTSAL_6') return '6-a-side Futsal';
  if (enumValue === 'FUTSAL_7') return '7-a-side Futsal';
  if (enumValue === 'CRICKET_7') return '7-a-side Cricket';
  if (enumValue === 'FOOTBALL_FULL') return 'Football (Full 11v11)';
  if (enumValue === 'CRICKET_FULL') return 'Cricket (Full 11v11)';
  return enumValue;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  // Also fetch active season for countdown
  const activeSeason = await prisma.challengeSeason.findFirst({ where: { isActive: true } });

  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, fullName: true, avatarUrl: true } },
      homeAreas: { select: { id: true, name: true, division: { select: { name: true } } } },
      homeTurfs: { select: { id: true, name: true, area: true } },
      members: {
        select: {
          id: true, role: true, playerId: true, sportRole: true, isStarter: true, pitchPosition: true,
          player: { select: { id: true, fullName: true, avatarUrl: true, mmr: true, level: true } }
        }
      },
      challengeSubscription: { select: { active: true, gracePeriodEnd: true, subscribedAt: true } },
      matchesAsTeamA: {
        orderBy: { createdAt: 'desc' },
        include: { 
          teamB: { select: { id: true, name: true, logoUrl: true } }
        }
      },
      matchesAsTeamB: {
        orderBy: { createdAt: 'desc' },
        include: { 
          teamA: { select: { id: true, name: true, logoUrl: true } }
        }
      }
    }
  });

  const playerId = getPlayerId(req);
  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  // Ensure owner's TeamMember.role always reads as 'owner' — guards against accidental DB mutation
  const normalised = {
    ...team,
    members: team.members.map((m: any) => 
      m.playerId === team.ownerId ? { ...m, role: 'owner' } : m
    )
  };
  return NextResponse.json({ team: normalised, myPlayerId: playerId, activeSeason });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const playerId = getPlayerId(req);
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const { id } = await params;
  
  const teamCheck = await prisma.team.findUnique({ 
    where: { id }, 
    select: { ownerId: true, sportType: true, members: true } 
  });
  if (!teamCheck) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  
  const myMember = teamCheck.members.find((m: any) => m.playerId === playerId);
  if (!myMember && teamCheck.ownerId !== playerId) return NextResponse.json({ error: 'Not a member' }, { status: 403 });
  // Normalize: owner's DB role might be stale — always derive from ownerId
  const myRole = teamCheck.ownerId === playerId ? 'owner' : (myMember?.role || 'none');

  const body = await req.json();
  const { action, payload } = body;

  const isOMC = ['owner', 'manager', 'captain'].includes(myRole);
  const isOM  = ['owner', 'manager'].includes(myRole);

  try {
    if (action === 'toggle_sub') {
      if (!isOM) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      const t = await prisma.team.update({
        where: { id },
        data: { isSubscribed: payload.isSubscribed }
      });
      return NextResponse.json({ ok: true, isSubscribed: t.isSubscribed });
    }

    if (action === 'add_member') {
      if (!isOM) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      
      let maxRosterSize = 9; // FUTSAL_5 default
      if (teamCheck.sportType === 'FUTSAL_6') maxRosterSize = 10;
      if (teamCheck.sportType === 'FUTSAL_7' || teamCheck.sportType === 'CRICKET_7') maxRosterSize = 11;
      if (teamCheck.sportType === 'FOOTBALL_FULL' || teamCheck.sportType === 'CRICKET_FULL') maxRosterSize = 15;

      if (teamCheck.members.length >= maxRosterSize) {
        return NextResponse.json({ error: `Roster is full. Maximum ${maxRosterSize} players allowed.` }, { status: 400 });
      }

      const { targetPlayerId } = payload;
      // Check player exists
      const player = await prisma.player.findUnique({ where: { id: targetPlayerId } });
      if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
      // Check not already a member
      const existing = await prisma.teamMember.findUnique({ where: { teamId_playerId: { teamId: id, playerId: targetPlayerId } } });
      if (existing) return NextResponse.json({ error: 'Already a member' }, { status: 409 });
      
      // Check not already in another team of the same sport
      const inSameSport = await prisma.teamMember.findFirst({
        where: {
          playerId: targetPlayerId,
          team: { sportType: teamCheck.sportType }
        },
        include: { team: { select: { name: true } } }
      });
      if (inSameSport) {
        return NextResponse.json({ error: `Player is already in a ${mapEnumToSport(teamCheck.sportType)} team (${inSameSport.team.name}). They must leave it before joining.` }, { status: 400 });
      }

      const member = await prisma.teamMember.create({
        data: { teamId: id, playerId: targetPlayerId, role: 'member' },
        select: {
          id: true, role: true, playerId: true, sportRole: true, isStarter: true, pitchPosition: true,
          player: { select: { id: true, fullName: true, avatarUrl: true, mmr: true, level: true } }
        }
      });
      return NextResponse.json({ ok: true, member });
    }

    if (action === 'kick_member') {
      if (!isOM) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      const { targetMemberId } = payload;
      // Cannot kick owner
      const target = await prisma.teamMember.findUnique({ where: { id: targetMemberId } });
      if (target?.role === 'owner') return NextResponse.json({ error: 'Cannot remove the owner' }, { status: 400 });
      await prisma.teamMember.delete({ where: { id: targetMemberId } });
      return NextResponse.json({ ok: true });
    }
    
    if (action === 'set_home_areas') {
      if (!isOM) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      const cityIds: string[] = payload.cityIds || [];
      if (cityIds.length > 3) return NextResponse.json({ error: 'Max 3 areas' }, { status: 400 });
      
      const t = await prisma.team.update({
        where: { id },
        data: { homeAreas: { set: cityIds.map(cityId => ({ id: cityId })) } },
        include: { homeAreas: { select: { id: true, name: true, division: { select: { name: true } } } } }
      });
      return NextResponse.json({ ok: true, homeAreas: t.homeAreas });
    }

    if (action === 'set_home_turfs') {
      if (!isOM) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      const turfIds: string[] = payload.turfIds || [];
      if (turfIds.length > 3) return NextResponse.json({ error: 'Max 3 turfs' }, { status: 400 });
      
      const t = await prisma.team.update({
        where: { id },
        data: { homeTurfs: { set: turfIds.map(turfId => ({ id: turfId })) } },
        include: { homeTurfs: { select: { id: true, name: true, area: true } } }
      });
      return NextResponse.json({ ok: true, homeTurfs: t.homeTurfs });
    }

    if (action === 'set_formation') {
      if (!isOMC) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      const t = await prisma.team.update({
        where: { id },
        data: { formation: payload.formation }
      });
      return NextResponse.json({ ok: true, formation: t.formation });
    }

    if (action === 'set_sport_role') {
      if (!isOMC) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      const tm = await prisma.teamMember.update({
        where: { id: payload.memberId },
        data: { sportRole: payload.sportRole }
      });
      return NextResponse.json({ ok: true, member: tm });
    }

    if (action === 'set_lineup') {
      if (!isOMC) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      const updates = payload.lineupUpdates || [];
      
      const results = await prisma.$transaction(
        updates.map((update: any) => 
          prisma.teamMember.update({
            where: { id: update.memberId },
            data: { 
              isStarter: update.isStarter, 
              pitchPosition: update.pitchPosition 
            }
          })
        )
      );
      
      return NextResponse.json({ ok: true, count: results.length });
    }

    if (action === 'set_team_role') {
      const { targetMemberId, newRole } = payload;
      
      // Guard hierarchies
      if (newRole === 'owner') return NextResponse.json({ error: 'Cannot transfer ownership here' }, { status: 400 });

      // CRITICAL: Never allow changing the team owner's role
      const targetMember = await prisma.teamMember.findUnique({ where: { id: targetMemberId }, select: { playerId: true } });
      if (targetMember?.playerId === teamCheck.ownerId) {
        return NextResponse.json({ error: 'Cannot change the team owner\'s role' }, { status: 403 });
      }

      if (newRole === 'manager' && myRole !== 'owner') return NextResponse.json({ error: 'Only Owner can appoint Manager' }, { status: 403 });
      if (newRole === 'captain' && !['owner', 'manager'].includes(myRole)) return NextResponse.json({ error: 'Only Owner or Manager can appoint Captain' }, { status: 403 });
      if (newRole === 'vice_captain' && !['owner', 'manager', 'captain'].includes(myRole)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

      // Demote anyone holding the unique roles automatically!
      if (['manager', 'captain', 'vice_captain'].includes(newRole)) {
        await prisma.teamMember.updateMany({
          where: { teamId: id, role: newRole as any },
          data: { role: 'member' }
        });
      }

      // Promote the target
      const updated = await prisma.teamMember.update({
        where: { id: targetMemberId },
        data: { role: newRole as any }
      });

      return NextResponse.json({ ok: true, member: updated });
    }

    if (action === 'subscribe_challenge') {
      if (!['owner', 'manager'].includes(myRole)) return NextResponse.json({ error: 'Only Owner or Manager can subscribe' }, { status: 403 });

      const minRequired = teamCheck.sportType === 'FUTSAL_6' ? 6 : (teamCheck.sportType === 'CRICKET_7' ? 7 : 5);
      if (teamCheck.members.length < minRequired) {
        return NextResponse.json({ error: `You need at least ${minRequired} players on the roster to enter the Challenge Market.` }, { status: 400 });
      }

      const existing = await prisma.challengeSubscription.findUnique({ where: { teamId: id } });
      if (existing && existing.active) return NextResponse.json({ error: 'Team is already subscribed.' }, { status: 400 });

      const cfg = await prisma.challengeMarketConfig.findUnique({ where: { id: 'singleton' } });
      const fee = cfg?.monthlyFee ?? 500;

      // STRICT OVERDRAFT PROTECT
      const expectedOwner = await prisma.player.findUnique({ where: { id: teamCheck.ownerId } });
      if (!expectedOwner || expectedOwner.walletBalance < fee) {
        return NextResponse.json({ error: `Insufficient wallet balance. You need ৳${fee} but only have ৳${expectedOwner?.walletBalance || 0}. Please recharge your wallet.` }, { status: 400 });
      }

      const ownerRec = await prisma.player.update({
        where: { id: teamCheck.ownerId },
        data: { walletBalance: { decrement: fee } }
      });

      let graceEnd = null;
      if (ownerRec.walletBalance < 0) {
        graceEnd = new Date();
        graceEnd.setDate(graceEnd.getDate() + 3);
      }

      await prisma.$transaction([
        prisma.challengePayment.create({
          data: { teamId: id, ownerId: teamCheck.ownerId, amount: fee }
        }),
        existing 
          ? prisma.challengeSubscription.update({
              where: { teamId: id },
              data: { active: true, gracePeriodEnd: graceEnd, subscribedAt: new Date() }
            })
          : prisma.challengeSubscription.create({
              data: { teamId: id, active: true, gracePeriodEnd: graceEnd }
            }),
        prisma.team.update({
          where: { id },
          data: { isSubscribed: true }
        })
      ]);

      return NextResponse.json({ ok: true, walletBalance: ownerRec.walletBalance });
    }

    if (action === 'delete_team') {
      if (myRole !== 'owner') return NextResponse.json({ error: 'Only the team owner can delete the team.' }, { status: 403 });
      
      const { password } = payload;
      if (!password) return NextResponse.json({ error: 'Password is required to delete the team.' }, { status: 400 });

      const owner = await prisma.player.findUnique({ where: { id: playerId } });
      if (!owner) return NextResponse.json({ error: 'Owner account not found.' }, { status: 404 });

      const pwMatch = await bcrypt.compare(password, owner.password);
      if (!pwMatch) return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });

      await prisma.team.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
