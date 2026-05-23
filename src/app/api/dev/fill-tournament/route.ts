import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  // 1. Gating to prevent running in production environment
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'This testing utility is not permitted in production environments.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { tournamentId } = body;

    if (!tournamentId) {
      return NextResponse.json({ success: false, error: 'Missing required field: tournamentId' }, { status: 400 });
    }

    // 2. Fetch the tournament details including current registrations
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        registrations: true,
      },
    });

    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 });
    }

    const currentCount = tournament.registrations.length;
    const maxParticipants = tournament.maxParticipants;
    const spotsToFill = maxParticipants - currentCount;

    if (spotsToFill <= 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        message: 'Tournament registration slots are already fully occupied.',
      });
    }

    const passwordHash = await bcrypt.hash('test1234', 10);
    let filledCount = 0;

    if (tournament.registrationType === 'TEAM') {
      // Determine correct sportVariant for the mock teams
      let sportType: 'FUTSAL_5' | 'FUTSAL_6' | 'FUTSAL_7' | 'CRICKET_7' | 'FOOTBALL_FULL' | 'CRICKET_FULL' = 'FUTSAL_5';
      if (tournament.sport === 'CRICKET') {
        sportType = 'CRICKET_7';
      }
      
      const formatConfig = tournament.formatConfig as any;
      if (formatConfig && formatConfig.sportVariant) {
        sportType = formatConfig.sportVariant;
      }

      for (let s = 0; s < spotsToFill; s++) {
        const uniqueId = Math.random().toString(36).substring(2, 7) + Date.now().toString().slice(-4);
        
        // Create 5 mock players for this team to fulfill the minimum roster size rule
        const mockPlayers = [];
        for (let i = 1; i <= 5; i++) {
          const player = await prisma.player.create({
            data: {
              fullName: `Mock Player ${uniqueId} ${i}`,
              email: `mock.player.${uniqueId}.${i}@bmt.test`,
              phone: `017000000${i}`,
              password: passwordHash,
              footballMmr: 1000,
              cricketMmr: 1000,
              level: 1,
            },
          });
          mockPlayers.push(player);
        }

        // The first player will be the owner of the team
        const ownerPlayer = mockPlayers[0];
        
        // Create team
        const teamName = `Mock Team ${uniqueId}`;
        const team = await prisma.team.create({
          data: {
            name: teamName,
            sportType: sportType,
            ownerId: ownerPlayer.id,
            footballMmr: 1000,
            cricketMmr: 1000,
            level: 1,
          },
        });

        // Link all 5 players to this team
        await prisma.teamMember.createMany({
          data: mockPlayers.map((p, idx) => ({
            teamId: team.id,
            playerId: p.id,
            role: idx === 0 ? 'owner' : 'member',
            sportRole: 'PLAYER',
            isStarter: true,
          })),
        });

        // Register the team
        await prisma.tournamentRegistration.create({
          data: {
            tournamentId: tournament.id,
            entityType: 'TEAM',
            entityId: team.id,
            status: 'APPROVED',
            entryFeePaid: true,
          },
        });

        filledCount++;
      }
    } else {
      // Individual player registrations
      for (let s = 0; s < spotsToFill; s++) {
        const uniqueId = Math.random().toString(36).substring(2, 7) + Date.now().toString().slice(-4);

        // Create player
        const player = await prisma.player.create({
          data: {
            fullName: `Mock Player ${uniqueId}`,
            email: `mock.player.${uniqueId}@bmt.test`,
            phone: `01800000000`,
            password: passwordHash,
            footballMmr: 1000,
            cricketMmr: 1000,
            level: 1,
          },
        });

        // Register the player
        await prisma.tournamentRegistration.create({
          data: {
            tournamentId: tournament.id,
            entityType: 'PLAYER',
            entityId: player.id,
            status: 'APPROVED',
            entryFeePaid: true,
          },
        });

        filledCount++;
      }
    }

    return NextResponse.json({
      success: true,
      count: filledCount,
      message: `Successfully generated and registered ${filledCount} participants.`,
    });
  } catch (error: any) {
    console.error('Error filling tournament registrations:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
