import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        owner: { select: { fullName: true, phone: true } },
        _count: { select: { members: true, matchesAsTeamA: true, matchesAsTeamB: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ teams });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
