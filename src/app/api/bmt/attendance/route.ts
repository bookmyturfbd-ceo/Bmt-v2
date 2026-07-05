import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET — Fetch attendance records by turfId and optional date
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const turfId = searchParams.get('turfId');
    const date = searchParams.get('date');

    if (!turfId) {
      return NextResponse.json({ error: 'turfId query parameter is required' }, { status: 400 });
    }

    const whereClause: any = { turfId };
    if (date) whereClause.date = date;

    const records = await prisma.attendanceRecord.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(records);
  } catch (error: any) {
    console.error('Attendance GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch attendance' }, { status: 500 });
  }
}

// POST — Upsert attendance record for a trainee on a date
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { turfId, bookingId, playerId, date, status, notes } = body;

    if (!turfId || !bookingId || !playerId || !date || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const record = await prisma.attendanceRecord.upsert({
      where: {
        bookingId_date: {
          bookingId,
          date,
        },
      },
      create: {
        turfId,
        bookingId,
        playerId,
        date,
        status,
        notes: notes || null,
      },
      update: {
        status,
        notes: notes || null,
      },
    });

    return NextResponse.json(record);
  } catch (error: any) {
    console.error('Attendance POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save attendance' }, { status: 500 });
  }
}
