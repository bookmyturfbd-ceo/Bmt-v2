import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '@/lib/prisma';
import { normalizePhone } from '@/lib/normalizePhone';
import { generateCode } from '@/lib/generateCode';

function signToken(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secret = process.env.BMT_SECRET || 'bmt_secret_key';
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { role, fullName, email, phone: rawPhone, password, otp, professions } = body;

    if (!role || !fullName || !email || !password || !rawPhone || !otp) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const phone = normalizePhone(rawPhone);
    if (!phone) {
      return NextResponse.json({ error: 'Invalid phone number format.' }, { status: 400 });
    }

    // Verify OTP first
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

    const cleanEmail = email.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const cookieOpts = {
      path: '/',
      maxAge: 86400 * 30,
      sameSite: 'lax' as const,
      httpOnly: false,
    };

    // ─── 1. PLAYER ROLE ───
    if (role === 'player') {
      const existingEmail = await prisma.player.findFirst({ where: { email: cleanEmail } });
      if (existingEmail) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });

      const existingPhone = await prisma.player.findFirst({
        where: {
          OR: [
            { phone },
            { phone: '+' + phone }
          ]
        }
      });
      if (existingPhone) return NextResponse.json({ error: 'An account with this phone number already exists.' }, { status: 409 });

      const player = await prisma.player.create({
        data: {
          fullName: fullName.trim(),
          email: cleanEmail,
          phone,
          password: hashedPassword,
          playerCode: generateCode('P-'),
        }
      });

      await prisma.otpVerification.deleteMany({ where: { phone, purpose: 'signup' } });

      const response = NextResponse.json({ ok: true, user: player, redirect: '/en' });
      response.cookies.set('bmt_auth', '1', cookieOpts);
      response.cookies.set('bmt_role', 'player', cookieOpts);
      response.cookies.set('bmt_player_id', player.id, cookieOpts);
      response.cookies.set('bmt_name', player.fullName, cookieOpts);
      return response;
    }

    // ─── 2. PROFESSIONAL ROLE ───
    if (role === 'professional') {
      const existingOwner = await prisma.owner.findFirst({ where: { email: cleanEmail } });
      if (existingOwner) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });

      const existingOwnerPhone = await prisma.owner.findFirst({
        where: {
          OR: [
            { phone },
            { phone: '+' + phone }
          ]
        }
      });
      if (existingOwnerPhone) return NextResponse.json({ error: 'An account with this phone number already exists.' }, { status: 409 });

      const owner = await prisma.owner.create({
        data: {
          name: fullName.trim(),
          email: cleanEmail,
          phone,
          password: hashedPassword,
          isCoach: true,
        }
      });

      // Query default division & city
      const division = await prisma.division.findFirst();
      const city = await prisma.city.findFirst();

      if (division && city) {
        await prisma.turf.create({
          data: {
            name: fullName.trim() + ' Profile',
            ownerId: owner.id,
            divisionId: division.id,
            cityId: city.id,
            isCoachProfile: true,
            status: 'published',
            professions: Array.isArray(professions) ? professions : [],
          }
        });
      }

      await prisma.otpVerification.deleteMany({ where: { phone, purpose: 'signup' } });

      const response = NextResponse.json({ ok: true, user: owner, redirect: '/en/dashboard/coach' });
      response.cookies.set('bmt_auth', '1', cookieOpts);
      response.cookies.set('bmt_role', 'coach', cookieOpts);
      response.cookies.set('bmt_owner_id', owner.id, cookieOpts);
      response.cookies.set('bmt_name', owner.name, cookieOpts);
      return response;
    }

    // ─── 3. ORGANIZER ROLE ───
    if (role === 'organizer') {
      const existingOrg = await prisma.organizer.findFirst({ where: { email: cleanEmail } });
      if (existingOrg) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });

      const organizer = await prisma.organizer.create({
        data: {
          name: fullName.trim(),
          email: cleanEmail,
          phone,
          password: hashedPassword,
          isVerified: true,
          wallet: {
            create: { balance: 0 }
          }
        }
      });

      await prisma.otpVerification.deleteMany({ where: { phone, purpose: 'signup' } });

      const token = signToken({ id: organizer.id, type: 'ORGANIZER', exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
      const isHttps = req.url.startsWith('https:');

      const response = NextResponse.json({ ok: true, user: organizer, redirect: '/en/organizer/dashboard' });
      response.cookies.set('org_token', token, {
        httpOnly: isHttps,
        secure: isHttps,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60
      });
      response.cookies.set('bmt_auth', '1', cookieOpts);
      response.cookies.set('bmt_role', 'organizer', cookieOpts);
      response.cookies.set('bmt_name', organizer.name, cookieOpts);
      return response;
    }

    return NextResponse.json({ error: 'Invalid role specified.' }, { status: 400 });
  } catch (error: any) {
    console.error('Signup Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to complete signup.' }, { status: 500 });
  }
}
