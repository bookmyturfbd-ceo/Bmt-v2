import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { cookies } from 'next/headers';

function verifyToken(token: string): any | null {
  try {
    const [data, sig] = token.split('.');
    const secret = process.env.BMT_SECRET || 'bmt_secret_key';
    const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

// GET /api/organizers/me/payouts
// Returns payout records for the logged-in organizer's tournaments
export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('org_token')?.value;
    if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || decoded.type !== 'ORGANIZER') {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const payouts = await prisma.tournamentPayout.findMany({
      where: { organizerId: decoded.id },
      include: {
        tournament: {
          select: { id: true, name: true, entryFee: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by tournament
    const byTournament: Record<string, any> = {};
    for (const p of payouts) {
      if (!byTournament[p.tournamentId]) {
        byTournament[p.tournamentId] = {
          tournament: p.tournament,
          payouts: [],
          totalHolding: 0,
          totalCleared: 0,
        };
      }
      byTournament[p.tournamentId].payouts.push(p);
      if (p.status === 'HOLDING') byTournament[p.tournamentId].totalHolding += p.amount;
      else byTournament[p.tournamentId].totalCleared += p.amount;
    }

    return NextResponse.json({ success: true, data: Object.values(byTournament) });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
