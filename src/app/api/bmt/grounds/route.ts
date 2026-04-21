import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const grounds = await prisma.ground.findMany({
    include: { slots: true }
  });
  return NextResponse.json(grounds);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { turfId, name } = body;

  if (!turfId || !name?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const ground = await prisma.ground.create({
    data: {
      turfId,
      name: name.trim()
    },
    include: { slots: true }
  });

  return NextResponse.json(ground, { status: 201 });
}
