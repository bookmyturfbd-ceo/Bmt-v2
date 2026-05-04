import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const { phone, purpose } = await req.json();

    if (!phone || !purpose) {
      return NextResponse.json({ error: 'Phone and purpose are required.' }, { status: 400 });
    }

    if (purpose !== 'signup' && purpose !== 'reset') {
      return NextResponse.json({ error: 'Invalid purpose.' }, { status: 400 });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Expire in 5 minutes
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Save to database
    await prisma.otpVerification.create({
      data: {
        phone,
        otp,
        purpose,
        expiresAt,
      },
    });

    // Send SMS via Onecodesoft API
    const apiKey = process.env.ONECODESOFT_API_KEY || 'zpYc0MHb5vo7Sxm8m7ewLcCiRKC5K80d58VT6YN0';
    const senderId = process.env.ONECODESOFT_SENDER_ID || '8809617626047';
    
    // Ensure phone is in 880 format for Bangladesh
    let formattedPhone = phone.trim();
    if (formattedPhone.startsWith('01')) {
      formattedPhone = '88' + formattedPhone;
    } else if (formattedPhone.startsWith('+880')) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    const message = `Your BMT OTP is ${otp}`;
    const smsUrl = `https://sms.onecodesoft.com/api/send-sms?api_key=${apiKey}&type=text&number=${formattedPhone}&senderid=${senderId}&message=${encodeURIComponent(message)}`;

    console.log(`Sending SMS to ${formattedPhone}...`);
    
    try {
      const smsRes = await fetch(smsUrl);
      const smsData = await smsRes.json();
      console.log('SMS API Response:', smsData);
      
      // Check for Onecodesoft specific error codes
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
