import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const methods = await prisma.paymentMethod.findMany();
  return NextResponse.json(methods);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, number, accountType } = body;

  if (!type || !number || !accountType) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  // Upsert by type to perfectly mimic legacy frontend behavior
  const method = await prisma.paymentMethod.upsert({
    where: { type },
    update: { number, accountType },
    create: { type, number, accountType }
  });

  return NextResponse.json(method, { status: 200 });
}
