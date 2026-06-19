import prisma from '@/lib/prisma';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  details?: Record<string, any>;
}

export async function logTournamentEvent(
  tournamentId: string,
  type: string,
  message: string,
  details: Record<string, any> = {}
) {
  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { timeline: true }
    });

    if (!tournament) return;

    const timeline: any[] = Array.isArray(tournament.timeline)
      ? [...tournament.timeline]
      : [];

    const newEvent: TimelineEvent = {
      id: Math.random().toString(36).substring(2, 11),
      timestamp: new Date().toISOString(),
      type,
      message,
      details
    };

    timeline.push(newEvent);

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { timeline: timeline as any }
    });
  } catch (error) {
    console.error('Error logging tournament timeline event:', error);
  }
}
