import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const revalidate = 0;

// Helper to get authenticated credentials
function getAuth(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value || null;
  const ownerId = req.cookies.get('bmt_owner_id')?.value || null;
  const role = req.cookies.get('bmt_role')?.value || null;
  return { playerId, ownerId, role };
}

// Helper to generate unique slug
async function generateUniqueSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  let slug = base;
  let counter = 1;
  while (true) {
    const existing = await prisma.academy.findUnique({ where: { slug } });
    if (!existing) break;
    slug = `${base}-${counter}`;
    counter++;
  }
  return slug;
}

// GET /api/academy - Fetch user's managed academy
export async function GET(req: NextRequest) {
  const { playerId, ownerId } = getAuth(req);
  if (!playerId && !ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const academy = await prisma.academy.findFirst({
      where: {
        OR: [
          ...(playerId ? [{ ownerPlayerId: playerId }] : []),
          ...(ownerId ? [{ ownerOwnerId: ownerId }] : [])
        ]
      },
      include: {
        media: { orderBy: { sortOrder: 'asc' } },
        programs: { orderBy: { sortOrder: 'asc' } },
        coaches: { orderBy: { sortOrder: 'asc' } }
      }
    });

    return NextResponse.json(academy);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/academy - Create a new draft academy
export async function POST(req: NextRequest) {
  const { playerId, ownerId } = getAuth(req);
  if (!playerId && !ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, tagline, description, sport, address, area, lat, lng, phone, whatsapp, facebookUrl } = body;

    if (!name || !address || !area || !phone) {
      return NextResponse.json({ error: 'Missing required fields (name, address, area, phone)' }, { status: 400 });
    }

    // Check if user already owns an academy
    const existing = await prisma.academy.findFirst({
      where: {
        OR: [
          ...(playerId ? [{ ownerPlayerId: playerId }] : []),
          ...(ownerId ? [{ ownerOwnerId: ownerId }] : [])
        ]
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'You already own an academy listing' }, { status: 409 });
    }

    const slug = await generateUniqueSlug(name);

    const academy = await prisma.academy.create({
      data: {
        ownerPlayerId: playerId,
        ownerOwnerId: ownerId,
        name,
        slug,
        tagline,
        description,
        sport: Array.isArray(sport) ? sport : [],
        address,
        area,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        phone,
        whatsapp,
        facebookUrl,
        verificationStatus: 'UNVERIFIED',
        status: 'DRAFT',
        featured: false
      }
    });

    return NextResponse.json(academy);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH /api/academy - Update user's academy
export async function PATCH(req: NextRequest) {
  const { playerId, ownerId, role } = getAuth(req);
  if (!playerId && !ownerId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, name, tagline, description, sport, address, area, lat, lng, phone, whatsapp, facebookUrl, status, verificationStatus } = body;

    if (!id) {
      return NextResponse.json({ error: 'Academy ID required' }, { status: 400 });
    }

    // Fetch existing academy and verify ownership
    const academy = await prisma.academy.findUnique({
      where: { id },
      include: { ownerOwner: true }
    });

    if (!academy) {
      return NextResponse.json({ error: 'Academy not found' }, { status: 404 });
    }

    const isPlayerOwner = playerId && academy.ownerPlayerId === playerId;
    const isOwnerOwner = ownerId && academy.ownerOwnerId === ownerId;
    if (!isPlayerOwner && !isOwnerOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updateData: any = {};
    if (name !== undefined) {
      updateData.name = name;
      if (name !== academy.name) {
        updateData.slug = await generateUniqueSlug(name);
      }
    }
    if (tagline !== undefined) updateData.tagline = tagline;
    if (description !== undefined) updateData.description = description;
    if (sport !== undefined) updateData.sport = Array.isArray(sport) ? sport : [];
    if (address !== undefined) updateData.address = address;
    if (area !== undefined) updateData.area = area;
    if (lat !== undefined) updateData.lat = lat ? parseFloat(lat) : null;
    if (lng !== undefined) updateData.lng = lng ? parseFloat(lng) : null;
    if (phone !== undefined) updateData.phone = phone;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
    if (facebookUrl !== undefined) updateData.facebookUrl = facebookUrl;

    // Handle verification request state machine (Sets to PENDING when requested by owner)
    if (verificationStatus === 'PENDING' && academy.verificationStatus === 'UNVERIFIED') {
      updateData.verificationStatus = 'PENDING';
    }

    // Enforce eligibility rules for publishing
    if (status === 'PUBLISHED') {
      const isVerifiedCoach = role === 'coach' || (academy.ownerOwnerId && academy.ownerOwner?.isCoach);
      const isVerifiedAcademy = academy.verificationStatus === 'VERIFIED';
      
      if (!isVerifiedCoach && !isVerifiedAcademy) {
        return NextResponse.json({
          error: 'Publishing requires either a verified coach account or academy verification. Submit for verification review first.'
        }, { status: 403 });
      }
      updateData.status = 'PUBLISHED';
    } else if (status === 'DRAFT') {
      updateData.status = 'DRAFT';
    }

    const updated = await prisma.academy.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
