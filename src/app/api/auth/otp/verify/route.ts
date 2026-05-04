import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { phone, otp, purpose } = await req.json();

    if (!phone || !otp || !purpose) {
      return NextResponse.json({ error: 'Phone, OTP, and purpose are required.' }, { status: 400 });
    }

    // Find the latest OTP for this phone and purpose
    const record = await prisma.otpVerification.findFirst({
      where: {
        phone,
        purpose,
        verified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return NextResponse.json({ error: 'No OTP requested for this number.' }, { status: 400 });
    }

    if (record.otp !== otp) {
      return NextResponse.json({ error: 'Invalid OTP.' }, { status: 400 });
    }

    if (new Date() > record.expiresAt) {
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    // Mark as verified
    await prisma.otpVerification.update({
      where: { id: record.id },
      data: { verified: true },
    });

    return NextResponse.json({ ok: true, message: 'OTP verified successfully.' });
  } catch (error: any) {
    console.error('OTP Verify Error:', error);
    return NextResponse.json({ error: 'Failed to verify OTP.' }, { status: 500 });
  }
}
