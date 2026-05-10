import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET — return current setting (or defaults if not set)
export async function GET() {
  try {
    const setting = await prisma.turfServiceSetting.findUnique({
      where: { id: 'singleton' },
    });
    return NextResponse.json(setting ?? { id: 'singleton', isActive: false, launchAt: null });
  } catch (error) {
    console.error('TurfServiceSetting GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch setting' }, { status: 500 });
  }
}

// POST — upsert the setting
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { isActive, launchAt } = body;

    const setting = await prisma.turfServiceSetting.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        isActive: !!isActive,
        launchAt: launchAt ? new Date(launchAt) : null,
      },
      update: {
        isActive: !!isActive,
        launchAt: launchAt ? new Date(launchAt) : null,
      },
    });

    return NextResponse.json(setting);
  } catch (error) {
    console.error('TurfServiceSetting POST error:', error);
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
  }
}
