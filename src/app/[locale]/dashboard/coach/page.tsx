'use client';
import { useState } from 'react';
import CoachSidebar, { type CoachPage } from '@/components/coach/CoachSidebar';
import OwnerHeader from '@/components/owner/OwnerHeader';
import CoachProfilePanel from '@/components/coach/CoachProfilePanel';
import CoachServicesPanel from '@/components/coach/CoachServicesPanel';
import CoachTrainingPanel from '@/components/coach/CoachTrainingPanel';
import BookingsPanel from '@/components/owner/BookingsPanel';
import FinancePanel from '@/components/owner/FinancePanel';

export default function CoachDashboardPage() {
  const [activePage, setActivePage] = useState<CoachPage>('myProfile');

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <CoachSidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="flex-1 flex flex-col min-w-0">
        <OwnerHeader />

        <main className="flex-1 p-4 md:p-6 flex flex-col gap-6 overflow-y-auto">
          {activePage === 'myProfile' && <CoachProfilePanel />}

          {activePage === 'manageServices' && <CoachServicesPanel />}

          {activePage === 'training' && <CoachTrainingPanel />}

          {activePage === 'bookings' && <BookingsPanel />}

          {activePage === 'finance' && <FinancePanel />}
        </main>
      </div>
    </div>
  );
}
