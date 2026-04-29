import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

type Params = Promise<{ id: string }>;

// GET /api/bmt/players/[id]
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;

  const player = await prisma.player.findUnique({
    where: { id },
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
      mmr:           true,
      footballMmr:   true,
      cricketMmr:    true,
      teamMemberships: {
        include: { team: true },
      },
      matchStats: {
        include: { team: true },
      },
      badges: true,
      battingPerformances: {
        select: { runs: true, ballsFaced: true, fours: true, sixes: true, notOut: true }
      },
      bowlingPerformances: {
        select: { legalBalls: true, runs: true, wickets: true, wides: true, noBalls: true }
      },
    },
  });

  if (!player) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  return NextResponse.json(player);
}

// PATCH /api/bmt/players/[id]
// Allows updating: fullName, avatarUrl, walletBalance, loyaltyPoints,
//                  level, levelProgress, banStatus, banUntil, banReason.
// Email, phone, and password are NOT patchable through this route.
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id }  = await params;
  const body    = await req.json();

  // Strip immutable / sensitive fields
  const {
    email:    _email,
    phone:    _phone,
    password: _password,
    id:       _id,
    joinedAt: _joinedAt,
    ...patch
  } = body;

  // If a new raw password is explicitly provided (admin reset flow), hash it
  if (body.newPassword) {
    patch.password = await bcrypt.hash(body.newPassword.trim(), 10);
    delete patch.newPassword;
  }

  // Coerce banUntil to Date if provided as string
  if (patch.banUntil && typeof patch.banUntil === 'string') {
    patch.banUntil = new Date(patch.banUntil);
  }

  try {
    const updated = await prisma.player.update({
      where: { id },
      data:  patch,
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
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }
}
