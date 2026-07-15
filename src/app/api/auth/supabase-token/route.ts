import { NextRequest, NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/authHelpers';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secret = process.env.SUPABASE_JWT_SECRET;
    if (!secret) {
      console.warn('SUPABASE_JWT_SECRET is missing from environment variables. Realtime connection will fallback to anon role.');
      return NextResponse.json({ token: null });
    }

    // Create JWT payload
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      role: 'authenticated',
      sub: userId,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 1 week
    };

    const base64UrlEncode = (str: string) =>
      Buffer.from(str).toString('base64url');

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));

    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');

    const token = `${encodedHeader}.${encodedPayload}.${signature}`;

    return NextResponse.json({ token });
  } catch (err: any) {
    console.error('Supabase token generator endpoint failed:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
