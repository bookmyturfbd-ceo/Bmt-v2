import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { phone, otp, newPassword } = await req.json();

    if (!phone || !otp || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Verify OTP was verified
    const record = await prisma.otpVerification.findFirst({
      where: {
        phone,
        otp,
        purpose: 'reset',
        verified: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return NextResponse.json({ error: 'Please verify your OTP first.' }, { status: 400 });
    }

    if (new Date() > record.expiresAt) {
      return NextResponse.json({ error: 'OTP session has expired. Please try again.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    // Update password for Player, Owner, Organizer if they exist with this phone
    let updated = false;

    // Check Player
    const player = await prisma.player.findFirst({ where: { phone } });
    if (player) {
      await prisma.player.update({ where: { id: player.id }, data: { password: hashedPassword } });
      updated = true;
    }

    // Check Owner
    const owner = await prisma.owner.findFirst({ where: { phone } });
    if (owner) {
      await prisma.owner.update({ where: { id: owner.id }, data: { password: hashedPassword } });
      updated = true;
    }

    // Check Organizer
    const organizer = await prisma.organizer.findFirst({ where: { phone } });
    if (organizer) {
      await prisma.organizer.update({ where: { id: organizer.id }, data: { password: hashedPassword } });
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
