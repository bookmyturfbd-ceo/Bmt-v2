import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const requests = await prisma.walletRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: { player: { select: { fullName: true, phone: true } } }
  });

  // Map back screenshotUrl to expected frontend property
  return NextResponse.json(requests.map(r => ({ ...r, screenshotBase64: r.screenshotUrl })));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { playerId, playerName, amount, method, screenshotBase64, screenshotUrl } = body;
  
  if (!playerId || !amount || !method) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  // Gracefully handle either the old base64 field or new true URL field
  const resolvedUrl = screenshotUrl || screenshotBase64 || null;

  const item = await prisma.walletRequest.create({
    data: {
      playerId,
      playerName, // Redundant but stored natively in db
      amount: Number(amount),
      method,
      screenshotUrl: resolvedUrl,
      status: 'pending'
    },
    include: { player: { select: { fullName: true, phone: true } } }
  });

  return NextResponse.json({ ...item, screenshotBase64: item.screenshotUrl }, { status: 201 });
}
