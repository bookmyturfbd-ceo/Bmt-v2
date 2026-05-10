import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

  const invite = await prisma.inviteToken.findUnique({
    where: { token },
  });

  if (!invite) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ error: 'Token already used', used: true }, { status: 400 });
  if (new Date() > invite.expiresAt) return NextResponse.json({ error: 'Token expired', expired: true }, { status: 400 });

  return NextResponse.json({
    role: invite.role,
    contact: invite.contact,
  });
}
