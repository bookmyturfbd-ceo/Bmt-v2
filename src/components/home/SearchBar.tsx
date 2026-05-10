'use client';
import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, MapPin, X } from 'lucide-react';
import { useLocale } from 'next-intl';

interface Turf  { id: string; name: string; area?: string; sportIds: string[]; }
interface Sport { id: string; name: string; }

const SPORT_EMOJI: Record<string, string> = {
  default: '🏟', futsal: '⚽', football: '⚽', cricket: '🏏',
  badminton: '🏸', basketball: '🏀', tennis: '🎾', swimming: '🏊',
  billiard: '🎱', snooker: '🎱', volleyball: '🏐', rugby: '🏉',
};
function sportEmoji(name: string) {
  const l = name.toLowerCase();
  for (const [k, v] of Object.entries(SPORT_EMOJI)) if (l.includes(k)) return v;
  return SPORT_EMOJI.default;
}

export default function SearchBar({
  turfs = [],
  sports = [],
}: {
  turfs?: Turf[];
  sports?: Sport[];
}) {
  const locale = useLocale();
  const [query,          setQuery]          = useState('');
  const [selectedSport,  setSelectedSport]  = useState<Sport | null>(null);
  const [sportOpen,      setSportOpen]      = useState(false);
  const [resultsOpen,    setResultsOpen]    = useState(false);
  const wrapRef  = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setSportOpen(false);
        setResultsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filtered results
  const results = turfs.filter(t => {
    const matchName  = !query || t.name.toLowerCase().includes(query.toLowerCase());
    const matchSport = !selectedSport || t.sportIds.includes(selectedSport.id);
    return matchName && matchSport;
  }).slice(0, 8); // max 8 results

  const showResults = resultsOpen && (query.length > 0 || selectedSport !== null);

  const getSportName = (t: Turf) => {
    if (t.sportIds.length === 0) return null;
    if (t.sportIds.length === 1) return sports.find(s => s.id === t.sportIds[0])?.name;
    return 'Multisports';
  };

  const clear = () => {
    setQuery('');
    setSelectedSport(null);
    setResultsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <section className="px-4 py-3" ref={wrapRef}>
      {/* ── Main bar ── */}
      <div className="relative flex items-center gap-2">

        {/* Text input */}
        <div className="flex-1 relative flex items-center h-13 bg-[var(--panel-bg)] rounded-2xl border border-[var(--panel-border)] shadow-sm px-4 gap-2 focus-within:border-accent/40 transition-colors">
          <Search size={16} className="text-[var(--muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setResultsOpen(true); }}
            onFocus={() => setResultsOpen(true)}
            placeholder="Search turfs by name…"
            className="flex-1 bg-transparent outline-none text-foreground text-sm font-medium placeholder:text-[var(--muted)] py-3.5"
          />
          {(query || selectedSport) && (
            <button onClick={clear} className="shrink-0 hover:text-foreground text-[var(--muted)] transition-colors">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sport dropdown trigger */}
        <button
          onClick={() => { setSportOpen(o => !o); setResultsOpen(false); }}
          className={`shrink-0 h-13 px-4 py-3.5 flex items-center gap-2 rounded-2xl border transition-all text-sm font-bold ${
            selectedSport
              ? 'bg-accent text-black border-accent shadow-[0_0_12px_rgba(0,255,65,0.25)]'
              : 'bg-[var(--panel-bg)] border-[var(--panel-border)] text-[var(--muted)] hover:border-accent/40'
          }`}
        >
          <span>{selectedSport ? sportEmoji(selectedSport.name) : '🏟'}</span>
          <span className="hidden sm:inline max-w-[80px] truncate">
            {selectedSport ? selectedSport.name : 'Sport'}
          </span>
          <ChevronDown size={13} className={`transition-transform ${sportOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* ── Sport dropdown ── */}
      {sportOpen && sports.length > 0 && (
        <div className="absolute z-50 mt-2 w-56 glass-panel rounded-2xl border border-[var(--panel-border)] shadow-2xl overflow-hidden">
          {/* All option */}
          <button
            onClick={() => { setSelectedSport(null); setSportOpen(false); setResultsOpen(true); }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors hover:bg-accent/5 ${!selectedSport ? 'text-accent' : 'text-foreground'}`}
          >
            <span>🏟</span> All Sports
          </button>
          <div className="h-px bg-[var(--panel-border)] mx-3" />
          {sports.map(sport => (
            <button
              key={sport.id}
              onClick={() => { setSelectedSport(sport); setSportOpen(false); setResultsOpen(true); }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold transition-colors hover:bg-accent/5 ${selectedSport?.id === sport.id ? 'text-accent' : 'text-foreground'}`}
            >
              <span>{sportEmoji(sport.name)}</span> {sport.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Search results dropdown ── */}
      {showResults && (
        <div className="absolute z-50 left-4 right-4 mt-2 glass-panel rounded-2xl border border-[var(--panel-border)] shadow-2xl overflow-hidden">
          {results.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-sm font-bold text-[var(--muted)]">No turfs found</p>
              <p className="text-xs text-[var(--muted)] opacity-60 mt-0.5">Try a different name or sport</p>
            </div>
          ) : (
            <>
              <div className="px-4 pt-3 pb-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                  {selectedSport ? ` · ${selectedSport.name}` : ''}
                </p>
              </div>
              {results.map((turf, i) => {
                const sportLabel = getSportName(turf);
                return (
                  <a
                    key={turf.id}
                    href={`/${locale}/turf/${turf.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-accent/5 transition-colors border-t border-[var(--panel-border)] first:border-t-0 group"
                  >
                    <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                      <span className="text-base">{sportLabel ? sportEmoji(sportLabel) : '🏟'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate group-hover:text-accent transition-colors">
                        {turf.name}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {turf.area && (
                          <><MapPin size={9} className="text-accent shrink-0" />
                          <span className="text-[10px] text-[var(--muted)] truncate">{turf.area}</span></>
                        )}
                        {sportLabel && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-accent/60 ml-1">
                            {sportLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[var(--muted)] group-hover:text-accent transition-colors font-bold">›</span>
                  </a>
                );
              })}
              {results.length === 8 && (
                <div className="px-4 py-2.5 border-t border-[var(--panel-border)]">
                  <p className="text-[10px] text-[var(--muted)] text-center">Showing top 8 — type more to narrow results</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
