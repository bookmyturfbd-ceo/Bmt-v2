import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Clean phone number (keep only digits)
    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length < 11) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    const apiKey = process.env.STEADFAST_API_KEY;
    const secretKey = process.env.STEADFAST_SECRET_KEY;
    const baseUrl = process.env.STEADFAST_BASE_URL || 'https://portal.steadfast.com.bd/api/v1';

    if (!apiKey || !secretKey) {
      return NextResponse.json({ error: 'Steadfast credentials are not configured' }, { status: 500 });
    }

    const response = await fetch(`${baseUrl}/fraud_check/${cleanedPhone}`, {
      method: 'GET',
      headers: {
        'Api-Key': apiKey,
        'Secret-Key': secretKey,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Steadfast API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Steadfast Fraud Check Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
