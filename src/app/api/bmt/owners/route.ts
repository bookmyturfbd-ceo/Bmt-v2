import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

// GET  /api/bmt/owners  — list all owners (passwords omitted)
export async function GET() {
  const owners = await prisma.owner.findMany({
    orderBy: { joinedAt: 'asc' },
    select: {
      id:             true,
      name:           true,
      email:          true,
      phone:          true,
      contactPerson:  true,
      joinedAt:       true,
      walletBalance:  true,
      pendingBmtCut:  true,
      turfs: {
        select: { id: true, name: true, status: true },
      },
    },
  });
  return NextResponse.json(owners);
}

// POST /api/bmt/owners  — create a new owner (bcrypt-hashes password)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, phone, password, contactPerson } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  // Duplicate email check
  const existing = await prisma.owner.findFirst({
    where: { email: { equals: email.trim().toLowerCase(), mode: 'insensitive' } },
  });
  if (existing) {
    return NextResponse.json(
      { error: 'An account with this email already exists.' },
      { status: 409 }
    );
  }

  const hashed = await bcrypt.hash(password.trim(), 10);

  const owner = await prisma.owner.create({
    data: {
      name:          name.trim(),
      email:         email.trim().toLowerCase(),
      phone:         phone?.trim() || '',
      contactPerson: contactPerson?.trim() || null,
      password:      hashed,
    },
    select: {
      id:            true,
      name:          true,
      email:         true,
      phone:         true,
      contactPerson: true,
      joinedAt:      true,
      walletBalance: true,
      pendingBmtCut: true,
    },
  });

  return NextResponse.json(owner, { status: 201 });
}
