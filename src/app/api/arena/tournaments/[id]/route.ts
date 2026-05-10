import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Public endpoint for Arena to get full tournament details (standings, matches)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const tournament = await prisma.tournament.findUnique({
      where: { id },
      include: {
        groups: true,
        standings: {
          orderBy: [
            { groupId: 'asc' },
            { position: 'asc' }
          ]
        },
        matches: {
          orderBy: { matchNumber: 'asc' }
        },
        _count: {
          select: { registrations: true }
        }
      }
    });

    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: tournament });
  } catch (error: any) {
    console.error('Error fetching public tournament details:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
