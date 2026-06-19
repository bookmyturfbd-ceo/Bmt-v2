import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SportType } from '@prisma/client';
import { generateCode } from '@/lib/generateCode';

type TeamType = 'REGULAR' | 'TOURNAMENT';

function getPlayerId(req: NextRequest): string | null {
  return req.cookies.get('bmt_player_id')?.value ?? null;
}

function mapSportToEnum(s: string): SportType {
  if (s === 'FUTSAL') return 'FUTSAL' as SportType;
  if (s === 'FOOTBALL') return 'FOOTBALL' as SportType;
  if (s === 'CRICKET') return 'CRICKET' as SportType;
  if (s === 'FUTSAL_5') return 'FUTSAL_5' as SportType;
  if (s === 'FUTSAL_6') return 'FUTSAL_6' as SportType;
  if (s === 'FUTSAL_7') return 'FUTSAL_7' as SportType;
  if (s === 'CRICKET_7') return 'CRICKET_7' as SportType;
  if (s === 'FOOTBALL_FULL') return 'FOOTBALL_FULL' as SportType;
  if (s === 'CRICKET_FULL') return 'CRICKET_FULL' as SportType;

  // Legacy fallback
  const low = s.toLowerCase();
  if (low.includes('5')) return 'FUTSAL_5' as SportType;
  if (low.includes('6')) return 'FUTSAL_6' as SportType;
  if (low.includes('cricket')) return 'CRICKET' as SportType;
  if (low.includes('futsal')) return 'FUTSAL' as SportType;
  if (low.includes('football')) return 'FOOTBALL' as SportType;
  return 'FUTSAL' as SportType;
}

export function mapEnumToSport(enumValue: SportType | string): string {
  if (enumValue === 'FUTSAL' || enumValue === 'FUTSAL_5' || enumValue === 'FUTSAL_6' || enumValue === 'FUTSAL_7') return 'Futsal';
  if (enumValue === 'FOOTBALL' || enumValue === 'FOOTBALL_FULL') return 'Football';
  if (enumValue === 'CRICKET' || enumValue === 'CRICKET_7' || enumValue === 'CRICKET_FULL') return 'Cricket';
  return enumValue as string;
}

// GET — teams the player is a member of (includes owned), optionally filtered by teamType
export async function GET(req: NextRequest) {
  const playerId = getPlayerId(req);
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  const memberships = await prisma.teamMember.findMany({
    where: {
      playerId,
    },
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
    const { sportType, teamType, ...rest } = m.team as any;
    return {
      ...rest,
      sport: mapEnumToSport(m.team.sportType),
      teamType: m.team.teamType,
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
    const teamType = 'REGULAR'; // unified teamType

    if (!name?.trim()) return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    if (!sport?.trim()) return NextResponse.json({ error: 'Sport is required' }, { status: 400 });

    // Check for duplicate team name
    const existing = await prisma.team.findFirst({
      where: { name: { equals: name.trim(), mode: 'insensitive' } },
      include: { members: { select: { playerId: true, role: true } } },
    });

    if (existing) {
      // ── Placeholder-Claim Flow ────────────────────────────────────────────────
      // If the existing team is a TOURNAMENT placeholder team with no real members
      // (only the system placeholder owner), allow the captain to claim it by
      // transferring ownership and updating the logo.
      const isPlaceholder =
        existing.teamType === 'TOURNAMENT' &&
        existing.members.length <= 1 &&
        existing.members.every(m => m.playerId === existing.ownerId);

      if (isPlaceholder) {
        // Transfer ownership to this captain
        const oldOwnerId = existing.ownerId;

        const updatedTeam = await prisma.$transaction(async (tx) => {
          // Remove old placeholder owner membership (if it exists)
          await tx.teamMember.deleteMany({ where: { teamId: existing.id, playerId: oldOwnerId } });

          // Update team — new owner, logo, teamCode (if none set)
          const teamCode = existing.teamCode ?? `T-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
          const updated = await tx.team.update({
            where: { id: existing.id },
            data: {
              ownerId: playerId,
              logoUrl: logoUrl || existing.logoUrl || null,
              teamCode,
            },
            include: {
              owner: { select: { id: true, fullName: true } },
              members: { select: { id: true, role: true, playerId: true } },
            },
          });

          // Add captain as owner member
          await tx.teamMember.create({ data: { teamId: existing.id, playerId, role: 'owner' } });

          // Update tournament registration entityId references — they should still point
          // to the same team.id so no change is needed for matches/groups.
          // (entityId in TournamentRegistration = team.id which is unchanged)

          return updated;
        });

        const returnedTeam = { ...updatedTeam, sport: mapEnumToSport(updatedTeam.sportType), teamType: updatedTeam.teamType, claimed: true };
        return NextResponse.json({ team: returnedTeam, message: `You've successfully claimed "${name.trim()}" as your tournament team!` }, { status: 200 });
      }

      // Normal duplicate — not claimable
      return NextResponse.json({ error: `Team name "${name.trim()}" is already taken` }, { status: 409 });
    }

    const sportEnum = mapSportToEnum(sport);

    // Prevent two teams of the same sport category
    const alreadyInSport = await prisma.teamMember.findFirst({
      where: {
        playerId,
        team: {
          OR: [
            { sportType: sportEnum },
            ...(sportEnum === 'FUTSAL' ? [{ sportType: 'FUTSAL_5' as SportType }, { sportType: 'FUTSAL_6' as SportType }, { sportType: 'FUTSAL_7' as SportType }] : []),
            ...(sportEnum === 'CRICKET' ? [{ sportType: 'CRICKET_7' as SportType }, { sportType: 'CRICKET_FULL' as SportType }] : []),
            ...(sportEnum === 'FOOTBALL' ? [{ sportType: 'FOOTBALL_FULL' as SportType }] : []),
          ]
        },
      },
      include: { team: true },
    });
    
    if (alreadyInSport) {
      return NextResponse.json({
        error: `You are already in a ${mapEnumToSport(alreadyInSport.team.sportType)} team (${alreadyInSport.team.name}). Leave it before creating a new one.`,
      }, { status: 400 });
    }

    // Create team + automatically add creator as owner member
    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        sportType: sportEnum,
        teamType: teamType as any,
        logoUrl: logoUrl || null,
        ownerId: playerId,
        teamCode: generateCode('T-'),
        members: {
          create: { playerId, role: 'owner' },
        },
      },
      include: {
        owner: { select: { id: true, fullName: true } },
        members: { select: { id: true, role: true, playerId: true } },
      },
    });

    const returnedTeam = { ...team, sport: mapEnumToSport(team.sportType), teamType: team.teamType };

    return NextResponse.json({ team: returnedTeam }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server Exception' }, { status: 500 });
  }
}
