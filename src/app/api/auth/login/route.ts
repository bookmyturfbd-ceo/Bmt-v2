import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

function signToken(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secret = process.env.BMT_SECRET || 'bmt_secret_key';
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export async function POST(request: NextRequest) {
  const { credential, password } = await request.json();

  if (!credential?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
  }

  const cred = credential.trim().toLowerCase();
  const pw   = password.trim();

  const cookieOpts = {
    path: '/',
    maxAge: 86400,
    sameSite: 'lax' as const,
    httpOnly: false,
  };

  // ── Super Admin ──────────────────────────────────────────────────────────────
  if (cred === 'admin@bmt.com' && pw === '1234') {
    const response = NextResponse.json({ ok: true, redirect: '/en/admin' });
    response.cookies.set('bmt_auth',  '1',     cookieOpts);
    response.cookies.set('bmt_role',  'admin', cookieOpts);
    response.cookies.set('bmt_name',  'Admin', cookieOpts);
    return response;
  }

  // ── Turf Owner ───────────────────────────────────────────────────────────────
  const owner = await prisma.owner.findFirst({
    where: { email: { equals: cred, mode: 'insensitive' } },
  });

  if (owner) {
    const passwordMatch = await bcrypt.compare(pw, owner.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid credentials. Check your email and password.' },
        { status: 401 }
      );
    }
    const name = owner.name || owner.contactPerson || credential;
    const response = NextResponse.json({ ok: true, redirect: '/en/dashboard/owner' });
    response.cookies.set('bmt_auth',     '1',        cookieOpts);
    response.cookies.set('bmt_role',     'owner',    cookieOpts);
    response.cookies.set('bmt_owner_id', owner.id,   cookieOpts);
    response.cookies.set('bmt_name',     name,       cookieOpts);
    return response;
  }

  // ── Organizer ────────────────────────────────────────────────────────────────
  const organizer = await prisma.organizer.findFirst({
    where: { email: { equals: cred, mode: 'insensitive' } },
  });

  if (organizer) {
    if (organizer.banStatus !== 'none') {
      return NextResponse.json(
        { error: "You don't have access to your panel. Contact BMT Support." },
        { status: 403 }
      );
    }

    const passwordMatch = await bcrypt.compare(pw, organizer.password);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid credentials. Check your email and password.' },
        { status: 401 }
      );
    }

    const token = signToken({ id: organizer.id, type: 'ORGANIZER', exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    const response = NextResponse.json({ ok: true, redirect: '/en/organizer/dashboard' });
    
    // Set the secure JWT for the organizer portal
    response.cookies.set('org_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    });
    
    // Also set legacy cookies just in case the unified layout needs them
    response.cookies.set('bmt_auth', '1', cookieOpts);
    response.cookies.set('bmt_role', 'organizer', cookieOpts);
    response.cookies.set('bmt_name', organizer.name, cookieOpts);
    
    return response;
  }

  // ── Player ───────────────────────────────────────────────────────────────────
  const player = await prisma.player.findFirst({
    where: { email: { equals: cred, mode: 'insensitive' } },
  });

  if (!player) {
    return NextResponse.json(
      { error: 'Invalid credentials. Check your email and password.' },
      { status: 401 }
    );
  }

  const passwordMatch = await bcrypt.compare(pw, player.password);
  if (!passwordMatch) {
    return NextResponse.json(
      { error: 'Invalid credentials. Check your email and password.' },
      { status: 401 }
    );
  }

  // ── Ban checks ───────────────────────────────────────────────────────────────
  if (player.banStatus === 'perma') {
    return NextResponse.json(
      { error: 'Your account has been permanently banned. Contact support.' },
      { status: 403 }
    );
  }

  if (player.banStatus === 'soft' && player.banUntil) {
    if (player.banUntil > new Date()) {
      return NextResponse.json(
        {
          error: `Your account is suspended until ${player.banUntil.toLocaleDateString('en-BD')}. Contact support if you think this is a mistake.`,
        },
        { status: 403 }
      );
    }
    // Auto-unban — ban has expired; clear it in Postgres
    await prisma.player.update({
      where: { id: player.id },
      data:  { banStatus: 'none', banUntil: null, banReason: null },
    });
  }

  // ── Success ──────────────────────────────────────────────────────────────────
  const response = NextResponse.json({ ok: true, redirect: '/en' });
  response.cookies.set('bmt_auth',      '1',            cookieOpts);
  response.cookies.set('bmt_role',      'player',       cookieOpts);
  response.cookies.set('bmt_player_id', player.id,      cookieOpts);
  response.cookies.set('bmt_name',      player.fullName, cookieOpts);
  return response;
}
