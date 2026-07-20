'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CoachSidebar, { type CoachPage } from '@/components/coach/CoachSidebar';
import CoachHeader from '@/components/coach/CoachHeader';
import CoachProfilePanel from '@/components/coach/CoachProfilePanel';
import CoachServicesPanel from '@/components/coach/CoachServicesPanel';
import CoachTrainingPanel from '@/components/coach/CoachTrainingPanel';
import BookingsPanel from '@/components/owner/BookingsPanel';
import FinancePanel from '@/components/owner/FinancePanel';

function CoachDashboardContent() {
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get('tab') as CoachPage) || 'myProfile';
  const [activePage, setActivePage] = useState<CoachPage>(tabParam);

  useEffect(() => {
    if (tabParam) {
      setActivePage(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    const handleNav = (e: Event) => {
      const customEvent = e as CustomEvent<CoachPage>;
      if (customEvent.detail) {
        setActivePage(customEvent.detail);
      }
    };
    window.addEventListener('bmt_coach_nav', handleNav);
    return () => window.removeEventListener('bmt_coach_nav', handleNav);
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground pb-20 md:pb-0">
      <CoachSidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="flex-1 flex flex-col min-w-0">
        <CoachHeader activePage={activePage} />

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

export default function CoachDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    }>
      <CoachDashboardContent />
    </Suspense>
  );
}
