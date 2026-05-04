import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');

    const now = new Date();

    // Published (non-DRAFT) OR DRAFT with an open/countdown flag set by organizer
    const where: any = {
      OR: [
        { status: { not: 'DRAFT' } },
        { status: 'DRAFT', isRegistrationOpen: true },
        { status: 'DRAFT', registrationOpenAt: { not: null } },
      ],
    };

    if (sport) where.sport = sport;

    const tournaments = await prisma.tournament.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        sport: true,
        status: true,
        operatorType: true,
        formatType: true,
        bannerImageUrl: true,
        registrationType: true,
        prizePoolTotal: true,
        prizeType: true,
        entryFee: true,
        maxParticipants: true,
        registrationDeadline: true,
        registrationOpenAt: true,
        isRegistrationOpen: true,
        venue: true,
        startDate: true,
        _count: { select: { registrations: true, matches: true } },
      },
    });

    return NextResponse.json({ success: true, data: tournaments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
