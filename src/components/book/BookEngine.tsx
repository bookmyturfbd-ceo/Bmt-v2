'use client';
import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import BookToggle from './BookToggle';
import SearchCard from './SearchCard';
import ProSearchCard from './ProSearchCard';
import SportsFilter from './SportsFilter';
import TurfList from './TurfList';
import PlayerBookingHistory from './PlayerBookingHistory';
import { Clock } from 'lucide-react';
import BookComingSoonClient from './BookComingSoonClient';

export default function BookEngine({ 
  sports, turfs, cities, slots, turfServiceSetting 
}: { 
  sports: any[], turfs: any[], cities: any[], slots: any[], turfServiceSetting?: { isActive: boolean; launchAt: string | null } | null
}) {
  const t = useTranslations('Book');
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') === 'history' ? 'history' : 'turf') as 'turf' | 'pros' | 'history';
  const groupId = searchParams.get('groupId') ?? undefined; // set when coming from Play With Friends

  const categories = Array.from(new Set(sports.map(s => s.category || s.name)));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProfession, setSelectedProfession] = useState<string>('all');
  const [selectedCityId, setSelectedCityId] = useState<string>('all');
  const [searchDate, setSearchDate] = useState<string>('');
  const [searchTime, setSearchTime] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'turf'|'pros'|'history'>(initialTab);
  const [proSearchQuery, setProSearchQuery] = useState('');

  const availableProfessions = useMemo(() => {
    const set = new Set<string>([
      'Cricket Coach',
      'Football Coach',
      'Physio',
      'Personal Trainer',
      'Referee'
    ]);
    turfs.forEach(turf => {
      if (turf.isCoachProfile) {
        if (turf.coachType) {
          set.add(turf.coachType);
        }
        if (Array.isArray(turf.professions)) {
          turf.professions.forEach((p: string) => {
            if (p) set.add(p);
          });
        }
      }
    });
    return Array.from(set);
  }, [turfs]);

  // The engine intercepts active filters and maps turfs that strictly pass filters
  const filteredTurfs = useMemo(() => {
    return turfs.filter(turf => {
      // 0. Filter by Profile Type (Turf vs Pro)
      if (activeTab === 'turf' && turf.isCoachProfile) return false;
      if (activeTab === 'pros' && !turf.isCoachProfile) return false;

      // Search Query filter for Pros (name, email, phone, sport type)
      if (activeTab === 'pros' && proSearchQuery.trim()) {
        const q = proSearchQuery.toLowerCase();
        const matchName = turf.name.toLowerCase().includes(q);
        const matchCoachType = turf.coachType?.toLowerCase()?.includes(q) || false;
        const matchProfessions = Array.isArray(turf.professions) && turf.professions.some((p: string) => p.toLowerCase().includes(q));
        const matchArea = turf.area?.toLowerCase()?.includes(q) || false;
        const matchEmail = turf.owner?.email?.toLowerCase()?.includes(q) || false;
        const matchPhone = turf.owner?.phone?.toLowerCase()?.includes(q) || false;
        if (!matchName && !matchCoachType && !matchProfessions && !matchArea && !matchEmail && !matchPhone) {
          return false;
        }
      }

      // 1. Sport Match (via Category bridging) - Only for standard turfs
      if (activeTab === 'turf' && selectedCategory !== 'all') {
         const targetSports = sports.filter(s => (s.category || s.name) === selectedCategory);
         const targetSportIds = targetSports.map(s => s.id);
         const targetSportNames = targetSports.map(s => s.name);

         const hasGlobalSport = turf.sportIds && turf.sportIds.some((id: string) => targetSportIds.includes(id));
         const hasSlotSport = slots.some((s: any) => s.turfId === turf.id && s.sports && s.sports.some((sn: string) => targetSportNames.includes(sn)));
         
         if (!hasGlobalSport && !hasSlotSport) return false;
      }

      // 2. Profession Match (only when activeTab === 'pros')
      if (activeTab === 'pros' && selectedProfession !== 'all') {
         const matchCoachType = turf.coachType?.toLowerCase() === selectedProfession.toLowerCase();
         const matchProfessions = Array.isArray(turf.professions) && turf.professions.some((p: string) => p.toLowerCase() === selectedProfession.toLowerCase());
         if (!matchCoachType && !matchProfessions) return false;
      }

      // 3. City Match
      if (selectedCityId !== 'all' && turf.cityId !== selectedCityId) return false;

      // 4. Slot Date/Time Intersection
      if (searchDate || searchTime) {
         // Get all slots belonging to this turf
         const turfSlots = slots.filter(s => s.turfId === turf.id);
         
         // Day filtering
         let isAvailable = false;
         
         if (searchDate) {
            // Find day name from date e.g. "Mon"
            const dateObj = new Date(searchDate);
            // We use 'utc' or adjust for timezone so that the local browser date doesn't offset the day
            // But since input type="date" outputs YYYY-MM-DD, parsing it as UTC is safe if we extract correctly.
            const dayName = new Date(searchDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
            // Does this turf have any slots operating on this day?
            const daySlots = turfSlots.filter(s => Array.isArray(s.days) && s.days.includes(dayName));

            if (daySlots.length === 0) return false;

            if (searchTime) {
               // Further filter: Does the slot physically exist around that time?
               // Since time comparison is complex, we just check exact string match OR timeCategory
               const timeCheck = daySlots.some(s => s.startTime === searchTime || s.timeCategory === searchTime);
               if (!timeCheck) return false;
            }
         }
      }
      
      return true;
    });
  }, [activeTab, selectedCategory, selectedProfession, selectedCityId, searchDate, searchTime, turfs, slots, sports]);

  const handleTabChange = (tab: 'turf'|'pros'|'history') => {
    setActiveTab(tab);
    setSelectedCategory('all');
    setSelectedProfession('all');
  };

  return (
    <>
      <BookToggle activeTab={activeTab} setActiveTab={handleTabChange} />
      
      {activeTab === 'history' ? (
        <PlayerBookingHistory />
      ) : activeTab === 'pros' ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col gap-4">
          <ProSearchCard searchQuery={proSearchQuery} setSearchQuery={setProSearchQuery} />
          
          {availableProfessions.length > 0 && (
            <div className="flex overflow-x-auto gap-2 pb-1 snap-x hide-scrollbar [&::-webkit-scrollbar]:hidden px-1">
              <button 
                onClick={() => setSelectedProfession('all')}
                className={`flex-shrink-0 snap-center px-5 py-2 rounded-full text-xs font-bold border transition-all ${selectedProfession === 'all' ? 'bg-accent text-black border-accent' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'}`}
              >
                 {t('sports.allProfessions')}
              </button>
              
              {availableProfessions.map((prof) => (
                <button 
                  key={prof} 
                  onClick={() => setSelectedProfession(prof)}
                  className={`flex-shrink-0 snap-center px-5 py-2 rounded-full text-xs font-bold border transition-all ${selectedProfession === prof ? 'bg-accent text-black border-accent' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white'}`}
                >
                  {prof}
                </button>
              ))}
            </div>
          )}

          <TurfList turfs={filteredTurfs} cities={cities} sports={sports} groupId={groupId} />
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col gap-4">
          {turfServiceSetting?.isActive ? (
            <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-b from-black/80 to-neutral-900/80 p-8 flex flex-col items-center text-center gap-5 mt-4 shadow-[0_0_60px_rgba(0,255,65,0.08)]">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_-10%,rgba(0,255,65,0.08),transparent)] pointer-events-none" />
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mb-2">
                  <Clock size={28} className="text-accent" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">Turf Booking</h2>
                <p className="text-accent font-black text-sm tracking-widest uppercase">Coming Soon</p>
                <p className="text-xs text-neutral-400 font-medium mt-1 max-w-[260px]">
                  We&apos;re finalizing our turf partnerships. Stay tuned — booking goes live soon!
                </p>
              </div>
              {turfServiceSetting.launchAt && (
                <div className="relative z-10 w-full">
                  <BookComingSoonClient launchAt={turfServiceSetting.launchAt} />
                </div>
              )}
            </div>
          ) : (
            <>
              <SearchCard 
                 cities={cities} 
                 turfs={turfs}
                 selectedCityId={selectedCityId}
                 setSelectedCityId={setSelectedCityId}
                 searchDate={searchDate}
                 setSearchDate={setSearchDate}
                 searchTime={searchTime}
                 setSearchTime={setSearchTime}
              />
              <SportsFilter 
                categories={categories as string[]} 
                selectedCategory={selectedCategory} 
                setSelectedCategory={setSelectedCategory} 
              />
              <TurfList turfs={filteredTurfs} cities={cities} sports={sports} groupId={groupId} />
            </>
          )}
        </div>
      )}
    </>
  );
}
