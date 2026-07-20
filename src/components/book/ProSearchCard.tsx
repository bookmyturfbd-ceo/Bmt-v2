'use client';

import { Search, X } from 'lucide-react';

interface ProSearchCardProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export default function ProSearchCard({ searchQuery, setSearchQuery }: ProSearchCardProps) {
  return (
    <div className="glass rounded-3xl p-4 mb-4 border border-blue-500/20 bg-gradient-to-r from-blue-950/20 via-neutral-900/80 to-neutral-950 shadow-xl">
      <label className="text-[10px] uppercase tracking-widest font-black text-blue-400 mb-2 block">
        Search Professionals & Coaches
      </label>
      <div className="relative flex items-center h-12 bg-neutral-950 rounded-2xl border border-white/10 px-4 gap-2 focus-within:border-blue-500/50 transition-all">
        <Search size={16} className="text-blue-400 shrink-0 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search pro by name, phone, email, or sport type..."
          className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-white placeholder:text-neutral-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
