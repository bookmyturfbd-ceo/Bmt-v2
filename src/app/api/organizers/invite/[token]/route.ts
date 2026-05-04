import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invite = await prisma.organizerInvite.findUnique({
      where: { inviteToken: token },
    });

    if (!invite) {
      return NextResponse.json({ success: false, error: 'Invite not found.' }, { status: 404 });
    }

    if (invite.status !== 'PENDING') {
      return NextResponse.json({ success: false, error: 'This invite has already been used.' }, { status: 400 });
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: 'This invite link has expired. Contact BMT Support.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: invite });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
