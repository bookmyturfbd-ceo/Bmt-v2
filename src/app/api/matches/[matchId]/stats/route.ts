import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calcPlayerBadgeBonus } from '@/lib/mmrCalculator';
import { maxBadges } from '@/lib/rankUtils';

function pid(req: NextRequest) { return req.cookies.get('bmt_player_id')?.value ?? null; }

/**
 * POST /api/matches/[matchId]/stats
 *
 * Badge-only distribution. Called by OMC from the History tab after the match
 * is COMPLETED and base MMR has already been applied at signoff.
 *
 * Body: { stats: Array<{ playerId, badgeKey, goals?, assists?, runs?, wickets?, overs?, yellowCard?, redCard? }> }
 *
 * Applies badge bonus (+20 MVP / +10 other) to each badged player.
 * Guards against double-submission with badgeBonusApplied flag.
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
      }
    });
    if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    if (match.status !== 'COMPLETED')
      return NextResponse.json({ error: 'Match must be COMPLETED first' }, { status: 400 });

    const isA = match.teamA.ownerId === playerId || match.teamA.members.some(m => m.playerId === playerId);
    const isB = match.teamB.ownerId === playerId || match.teamB.members.some(m => m.playerId === playerId);
    if (!isA && !isB) return NextResponse.json({ error: 'Not in match' }, { status: 403 });

    const myTeam   = isA ? match.teamA : match.teamB;
    const myTeamId = isA ? match.teamA_Id : match.teamB_Id;

    // Check if THIS team already distributed badges/stats
    const existingStats = await prisma.playerMatchStat.findFirst({
      where: { matchId, teamId: myTeamId }
    });
    if (existingStats) {
      return NextResponse.json({ error: 'Stats and badges have already been distributed for your team in this match' }, { status: 409 });
    }
    const myRole = myTeam.members.find(m => m.playerId === playerId)?.role
      ?? (myTeam.ownerId === playerId ? 'owner' : 'member');
    if (!['owner','manager','captain'].includes(myRole))
      return NextResponse.json({ error: 'Only OMC can distribute badges' }, { status: 403 });

    const body = await req.json();
    const { stats } = body as {
      stats: Array<{
        playerId    : string;
        badgeKey   ?: string;
        // Optional display stats (stored but don't affect MMR at this stage)
        goals      ?: number;
        assists    ?: number;
        runs       ?: number;
        wickets    ?: number;
        overs      ?: number;
        yellowCard ?: boolean;
        redCard    ?: boolean;
      }>
    };

    if (!Array.isArray(stats) || stats.length === 0)
      return NextResponse.json({ error: 'No stats provided' }, { status: 400 });

    // ── Badge validation ──────────────────────────────────────────────────────
    const sportType = match.teamA.sportType as string;
    const badgedPlayers = stats.filter(s => s.badgeKey && s.badgeKey !== 'NONE');
    const badgeMax = maxBadges(sportType);

    if (badgedPlayers.length > badgeMax)
      return NextResponse.json({ error: `Maximum ${badgeMax} badges allowed for ${sportType}` }, { status: 400 });

    // Max 1 badge per player
    const uniquePlayers = new Set(badgedPlayers.map(p => p.playerId));
    if (uniquePlayers.size !== badgedPlayers.length)
      return NextResponse.json({ error: 'Maximum 1 badge per player' }, { status: 400 });

    // ── Calculate badge bonuses ───────────────────────────────────────────────
    const badgeResults = calcPlayerBadgeBonus(
      badgedPlayers.map(s => ({ playerId: s.playerId, badgeKey: s.badgeKey! })),
      sportType as any,
    );

    // ── Persist badge + optional display stats ────────────────────────────────
    const statUpdates = stats.map(s => prisma.playerMatchStat.upsert({
      where: { matchId_playerId: { matchId, playerId: s.playerId } },
      create: {
        matchId,
        playerId : s.playerId,
        teamId   : myTeamId,
        badge    : (s.badgeKey ?? 'NONE') as any,
        badgeBonus: badgeResults.find(r => r.playerId === s.playerId)?.badgeBonus ?? 0,
        goals    : s.goals    ?? 0,
        assists  : s.assists  ?? 0,
        runs     : s.runs     ?? 0,
        wickets  : s.wickets  ?? 0,
        overs    : s.overs    ?? 0,
        yellowCard: s.yellowCard ?? false,
        redCard   : s.redCard   ?? false,
      },
      update: {
        badge    : (s.badgeKey ?? 'NONE') as any,
        badgeBonus: badgeResults.find(r => r.playerId === s.playerId)?.badgeBonus ?? 0,
        goals    : s.goals    ?? 0,
        assists  : s.assists  ?? 0,
        runs     : s.runs     ?? 0,
        wickets  : s.wickets  ?? 0,
        overs    : s.overs    ?? 0,
        yellowCard: s.yellowCard ?? false,
        redCard   : s.redCard   ?? false,
      },
    }));

    // Apply badge MMR bonus to each badged player
    const badgeMmrUpdates = badgeResults
      .filter(r => r.badgeBonus > 0)
      .map(r => prisma.player.update({
        where: { id: r.playerId },
        data: {
          [r.mmrField]: { increment: r.badgeBonus },
          mmr           : { increment: r.badgeBonus },
        },
      }));

    await prisma.$transaction([
      ...statUpdates,
      ...badgeMmrUpdates,
    ]);

    return NextResponse.json({ ok: true, badgeResults });
  } catch (e: any) {
    console.error('[stats POST]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
