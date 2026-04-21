'use client';
import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import BookToggle from './BookToggle';
import SearchCard from './SearchCard';
import SportsFilter from './SportsFilter';
import TurfList from './TurfList';
import PlayerBookingHistory from './PlayerBookingHistory';

export default function BookEngine({ 
  sports, turfs, cities, slots 
}: { 
  sports: any[], turfs: any[], cities: any[], slots: any[] 
}) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') === 'history' ? 'history' : 'turf') as 'turf' | 'pros' | 'history';

  const categories = Array.from(new Set(sports.map(s => s.category || s.name)));
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCityId, setSelectedCityId] = useState<string>('all');
  const [searchDate, setSearchDate] = useState<string>('');
  const [searchTime, setSearchTime] = useState<string>('');
  
  const [activeTab, setActiveTab] = useState<'turf'|'pros'|'history'>(initialTab);

  // The engine intercepts active filters and maps turfs that strictly pass filters
  const filteredTurfs = useMemo(() => {
    return turfs.filter(turf => {
      // 1. Sport Match (via Category bridging)
      if (selectedCategory !== 'all') {
         const targetSports = sports.filter(s => (s.category || s.name) === selectedCategory);
         const targetSportIds = targetSports.map(s => s.id);
         const targetSportNames = targetSports.map(s => s.name);

         const hasGlobalSport = turf.sportIds && turf.sportIds.some((id: string) => targetSportIds.includes(id));
         const hasSlotSport = slots.some((s: any) => s.turfId === turf.id && s.sports && s.sports.some((sn: string) => targetSportNames.includes(sn)));
         
         if (!hasGlobalSport && !hasSlotSport) return false;
      }

      // 2. City Match
      if (selectedCityId !== 'all' && turf.cityId !== selectedCityId) return false;

      // 3. Slot Date/Time Intersection
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
  }, [selectedCategory, selectedCityId, searchDate, searchTime, turfs, slots]);

  return (
    <>
      <BookToggle activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {activeTab === 'history' ? (
        <PlayerBookingHistory />
      ) : activeTab === 'pros' ? (
        <div className="py-20 flex flex-col items-center justify-center text-center text-[var(--muted)] animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="w-16 h-16 rounded-full bg-white/5 border-2 border-dashed border-white/10 flex items-center justify-center mb-4">
              <span className="text-2xl">🏃</span>
           </div>
           <p className="text-lg font-black text-white">Pro Booking Coming Soon!</p>
           <p className="text-sm mt-1 max-w-[250px] mx-auto opacity-70 leading-relaxed">Book professional players to join your team. Matchmaking is currently in development.</p>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 flex flex-col gap-4">
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
          <TurfList turfs={filteredTurfs} cities={cities} sports={sports} />
        </div>
      )}
    </>
  );
}
