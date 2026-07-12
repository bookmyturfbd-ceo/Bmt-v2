import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, password, inviteToken } = body;
    
    if (!name || !email || !password) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Validate invite if provided
    let invite = null;
    if (inviteToken) {
      invite = await prisma.organizerInvite.findUnique({ where: { inviteToken } });
      if (!invite) {
        return NextResponse.json({ success: false, error: 'Invalid invite token' }, { status: 400 });
      }
      if (invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
        return NextResponse.json({ success: false, error: 'Invite token is expired or already used' }, { status: 400 });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create organizer and wallet
    const organizer = await prisma.organizer.create({
      data: {
        name,
        email: normalizedEmail,
        phone: phone || '',
        password: hashedPassword,
        isVerified: true,
        inviteId: invite ? invite.id : null,
        wallet: {
          create: { balance: 0 }
        }
      }
    });

    if (invite) {
      await prisma.organizerInvite.update({
        where: { id: invite.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          organizerUserId: organizer.id
        }
      });
    }

    // Don't return password
    const { password: _, ...safeOrganizer } = organizer;

    return NextResponse.json({ success: true, data: safeOrganizer });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 400 });
    }
    console.error('Error registering organizer:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const organizers = await prisma.organizer.findMany({
      orderBy: { joinedAt: 'desc' },
      include: {
        wallet: true,
        _count: { select: { tournaments: true } },
        tournaments: {
          select: { id: true, name: true, status: true, entryFee: true, maxParticipants: true, _count: { select: { registrations: true } } },
          orderBy: { createdAt: 'desc' },
        },
      }
    });

    const safeOrganizers = organizers.map(org => {
      const { password, ...safe } = org;
      return safe;
    });

    return NextResponse.json({ success: true, data: safeOrganizers });
  } catch (error: any) {
    console.error('Error fetching organizers:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
