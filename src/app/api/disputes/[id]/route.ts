import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, resolvedBy, resolutionNote } = body;
    
    if (!['REVIEWING', 'UPHELD', 'REJECTED'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
    }

    const dispute = await prisma.tournamentDispute.findUnique({ where: { id } });
    if (!dispute) {
      return NextResponse.json({ success: false, error: 'Dispute not found' }, { status: 404 });
    }

    const updated = await prisma.tournamentDispute.update({
      where: { id },
      data: {
        status,
        resolvedBy,
        resolutionNote,
        resolvedAt: ['UPHELD', 'REJECTED'].includes(status) ? new Date() : null
      }
    });

    // Check if match has other pending disputes
    const pendingDisputes = await prisma.tournamentDispute.count({
      where: { matchId: dispute.matchId, status: 'PENDING' }
    });

    if (pendingDisputes === 0 && ['UPHELD', 'REJECTED'].includes(status)) {
      await prisma.tournamentMatch.update({
        where: { id: dispute.matchId },
        data: { disputeStatus: status }
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating dispute:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
