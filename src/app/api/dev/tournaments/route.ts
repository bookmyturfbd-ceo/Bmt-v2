import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const ts = await prisma.tournament.findMany();
    return NextResponse.json({ success: true, data: ts });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
