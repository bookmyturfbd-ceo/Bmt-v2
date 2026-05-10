import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { raisedByTeamId, eventRef, reason } = body;
    
    if (!raisedByTeamId || !reason || reason.length < 10) {
      return NextResponse.json({ success: false, error: 'Team ID and a reason (min 10 characters) are required' }, { status: 400 });
    }

    const match = await prisma.tournamentMatch.findUnique({ where: { id } });
    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    const dispute = await prisma.tournamentDispute.create({
      data: {
        matchId: id,
        raisedByTeamId,
        eventRef,
        reason,
        status: 'PENDING'
      }
    });

    // Mark match as having a dispute
    await prisma.tournamentMatch.update({
      where: { id },
      data: { hasDispute: true, disputeStatus: 'PENDING' }
    });

    return NextResponse.json({ success: true, data: dispute });
  } catch (error: any) {
    console.error('Error raising dispute:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const disputes = await prisma.tournamentDispute.findMany({
      where: { matchId: id },
      orderBy: { raisedAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: disputes });
  } catch (error: any) {
    console.error('Error fetching disputes:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
