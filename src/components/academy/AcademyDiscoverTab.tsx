'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trophy, ShieldCheck, MapPin, Users, ChevronRight, Search,
  Loader2, SlidersHorizontal, X, Lock, Plus
} from 'lucide-react';

const SPORTS = ['FUTSAL', 'FOOTBALL', 'CRICKET'];
const AGE_GROUPS = ['U10', 'U12', 'U14', 'U16', 'Adults', '16+'];

interface AcademyDiscoverTabProps {
  locale: string;
  isAuthed: boolean;
}

export default function AcademyDiscoverTab({ locale, isAuthed }: AcademyDiscoverTabProps) {
  const router = useRouter();

  const [academies, setAcademies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);

  // Filter state
  const [searchQ, setSearchQ] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [ageGroupFilter, setAgeGroupFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchAcademies = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQ) params.set('q', searchQ);
      if (sportFilter) params.set('sport', sportFilter);
      if (areaFilter) params.set('area', areaFilter);
      if (ageGroupFilter) params.set('ageGroup', ageGroupFilter);

      const res = await fetch(`/api/academy/discover?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setEnabled(data.enabled);
        setAcademies(data.academies || []);
      }
    } catch (err) {
      console.error('Error loading academies:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQ, sportFilter, areaFilter, ageGroupFilter]);

  useEffect(() => {
    const debounce = setTimeout(fetchAcademies, 400);
    return () => clearTimeout(debounce);
  }, [fetchAcademies]);

  const clearFilters = () => {
    setSportFilter('');
    setAreaFilter('');
    setAgeGroupFilter('');
    setSearchQ('');
  };

  const hasActiveFilters = !!(sportFilter || areaFilter || ageGroupFilter);

  // Pre-launch locked state
  if (!enabled && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-neutral-900 border border-white/5 flex items-center justify-center">
          <Lock size={28} className="text-neutral-600" />
        </div>
        <div>
          <h3 className="font-black text-base text-white">Academies Are Coming</h3>
          <p className="text-xs text-neutral-500 mt-2 leading-relaxed max-w-xs">
            Sports academies are joining BMT. Own one? List yours and start receiving direct inquiries before the tab goes live.
          </p>
        </div>
        <button
          onClick={() => router.push(`/${locale}/academy/dashboard`)}
          className="px-5 py-3 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black text-xs uppercase rounded-xl flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus size={14} /> List Your Academy
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── Search + Filters header ── */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search academies…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            className="w-full bg-neutral-900 border border-white/10 rounded-2xl pl-9 pr-4 py-2.5 text-xs outline-none focus:border-[#00ff41]/50 text-white font-bold placeholder:text-neutral-600"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          {searchQ && (
            <button onClick={() => setSearchQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white">
              <X size={12} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2.5 rounded-2xl border transition-all ${
            hasActiveFilters
              ? 'bg-[#00ff41]/10 border-[#00ff41]/30 text-[#00ff41]'
              : 'bg-neutral-900 border-white/10 text-neutral-400'
          }`}
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {/* ── Expanded Filters ── */}
      {showFilters && (
        <div className="bg-neutral-900 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
          
          {/* Sport chips */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black uppercase text-neutral-500 tracking-widest">Sport</span>
            <div className="flex gap-2 flex-wrap">
              {SPORTS.map(s => (
                <button
                  key={s}
                  onClick={() => setSportFilter(sportFilter === s ? '' : s)}
                  className={`px-3 py-1 text-[10px] font-black rounded-full border transition-all uppercase ${
                    sportFilter === s
                      ? 'bg-[#00ff41] border-[#00ff41] text-black'
                      : 'bg-transparent border-white/10 text-neutral-400 hover:text-white'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Age Group chips */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black uppercase text-neutral-500 tracking-widest">Age Group</span>
            <div className="flex gap-2 flex-wrap">
              {AGE_GROUPS.map(ag => (
                <button
                  key={ag}
                  onClick={() => setAgeGroupFilter(ageGroupFilter === ag ? '' : ag)}
                  className={`px-3 py-1 text-[10px] font-black rounded-full border transition-all ${
                    ageGroupFilter === ag
                      ? 'bg-[#00ff41] border-[#00ff41] text-black'
                      : 'bg-transparent border-white/10 text-neutral-400 hover:text-white'
                  }`}
                >
                  {ag}
                </button>
              ))}
            </div>
          </div>

          {/* Area */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black uppercase text-neutral-500 tracking-widest">Area</span>
            <input
              type="text"
              placeholder="e.g. Uttara, Mirpur, Gulshan…"
              value={areaFilter}
              onChange={e => setAreaFilter(e.target.value)}
              className="w-full bg-neutral-950 border border-white/5 rounded-xl px-3 py-2 text-xs outline-none focus:border-[#00ff41]/50 text-white font-bold placeholder:text-neutral-600"
            />
          </div>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-[10px] font-black text-neutral-500 hover:text-red-400 transition-colors self-start mt-1">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* ── Results Grid ── */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-full h-36 rounded-3xl bg-neutral-900/40 border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : academies.length > 0 ? (
        <div className="flex flex-col gap-3">
          {academies.map(academy => {
            const coverPhoto = academy.media?.[0]?.url || null;
            const minFee = academy.programs?.reduce((min: number | null, p: any) => {
              if (p.monthlyFeeBdt == null) return min;
              return min === null ? p.monthlyFeeBdt : Math.min(min, p.monthlyFeeBdt);
            }, null);

            const isVerified = academy.verificationStatus === 'VERIFIED';
            const isFeatured = academy.featured;

            return (
              <div
                key={academy.id}
                onClick={() => router.push(`/${locale}/academy/${academy.slug}`)}
                className={`relative w-full bg-neutral-900/60 border rounded-3xl overflow-hidden cursor-pointer active:scale-[0.99] transition-all ${
                  isFeatured
                    ? 'border-[#00ff41]/30 shadow-[0_0_20px_rgba(0,255,65,0.08)]'
                    : 'border-white/5 hover:border-white/10'
                }`}
              >
                {/* Featured accent badge */}
                {isFeatured && (
                  <div className="absolute top-3 left-3 z-10 bg-[#00ff41] text-black text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full">
                    Featured
                  </div>
                )}

                <div className="flex gap-4 p-4">
                  {/* Cover thumbnail */}
                  <div className="w-24 h-24 rounded-2xl bg-neutral-950 border border-white/10 overflow-hidden flex-shrink-0">
                    {coverPhoto ? (
                      <img src={coverPhoto} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Trophy size={24} className="text-neutral-700" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 min-w-0 flex-1 py-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-black text-sm text-white leading-tight truncate max-w-[160px]">{academy.name}</h3>
                      {isVerified && (
                        <ShieldCheck size={14} className="text-[#00ff41] shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-neutral-500 text-[10px]">
                      <MapPin size={10} className="shrink-0" />
                      <span className="truncate">{academy.area}</span>
                    </div>

                    {/* Sport chips */}
                    <div className="flex gap-1 flex-wrap mt-0.5">
                      {academy.sport?.slice(0, 3).map((s: string) => (
                        <span key={s} className="text-[8px] font-black bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded-full uppercase">
                          {s}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-1">
                      <div className="flex items-center gap-3 text-[10px] text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Users size={10} /> {academy._count?.programs || academy.programs?.length || 0} programs
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-[#00ff41]">
                        {minFee != null ? `from ৳${minFee}/mo` : 'Contact'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* List your own CTA */}
          <button
            onClick={() => router.push(`/${locale}/academy/dashboard`)}
            className="w-full py-4 border border-dashed border-white/10 rounded-3xl text-neutral-500 text-xs font-black text-center hover:border-[#00ff41]/30 hover:text-[#00ff41] transition-all active:scale-[0.99]"
          >
            + List Your Academy on BMT
          </button>
        </div>
      ) : (
        <div className="text-center py-10 text-neutral-500 border border-dashed border-white/10 rounded-3xl flex flex-col items-center gap-3">
          <Trophy size={32} className="text-neutral-700" />
          <div>
            <p className="font-black text-sm">No academies found</p>
            <p className="text-xs mt-1 max-w-[200px] mx-auto">Try clearing filters or be the first to list here!</p>
          </div>
          <button
            onClick={() => router.push(`/${locale}/academy/dashboard`)}
            className="mt-1 px-4 py-2.5 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black text-xs rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Plus size={12} /> List Your Academy
          </button>
        </div>
      )}
    </div>
  );
}
