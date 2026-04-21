import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SportType } from '@prisma/client';

function getPlayerId(req: NextRequest): string | null {
  return req.cookies.get('bmt_player_id')?.value ?? null;
}

function mapSportToEnum(s: string): SportType {
  if (s === 'FUTSAL_5') return 'FUTSAL_5' as SportType;
  if (s === 'FUTSAL_6') return 'FUTSAL_6' as SportType;
  if (s === 'FUTSAL_7') return 'FUTSAL_7' as SportType;
  if (s === 'CRICKET_7') return 'CRICKET_7' as SportType;
  if (s === 'FOOTBALL_FULL') return 'FOOTBALL_FULL' as SportType;
  if (s === 'CRICKET_FULL') return 'CRICKET_FULL' as SportType;
  
  // Legacy fallback just in case
  const low = s.toLowerCase();
  if (low.includes('5')) return 'FUTSAL_5' as SportType;
  if (low.includes('6')) return 'FUTSAL_6' as SportType;
  if (low.includes('cricket')) return 'CRICKET_7' as SportType;
  return 'FUTSAL_5' as SportType;
}

function mapEnumToSport(enumValue: SportType | string): string {
  if (enumValue === 'FUTSAL_5') return '5-a-side Futsal';
  if (enumValue === 'FUTSAL_6') return '6-a-side Futsal';
  if (enumValue === 'FUTSAL_7') return '7-a-side Futsal';
  if (enumValue === 'CRICKET_7') return '7-a-side Cricket';
  if (enumValue === 'FOOTBALL_FULL') return 'Football (Full 11v11)';
  if (enumValue === 'CRICKET_FULL') return 'Cricket (Full 11v11)';
  return enumValue as string;
}

// GET — teams the player is a member of (includes owned)
export async function GET(req: NextRequest) {
  const playerId = getPlayerId(req);
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const memberships = await prisma.teamMember.findMany({
    where: { playerId },
    include: {
      team: {
        include: {
          owner: { select: { id: true, fullName: true } },
          members: { select: { id: true, role: true, playerId: true } },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  const teams = memberships.map(m => {
    const { sportType, ...rest } = m.team as any;
    return {
      ...rest,
      sport: mapEnumToSport(m.team.sportType),
      myRole: m.role,
      memberCount: m.team.members.length,
    };
  });

  return NextResponse.json({ teams });
}

// POST — create a new team
export async function POST(req: NextRequest) {
  try {
    const playerId = getPlayerId(req);
    if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

    const body = await req.json();
    const { name, sport, logoUrl } = body;

    if (!name?.trim()) return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    if (!sport?.trim()) return NextResponse.json({ error: 'Sport is required' }, { status: 400 });

    // Check for duplicate team name (case-insensitive via unique constraint)
    const existing = await prisma.team.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' } },
    });
    if (existing) return NextResponse.json({ error: `Team name "${name.trim()}" is already taken` }, { status: 409 });

    const sportEnum = mapSportToEnum(sport);

    // Prevent creating multiple teams for the same sport
    const alreadyInSport = await prisma.teamMember.findFirst({
      where: {
        playerId,
        team: { sportType: sportEnum }
      },
      include: { team: true }
    });
    if (alreadyInSport) {
      return NextResponse.json({ error: `You are already in a ${mapEnumToSport(sportEnum)} team (${alreadyInSport.team.name}). You must leave it before creating a new one.` }, { status: 400 });
    }

    // Create team + automatically add creator as owner member
    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        sportType: sportEnum,
        logoUrl: logoUrl || null,
        ownerId: playerId,
        members: {
          create: { playerId, role: 'owner' },
        },
      },
      include: {
        owner: { select: { id: true, fullName: true } },
        members: { select: { id: true, role: true, playerId: true } },
      },
    });

    const { sportType, ...rest } = team as any;
    const returnedTeam = { ...rest, sport: mapEnumToSport(team.sportType) };

    return NextResponse.json({ team: returnedTeam }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Exception' }, { status: 500 });
  }
}

