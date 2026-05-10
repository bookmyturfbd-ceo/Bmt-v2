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

async function getOrganizerId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('org_token')?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.type === 'ORGANIZER' ? decoded.id : null;
}

// PATCH /api/tournaments/[id]/settings
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const organizerId = await getOrganizerId();
    if (!organizerId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { action, registrationOpenAt } = await request.json();

    const tournament = await prisma.tournament.findUnique({
      where: { id },
      select: {
        operatorId:        true,
        registrationOpenAt: true,
        isRegistrationOpen: true,
      },
    });

    if (!tournament) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    if (tournament.operatorId !== organizerId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const countdownElapsed =
      tournament.registrationOpenAt != null &&
      new Date(tournament.registrationOpenAt) <= now;

    let data: Record<string, any> = {};

    if (action === 'open') {
      data.isRegistrationOpen = true;
    } else if (action === 'close') {
      if (countdownElapsed) {
        return NextResponse.json(
          { success: false, error: 'Countdown has already elapsed — registration is permanently open.' },
          { status: 400 }
        );
      }
      data.isRegistrationOpen = false;
    } else if (action === 'setCountdown') {
      if (tournament.registrationOpenAt !== null) {
        return NextResponse.json(
          { success: false, error: 'A countdown has already been set and cannot be changed.' },
          { status: 400 }
        );
      }
      if (!registrationOpenAt) {
        return NextResponse.json({ success: false, error: 'registrationOpenAt is required.' }, { status: 400 });
      }
      const target = new Date(registrationOpenAt);
      if (target <= now) {
        return NextResponse.json({ success: false, error: 'Countdown date must be in the future.' }, { status: 400 });
      }
      data.registrationOpenAt = target;
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const updated = await prisma.tournament.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: updated });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
