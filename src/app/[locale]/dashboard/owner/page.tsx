'use client';
import { useState } from 'react';
import OwnerSidebar, { type OwnerPage } from '@/components/owner/OwnerSidebar';
import OwnerHeader from '@/components/owner/OwnerHeader';
import OwnerStatsGrid from '@/components/owner/OwnerStatsGrid';
import MyTurfsPanel from '@/components/owner/MyTurfsPanel';
import SlotManagerPanel from '@/components/owner/SlotManagerPanel';
import BookingsPanel from '@/components/owner/BookingsPanel';
import FinancePanel from '@/components/owner/FinancePanel';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function OwnerDashboardPage() {
  const t = useTranslations('Owner.slot');
  const [activePage, setActivePage] = useState<OwnerPage>('myTurfs');

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
