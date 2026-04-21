import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const payouts = await prisma.payout.findMany({
    orderBy: { createdAt: 'desc' },
    include: { owner: { select: { name: true, phone: true } } }
  });

  // Map proofUrl to legacy variable name seamlessly for frontend components
  return NextResponse.json(payouts.map(p => ({ ...p, proofBase64: p.proofUrl })));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { ownerId, ownerName, turfName, amount, bmtCut, date, method, txId, proofBase64, proofUrl } = body;

  if (!ownerId || !amount || !date || !method) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const resolvedProof = proofUrl || proofBase64 || null;

  const item = await prisma.payout.create({
    data: {
      ownerId,
      ownerName: ownerName || 'Unknown Owner',
      turfName: turfName || 'Unknown Turf',
      amount: Number(amount),
      bmtCut: Number(bmtCut || 0),
      date,
      method,
      txId: txId || null,
      proofUrl: resolvedProof
    },
    include: { owner: { select: { name: true, phone: true } } }
  });

  return NextResponse.json({ ...item, proofBase64: item.proofUrl }, { status: 201 });
}
