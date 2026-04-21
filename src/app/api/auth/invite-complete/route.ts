import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const { fullName, contact, role, password } = await request.json();

  if (!fullName?.trim()) {
    return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
  }

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
