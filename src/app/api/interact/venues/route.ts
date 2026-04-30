import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/interact/venues?sport=FUTSAL_5&date=2026-04-20
 * Returns all active turfs with available slots for the given date.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sport = searchParams.get('sport') || '';
  const date  = searchParams.get('date')  || '';


  try {

    // Fetch ALL published turfs with their slots
    const turfs = await prisma.turf.findMany({
      where: {
        status: 'published',
      },
      select: {
        id: true,
        name: true,
        area: true,
        imageUrls: true,
        logoUrl: true,
        city:     { select: { name: true } },
        division: { select: { name: true } },
        sports:   { select: { sport: { select: { name: true } } } },
        grounds: {
          select: {
            id: true,
            name: true,
            slots: {
              select: {
                id: true,
                startTime: true,
                endTime: true,
                price: true,
                days: true,
                timeCategory: true,
                status: true,
              },
              orderBy: { startTime: 'asc' },
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    /**
     * Sport category groupings used for turf matching.
     *
     * Logic:
     *  - If a turf has NO sports configured → show it for every query (fallback).
     *  - If a turf HAS sports → at least one sport name must satisfy the match function.
     *
     * For FULL variants (FOOTBALL_FULL, CRICKET_FULL) we prefer turfs that explicitly
     * include the word "full" in one of their sport names.  For side-count variants
     * (FUTSAL_5/6/7, CRICKET_7) we just check the general category keyword.
     */
    type MatchFn = (sportNames: string[]) => boolean;
    const sportMatchFnMap: Record<string, MatchFn> = {
      FUTSAL_5:      (names) => names.some(n => n.includes('football') || n.includes('futsal') || n.includes('soccer')),
      FUTSAL_6:      (names) => names.some(n => n.includes('football') || n.includes('futsal') || n.includes('soccer')),
      FUTSAL_7:      (names) => names.some(n => n.includes('football') || n.includes('futsal') || n.includes('soccer')),
      CRICKET_7:     (names) => names.some(n => n.includes('cricket')),
      FOOTBALL_FULL: (names) => names.some(n => n.includes('football')),
      CRICKET_FULL:  (names) => names.some(n => n.includes('cricket')),
    };
    const matchFn = sportMatchFnMap[sport];

    const sportFiltered = matchFn
      ? turfs.filter(t => {
          // Turf has no sports configured → show as generic venue for everyone
          if (!t.sports.length) return true;
          const sportNames = t.sports.map(ts => ts.sport.name.toLowerCase());
          return matchFn(sportNames);
        })
      : turfs;


    // For each turf, compute available slots for the requested date
    const dateObj = date ? new Date(date) : null;
    const dayOfWeek = dateObj
      ? dateObj.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() // 'monday' etc.
      : null;

    // Fetch existing bookings for this date in one query (all slot IDs)
    const allSlotIds = sportFiltered.flatMap(t => t.grounds.flatMap(g => g.slots.map(s => s.id)));
    const bookedSlotIds = new Set<string>();
    if (date && allSlotIds.length > 0) {
      const bookings = await prisma.booking.findMany({
        where: {
          slotId: { in: allSlotIds },
          date,
          status: { notIn: ['cancelled'] },
        },
        select: { slotId: true }
      });
      bookings.forEach((b: any) => { if (b.slotId) bookedSlotIds.add(b.slotId); });
    }

    const TC_ORDER: Record<string, number> = { Morning: 0, Afternoon: 1, Evening: 2, Night: 3 };

    const result = sportFiltered.map(turf => {
      const allSlots: any[] = [];
      turf.grounds.forEach(ground => {
        ground.slots.forEach(slot => {
          // Skip slots that are permanently unavailable (blocked by admin)
          if (slot.status === 'blocked') return;

          const dayMatch = !dayOfWeek || !slot.days.length ||
            slot.days.some((d: string) => d.toLowerCase().startsWith(dayOfWeek!.slice(0, 3)));
          if (!dayMatch) return; // Skip slots not offered on this weekday

          const isBookedByBooking = bookedSlotIds.has(slot.id);
          const isBookedByStatus  = slot.status === 'booked';
          const isBooked = isBookedByBooking || isBookedByStatus;

          allSlots.push({
            id:           slot.id,
            groundId:     ground.id,
            groundName:   ground.name,
            startTime:    slot.startTime,
            endTime:      slot.endTime,
            price:        slot.price,
            timeCategory: slot.timeCategory,
            status:       isBooked ? 'booked' : (slot.status === 'walkin' ? 'walkin' : 'available'),
          });
        });
      });

      // Sort: Morning → Afternoon → Evening → Night, then startTime
      allSlots.sort((a, b) => {
        const tA = TC_ORDER[a.timeCategory] ?? 9;
        const tB = TC_ORDER[b.timeCategory] ?? 9;
        if (tA !== tB) return tA - tB;
        return a.startTime.localeCompare(b.startTime);
      });

      return {
        id:             turf.id,
        name:           turf.name,
        area:           turf.area,
        city:           turf.city?.name || '',
        division:       turf.division?.name || '',
        imageUrls:      (turf as any).imageUrls || [],
        logoUrl:        (turf as any).logoUrl || null,
        availableSlots: allSlots,          // key kept for backward compat
        totalSlots:     allSlots.length,
        availableCount: allSlots.filter(s => s.status !== 'booked').length,
      };
    });

    // Only show turfs that have at least 1 slot on this day (when a date is given)
    const filtered = date ? result.filter(t => t.totalSlots > 0) : result;

    return NextResponse.json({ turfs: filtered });
  } catch (e: any) {
    console.error('[venues API]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
