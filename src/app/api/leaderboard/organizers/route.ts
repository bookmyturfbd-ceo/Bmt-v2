import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

const REVIEWS_FILE = path.join(process.cwd(), 'bmt-data', 'organizer_reviews.json');

// Helper to read reviews securely
function getReviews() {
  try {
    if (!fs.existsSync(REVIEWS_FILE)) {
      const dir = path.dirname(REVIEWS_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(REVIEWS_FILE, '[]', 'utf8');
      return [];
    }
    const data = fs.readFileSync(REVIEWS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to read organizer reviews:', e);
    return [];
  }
}

// Helper to save reviews securely
function saveReviews(reviews: any[]) {
  try {
    fs.writeFileSync(REVIEWS_FILE, JSON.stringify(reviews, null, 2), 'utf8');
  } catch (e) {
    console.error('Failed to save organizer reviews:', e);
  }
}

// GET: Fetch top organizers based on ratings and completed tournament counts
export async function GET(req: NextRequest) {
  try {
    const organizers = await prisma.organizer.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        joinedAt: true
      }
    });

    // Fetch all completed tournaments managed by organizers
    const tournaments = await prisma.tournament.findMany({
      select: {
        id: true,
        operatorId: true,
        name: true,
        status: true,
        sport: true
      }
    });

    const reviews = getReviews();

    const enriched = organizers.map(org => {
      const orgTourneys = tournaments.filter(t => t.operatorId === org.id);
      const completedCount = orgTourneys.filter(t => t.status === 'COMPLETED').length;

      const orgReviews = reviews.filter((r: any) => r.organizerId === org.id);
      const totalReviews = orgReviews.length;
      const averageRating = totalReviews > 0 ? orgReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviews : 0;

      // Score formula: (average rating * 2) + completed tournaments count
      const score = (averageRating * 2) + completedCount;

      return {
        id: org.id,
        name: org.name,
        email: org.email,
        phone: org.phone,
        joinedAt: org.joinedAt,
        completedCount,
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews,
        reviews: orgReviews.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        score,
        tournaments: orgTourneys
      };
    })
    .sort((a, b) => b.score - a.score || b.completedCount - a.completedCount);

    return NextResponse.json({ organizers: enriched });
  } catch (e: any) {
    console.error('[organizers GET]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST: Add review to organizer's tournaments with security verification
export async function POST(req: NextRequest) {
  try {
    const playerId = req.cookies.get('bmt_player_id')?.value;
    if (!playerId) {
      return NextResponse.json({ error: 'You must be logged in as a player to leave a review.' }, { status: 401 });
    }

    const { organizerId, rating, comment } = await req.json();

    if (!organizerId || !rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid organizer ID or rating (1-5).' }, { status: 400 });
    }

    // 1. Fetch player to save their name
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { fullName: true }
    });
    if (!player) {
      return NextResponse.json({ error: 'Player account not found.' }, { status: 404 });
    }

    // 2. Fetch all tournament IDs managed by this organizer
    const orgTournaments = await prisma.tournament.findMany({
      where: { operatorId: organizerId },
      select: { id: true }
    });
    const orgTournamentIds = orgTournaments.map(t => t.id);

    if (orgTournamentIds.length === 0) {
      return NextResponse.json({ error: 'This organizer has no registered tournaments yet, so they cannot be reviewed.' }, { status: 403 });
    }

    // 3. Get all teams the player belongs to
    const memberships = await prisma.teamMember.findMany({
      where: { playerId },
      select: { teamId: true }
    });
    const playerTeamIds = memberships.map(m => m.teamId);

    // 4. Verify restriction: Check if player or any of their teams is registered in any of these tournaments
    const registration = await prisma.tournamentRegistration.findFirst({
      where: {
        tournamentId: { in: orgTournamentIds },
        entityId: { in: [playerId, ...playerTeamIds] }
      }
    });

    if (!registration) {
      return NextResponse.json({
        error: 'Only players or teams registered in this organizer\'s tournaments can submit a review.'
      }, { status: 403 });
    }

    // 5. Save the review to JSON store
    const reviews = getReviews();
    
    // Check if player already reviewed this organizer to prevent duplicates
    const existingIdx = reviews.findIndex((r: any) => r.organizerId === organizerId && r.playerId === playerId);
    const newReview = {
      id: 'rev-' + Math.random().toString(36).slice(2, 11),
      organizerId,
      playerId,
      playerName: player.fullName,
      rating,
      comment: comment ?? '',
      createdAt: new Date().toISOString()
    };

    if (existingIdx !== -1) {
      reviews[existingIdx] = newReview; // update existing
    } else {
      reviews.push(newReview); // add new
    }

    saveReviews(reviews);

    return NextResponse.json({ success: true, review: newReview });
  } catch (e: any) {
    console.error('[organizers POST]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
