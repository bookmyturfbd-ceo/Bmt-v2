import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { TIER_RANGES } from '@/lib/rankUtils';

function getFormatSize(sport: string): number {
  if (sport.includes('5')) return 5;
  if (sport.includes('6')) return 6;
  if (sport.includes('7')) return 7;
  if (sport.includes('FULL') || sport === 'FOOTBALL' || sport === 'CRICKET') return 11;
  return 5;
}

// POST: Accept an open challenge
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    const { acceptingTeamId } = await req.json();
    if (!acceptingTeamId) return NextResponse.json({ error: 'Missing acceptingTeamId' }, { status: 400 });

    const openChallenge = await prisma.openChallenge.findUnique({
      where: { id },
      include: {
        team: true
      }
    });

    if (!openChallenge) return NextResponse.json({ error: 'Open challenge not found' }, { status: 404 });
    if (openChallenge.status !== 'open') return NextResponse.json({ error: `This open challenge is ${openChallenge.status}` }, { status: 400 });
    if (new Date(openChallenge.windowEnd) < new Date()) {
      return NextResponse.json({ error: 'This open challenge has expired' }, { status: 400 });
    }

    if (openChallenge.teamId === acceptingTeamId) {
      return NextResponse.json({ error: 'You cannot accept your own open challenge' }, { status: 400 });
    }

    // Validate accepting team & player's authority (OMC)
    const acceptingTeam = await prisma.team.findUnique({
      where: { id: acceptingTeamId },
      include: {
        members: { select: { playerId: true, role: true } }
      }
    });

    if (!acceptingTeam) return NextResponse.json({ error: 'Accepting team not found' }, { status: 404 });

    const membership = acceptingTeam.members.find(m => m.playerId === playerId)
      ?? (acceptingTeam.ownerId === playerId ? { role: 'owner' } : null);

    if (!membership || !['owner', 'manager', 'captain', 'vice_captain'].includes(membership.role as string)) {
      return NextResponse.json({ error: 'Only team captains or managers can accept open challenges' }, { status: 403 });
    }

    // Eligibility check 1: Roster count
    const formatSize = getFormatSize(openChallenge.format);
    const rosterSize = acceptingTeam.members.length;
    if (rosterSize < formatSize) {
      return NextResponse.json({
        error: `Your team does not have enough players to field this format. Roster size is ${rosterSize}, but format requires ${formatSize}.`
      }, { status: 400 });
    }

    // Eligibility check 2: Tier compatibility
    const teamMmr = acceptingTeam.teamMmr ?? 1000;
    if (openChallenge.tierMin) {
      const minVal = TIER_RANGES[openChallenge.tierMin]?.[0] ?? 0;
      if (teamMmr < minVal) {
        return NextResponse.json({
          error: `Your team tier is too low. Required: ${openChallenge.tierMin} or higher.`
        }, { status: 400 });
      }
    }
    if (openChallenge.tierMax) {
      const maxVal = TIER_RANGES[openChallenge.tierMax]?.[1] ?? 9999;
      if (teamMmr > maxVal) {
        return NextResponse.json({
          error: `Your team tier is too high. Required: ${openChallenge.tierMax} or lower.`
        }, { status: 400 });
      }
    }

    // Check if an existing match already exists between them in PENDING or INTERACTION
    const existingMatch = await prisma.match.findFirst({
      where: {
        status: { in: ['PENDING', 'INTERACTION', 'SCHEDULED', 'LIVE'] },
        OR: [
          { teamA_Id: openChallenge.teamId, teamB_Id: acceptingTeamId },
          { teamA_Id: acceptingTeamId, teamB_Id: openChallenge.teamId }
        ]
      }
    });

    if (existingMatch) {
      return NextResponse.json({ error: 'An active match or pending challenge already exists between these teams.' }, { status: 400 });
    }

    // Execute transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Mark open challenge as accepted
      const updatedChallenge = await tx.openChallenge.update({
        where: { id },
        data: { status: 'accepted' }
      });

      // 2. Create the match in INTERACTION state
      const match = await tx.match.create({
        data: {
          teamA_Id: openChallenge.teamId,
          teamB_Id: acceptingTeamId,
          status: 'INTERACTION',
          sportType: openChallenge.format as any,
        }
      });

      return { updatedChallenge, match };
    });

    return NextResponse.json({ ok: true, match: result.match });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Withdraw an open challenge
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    const openChallenge = await prisma.openChallenge.findUnique({
      where: { id },
      include: {
        team: {
          include: {
            members: { select: { playerId: true, role: true } }
          }
        }
      }
    });

    if (!openChallenge) return NextResponse.json({ error: 'Open challenge not found' }, { status: 404 });

    const team = openChallenge.team;
    const membership = team.members.find(m => m.playerId === playerId)
      ?? (team.ownerId === playerId ? { role: 'owner' } : null);

    if (!membership || !['owner', 'manager', 'captain', 'vice_captain'].includes(membership.role as string)) {
      return NextResponse.json({ error: 'Only team captains or managers can withdraw open challenges' }, { status: 403 });
    }

    const updated = await prisma.openChallenge.update({
      where: { id },
      data: { status: 'withdrawn' }
    });

    return NextResponse.json({ ok: true, openChallenge: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
