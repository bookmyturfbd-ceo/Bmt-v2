'use client';
import { useState } from 'react';
import { Trophy, ShieldCheck, Banknote } from 'lucide-react';
import TournamentListTab from './tournaments/TournamentListTab';
import OrganizerListTab from './tournaments/OrganizerListTab';
import OrganizerPayoutPanel from './tournaments/OrganizerPayoutPanel';

type Tab = 'tournaments' | 'organizers' | 'payouts';

export default function TournamentsAdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('tournaments');

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'tournaments', label: 'Tournaments', icon: Trophy },
    { key: 'organizers',  label: 'Organizers',  icon: ShieldCheck },
    { key: 'payouts',     label: 'Payouts',     icon: Banknote },
  ];

  return (
    <div className="flex flex-col h-full gap-5 md:gap-7">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-2xl font-black">Tournament Engine</h2>
          <p className="text-sm md:text-base text-[var(--muted)] mt-0.5 md:mt-1">
            Manage platform-run and organizer-led tournaments, invite organizers, and monitor wallets.
          </p>
        </div>
        <div className="flex bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl p-1 shrink-0">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === key ? 'bg-accent text-black shadow-md' : 'text-[var(--muted)] hover:text-white'}`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-2xl p-5 overflow-y-auto">
        {activeTab === 'tournaments' && <TournamentListTab />}
        {activeTab === 'organizers'  && <OrganizerListTab />}
        {activeTab === 'payouts'     && <OrganizerPayoutPanel />}
      </div>
    </div>
  );
}
