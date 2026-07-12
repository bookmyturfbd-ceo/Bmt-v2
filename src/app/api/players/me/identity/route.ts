/**
 * PATCH /api/players/me/identity
 *
 * Owner-only: update public identity fields.
 * Allowed: fullName, avatarUrl, position, preferredFoot, homeAreaId, ageBracket
 * Never touches: walletBalance, password, email, banStatus
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const VALID_POSITIONS = ['GK', 'DEF', 'MID', 'FWD'];
const VALID_FEET = ['L', 'R', 'Both'];
const VALID_BRACKETS = ['U18', '18-24', '25-34', '35+'];

export async function PATCH(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    const body = await req.json();
    const { fullName, avatarUrl, position, preferredFoot, homeAreaId, ageBracket } = body;

    // Build update data — only allow safe public fields
    const data: Record<string, any> = {};

    if (fullName !== undefined) {
      if (typeof fullName !== 'string' || fullName.trim().length < 2) {
        return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
      }
      data.fullName = fullName.trim();
    }

    if (avatarUrl !== undefined) {
      data.avatarUrl = avatarUrl || null;
    }

    if (position !== undefined) {
      if (position !== null && !VALID_POSITIONS.includes(position)) {
        return NextResponse.json({ error: `Position must be one of: ${VALID_POSITIONS.join(', ')}` }, { status: 400 });
      }
      data.position = position || null;
    }

    if (preferredFoot !== undefined) {
      if (preferredFoot !== null && !VALID_FEET.includes(preferredFoot)) {
        return NextResponse.json({ error: `Preferred foot must be one of: ${VALID_FEET.join(', ')}` }, { status: 400 });
      }
      data.preferredFoot = preferredFoot || null;
    }

    if (homeAreaId !== undefined) {
      if (homeAreaId !== null) {
        const city = await prisma.city.findUnique({ where: { id: homeAreaId } });
        if (!city) return NextResponse.json({ error: 'Invalid home area' }, { status: 400 });
      }
      data.homeAreaId = homeAreaId || null;
    }

    if (ageBracket !== undefined) {
      if (ageBracket !== null && !VALID_BRACKETS.includes(ageBracket)) {
        return NextResponse.json({ error: `Age bracket must be one of: ${VALID_BRACKETS.join(', ')}` }, { status: 400 });
      }
      data.ageBracket = ageBracket || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await prisma.player.update({
      where: { id: playerId },
      data,
      select: {
        id: true, fullName: true, avatarUrl: true,
        position: true, preferredFoot: true, ageBracket: true,
        homeArea: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ ok: true, player: updated });
  } catch (err: any) {
    console.error('[identity PATCH]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
