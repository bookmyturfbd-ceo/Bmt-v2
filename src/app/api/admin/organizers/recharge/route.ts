import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET — list all organizer recharge requests
export async function GET() {
  try {
    const requests = await prisma.organizerRechargeRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        organizer: { select: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json({ success: true, data: requests });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
