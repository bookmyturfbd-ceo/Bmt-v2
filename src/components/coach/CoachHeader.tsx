'use client';

import { useState, useEffect } from 'react';
import { getCookie } from '@/lib/cookies';
import ThemeToggle from '@/components/ui/ThemeToggle';
import NotificationCenter from '@/components/layout/NotificationCenter';
import { ProfileModal } from '@/components/owner/OwnerHeader';
import type { CoachPage } from './CoachSidebar';

interface CoachHeaderProps {
  activePage?: CoachPage;
}

const PAGE_TITLES: Record<CoachPage, { title: string; subtitle: string }> = {
  myProfile:      { title: 'My Profile',             subtitle: 'Professional Workspace' },
  manageServices: { title: 'My Services',            subtitle: 'Professional Services & Offerings' },
  training:       { title: 'Training & Attendance', subtitle: 'Session Logs & Player Tracker' },
  bookings:       { title: 'Client Bookings',        subtitle: 'Sessions & Training Requests' },
  finance:        { title: 'Earnings & Payouts',     subtitle: 'Financial Ledger & Revenue' },
  settings:       { title: 'Settings',               subtitle: 'Account Preferences' },
};

export default function CoachHeader({ activePage = 'myProfile' }: CoachHeaderProps) {
  const [showProfile, setShowProfile] = useState(false);
  const [ownerName, setOwnerName]     = useState('Pro Coach');
  const [initials, setInitials]       = useState('PC');

  useEffect(() => {
    const name = getCookie('bmt_name') || getCookie('bmt_owner_name') || 'Pro Coach';
    setOwnerName(name);
    setInitials(name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'PC');
  }, []);

  const titleInfo = PAGE_TITLES[activePage] || { title: 'Professional Dashboard', subtitle: 'Pro Workspace' };

  return (
    <>
      <header className="sticky top-0 z-40 glass-panel border-b border-[var(--panel-border)] px-5 py-3 flex items-center justify-between gap-4">
        <div className="ml-10 md:ml-0 flex flex-col leading-none">
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 font-mono">
            {titleInfo.subtitle}
          </span>
          <h1 className="text-base font-black tracking-tight text-white mt-0.5">
            {titleInfo.title}
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <NotificationCenter />

          {/* Coach / Pro profile avatar */}
          <button
            onClick={() => setShowProfile(s => !s)}
            className="flex items-center gap-2 glass-panel rounded-xl px-2.5 py-1.5 hover:border-blue-500/30 transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-black text-blue-400">{initials}</span>
            </div>
            <div className="hidden sm:flex flex-col leading-none text-left">
              <span className="text-[11px] font-black text-foreground">{ownerName}</span>
              <span className="text-[9px] text-blue-400 font-bold uppercase tracking-widest">Professional</span>
            </div>
          </button>
        </div>
      </header>

      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
}
