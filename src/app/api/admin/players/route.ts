import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search') || '';
    const filterStatus = searchParams.get('status') || 'all'; // all, active, soft, perma

    let banFilter = {};
    if (filterStatus === 'active') banFilter = { OR: [{ banStatus: 'none' }, { banStatus: null }] };
    if (filterStatus === 'soft') banFilter = { banStatus: 'soft' };
    if (filterStatus === 'perma') banFilter = { banStatus: 'perma' };

    const whereClause = {
      ...banFilter,
      ...(search ? {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' as any } },
          { email: { contains: search, mode: 'insensitive' as any } },
          { phone: { contains: search } }
        ]
      } : {})
    };

    const total = await prisma.player.count({ where: whereClause as any });
    
    const players = await prisma.player.findMany({
      where: whereClause as any,
      orderBy: { joinedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, fullName: true, email: true, phone: true, joinedAt: true,
        walletBalance: true, banStatus: true, banUntil: true, avatarUrl: true
      }
    });

    // Calculate recharged and spent for each player in this page
    const playersWithStats = await Promise.all(players.map(async (p) => {
      // Recharged
      const walletAgg = await prisma.walletRequest.aggregate({
        _sum: { amount: true },
        where: { playerId: p.id, status: 'approved' }
      });
      
      // Spent
      const bookingsAgg = await prisma.booking.aggregate({
        _sum: { price: true },
        where: { playerId: p.id }
      });

      return {
        ...p,
        recharged: walletAgg._sum.amount || 0,
        spent: bookingsAgg._sum.price || 0
      };
    }));

    return NextResponse.json({
      data: playersWithStats,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
