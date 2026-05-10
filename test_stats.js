const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

      const activePlayers = await prisma.player.count({
        where: { banStatus: 'none' }
      });
      console.log('activePlayers', activePlayers);

      const joinedToday = await prisma.player.count({
        where: { joinedAt: { gte: today } }
      });
      console.log('joinedToday', joinedToday);

      const totalTurfs = await prisma.turf.count();
      console.log('totalTurfs', totalTurfs);

      const activeTurfs = await prisma.turf.count({
        where: {
          status: { in: ['published', 'approved'] }
        }
      });
      console.log('activeTurfs', activeTurfs);

      const grossRevenueAgg = await prisma.booking.aggregate({ _sum: { price: true } });
      console.log('grossRevenueAgg', grossRevenueAgg);
      
      const bmtProfitOwnersAgg = await prisma.owner.aggregate({ _sum: { pendingBmtCut: true } });
      const bmtProfitBookingsAgg = await prisma.booking.aggregate({ _sum: { bmtCut: true } });
      console.log('bmtProfitOwnersAgg', bmtProfitOwnersAgg);

      const walletApprovedAgg = await prisma.walletRequest.aggregate({ 
        _sum: { amount: true }, 
        where: { status: 'approved' } 
      });
      const walletApprovedCount = await prisma.walletRequest.count({ where: { status: 'approved' } });
      console.log('walletApprovedCount', walletApprovedCount);

      const monthlyFeesPaidAgg = await prisma.monthlyFee.aggregate({
        _sum: { amount: true },
        where: { paid: true }
      });
      const monthlyFeesTotalCount = await prisma.monthlyFee.count();
      const monthlyFeesPaidCount = await prisma.monthlyFee.count({ where: { paid: true } });
      console.log('monthlyFeesPaidCount', monthlyFeesPaidCount);

      const shopOrdersAgg = await prisma.shopOrder.aggregate({
        _sum: { total: true },
        where: { status: { not: 'cancelled' } }
      });
      const shopOrdersCount = await prisma.shopOrder.count({
        where: { status: { not: 'cancelled' } }
      });
      console.log('shopOrdersCount', shopOrdersCount);

      const cmPaymentsAgg = await prisma.challengePayment.aggregate({ _sum: { amount: true } });
      const cmPaymentsCount = await prisma.challengePayment.count();
      console.log('cmPaymentsCount', cmPaymentsCount);

  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
