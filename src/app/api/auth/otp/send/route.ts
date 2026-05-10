import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { normalizePhone } from '@/lib/normalizePhone';

export async function POST(req: NextRequest) {
  try {
    const { phone: rawPhone, purpose } = await req.json();

    if (!rawPhone || !purpose) {
      return NextResponse.json({ error: 'Phone and purpose are required.' }, { status: 400 });
    }

    if (purpose !== 'signup' && purpose !== 'reset') {
      return NextResponse.json({ error: 'Invalid purpose.' }, { status: 400 });
    }

    // Always store the canonical 880XXXXXXXXXX format in the DB
    const phone = normalizePhone(rawPhone);

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Expire in 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Save to database
    await prisma.otpVerification.create({
      data: { phone, otp, purpose, expiresAt },
    });

    // Send SMS via Onecodesoft API (they want 880XXXXXXXXXX — already canonical)
    const apiKey = process.env.ONECODESOFT_API_KEY || 'zpYc0MHb5vo7Sxm8m7ewLcCiRKC5K80d58VT6YN0';
    const senderId = process.env.ONECODESOFT_SENDER_ID || '8809617626047';
    const message = `Your BMT OTP is ${otp}`;
    const smsUrl = `https://sms.onecodesoft.com/api/send-sms?api_key=${apiKey}&type=text&number=${phone}&senderid=${senderId}&message=${encodeURIComponent(message)}`;

    console.log(`Sending SMS to ${phone}...`);

    try {
      const smsRes = await fetch(smsUrl);
      const smsData = await smsRes.json();
      console.log('SMS API Response:', smsData);

      if (smsData?.ErrorCode !== undefined && smsData.ErrorCode !== 0) {
        console.error('Onecodesoft API Error:', smsData);
        if (smsData.ErrorCode === 1007) {
          console.error('CRITICAL: Onecodesoft SMS Gateway Low Balance!');
        }
        return NextResponse.json({ error: 'SMS Gateway issue. Please try again later or contact support.' }, { status: 500 });
      }
    } catch (smsErr) {
      console.error('Failed to call SMS API:', smsErr);
      return NextResponse.json({ error: 'Failed to send SMS due to a network error.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'OTP sent successfully.' });
  } catch (error: any) {
    console.error('OTP Send Error:', error);
    return NextResponse.json({ error: 'Failed to send OTP.' }, { status: 500 });
  }
}
