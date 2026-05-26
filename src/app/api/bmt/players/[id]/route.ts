import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

type Params = Promise<{ id: string }>;

// GET /api/bmt/players/[id]
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;

  try {
    const player = await prisma.player.findUnique({
      where: { id },
      select: {
        id:            true,
        fullName:      true,
        email:         true,
        phone:         true,
        joinedAt:      true,
        walletBalance: true,
        loyaltyPoints: true,
        level:         true,
        levelProgress: true,
        avatarUrl:     true,
        banStatus:     true,
        banUntil:      true,
        banReason:     true,
        playerCode:    true,
        mmr:           true,
        footballMmr:   true,
        cricketMmr:    true,
        tournamentFootballMmr: true,
        tournamentCricketMmr: true,
        teamMemberships: {
          include: { team: true },
        },
        matchStats: {
          include: { team: true },
        },
        badges: true,
        battingPerformances: {
          select: { runs: true, ballsFaced: true, fours: true, sixes: true, notOut: true, matchId: true }
        },
        bowlingPerformances: {
          select: { legalBalls: true, runs: true, wickets: true, wides: true, noBalls: true, matchId: true }
        },
      },
    });

    if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });

    // Compute peak tournament finish: lowest position across all tournament standings for this player's teams
    const teamIds = player.teamMemberships.map((m: any) => m.team?.id).filter(Boolean);
    let peakTournamentFinish: number | null = null;
    if (teamIds.length > 0) {
      const standings = await prisma.tournamentStanding.findMany({
        where: { teamId: { in: teamIds }, position: { gt: 0 } },
        select: { position: true },
        orderBy: { position: 'asc' },
        take: 1,
      });
      if (standings.length > 0) peakTournamentFinish = standings[0].position;
    }

    // Query completed tournament matches for this player's teams
    const tourneyMatches = await prisma.tournamentMatch.findMany({
      where: {
        status: 'COMPLETED',
        OR: [
          { teamAId: { in: teamIds } },
          { teamBId: { in: teamIds } }
        ]
      },
      include: {
        tournament: {
          select: { sport: true }
        }
      }
    });

    const tournamentStats: any[] = [];
    for (const m of tourneyMatches) {
      const myTeamId = teamIds.find(tid => tid === m.teamAId || tid === m.teamBId);
      if (!myTeamId) continue;
      
      const events = (m.resultSummary as any)?.events || [];
      const goalsCount = events.filter((e: any) => e.type === 'goal' && e.scorerPlayerId === id && e.teamId === myTeamId).length;
      const assistsCount = events.filter((e: any) => e.type === 'goal' && e.assistPlayerId === id && e.teamId === myTeamId).length;
      const hasYellowCard = events.some((e: any) => e.type === 'card' && e.cardType === 'YELLOW' && e.scorerPlayerId === id);
      const hasRedCard = events.some((e: any) => e.type === 'card' && e.cardType === 'RED' && e.scorerPlayerId === id);

      if (goalsCount > 0 || assistsCount > 0 || hasYellowCard || hasRedCard) {
        tournamentStats.push({
          id: `tourney-stat-${m.id}`,
          matchId: m.id,
          playerId: id,
          teamId: myTeamId,
          goals: goalsCount,
          assists: assistsCount,
          yellowCard: hasYellowCard,
          redCard: hasRedCard,
          mmrChange: 0,
          team: {
            id: myTeamId,
            name: player.teamMemberships.find((tm: any) => tm.team?.id === myTeamId)?.team?.name || 'Tournament Team',
            teamType: 'TOURNAMENT',
            sportType: m.tournament.sport
          }
        });
      }
    }

    const mergedStats = [...player.matchStats, ...tournamentStats];

    return NextResponse.json({ 
      ...player, 
      matchStats: mergedStats,
      peakTournamentFinish 
    });
  } catch (error: any) {
    console.error('API Error fetching player profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/bmt/players/[id]
// Allows updating: fullName, avatarUrl, walletBalance, loyaltyPoints,
//                  level, levelProgress, banStatus, banUntil, banReason.
// Email, phone, and password are NOT patchable through this route.
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id }  = await params;
  const body    = await req.json();

  // Strip immutable / sensitive fields
  const {
    email:    _email,
    phone:    _phone,
    password: _password,
    id:       _id,
    joinedAt: _joinedAt,
    ...patch
  } = body;

  // If a new raw password is explicitly provided (admin reset flow), hash it
  if (body.newPassword) {
    patch.password = await bcrypt.hash(body.newPassword.trim(), 10);
    delete patch.newPassword;
  }

  // Coerce banUntil to Date if provided as string
  if (patch.banUntil && typeof patch.banUntil === 'string') {
    patch.banUntil = new Date(patch.banUntil);
  }

  try {
    const updated = await prisma.player.update({
      where: { id },
      data:  patch,
      select: {
        id:            true,
        fullName:      true,
        email:         true,
        phone:         true,
        joinedAt:      true,
        walletBalance: true,
        loyaltyPoints: true,
        level:         true,
        levelProgress: true,
        avatarUrl:     true,
        banStatus:     true,
        banUntil:      true,
        banReason:     true,
        playerCode:    true,
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }
}
