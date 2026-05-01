import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const matches = await prisma.tournamentMatch.findMany({
      where: { tournamentId: id },
      orderBy: { matchNumber: 'asc' }
    });

    return NextResponse.json({ success: true, data: matches });
  } catch (error: any) {
    console.error('Error fetching tournament matches:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
