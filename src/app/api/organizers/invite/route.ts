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

    // Cancel any existing PENDING invites for this contact before creating a new one
    await prisma.organizerInvite.updateMany({
      where: { emailOrPhone, status: 'PENDING' },
      data: { status: 'CANCELLED' }
    });

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
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') || host.startsWith('100.') ? 'http' : 'https';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;
    const inviteUrl = `${baseUrl}/organizer-signup/${inviteToken}`;

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
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, data: invites });
  } catch (error: any) {
    console.error('Error fetching invites:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }
    await prisma.organizerInvite.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
