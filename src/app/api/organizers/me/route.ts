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
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('org_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.type !== 'ORGANIZER') {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const organizer = await prisma.organizer.findUnique({
      where: { id: decoded.id },
      include: {
        wallet: {
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 50,
            }
          }
        },

        tournaments: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { registrations: true, matches: true } }
          }
        }
      }
    });

    if (!organizer) {
      return NextResponse.json({ success: false, error: 'Organizer not found' }, { status: 404 });
    }

    const { password: _, ...safeOrg } = organizer;
    return NextResponse.json({ success: true, data: safeOrg });
  } catch (error: any) {
    console.error('Organizer auth error:', error);
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
}
