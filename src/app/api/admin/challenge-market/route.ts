import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    let config = await prisma.challengeMarketConfig.findUnique({ where: { id: 'singleton' } });
    if (!config) {
      config = await prisma.challengeMarketConfig.create({
        data: { id: 'singleton', monthlyFee: 500 }
      });
    }

    const subscriptions = await prisma.challengeSubscription.findMany({
      include: { team: { select: { name: true, owner: { select: { fullName: true } } } } },
      orderBy: { subscribedAt: 'desc' }
    });

    const disputes = await prisma.challengeDispute.findMany({
      include: { match: true, team: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const payments = await prisma.challengePayment.findMany();

    // Stats Math
    const lifetime = payments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const todayStr = new Date().toISOString().split('T')[0];
    const daily = payments.filter((p: any) => p.createdAt.toISOString().startsWith(todayStr)).reduce((sum: number, p: any) => sum + p.amount, 0);
    
    // roughly matching "YYYY-MM"
    const monthStr = todayStr.substring(0, 7);
    const monthly = payments.filter((p: any) => p.createdAt.toISOString().startsWith(monthStr)).reduce((sum: number, p: any) => sum + p.amount, 0);

    const stats = { lifetime, daily, monthly, activeSubs: subscriptions.filter((s: any) => s.active).length };

    // CM config fee (for UI display)
    const cmFee = config.monthlyFee;

    // All seasons
    const seasons = await prisma.challengeSeason.findMany({ orderBy: { createdAt: 'desc' } });

    return NextResponse.json({ config, subscriptions, disputes, stats, payments, seasons, cmFee });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, startDate, endDate } = await req.json();
    if (!name || !startDate || !endDate) return NextResponse.json({ error: 'name, startDate, endDate required' }, { status: 400 });

    // Deactivate all existing seasons
    await prisma.challengeSeason.updateMany({ data: { isActive: false } });

    const season = await prisma.challengeSeason.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        isActive: true
      }
    });
    return NextResponse.json({ ok: true, season });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { monthlyFee } = await req.json();
    const config = await prisma.challengeMarketConfig.update({
      where: { id: 'singleton' },
      data: { monthlyFee }
    });
    return NextResponse.json({ ok: true, config });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
