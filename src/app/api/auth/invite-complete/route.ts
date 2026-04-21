import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const { fullName, token, password } = await request.json();

  if (!fullName?.trim() || !token?.trim()) {
    return NextResponse.json({ error: 'Full name and valid invite token are required' }, { status: 400 });
  }

  // Fetch token from DB
  const inviteRecord = await prisma.inviteToken.findUnique({
    where: { token },
  });

  if (!inviteRecord) {
    return NextResponse.json({ error: 'Invalid or expired invite token' }, { status: 400 });
  }

  if (inviteRecord.usedAt) {
    return NextResponse.json({ error: 'This invite link has already been used' }, { status: 400 });
  }

  if (new Date() > inviteRecord.expiresAt) {
    return NextResponse.json({ error: 'This invite link has expired' }, { status: 400 });
  }

  const role = inviteRecord.role;
  const contact = inviteRecord.contact;

  const roleLower    = (role ?? '').toLowerCase();
  const isTurfOwner  = roleLower.includes('turf') || roleLower.includes('owner');
  const isCoach      = roleLower.includes('coach') || roleLower.includes('pro');
  const isOwnerRole  = isTurfOwner || isCoach;

  const cookieOpts = {
    path: '/',
    maxAge: 86400 * 30,
    sameSite: 'lax' as const,
    httpOnly: false,
  };

  if (isOwnerRole) {
    // Hash password — use provided value or a temporary default
    const rawPw   = password?.trim() || 'changeme';
    const hashed  = await bcrypt.hash(rawPw, 10);
    const email   = (contact ?? '').trim().toLowerCase();

    // Upsert: don't create a duplicate if the owner already exists
    const owner = await prisma.owner.upsert({
      where:  { email },
      update: {},   // do not overwrite existing data on re-completion
      create: {
        name:     fullName.trim(),
        email,
        phone:    '',
        password: hashed,
      },
    });

    // Mark Token as Used!
    await prisma.inviteToken.update({
      where: { id: inviteRecord.id },
      data: { usedAt: new Date(), usedBy: owner.id }
    });

    const redirect = '/en/dashboard/owner';
    const response = NextResponse.json({ ok: true, redirect });
    response.cookies.set('bmt_auth',     '1',        cookieOpts);
    response.cookies.set('bmt_role',     'owner',    cookieOpts);
    response.cookies.set('bmt_owner_id', owner.id,   cookieOpts);
    response.cookies.set('bmt_name',     owner.name, cookieOpts);
    return response;
  }

  // Non-owner invite flows
  const response = NextResponse.json({ ok: true, redirect: '/en' });
  response.cookies.set('bmt_auth', '1', cookieOpts);
  return response;
}
