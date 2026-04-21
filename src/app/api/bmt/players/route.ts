import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

// GET  /api/bmt/players  — list all players (passwords omitted)
export async function GET() {
  const players = await prisma.player.findMany({
    orderBy: { joinedAt: 'desc' },
    select: {
      id:            true,
      fullName:      true,
      email:         true,
      phone:         true,
      joinedAt:      true,
      walletBalance: true,
      loyaltyPoints: true,
      level:         true,
      levelProgress: true,
      avatarUrl:     true,
      banStatus:     true,
      banUntil:      true,
      banReason:     true,
    },
  });
  return NextResponse.json(players);
}

// POST /api/bmt/players  — register a new player (bcrypt-hashes password)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { fullName, email, phone, password, joinedAt } = body;

  if (!fullName || !email || !password) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  // Duplicate email check
  const existing = await prisma.player.findFirst({
    where: { email: { equals: email.trim().toLowerCase(), mode: 'insensitive' } },
  });
  if (existing) {
    return NextResponse.json(
      { error: 'An account with this email already exists.' },
      { status: 409 }
    );
  }

  const hashed = await bcrypt.hash(password.trim(), 10);

  const player = await prisma.player.create({
    data: {
      fullName:  fullName.trim(),
      email:     email.trim().toLowerCase(),
      phone:     phone?.trim() || '',
      password:  hashed,
      joinedAt:  joinedAt ? new Date(joinedAt) : new Date(),
    },
    select: {
      id:            true,
      fullName:      true,
      email:         true,
      phone:         true,
      joinedAt:      true,
      walletBalance: true,
      loyaltyPoints: true,
      level:         true,
      levelProgress: true,
      avatarUrl:     true,
      banStatus:     true,
    },
  });

  return NextResponse.json(player, { status: 201 });
}
