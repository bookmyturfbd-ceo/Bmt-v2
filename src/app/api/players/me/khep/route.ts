/**
 * PUT /api/players/me/khep
 *
 * Toggle Khep availability for the logged-in player.
 *
 * KHEP_MARKET_HOOK: This stores supply-side availability.
 * The search/marketplace UI is a future feature — this endpoint is the data layer.
 *
 * Body: { available: boolean, positions: string[], areas: string[] }
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    const body = await req.json();
    const { available, positions = [], areas = [] } = body as {
      available: boolean;
      positions: string[];
      areas: string[];
    };

    if (typeof available !== 'boolean') {
      return NextResponse.json({ error: 'available must be a boolean' }, { status: 400 });
    }

    const khep = await prisma.khepAvailability.upsert({
      where: { playerId },
      create: { playerId, available, positions, areas },
      update: { available, positions, areas },
    });

    return NextResponse.json({ ok: true, khep });
  } catch (err: any) {
    console.error('[khep PUT]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET: return current Khep status for the logged-in player
export async function GET(req: NextRequest) {
  const playerId = req.cookies.get('bmt_player_id')?.value;
  if (!playerId) return NextResponse.json({ error: 'Not logged in' }, { status: 401 });

  try {
    const khep = await prisma.khepAvailability.findUnique({
      where: { playerId },
    });
    return NextResponse.json({ khep: khep ?? { available: false, positions: [], areas: [] } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
