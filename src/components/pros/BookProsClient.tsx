'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserCircle, MapPin, Search, ShieldCheck, Dumbbell, ChevronRight } from 'lucide-react';

interface Turf {
  id: string;
  name: string;
  status: string;
  cityId: string;
  divisionId: string;
  area?: string | null;
  imageUrls: string[];
  isCoachProfile: boolean;
  coachType?: string | null;
  professions?: string[];
  displayOrder?: number;
}

interface City { id: string; name: string; divisionId: string; }
interface Division { id: string; name: string; }

interface BookProsClientProps {
  coaches: Turf[];
  cities: City[];
  divisions: Division[];
  professions: string[];
}

export default function BookProsClient({ coaches, cities, divisions, professions }: BookProsClientProps) {
  const [selectedProfession, setSelectedProfession] = useState<string>('ALL');
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCoaches = coaches.filter(c => {
    // Profession filter
    if (selectedProfession !== 'ALL') {
      const matchCoachType = c.coachType?.toLowerCase() === selectedProfession.toLowerCase();
      const matchProfessions = Array.isArray(c.professions) && c.professions.some(p => p.toLowerCase() === selectedProfession.toLowerCase());
      if (!matchCoachType && !matchProfessions) return false;
    }
    // Division filter
    if (selectedDivision !== 'ALL' && c.divisionId !== selectedDivision) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = c.name.toLowerCase().includes(q);
      const typeMatch = c.coachType?.toLowerCase()?.includes(q);
      const areaMatch = c.area?.toLowerCase()?.includes(q);
      if (!nameMatch && !typeMatch && !areaMatch) return false;
    }
    return true;
  });

  const getCityName = (cityId: string) => cities.find(c => c.id === cityId)?.name || '';

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-6 px-4 sm:px-6 md:px-8 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="relative rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border border-[var(--panel-border)] p-6 sm:p-10 mb-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-black tracking-widest uppercase mb-3">
              <ShieldCheck size={13} /> Verified Professionals
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Book Certified Coaches & Experts
            </h1>
            <p className="text-sm text-[var(--muted)] mt-2 max-w-xl leading-relaxed">
              Find top-tier coaches, trainers, referees, and physios. Book 1-on-1 private training sessions or monthly coaching packages seamlessly.
            </p>
          </div>

          <div className="flex flex-col gap-3 shrink-0">
            <div className="relative min-w-[260px]">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Search coach name, specialty…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-2xl pl-10 pr-4 py-3 text-sm font-bold outline-none focus:border-blue-500/50 text-white placeholder:text-[var(--muted)]"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Profession Filters */}
        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-3">
          <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Filter by Profession</label>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedProfession('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 transition-all border ${
                selectedProfession === 'ALL'
                  ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                  : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:text-white'
              }`}
            >
              All Professions ({coaches.length})
            </button>
            {professions.map(prof => (
              <button
                key={prof}
                onClick={() => setSelectedProfession(prof)}
                className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all border ${
                  selectedProfession.toLowerCase() === prof.toLowerCase()
                    ? 'bg-blue-500 text-white border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)] font-black'
                    : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:text-white'
                }`}
              >
                {prof}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Coaches Grid */}
      {filteredCoaches.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center gap-4 glass-panel rounded-3xl border border-[var(--panel-border)]">
          <Dumbbell size={36} className="text-blue-500/40" />
          <div>
            <h3 className="text-lg font-black text-white">No Professionals Found</h3>
            <p className="text-xs text-[var(--muted)] mt-1 max-w-sm">
              No published coaches match your current search or profession filters.
            </p>
          </div>
          <button
            onClick={() => { setSelectedProfession('ALL'); setSelectedDivision('ALL'); setSearchQuery(''); }}
            className="text-xs font-black text-blue-400 uppercase tracking-widest hover:underline"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCoaches.map(coach => (
            <Link
              key={coach.id}
              href={`/turf/${coach.id}`}
              className="group glass-panel rounded-3xl border border-[var(--panel-border)] hover:border-blue-500/40 p-5 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 shadow-lg relative overflow-hidden"
            >
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-blue-500 to-cyan-400 shrink-0">
                    <div className="w-full h-full rounded-full bg-neutral-950 overflow-hidden flex items-center justify-center">
                      {coach.imageUrls?.[0] ? (
                        <img src={coach.imageUrls[0]} alt={coach.name} className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle size={32} className="text-blue-500 opacity-50" />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-base text-white truncate group-hover:text-blue-400 transition-colors">
                      {coach.name}
                    </h3>
                    <p className="text-xs font-bold text-blue-400 tracking-wider uppercase truncate mt-0.5">
                      {coach.coachType || 'Professional'}
                    </p>
                    <p className="text-[11px] text-[var(--muted)] flex items-center gap-1 mt-1 truncate">
                      <MapPin size={10} className="text-blue-500/70 shrink-0" />
                      <span>{coach.area ? `${coach.area}, ` : ''}{getCityName(coach.cityId)}</span>
                    </p>
                  </div>
                </div>

                {/* Professions tags */}
                {Array.isArray(coach.professions) && coach.professions.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mb-4">
                    {coach.professions.slice(0, 3).map(p => (
                      <span key={p} className="text-[9px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-[var(--panel-border)] flex items-center justify-between mt-2">
                <span className="text-xs font-black text-white group-hover:text-blue-400 transition-colors flex items-center gap-1">
                  View Sessions <ChevronRight size={14} />
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-xl">
                  Book Pro
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
