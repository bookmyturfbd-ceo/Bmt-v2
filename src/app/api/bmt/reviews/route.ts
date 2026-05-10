import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const items = await prisma.review.findMany();
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const item = await prisma.review.create({ data: body });
  return NextResponse.json(item, { status: 201 });
}
