import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { normalizePhone } from '@/lib/normalizePhone';

export async function POST(req: NextRequest) {
  try {
    const { phone: rawPhone, otp, newPassword } = await req.json();

    if (!rawPhone || !otp || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const phone = normalizePhone(rawPhone);

    // Verify OTP was verified
    const record = await prisma.otpVerification.findFirst({
      where: { phone, otp, purpose: 'reset', verified: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return NextResponse.json({ error: 'Please verify your OTP first.' }, { status: 400 });
    }

    if (new Date() > record.expiresAt) {
      return NextResponse.json({ error: 'OTP session has expired. Please try again.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    // Look up user with normalized phone AND also try the +880 variant for
    // accounts created before the normalizer was added.
    const plusVariant = '+' + phone; // e.g. +8801XXXXXXXXX
    let updated = false;

    // ── Player ──────────────────────────────────────────────────────────────
    const player = await prisma.player.findFirst({
      where: { OR: [{ phone }, { phone: plusVariant }] },
    });
    if (player) {
      await prisma.player.update({
        where: { id: player.id },
        data: {
          password: hashedPassword,
          // Normalize the stored phone so future lookups work correctly
          phone,
        },
      });
      updated = true;
    }

    // ── Owner ────────────────────────────────────────────────────────────────
    const owner = await prisma.owner.findFirst({
      where: { OR: [{ phone }, { phone: plusVariant }] },
    });
    if (owner) {
      await prisma.owner.update({
        where: { id: owner.id },
        data: { password: hashedPassword, phone },
      });
      updated = true;
    }

    // ── Organizer ────────────────────────────────────────────────────────────
    const organizer = await prisma.organizer.findFirst({
      where: { OR: [{ phone }, { phone: plusVariant }] },
    });
    if (organizer) {
      await prisma.organizer.update({
        where: { id: organizer.id },
        data: { password: hashedPassword, phone },
      });
      updated = true;
    }

    if (!updated) {
      return NextResponse.json({ error: 'No user found with this phone number.' }, { status: 404 });
    }

    // Delete the OTP record so it can't be reused
    await prisma.otpVerification.delete({ where: { id: record.id } });

    return NextResponse.json({ ok: true, message: 'Password reset successfully.' });
  } catch (error: any) {
    console.error('Reset Password Error:', error);
    return NextResponse.json({ error: 'Failed to reset password.' }, { status: 500 });
  }
}
