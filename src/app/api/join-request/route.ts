import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, name, phone, email, location, message } = body;

    if (!type || !name || !phone || !location) {
      return NextResponse.json({ error: 'Name, phone and location are required.' }, { status: 400 });
    }

    if (!['TURF_OWNER', 'PROFESSIONAL', 'COACH'].includes(type)) {
      return NextResponse.json({ error: 'Invalid request type.' }, { status: 400 });
    }

    const request = await prisma.joinRequest.create({
      data: {
        type,
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        location: location.trim(),
        message: message?.trim() || null,
      },
    });

    return NextResponse.json({ ok: true, id: request.id });
  } catch (err) {
    console.error('[join-request POST]', err);
    return NextResponse.json({ error: 'Failed to submit request.' }, { status: 500 });
  }
}
