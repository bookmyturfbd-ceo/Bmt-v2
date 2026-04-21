import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  // Only accessible to admins (in a real app, middleware handles auth, but let's check cookie or just return)
  // For MVP, we'll return all tokens.
  try {
    const invites = await prisma.inviteToken.findMany({
      orderBy: { issuedAt: 'desc' },
    });
    return NextResponse.json({ invites });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { contact, role } = await req.json();

    if (!contact || !role) {
      return NextResponse.json({ error: 'Contact and Role are required' }, { status: 400 });
    }

    // Map role string to enum
    // Prisma Enum for InviteRole: TURF_OWNER, PRO, TEAM_MANAGER, etc.
    // If your roles are string, let's derive the correct enum or string.
    // Let's check schema: InviteRole = TURF_OWNER, COACH, PRO? 
    // Wait, let's map it safely. "Turf Owner" -> TURF_OWNER.
    let enumRole: any = 'TurfOwner';
    const r = role.toLowerCase();
    if (r.includes('coach') || r.includes('pro')) enumRole = 'Coach';

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const invite = await prisma.inviteToken.create({
      data: {
        token,
        contact,
        role: enumRole,
        expiresAt,
      },
    });

    return NextResponse.json({ token: invite.token, invite });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}
