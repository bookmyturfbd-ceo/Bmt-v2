import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { cookies } from 'next/headers';

function verifyToken(token: string): any | null {
  try {
    const [data, sig] = token.split('.');
    const secret = process.env.BMT_SECRET || 'bmt_secret_key';
    const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch { return null; }
}

// GET — list this organizer's recharge requests
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('org_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || decoded.type !== 'ORGANIZER') return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

    const requests = await prisma.organizerRechargeRequest.findMany({
      where: { organizerId: decoded.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ success: true, data: requests });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}

// POST — submit a new recharge request
export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('org_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const decoded = verifyToken(token);
    if (!decoded || decoded.type !== 'ORGANIZER') return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

    const { amount, method, screenshotBase64 } = await req.json();

    if (!amount || amount < 100) {
      return NextResponse.json({ success: false, error: 'Minimum recharge is ৳100' }, { status: 400 });
    }
    if (!method) {
      return NextResponse.json({ success: false, error: 'Payment method required' }, { status: 400 });
    }

    const request = await prisma.organizerRechargeRequest.create({
      data: {
        organizerId: decoded.id,
        amount: Number(amount),
        method,
        screenshotBase64: screenshotBase64 || null,
        status: 'pending',
      },
    });

    return NextResponse.json({ success: true, data: request });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
