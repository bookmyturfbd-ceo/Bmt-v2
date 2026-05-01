import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Public endpoint for Arena to list active/registering tournaments
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport'); // Optional filter
    
    const where: any = {
      status: {
        in: ['REGISTRATION_OPEN', 'ACTIVE', 'SCHEDULED', 'AUCTION_LIVE']
      }
    };
    
    if (sport) {
      where.sport = sport;
    }

    const tournaments = await prisma.tournament.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        sport: true,
        status: true,
        bannerImageUrl: true,
        registrationType: true,
        prizePoolTotal: true,
        prizeType: true,
        entryFee: true,
        registrationDeadline: true,
        _count: {
          select: { registrations: true, matches: true }
        }
      }
    });

    return NextResponse.json({ success: true, data: tournaments });
  } catch (error: any) {
    console.error('Error fetching public tournaments:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
