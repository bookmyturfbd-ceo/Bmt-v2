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

    // Update the live score inside the resultSummary JSON
    const currentSummary = (match.resultSummary as Record<string, any>) || {};
    let events = currentSummary.events || [];
    
    let goalsA = currentSummary.goalsA ?? 0;
    let goalsB = currentSummary.goalsB ?? 0;
    
    let runsA = currentSummary.runsA ?? 0;
    let wicketsA = currentSummary.wicketsA ?? 0;
    let runsB = currentSummary.runsB ?? 0;
    let wicketsB = currentSummary.wicketsB ?? 0;
    let battingTeamId = currentSummary.battingTeamId || match.teamAId;

    if (body.action === 'delete') {
      const { eventId } = body;
      const eventToDelete = events.find((e: any) => e.id === eventId);
      if (eventToDelete) {
        events = events.filter((e: any) => e.id !== eventId);
        if (match.tournament.sport === 'FOOTBALL') {
          if (eventToDelete.type === 'goal') {
            if (eventToDelete.teamId === match.teamAId) {
              goalsA = Math.max(0, goalsA - 1);
            } else if (eventToDelete.teamId === match.teamBId) {
              goalsB = Math.max(0, goalsB - 1);
            }
          }
        }
      }
    } else {
      const newEvent = {
        id: body.id || Math.random().toString(36).substring(2, 9),
        ...body,
        createdAt: new Date().toISOString()
      };
      events = [...events, newEvent];

      if (match.tournament.sport === 'FOOTBALL') {
        if (body.type === 'goal') {
          if (body.teamId === match.teamAId) {
            goalsA += 1;
          } else if (body.teamId === match.teamBId) {
            goalsB += 1;
          }
        }
      } else if (match.tournament.sport === 'CRICKET') {
        if (body.type === 'run') {
          const targetTeam = body.teamId || battingTeamId;
          if (targetTeam === match.teamAId) {
            runsA += body.runs || 1;
          } else {
            runsB += body.runs || 1;
          }
        } else if (body.type === 'wicket') {
          const targetTeam = body.teamId || battingTeamId;
          if (targetTeam === match.teamAId) {
            wicketsA += 1;
            if (wicketsA >= 10) {
              battingTeamId = match.teamBId; // Auto switch batting team when all out
            }
          } else {
            wicketsB += 1;
          }
        }
      }
    }

    const newSummary = {
      ...currentSummary,
      events,
      goalsA,
      goalsB,
      runsA,
      wicketsA,
      runsB,
      wicketsB,
      battingTeamId,
      lastEvent: body,
      updatedAt: new Date().toISOString()
    };

    const updatedMatch = await prisma.tournamentMatch.update({
      where: { id },
      data: { resultSummary: newSummary }
    });

    // Broadcast live event via Supabase
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
