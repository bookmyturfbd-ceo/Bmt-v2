import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { cookies } from 'next/headers';

function signToken(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secret = process.env.BMT_SECRET || 'bmt_secret_key';
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: 'Email and password required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const organizer = await prisma.organizer.findUnique({ where: { email: normalizedEmail } });
    if (!organizer) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    if (organizer.banStatus !== 'none') {
      return NextResponse.json({ success: false, error: "You don't have access to your panel. Contact BMT Support." }, { status: 403 });
    }

    const isValid = await bcrypt.compare(password, organizer.password);
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const token = signToken({ id: organizer.id, type: 'ORGANIZER', exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });

    const cookieStore = await cookies();
    cookieStore.set('org_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    });

    const { password: _, ...safeOrg } = organizer;
    return NextResponse.json({ success: true, data: safeOrg });
  } catch (error: any) {
    console.error('Organizer login error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
