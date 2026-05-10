import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calcTeamMMR, calcPlayerBaseMMR } from '@/lib/mmrCalculator';

function pid(req: NextRequest) { return req.cookies.get('bmt_player_id')?.value ?? null; }

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
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    if (match.status !== 'SCORE_ENTRY')
      return NextResponse.json({ error: 'Match must be in SCORE_ENTRY (sign-off) phase' }, { status: 400 });

    const isA = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
    const isB = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);
    if (!isA && !isB) return NextResponse.json({ error: 'Not in match' }, { status: 403 });

    const myTeam   = isA ? match.teamA : match.teamB;
    const myTeamId = isA ? match.teamA_Id : match.teamB_Id;
    const myRole = myTeam.members.find(m => m.playerId === playerId)?.role
      ?? (myTeam.ownerId === playerId ? 'owner' : 'member');
    if (!['owner','manager','captain'].includes(myRole))
      return NextResponse.json({ error: 'Only OMC can sign off' }, { status: 403 });

    // Upsert sign-off row for this team
    await prisma.matchSignOff.upsert({
      where: { matchId_teamId: { matchId, teamId: myTeamId } },
      create: { matchId, teamId: myTeamId },
      update: { signedOffAt: new Date() },
    });

    const signOffs = await prisma.matchSignOff.findMany({ where: { matchId } });
    const bothSigned = signOffs.some(s => s.teamId === match.teamA_Id)
                    && signOffs.some(s => s.teamId === match.teamB_Id);

    if (!bothSigned) {
      return NextResponse.json({ ok: true, bothSigned: false });
    }

    // ── Both signed — finalise match ──────────────────────────────────────────
    const scoreA  = match.scoreA ?? 0;
    const scoreB  = match.scoreB ?? 0;
    const winnerId = scoreA > scoreB ? match.teamA_Id
                   : scoreB > scoreA ? match.teamB_Id
                   : null;

    const sportType = match.teamA.sportType as any;
    const { mmrChangeA, mmrChangeB, mmrField } = calcTeamMMR(match.teamA_Id, match.teamB_Id, winnerId, sportType);

    // MMR cap: max 2 games per week between same teams
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

    // Gather all rostered players (from rosterPicks → memberId → TeamMember)
    const rosterMemberIds = match.rosterPicks.map(r => r.memberId);
    const rosterMembers = await prisma.teamMember.findMany({
      where: { id: { in: rosterMemberIds } },
      select: { playerId: true, teamId: true },
    });

    // Calculate base player MMR for every rostered player
    const playerBaseResults = calcPlayerBaseMMR(
      rosterMembers.map(m => ({ playerId: m.playerId, teamId: m.teamId })),
      recentCount >= 2 ? null : winnerId,  // no MMR if capped
      sportType,
    );

    // Upsert PlayerMatchStat rows with base MMR (no badge yet)
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

    // Apply player MMR increments
    const playerMmrUpdates = playerBaseResults.map(r =>
      prisma.player.update({
        where: { id: r.playerId },
        data: {
          [r.mmrField]: { increment: r.mmrChange },
          mmr           : { increment: r.mmrChange }, // keep legacy in sync
        },
      })
    );

    await prisma.$transaction([
      prisma.match.update({
        where: { id: matchId },
        data: { status: 'COMPLETED', winnerId, mmrChangeA: effectiveMmrChangeA, mmrChangeB: effectiveMmrChangeB, finalOutcome: 'agreed' }
      }),
      prisma.team.update({ where: { id: match.teamA_Id }, data: { [mmrField]: { increment: effectiveMmrChangeA }, teamMmr: { increment: effectiveMmrChangeA } } }),
      prisma.team.update({ where: { id: match.teamB_Id }, data: { [mmrField]: { increment: effectiveMmrChangeB }, teamMmr: { increment: effectiveMmrChangeB } } }),
      ...statUpserts,
      ...playerMmrUpdates,
    ]);

    return NextResponse.json({
      ok: true, bothSigned: true,
      scoreA, scoreB, winnerId,
      mmrChangeA: effectiveMmrChangeA, mmrChangeB: effectiveMmrChangeB,
      playerResults: playerBaseResults,
    });
  } catch (e: any) {
    console.error('[signoff POST]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
