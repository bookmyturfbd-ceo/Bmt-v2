'use client';
import { useState } from 'react';
import { Trophy, ShieldCheck } from 'lucide-react';
import TournamentListTab from './tournaments/TournamentListTab';
import OrganizerListTab from './tournaments/OrganizerListTab';

export default function TournamentsAdminPanel() {
  const [activeTab, setActiveTab] = useState<'tournaments' | 'organizers'>('tournaments');

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
          <button 
            onClick={() => setActiveTab('tournaments')} 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all \${activeTab === 'tournaments' ? 'bg-accent text-black shadow-md' : 'text-[var(--muted)] hover:text-white'}`}
          >
            <Trophy size={16} />
            Tournaments
          </button>
          <button 
            onClick={() => setActiveTab('organizers')} 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all \${activeTab === 'organizers' ? 'bg-accent text-black shadow-md' : 'text-[var(--muted)] hover:text-white'}`}
          >
            <ShieldCheck size={16} />
            Organizers
          </button>
        </div>
      </div>

      <div className="flex-1 bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-2xl p-5 overflow-hidden flex flex-col">
        {activeTab === 'tournaments' ? <TournamentListTab /> : <OrganizerListTab />}
      </div>
    </div>
  );
}
