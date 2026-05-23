import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateCasualScorerToken } from '@/lib/match/token-generator';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Validate token and get match ID
    const matchId = validateCasualScorerToken(token);
    if (!matchId) {
      return NextResponse.json({ success: false, error: 'Invalid or expired token' }, { status: 401 });
    }

    // Fetch full match data needed for scoring
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        teamA: {
          include: {
            members: {
              include: {
                player: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true
                  }
                }
              }
            }
          }
        },
        teamB: {
          include: {
            members: {
              include: {
                player: {
                  select: {
                    id: true,
                    fullName: true,
                    avatarUrl: true
                  }
                }
              }
            }
          }
        },
        events: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: match });
  } catch (error: any) {
    console.error('Error validating casual scorer token:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
