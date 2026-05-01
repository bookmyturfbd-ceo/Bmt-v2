import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { chargeMatchFee } from '@/lib/tournament/billing';
import { supabase } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // We should validate token here ideally, or assume middleware does it.
    // For this implementation, we accept the event data.
    // Format is similar to the existing MatchEvent structure, but adapted for tournament
    
    const match = await prisma.tournamentMatch.findUnique({
      where: { id },
      include: { tournament: true }
    });

    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    if (match.status === 'COMPLETED' || match.status === 'CANCELLED') {
      return NextResponse.json({ success: false, error: 'Match is already finished' }, { status: 400 });
    }

    // If this is the first event, transition to LIVE and charge the organizer
    if (match.status !== 'LIVE') {
      const billing = await chargeMatchFee(match.tournamentId, match.id);
      if (!billing.ok) {
        return NextResponse.json({ success: false, error: `Cannot start match: ${billing.reason}` }, { status: 402 });
      }

      await prisma.tournamentMatch.update({
        where: { id },
        data: { status: 'LIVE' }
      });
      
      // Update tournament to ACTIVE if it wasn't already
      if (match.tournament.status !== 'ACTIVE') {
        await prisma.tournament.update({
          where: { id: match.tournamentId },
          data: { status: 'ACTIVE' }
        });
      }
    }

    // Now log the event. Since the actual event structure is very specific to the sport,
    // we'll store it dynamically in the resultSummary for now, or create formal MatchEvent entries 
    // if we map directly to the existing MatchEvent table.
    
    // In a full implementation we would insert to CricketDelivery or MatchEvent.
    // For now we simulate an update to resultSummary to represent state progression.

    const newSummary = {
      ...(match.resultSummary as Record<string, any> || {}),
      lastEvent: body,
      updatedAt: new Date().toISOString()
    };

    const updatedMatch = await prisma.tournamentMatch.update({
      where: { id },
      data: { resultSummary: newSummary }
    });

    // Broadcast event via Supabase (pseudo-code using standard broadcast)
    try {
      await supabase
        .channel(`tournament:match:${id}`)
        .send({
          type: 'broadcast',
          event: 'match:event_logged',
          payload: { matchId: id, event: body, updatedState: newSummary }
        });
    } catch (e) {
      console.warn('Supabase broadcast failed:', e);
    }

    return NextResponse.json({ success: true, data: updatedMatch });
  } catch (error: any) {
    console.error('Error logging event:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
