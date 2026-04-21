import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

type Params = Promise<{ id: string }>;

// GET /api/bmt/owners/[id]
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;

  const owner = await prisma.owner.findUnique({
    where: { id },
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
        select: {
          id:        true,
          name:      true,
          status:    true,
          area:      true,
          logoUrl:   true,
          createdAt: true,
        },
      },
      financeLock: { select: { id: true } }, // confirms lock exists, no hash
      payouts:     { select: { id: true, amount: true, date: true } },
    },
  });

  if (!owner) return NextResponse.json({ error: 'Owner not found' }, { status: 404 });
  return NextResponse.json(owner);
}

// PATCH /api/bmt/owners/[id]
// Patchable: name, phone, contactPerson, walletBalance, pendingBmtCut.
// Email is NOT patchable here. Use newPassword for admin password resets.
export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const body   = await req.json();

  const {
    email:       _email,
    password:    _password,
    id:          _id,
    joinedAt:    _joinedAt,
    turfs:       _turfs,
    financeLock: _fl,
    payouts:     _po,
    ...patch
  } = body;

  // Admin password-reset flow
  if (body.newPassword) {
    patch.password = await bcrypt.hash(body.newPassword.trim(), 10);
    delete patch.newPassword;
  }

  try {
    const updated = await prisma.owner.update({
      where: { id },
      data:  patch,
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
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Owner not found' }, { status: 404 });
  }
}

// DELETE /api/bmt/owners/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  try {
    await prisma.owner.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Owner not found' }, { status: 404 });
  }
}
