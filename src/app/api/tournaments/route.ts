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
      formatConfig,
      venue,
      startDate,
      endDate,
      startTime,
    } = body;

    // Validate required fields
    if (!operatorId || !operatorType || !sport || !name || !registrationType || !maxParticipants || !formatType) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const tournamentData = {
      operatorId,
      operatorType,
      sport,
      name,
      description: description || null,
      bannerImageUrl: bannerImageUrl || null,
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
      formatConfig: formatConfig ?? null,
      venue: venue || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      startTime: startTime || null,
      status: 'DRAFT' as any,
    };

    let newTournament;

    if (operatorType === 'ORGANIZER') {
      const organizer = await prisma.organizer.findUnique({
        where: { id: operatorId },
        include: { wallet: true }
      });

      if (!organizer) {
        return NextResponse.json({ success: false, error: 'Organizer not found' }, { status: 404 });
      }

      const chargeAmount = organizer.chargePerTournament || 0;
      const currentBalance = organizer.wallet?.balance || 0;

      if (currentBalance < chargeAmount) {
        return NextResponse.json({ 
          success: false, 
          error: `Low balance. Requires ${chargeAmount} taka to publish this tournament. Current balance: ${currentBalance} taka.` 
        }, { status: 400 });
      }

      // Ensure wallet exists BEFORE the transaction (FK requires the wallet row)
      if (!organizer.wallet) {
        await prisma.organizerWallet.create({
          data: { organizerId: operatorId, balance: 0, totalToppedUp: 0, totalSpent: 0 }
        });
      }

      newTournament = await prisma.$transaction(async (tx) => {
        const tournament = await tx.tournament.create({ data: tournamentData });

        if (chargeAmount > 0) {
          await tx.organizerWallet.update({
            where: { organizerId: operatorId },
            data: {
              balance:    { decrement: chargeAmount },
              totalSpent: { increment: chargeAmount }
            }
          });

          await tx.organizerWalletTransaction.create({
            data: {
              wallet:      { connect: { organizerId: operatorId } },
              type:        'TOURNAMENT_CHARGE',
              amount:      chargeAmount,
              description: `Charge for publishing tournament: ${name}`
            }
          });
        }

        return tournament;
      });

    } else {
      newTournament = await prisma.tournament.create({
        data: tournamentData
      });
    }

    return NextResponse.json({ success: true, data: newTournament });
  } catch (error: any) {
    console.error('Error creating tournament:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
