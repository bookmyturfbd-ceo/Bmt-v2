import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { calcPlayerBadgeBonus } from '@/lib/mmrCalculator';
import { maxBadges } from '@/lib/rankUtils';

function pid(req: NextRequest) { return req.cookies.get('bmt_player_id')?.value ?? null; }

const BADGE_META: Record<string, { title: string; icon: string }> = {
  MVP: { title: 'Man of the Match', icon: '⭐' },
  THE_SNIPER: { title: 'The Sniper', icon: '🎯' },
  THE_MAESTRO: { title: 'The Maestro', icon: '🪄' },
  THE_WALL: { title: 'The Wall', icon: '🛡️' },
  OPP_RESPECT: { title: 'Respect Badge', icon: '🤝' },
  OPP_TOUGHEST: { title: 'Toughest Opponent', icon: '🪨' },
  OPP_KEEPER: { title: 'Best Keeper', icon: '🧤' },
};

/**
 * POST /api/matches/[matchId]/stats
 *
 * Badge-only distribution. Called by OMC from the History tab after the match
 * is COMPLETED and base MMR has already been applied at signoff.
 *
 * Body: { stats: Array<{ playerId, badgeKey, goals?, assists?, runs?, wickets?, overs?, yellowCard?, redCard? }> }
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
    const opponentTeamId = isA ? match.teamB_Id : match.teamA_Id;

    // Check if THIS team already distributed badges
    const existingBadges = await prisma.playerMatchStat.findFirst({
      where: { matchId, teamId: myTeamId, badge: { not: 'NONE' } }
    });
    if (existingBadges) {
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

    // Helper to resolve player team
    const getPlayerTeamId = (pId: string) => {
      const inA = match.teamA.members.some(m => m.playerId === pId) || match.teamA.ownerId === pId;
      if (inA) return match.teamA_Id;
      const inB = match.teamB.members.some(m => m.playerId === pId) || match.teamB.ownerId === pId;
      if (inB) return match.teamB_Id;
      return myTeamId;
    };

    const sportType = (match.sportType ?? match.teamA.sportType) as string;
    const badgedPlayers = stats.filter(s => s.badgeKey && s.badgeKey !== 'NONE');
    const badgeMax = maxBadges(sportType) + 1; // plus 1 since we designated one for opponent

    if (badgedPlayers.length > badgeMax)
      return NextResponse.json({ error: `Maximum ${badgeMax} badges allowed for ${sportType}` }, { status: 400 });

    const uniquePlayers = new Set(badgedPlayers.map(p => p.playerId));
    if (uniquePlayers.size !== badgedPlayers.length)
      return NextResponse.json({ error: 'Maximum 1 badge per player' }, { status: 400 });

    // ── Anti-Farming check ──────────────────────────────────────────────────
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const badgeBonusesApplied: Record<string, number> = {};
    const badgeShowcaseInserts: any[] = [];

    for (const s of badgedPlayers) {
      const pId = s.playerId;
      const badgeKey = s.badgeKey!;
      
      const pTeamId = getPlayerTeamId(pId);
      const pOpponentTeamId = pTeamId === match.teamA_Id ? match.teamB_Id : match.teamA_Id;

      // Check if player earned any badge against this opponent team in last 7 days
      const farmedMatch = await prisma.playerMatchStat.findFirst({
        where: {
          playerId: pId,
          badge: { not: 'NONE' },
          match: {
            id: { not: matchId },
            status: 'COMPLETED',
            createdAt: { gte: sevenDaysAgo },
            OR: [
              { teamA_Id: pOpponentTeamId },
              { teamB_Id: pOpponentTeamId }
            ]
          }
        }
      });

      const isFarming = !!farmedMatch;
      let finalBonus = 0;

      if (!isFarming) {
        // Calculate MMR bonus
        const calcRes = calcPlayerBadgeBonus([{ playerId: pId, badgeKey }], sportType as any);
        finalBonus = calcRes[0]?.badgeBonus ?? 0;

        // Push showcase record
        const meta = BADGE_META[badgeKey];
        if (meta) {
          badgeShowcaseInserts.push(prisma.playerBadge.create({
            data: {
              playerId: pId,
              title: meta.title,
              icon: meta.icon,
              earnedAt: new Date(),
            }
          }));
        }
      }

      badgeBonusesApplied[pId] = finalBonus;
    }

    // ── Persist badge + stats ───────────────────────────────────────────────
    const statUpdates = stats.map(s => {
      const pTeamId = getPlayerTeamId(s.playerId);
      const resolvedBadgeBonus = badgeBonusesApplied[s.playerId] ?? 0;
      return prisma.playerMatchStat.upsert({
        where: { matchId_playerId: { matchId, playerId: s.playerId } },
        create: {
          matchId,
          playerId : s.playerId,
          teamId   : pTeamId,
          badge    : (s.badgeKey ?? 'NONE') as any,
          badgeBonus: resolvedBadgeBonus,
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
          badgeBonus: resolvedBadgeBonus,
          goals    : s.goals    ?? 0,
          assists  : s.assists  ?? 0,
          runs     : s.runs     ?? 0,
          wickets  : s.wickets  ?? 0,
          overs    : s.overs    ?? 0,
          yellowCard: s.yellowCard ?? false,
          redCard   : s.redCard   ?? false,
        },
      });
    });

    // ── MMR Increments ───────────────────────────────────────────────────────
    const badgeMmrUpdates = Object.entries(badgeBonusesApplied)
      .filter(([, bonus]) => bonus > 0)
      .map(([pId, bonus]) => {
        const matchingStat = stats.find(st => st.playerId === pId);
        const calcRes = calcPlayerBadgeBonus([{ playerId: pId, badgeKey: matchingStat?.badgeKey! }], sportType as any);
        const mmrField = calcRes[0]?.mmrField || 'footballMmr';
        return prisma.player.update({
          where: { id: pId },
          data: {
            [mmrField]: { increment: bonus },
            mmr       : { increment: bonus },
          },
        });
      });

    await prisma.$transaction([
      ...statUpdates,
      ...badgeMmrUpdates,
      ...badgeShowcaseInserts,
    ]);

    return NextResponse.json({ ok: true, badgeResults: Object.entries(badgeBonusesApplied).map(([playerId, badgeBonus]) => ({ playerId, badgeBonus })) });
  } catch (e: any) {
    console.error('[stats POST]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
