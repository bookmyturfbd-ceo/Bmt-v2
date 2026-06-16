import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const dbTime = await prisma.$queryRaw`SELECT NOW()`;
    const playersCount = await prisma.player.count();
    const matchesCount = await prisma.match.count();
    const teamsCount = await prisma.team.count();

    // Check if tournamentFootballMmr column exists on Team table via raw SQL
    let tournamentMmrColumnsExist = false;
    try {
      await prisma.$queryRaw`SELECT "tournamentFootballMmr" FROM "teams" LIMIT 1`;
      tournamentMmrColumnsExist = true;
    } catch {
      tournamentMmrColumnsExist = false;
    }

    // Check for teams without a sport type using raw SQL (bypasses Prisma's enum validation)
    const nullSportTypeResult = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count FROM "teams" WHERE "sportType" IS NULL
    `;
    const nullSportTypeTeams = Number(nullSportTypeResult[0]?.count ?? 0);

    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      dbTime,
      playersCount,
      matchesCount,
      teamsCount,
      nullSportTypeTeams,
      tournamentMmrColumnsExist,
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
