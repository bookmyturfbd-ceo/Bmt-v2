import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { checkAndAdvanceGroupStage } from '@/lib/tournament/advancement';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tournamentId } = await params;

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId }
    });

    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.status !== 'ACTIVE') {
      return NextResponse.json({ success: false, error: 'Tournament must be ACTIVE to advance stage' }, { status: 400 });
    }

    // Trigger stage advancement
    await checkAndAdvanceGroupStage(tournamentId, tournament.qualifyPerGroup ?? 2);

    return NextResponse.json({
      success: true,
      message: 'Tournament advanced to the next stage successfully.'
    });
  } catch (error: any) {
    console.error('Error advancing tournament:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
