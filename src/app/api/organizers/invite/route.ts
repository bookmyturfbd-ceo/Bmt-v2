import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { emailOrPhone, invitedBy } = body;
    
    if (!emailOrPhone || !invitedBy) {
      return NextResponse.json({ success: false, error: 'emailOrPhone and invitedBy are required' }, { status: 400 });
    }

    // Check if organizer already exists
    const existingOrg = await prisma.organizer.findFirst({
      where: { 
        OR: [
          { email: emailOrPhone },
          { phone: emailOrPhone }
        ]
      }
    });

    if (existingOrg) {
      return NextResponse.json({ success: false, error: 'An organizer with this contact already exists' }, { status: 400 });
    }

    const inviteToken = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invite = await prisma.organizerInvite.create({
      data: {
        invitedBy,
        emailOrPhone,
        inviteToken,
        expiresAt,
        status: 'PENDING'
      }
    });

    // In a real app, send an email/SMS here
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = `\${baseUrl}/organizer-signup/\${inviteToken}`;

    return NextResponse.json({ 
      success: true, 
      message: 'Invite created',
      data: { invite, inviteUrl } 
    });
  } catch (error: any) {
    console.error('Error creating invite:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const invites = await prisma.organizerInvite.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, data: invites });
  } catch (error: any) {
    console.error('Error fetching invites:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
