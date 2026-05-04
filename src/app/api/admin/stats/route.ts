import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

      // Players
      const activePlayers = await prisma.player.count({
        where: { banStatus: 'none' }
      });
      const joinedToday = await prisma.player.count({
        where: { joinedAt: { gte: today } }
      });

      // Turfs
      const totalTurfs = await prisma.turf.count();
      const activeTurfs = await prisma.turf.count({
        where: {
          status: 'published'
        }
      });

      // Revenue
      const grossRevenueAgg = await prisma.booking.aggregate({ _sum: { price: true } });
      
      // BMT Profit
      const bmtProfitOwnersAgg = await prisma.owner.aggregate({ _sum: { pendingBmtCut: true } });
      const bmtProfitBookingsAgg = await prisma.booking.aggregate({ _sum: { bmtCut: true } });

      // Wallets
      const walletApprovedAgg = await prisma.walletRequest.aggregate({ 
        _sum: { amount: true }, 
        where: { status: 'approved' } 
      });
      const walletApprovedCount = await prisma.walletRequest.count({ where: { status: 'approved' } });

      // Monthly Fees
      const monthlyFeesPaidAgg = await prisma.monthlyFee.aggregate({
        _sum: { amount: true },
        where: { paid: true }
      });
      const monthlyFeesTotalCount = await prisma.monthlyFee.count();
      const monthlyFeesPaidCount = await prisma.monthlyFee.count({ where: { paid: true } });

      // Shop Orders
      const shopOrdersAgg = await prisma.shopOrder.aggregate({
        _sum: { total: true },
        where: { status: { not: 'cancelled' } }
      });
      const shopOrdersCount = await prisma.shopOrder.count({
        where: { status: { not: 'cancelled' } }
      });

      // Challenge Market
      const cmPaymentsAgg = await prisma.challengePayment.aggregate({ _sum: { amount: true } });
      const cmPaymentsCount = await prisma.challengePayment.count();

    const stats = {
      activePlayers,
      joinedToday,
      totalTurfs,
      activeTurfs,
      grossRevenue: grossRevenueAgg._sum.price || 0,
      bmtProfit: bmtProfitOwnersAgg._sum.pendingBmtCut || bmtProfitBookingsAgg._sum.bmtCut || 0,
      walletRevenue: walletApprovedAgg._sum.amount || 0,
      walletApprovedCount,
      lifetimeMonthlyRevenue: monthlyFeesPaidAgg._sum.amount || 0,
      totalMonthlyFees: monthlyFeesTotalCount,
      paidMonthlyFees: monthlyFeesPaidCount,
      shopOrdersRevenue: shopOrdersAgg._sum.total || 0,
      shopOrdersCount,
      cmPaymentsRevenue: cmPaymentsAgg._sum.amount || 0,
      cmPaymentsCount
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Stats aggregation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
