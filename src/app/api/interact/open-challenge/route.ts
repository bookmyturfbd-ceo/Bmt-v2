import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Fetch all active, open challenges
export async function GET(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    // Check if user is part of any test team
    const userTestTeams = await prisma.teamMember.findMany({
      where: { playerId, team: { isTestTeam: true } },
      select: { teamId: true }
    });
    const isTestUser = userTestTeams.length > 0;

    const openChallenges = await prisma.openChallenge.findMany({
      where: {
        status: 'open',
        windowEnd: { gt: now },
        ...(isTestUser ? {} : { team: { isTestTeam: false } }),
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            sportType: true,
            teamMmr: true,
            isVerified: true,
            members: {
              select: {
                playerId: true,
                role: true,
                player: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true,
                    mmr: true,
                  }
                }
              }
            },
            homeAreas: { select: { id: true, name: true } },
            homeTurfs: { select: { id: true, name: true } },
          }
        }
      },
      orderBy: {
        windowStart: 'asc',
      }
    });

    return NextResponse.json({ openChallenges });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new open challenge
export async function POST(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    const body = await req.json();
    const { teamId, format, windowStart, windowEnd, area, tierMin, tierMax, note } = body;

    if (!teamId || !format || !windowStart || !windowEnd || !area) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate authorized representative roles
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: { select: { playerId: true, role: true } },
      }
    });

    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

    const membership = team.members.find(m => m.playerId === playerId)
      ?? (team.ownerId === playerId ? { role: 'owner' } : null);

    if (!membership || !['owner', 'manager', 'captain', 'vice_captain'].includes(membership.role as string)) {
      return NextResponse.json({ error: 'Only team captains or managers can post open challenges' }, { status: 403 });
    }

    const openChallenge = await prisma.openChallenge.create({
      data: {
        teamId,
        format,
        windowStart: new Date(windowStart),
        windowEnd: new Date(windowEnd),
        area,
        tierMin: tierMin || null,
        tierMax: tierMax || null,
        note: note || null,
        status: 'open',
      }
    });

    return NextResponse.json({ ok: true, openChallenge });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
