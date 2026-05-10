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

    if (tournament.status !== 'DRAFT') {
      return NextResponse.json({ success: false, error: 'Tournament must be in DRAFT state to open registration' }, { status: 400 });
    }

    const updated = await prisma.tournament.update({
      where: { id },
      data: { status: 'REGISTRATION_OPEN' }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error opening registration:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
