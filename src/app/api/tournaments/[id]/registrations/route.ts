import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const registrations = await prisma.tournamentRegistration.findMany({
      where: { tournamentId: id },
      orderBy: { registeredAt: 'asc' }
    });

    return NextResponse.json({ success: true, data: registrations });
  } catch (error: any) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
