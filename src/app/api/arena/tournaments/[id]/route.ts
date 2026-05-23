import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Public endpoint for Arena to get full tournament details (standings, matches, sponsors, teams)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        groups: true,
        standings: {
          orderBy: [{ groupId: 'asc' }, { position: 'asc' }]
        },
        matches: {
          orderBy: { matchNumber: 'asc' }
        },
        sponsors: {
          orderBy: [{ type: 'asc' }, { order: 'asc' }]
        },
        registrations: {
          include: {
            // We join teams and players manually below
          },
          orderBy: { registeredAt: 'asc' },
        },
        _count: {
          select: { registrations: true }
        }
      }
    });

    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 });
    }

    // Enrich registrations with team/player data
    const enrichedRegistrations = await Promise.all(
      tournament.registrations.map(async (reg) => {
        if (reg.entityType === 'TEAM') {
          const team = await prisma.team.findUnique({
            where: { id: reg.entityId },
            include: {
              members: {
                include: {
                  player: {
                    select: {
                      id: true, fullName: true, avatarUrl: true,
                      footballMmr: true, cricketMmr: true, level: true,
                    }
                  }
                }
              }
            }
          });
          return { ...reg, team, player: null };
        } else {
          const player = await prisma.player.findUnique({
            where: { id: reg.entityId },
            select: {
              id: true, fullName: true, avatarUrl: true,
              footballMmr: true, cricketMmr: true, level: true,
            }
          });
          return { ...reg, team: null, player };
        }
      })
    );

    let organizerName = 'Book My Turf';
    if (tournament.operatorType === 'ORGANIZER' && tournament.operatorId) {
      const organizer = await prisma.organizer.findUnique({
        where: { id: tournament.operatorId },
        select: { name: true }
      });
      if (organizer) {
        organizerName = organizer.name;
      }
    }

    return NextResponse.json({
      success: true,
      data: { ...tournament, registrations: enrichedRegistrations, organizerName }
    });
  } catch (error: any) {
    console.error('Error fetching public tournament details:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
