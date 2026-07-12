import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const teamsRaw = await prisma.team.findMany({
      include: {
        owner: { select: { fullName: true, phone: true } },
        _count: { select: { members: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const teams = await Promise.all(teamsRaw.map(async (t) => {
      const [completedCount, disputedCount] = await Promise.all([
        prisma.match.count({
          where: {
            status: 'COMPLETED',
            OR: [{ teamA_Id: t.id }, { teamB_Id: t.id }]
          }
        }),
        prisma.match.count({
          where: {
            status: 'DISPUTED',
            OR: [{ teamA_Id: t.id }, { teamB_Id: t.id }]
          }
        })
      ]);
      const total = completedCount + disputedCount;
      const trustScore = total > 0 ? Math.round((completedCount / total) * 100) : 100;
      return {
        ...t,
        completedCount,
        disputedCount,
        trustScore
      };
    }));

    return NextResponse.json({ teams });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, isVerified } = await req.json();
    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const team = await prisma.team.update({
      where: { id },
      data: { isVerified: Boolean(isVerified) },
    });

    return NextResponse.json({ ok: true, team });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
