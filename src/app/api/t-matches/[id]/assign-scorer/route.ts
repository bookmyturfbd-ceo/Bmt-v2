import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createScorerToken } from '@/lib/tournament/token-generator';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { email_or_phone } = body;
    
    const match = await prisma.tournamentMatch.findUnique({ where: { id } });
    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    if (['COMPLETED', 'CANCELLED', 'WALKOVER'].includes(match.status)) {
      return NextResponse.json({ success: false, error: 'Cannot assign scorer to a completed or cancelled match' }, { status: 400 });
    }

    // Generate token
    const result = await createScorerToken(id, email_or_phone);

    // Update match status if it's currently SCHEDULED
    if (match.status === 'SCHEDULED') {
      await prisma.tournamentMatch.update({
        where: { id },
        data: { 
          status: 'SCORER_ASSIGNED',
          scorerType: 'ASSIGNED',
          scorerId: email_or_phone || 'ASSIGNED' 
        }
      });
    } else {
      await prisma.tournamentMatch.update({
        where: { id },
        data: { 
          scorerType: 'ASSIGNED',
          scorerId: email_or_phone || 'ASSIGNED' 
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Scorer token generated',
      data: {
        token: result.token,
        url: result.url
      }
    });
  } catch (error: any) {
    console.error('Error assigning scorer:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
