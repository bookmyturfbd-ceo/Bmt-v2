import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const operatorId = searchParams.get('operatorId');
    
    // Build where clause
    const where: any = {};
    if (operatorId) {
      where.operatorId = operatorId;
    }

    const tournaments = await prisma.tournament.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { registrations: true, matches: true }
        }
      }
    });

    return NextResponse.json({ success: true, data: tournaments });
  } catch (error: any) {
    console.error('Error fetching tournaments:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // operatorType should be 'PLATFORM' | 'ORGANIZER'
    const {
      operatorId,
      operatorType,
      sport,
      name,
      description,
      bannerImageUrl,
      registrationType,
      maxParticipants,
      entryFee,
      registrationDeadline,
      auctionEnabled,
      playerBudgetPerCaptain,
      prizePoolTotal,
      prizeType,
      formatType,
      groupCount,
      teamsPerGroup,
      qualifyPerGroup,
    } = body;

    // Validate required fields
    if (!operatorId || !operatorType || !sport || !name || !registrationType || !maxParticipants || !formatType) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const newTournament = await prisma.tournament.create({
      data: {
        operatorId,
        operatorType,
        sport,
        name,
        description,
        bannerImageUrl,
        registrationType,
        maxParticipants: parseInt(maxParticipants),
        entryFee: entryFee ? parseInt(entryFee) : 0,
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline) : null,
        auctionEnabled: auctionEnabled ?? false,
        playerBudgetPerCaptain: playerBudgetPerCaptain ? parseInt(playerBudgetPerCaptain) : null,
        prizePoolTotal: prizePoolTotal ? parseInt(prizePoolTotal) : 0,
        prizeType: prizeType || 'TROPHY_ONLY',
        formatType,
        groupCount: groupCount ? parseInt(groupCount) : null,
        teamsPerGroup: teamsPerGroup ? parseInt(teamsPerGroup) : null,
        qualifyPerGroup: qualifyPerGroup ? parseInt(qualifyPerGroup) : null,
        status: 'DRAFT',
      }
    });

    return NextResponse.json({ success: true, data: newTournament });
  } catch (error: any) {
    console.error('Error creating tournament:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
