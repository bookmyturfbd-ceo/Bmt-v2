import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

// GET  /api/bmt/players  — list all players (passwords omitted)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pageParam = searchParams.get('page');
  const limitParam = searchParams.get('limit');
  const search = searchParams.get('search') || '';

  const whereClause = search ? {
    OR: [
      { fullName: { contains: search, mode: 'insensitive' as any } },
      { email: { contains: search, mode: 'insensitive' as any } },
      { phone: { contains: search } }
    ]
  } : {};

  // If no pagination requested, return all (backward compatibility for now, though we should migrate all to paginated)
  if (!pageParam || !limitParam) {
    const players = await prisma.player.findMany({
      where: whereClause,
      orderBy: { joinedAt: 'desc' },
      select: {
        id: true, fullName: true, email: true, phone: true, joinedAt: true,
        walletBalance: true, loyaltyPoints: true, level: true, levelProgress: true,
        avatarUrl: true, banStatus: true, banUntil: true, banReason: true,
      },
    });
    // Return wrapped in data to start migrating clients, or return array? 
    // To be safe and not break existing components instantly, we return array if no page is provided, 
    // BUT we want to enforce { data, total }. Let's return { data: players, total: players.length } 
    // and update the frontend clients.
    const total = players.length;
    return NextResponse.json({ data: players, total, page: 1, totalPages: 1 });
  }

  const page = parseInt(pageParam, 10);
  const limit = parseInt(limitParam, 10);

  const total = await prisma.player.count({ where: whereClause });
  
  const players = await prisma.player.findMany({
    where: whereClause,
    orderBy: { joinedAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
    select: {
      id: true, fullName: true, email: true, phone: true, joinedAt: true,
      walletBalance: true, loyaltyPoints: true, level: true, levelProgress: true,
      avatarUrl: true, banStatus: true, banUntil: true, banReason: true,
    },
  });

  return NextResponse.json({ 
    data: players, 
    total, 
    page, 
    totalPages: Math.ceil(total / limit) 
  });
}

// POST /api/bmt/players  — register a new player (bcrypt-hashes password)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { fullName, email, phone, password, joinedAt, otp } = body;

  if (!fullName || !email || !password || !phone) {
    return NextResponse.json({ error: 'Missing required fields (including phone).' }, { status: 400 });
  }

  // Enforce OTP verification
  if (!otp) {
    return NextResponse.json({ error: 'OTP is required for registration.' }, { status: 400 });
  }

  const otpRecord = await prisma.otpVerification.findFirst({
    where: {
      phone: phone.trim(),
      otp: otp.trim(),
      purpose: 'signup',
      verified: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  if (!otpRecord) {
    return NextResponse.json({ error: 'Please verify your phone number with OTP first.' }, { status: 400 });
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
  
  // Duplicate phone check
  const existingPhone = await prisma.player.findFirst({
    where: { phone: { equals: phone.trim() } },
  });
  if (existingPhone) {
    return NextResponse.json(
      { error: 'An account with this phone number already exists.' },
      { status: 409 }
    );
  }

  const hashed = await bcrypt.hash(password.trim(), 10);

  const player = await prisma.player.create({
    data: {
      fullName:  fullName.trim(),
      email:     email.trim().toLowerCase(),
      phone:     phone.trim(),
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

  // Cleanup OTP
  await prisma.otpVerification.deleteMany({
    where: { phone: phone.trim(), purpose: 'signup' }
  });

  return NextResponse.json(player, { status: 201 });
}
