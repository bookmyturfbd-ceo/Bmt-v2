import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const tournament = await prisma.tournament.findUnique({ where: { id } });
    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 });
    }

    if (tournament.status !== 'SCHEDULED') {
      return NextResponse.json({ success: false, error: 'Tournament must be SCHEDULED to activate' }, { status: 400 });
    }

    const updated = await prisma.tournament.update({
      where: { id },
      data: { status: 'ACTIVE' }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error activating tournament:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
