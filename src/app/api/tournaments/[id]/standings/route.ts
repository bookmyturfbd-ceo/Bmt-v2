import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const standings = await prisma.tournamentStanding.findMany({
      where: { tournamentId: id },
      orderBy: [
        { groupId: 'asc' },
        { position: 'asc' }
      ],
      include: {
        group: { select: { name: true } }
      }
    });

    return NextResponse.json({ success: true, data: standings });
  } catch (error: any) {
    console.error('Error fetching standings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
