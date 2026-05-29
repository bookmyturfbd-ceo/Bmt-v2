import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Fetch top professionals, optional filter by category (coachType)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') ?? 'ALL'; // 'ALL' | 'COACH' | 'REF' | 'TRAINER'

    const whereClause: any = {
      isCoachProfile: true,
      status: 'published'
    };

    if (category !== 'ALL') {
      whereClause.coachType = category;
    }

    const professionals = await prisma.turf.findMany({
      where: whereClause,
      include: {
        reviews: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    const enriched = professionals.map(pro => {
      const totalReviews = pro.reviews.length;
      const averageRating = totalReviews > 0 ? pro.reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;

      // Score formula: average rating (higher rating is higher on leaderboard)
      // Tie breaker: total review counts
      return {
        id: pro.id,
        name: pro.name,
        area: pro.area || 'BD',
        logoUrl: pro.logoUrl,
        imageUrls: pro.imageUrls,
        coachType: pro.coachType || 'PRO',
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews,
        reviews: pro.reviews,
        score: averageRating
      };
    })
    .sort((a, b) => b.score - a.score || b.totalReviews - a.totalReviews);

    return NextResponse.json({ professionals: enriched });
  } catch (e: any) {
    console.error('[professionals GET]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: Leave rating review for professional using standard Review table
export async function POST(req: NextRequest) {
  try {
    const playerId = req.cookies.get('bmt_player_id')?.value;
    if (!playerId) {
      return NextResponse.json({ error: 'You must be logged in as a player to leave a rating.' }, { status: 401 });
    }

    const { turfId, rating, comment } = await req.json();

    if (!turfId || !rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid professional ID or rating (1-5).' }, { status: 400 });
    }

    // Verify player exists
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { fullName: true }
    });
    if (!player) {
      return NextResponse.json({ error: 'Player account not found.' }, { status: 404 });
    }

    // Verify professional exists
    const pro = await prisma.turf.findFirst({
      where: { id: turfId, isCoachProfile: true }
    });
    if (!pro) {
      return NextResponse.json({ error: 'Professional profile not found.' }, { status: 404 });
    }

    // Add review using standard Turf-Review model
    const review = await prisma.review.create({
      data: {
        turfId,
        playerId,
        playerName: player.fullName,
        rating,
        comment: comment ?? ''
      }
    });

    return NextResponse.json({ success: true, review });
  } catch (e: any) {
    console.error('[professionals POST]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
