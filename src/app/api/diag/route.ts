import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const dbTime = await prisma.$queryRaw`SELECT NOW()`;
    const playersCount = await prisma.player.count();
    const matchesCount = await prisma.match.count();
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      dbTime,
      playersCount,
      matchesCount,
      env: {
        DATABASE_URL_length: process.env.DATABASE_URL?.length ?? 0,
        NODE_ENV: process.env.NODE_ENV,
      }
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      stack: err.stack,
      code: err.code,
      meta: err.meta,
    }, { status: 500 });
  }
}
