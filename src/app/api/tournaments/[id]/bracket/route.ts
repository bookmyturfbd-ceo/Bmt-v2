import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Bracket is essentially all matches without a groupId
    const knockoutMatches = await prisma.tournamentMatch.findMany({
      where: { 
        tournamentId: id,
        groupId: null
      },
      orderBy: { matchNumber: 'asc' }
    });

    return NextResponse.json({ success: true, data: knockoutMatches });
  } catch (error: any) {
    console.error('Error fetching bracket:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
