'use client';
import { useState, useEffect } from 'react';
import OwnerSidebar, { type OwnerPage } from '@/components/owner/OwnerSidebar';
import OwnerHeader from '@/components/owner/OwnerHeader';
import OwnerStatsGrid from '@/components/owner/OwnerStatsGrid';
import MyTurfsPanel from '@/components/owner/MyTurfsPanel';
import SlotManagerPanel from '@/components/owner/SlotManagerPanel';
import BookingsPanel from '@/components/owner/BookingsPanel';
import FinancePanel from '@/components/owner/FinancePanel';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getCookie } from '@/lib/cookies';

export default function OwnerDashboardPage() {
  const t = useTranslations('Owner.slot');
  const [activePage, setActivePage] = useState<OwnerPage>('myTurfs');

  // ── Web Audio Chime Sound Helper ──
  const playNotificationSound = () => {
    if (typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.15, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = ctx.currentTime;
      playTone(523.25, now, 0.3); // C5
      playTone(659.25, now + 0.15, 0.4); // E5
    } catch (e) {
      console.error('Failed to play notification sound:', e);
    }
  };

  // ── Browser Notification System for New Bookings ──
  useEffect(() => {
    const ownerId = getCookie('bmt_owner_id');
    if (!ownerId) return;

    // Request notification permission on mount
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    const knownBookingIds = new Set<string>();
    let myTurfIds = new Set<string>();
    let isFirstLoad = true;
    let pollInterval: NodeJS.Timeout;

    async function initAndPoll() {
      try {
        // 1. Fetch Owner's Turfs
        const turfsRes = await fetch('/api/bmt/turfs');
        if (!turfsRes.ok) return;
        const turfs = await turfsRes.json();
        const myTurfs = Array.isArray(turfs) ? turfs.filter((t: any) => t.ownerId === ownerId) : [];
        myTurfIds = new Set(myTurfs.map((t: any) => t.id));

        if (myTurfIds.size === 0) return;

        // 2. Poll function
        const checkBookings = async () => {
          try {
            const bookingsRes = await fetch('/api/bmt/bookings');
            if (!bookingsRes.ok) return;
            const bookings = await bookingsRes.json();
            if (!Array.isArray(bookings)) return;

            // Filter bookings for this owner's turfs
            const myBookings = bookings.filter((b: any) => {
              const turfId = b.turfId || b.slot?.turfId;
              return turfId && myTurfIds.has(turfId);
            });

            if (isFirstLoad) {
              // Populate initial bookings so we only notify on new ones
              myBookings.forEach((b: any) => knownBookingIds.add(b.id));
              isFirstLoad = false;
              return;
            }

            let foundNew = false;
            // Find new bookings
            for (const b of myBookings) {
              if (!knownBookingIds.has(b.id)) {
                knownBookingIds.add(b.id);
                foundNew = true;

                // Show browser notification
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  const turf = turfs.find((t: any) => t.id === b.turfId || t.id === b.slot?.turfId);
                  const turfName = turf ? turf.name : 'your turf';
                  const groundName = b.slot?.ground?.name || 'Pitch';
                  const playerName = b.player?.fullName || 'A player';
                  const price = b.price || 0;
                  const time = b.slot ? `${b.slot.startTime} - ${b.slot.endTime}` : '';

                  new Notification('New Booking Received! ⚽🏏', {
                    body: `${playerName} booked ${turfName} (${groundName}) on ${b.date} at ${time} for ৳${price}`,
                    icon: '/favicon.ico',
                  });
                }
              }
            }

            if (foundNew) {
              playNotificationSound();
            }
          } catch (err) {
            console.error('Error polling bookings for notifications:', err);
          }
        };

        // Initial check
        await checkBookings();

        // Start polling every 15 seconds
        pollInterval = setInterval(checkBookings, 15000);
      } catch (err) {
        console.error('Error initializing notifications:', err);
      }
    }

    initAndPoll();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <OwnerSidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="flex-1 flex flex-col min-w-0">
        <OwnerHeader />

        <main className="flex-1 p-4 md:p-6 flex flex-col gap-6 overflow-y-auto">
          {activePage === 'myTurfs' && <MyTurfsPanel />}

          {activePage === 'bookings' && <BookingsPanel />}

          {activePage === 'manageSlots' && <SlotManagerPanel />}

          {(activePage === 'finance') && <FinancePanel />}

          {(activePage === 'settings') && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-4xl mb-3">⚙️</p>
                <h3 className="text-lg font-black capitalize">Settings</h3>
                <p className="text-sm text-[var(--muted)] mt-1">Coming soon.</p>
              </div>
            </div>
          )}
        </main>
      </div>


    </div>
  );
}
