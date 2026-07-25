import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function getOwnerId(req: NextRequest): string | null {
  return req.cookies.get('bmt_owner_id')?.value ?? null;
}

export async function GET(req: NextRequest) {
  const ownerId = getOwnerId(req);
  if (!ownerId) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  try {
    const owner = await prisma.owner.findUnique({
      where: { id: ownerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        contactPerson: true,
        isCoach: true,
        avatarUrl: true,
        joinedAt: true,
        walletBalance: true,
      },
    });

    if (!owner) {
      return NextResponse.json({ error: 'Owner profile not found' }, { status: 404 });
    }

    return NextResponse.json({ owner });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch owner profile' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const ownerId = getOwnerId(req);
  if (!ownerId) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, avatarUrl, phone, contactPerson } = body;

    const dataToUpdate: Record<string, any> = {};

    if (name !== undefined && typeof name === 'string' && name.trim()) {
      dataToUpdate.name = name.trim();
    }
    if (avatarUrl !== undefined) {
      dataToUpdate.avatarUrl = avatarUrl || null;
    }
    if (phone !== undefined) {
      dataToUpdate.phone = phone;
    }
    if (contactPerson !== undefined) {
      dataToUpdate.contactPerson = contactPerson || null;
    }

    const updated = await prisma.owner.update({
      where: { id: ownerId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        contactPerson: true,
        isCoach: true,
        avatarUrl: true,
        joinedAt: true,
      },
    });

    return NextResponse.json({ success: true, owner: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update owner profile' }, { status: 500 });
  }
}
