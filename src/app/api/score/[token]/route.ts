import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateScorerToken } from '@/lib/tournament/token-generator';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Validate token and get match ID
    const matchId = await validateScorerToken(token);

    // Fetch full match data needed for scoring
    const match = await prisma.tournamentMatch.findUnique({
      where: { id: matchId },
      include: {
        tournament: { select: { sport: true, name: true, formatType: true } }
      }
    });

    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: match });
  } catch (error: any) {
    console.error('Error validating scorer token:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
