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
    const baseUrl = process.env.STEADFAST_BASE_URL || 'https://portal.packzy.com/api/v1';

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

    // Parse data safely
    let data;
    try {
      data = await response.json();
    } catch (parseErr) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Steadfast API returned non-JSON response: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    // Return response directly (even if error status like 403/400) so browser gets the message
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Steadfast Fraud Check Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
