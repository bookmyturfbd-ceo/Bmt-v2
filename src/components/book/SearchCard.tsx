import { useTranslations } from 'next-intl';
import { Calendar, Clock, Search } from 'lucide-react';

export default function SearchCard({ 
  cities, turfs, selectedCityId, setSelectedCityId, searchDate, setSearchDate, searchTime, setSearchTime 
}: { 
  cities: any[], turfs: any[], selectedCityId: string, setSelectedCityId: (v: string) => void,
  searchDate: string, setSearchDate: (v: string) => void, searchTime: string, setSearchTime: (v: string) => void
}) {
  const t = useTranslations('Book.search');
  
  return (
    <div className="glass rounded-3xl overflow-hidden mb-5 border border-white/5">
      <div className="flex border-b border-white/5">
        <div className="flex-1 flex items-center gap-2 py-2 px-3 border-r border-white/5 relative">
          <Calendar size={16} className="text-accent shrink-0 pointer-events-none" />
          <input 
             type="date" 
             value={searchDate} 
             onChange={(e) => setSearchDate(e.target.value)}
             className="w-full bg-transparent border-none outline-none text-xs font-semibold text-white/90 placeholder:text-neutral-500 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:w-full"
          />
        </div>
        <div className="flex-1 flex items-center gap-2 py-2 px-3 relative">
          <Clock size={16} className="text-accent shrink-0 pointer-events-none" />
          <select 
             value={searchTime} 
             onChange={(e) => setSearchTime(e.target.value)}
             className="w-full bg-transparent border-none outline-none text-xs font-semibold text-white/90 appearance-none"
          >
             <option value="" className="bg-neutral-900 text-neutral-500">Any Time</option>
             <option value="Morning" className="bg-neutral-900">☀️ Morning</option>
             <option value="Afternoon" className="bg-neutral-900">🌤️ Afternoon</option>
             <option value="Evening" className="bg-neutral-900">🌅 Evening</option>
             <option value="Night" className="bg-neutral-900">🌙 Night</option>
             <optgroup label="Exact Slots" className="bg-neutral-950 font-bold uppercase text-[9px] mt-2">
                 <option value="06:00 AM" className="bg-neutral-900 normal-case text-xs">06:00 AM</option>
                 <option value="04:00 PM" className="bg-neutral-900 normal-case text-xs">04:00 PM</option>
                 <option value="08:00 PM" className="bg-neutral-900 normal-case text-xs">08:00 PM</option>
                 <option value="10:00 PM" className="bg-neutral-900 normal-case text-xs">10:00 PM</option>
             </optgroup>
          </select>
        </div>
      </div>
      <div className="flex flex-col border-b border-white/5">
        <label className="text-[10px] uppercase tracking-widest font-bold text-neutral-500 pt-3 px-4 -mb-1">Select Location</label>
        <div className="flex items-center px-4 py-3">
          <Search size={16} className="text-accent mr-2 shrink-0 pointer-events-none" />
          <select 
            value={selectedCityId}
            onChange={(e) => setSelectedCityId(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm font-bold text-white appearance-none"
          >
             <option value="all" className="bg-neutral-900">All Locations</option>
             {cities.map(c => (
                <option key={c.id} value={c.id} className="bg-neutral-900">{c.name}</option>
             ))}
          </select>
        </div>
      </div>
      <div className="p-3 bg-neutral-900/50">
        <button className="w-full py-3 rounded-2xl bg-accent text-black font-black text-sm uppercase tracking-wide hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_15px_rgba(0,255,0,0.1)]">
           Search Valid Slots
        </button>
      </div>
    </div>
  );
}
