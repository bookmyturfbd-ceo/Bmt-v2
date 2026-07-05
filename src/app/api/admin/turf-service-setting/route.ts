import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET — return current setting (or defaults if not set)
export async function GET() {
  try {
    const setting = await prisma.turfServiceSetting.findUnique({
      where: { id: 'singleton' },
    });
    const defaultProfessions = ["Cricket Coach", "Football Coach", "Futsal Coach", "Swimming Trainer", "Gym Trainer", "Fitness Coach", "Football Referee", "Cricket Umpire", "Scoreboard Manager", "Physio", "Nutritionist", "Yoga Instructor"];
    return NextResponse.json(setting ?? { 
      id: 'singleton', 
      isActive: false, 
      launchAt: null,
      professionTypes: defaultProfessions
    });
  } catch (error) {
    console.error('TurfServiceSetting GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch setting' }, { status: 500 });
  }
}

// POST — upsert the setting
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { isActive, launchAt, professionTypes } = body;

    const data: any = {};
    if (isActive !== undefined) data.isActive = !!isActive;
    if (launchAt !== undefined) data.launchAt = launchAt ? new Date(launchAt) : null;
    if (Array.isArray(professionTypes)) data.professionTypes = professionTypes;

    const setting = await prisma.turfServiceSetting.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        isActive: !!isActive,
        launchAt: launchAt ? new Date(launchAt) : null,
        professionTypes: Array.isArray(professionTypes) ? professionTypes : undefined,
      },
      update: data,
    });

    return NextResponse.json(setting);
  } catch (error) {
    console.error('TurfServiceSetting POST error:', error);
    return NextResponse.json({ error: 'Failed to update setting' }, { status: 500 });
  }
}
