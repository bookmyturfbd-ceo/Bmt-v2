'use client';
import { useState, useEffect } from 'react';
import { getCookie } from '@/lib/cookies';
import { Calendar, Search } from 'lucide-react';

interface Booking { id: string; slotId: string; date: string; price?: number; playerName?: string; playerId?: string; createdAt?: string; source?: string; }
interface Slot    { id: string; turfId: string; startTime: string; endTime: string; price: number; }
interface Turf    { id: string; name: string; }

function matchCode(id: string) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  let code = '';
  for (let i = 0; i < 4; i++) { code += chars[hash % chars.length]; hash = Math.floor(hash / chars.length) + id.charCodeAt(i % id.length); }
  return code;
}

export default function PlayerBookingHistory() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'turf'|'pros'>('turf'); 

  useEffect(() => {
    const pid = getCookie('bmt_player_id');
    const pname = getCookie('bmt_name');
    
    if (!pid && !pname) {
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`/api/bmt/bookings?playerId=${encodeURIComponent(pid || '')}`).then(r => r.json()),
      fetch('/api/bmt/slots').then(r => r.json()),
      fetch('/api/bmt/turfs').then(r => r.json())
    ]).then(([bs, ss, ts]) => {
      setSlots(Array.isArray(ss) ? ss : []);
      setTurfs(Array.isArray(ts) ? ts : []);
      
      const all: Booking[] = Array.isArray(bs) ? bs : [];
      // Only show standard bookings — CM bookings are separate (they show in team page)
      setBookings(all
        .filter(b => b.source !== 'challenge_market')
        .sort((a, b) => {
          const timeA = a.createdAt || a.date;
          const timeB = b.createdAt || b.date;
          return timeB.localeCompare(timeA);
        }));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const isAuthed = getCookie('bmt_auth') !== undefined && getCookie('bmt_role') === 'player';
  if (!isAuthed) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-[var(--muted)]">
        <Calendar size={32} className="opacity-20 mb-3" />
        <p className="text-sm font-bold">Sign in to view your bookings</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Sub-tabs: Turf | Pros */}
      <div className="flex gap-1.5 bg-neutral-900 border border-neutral-800 rounded-full p-1 mx-auto max-w-[200px] w-full shadow-inner">
        <button onClick={() => setSubTab('turf')} className={`flex-1 py-1.5 text-[9px] uppercase tracking-widest font-black rounded-full transition-all ${subTab === 'turf' ? 'bg-accent text-black shadow-[0_0_10px_rgba(0,255,0,0.2)]' : 'text-neutral-500 hover:text-white'}`}>Turf</button>
        <button onClick={() => setSubTab('pros')} className={`flex-1 py-1.5 text-[9px] uppercase tracking-widest font-black rounded-full transition-all ${subTab === 'pros' ? 'bg-accent text-black shadow-[0_0_10px_rgba(0,255,0,0.2)]' : 'text-neutral-500 hover:text-white'}`}>Pros</button>
      </div>

      <div className="glass-panel border border-[var(--panel-border)] rounded-2xl overflow-hidden min-h-[300px]">
        {subTab === 'pros' ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--muted)]">
            <Search size={32} className="opacity-20 mb-3" />
            <p className="text-sm font-black">No Pro Bookings</p>
            <p className="text-[11px] opacity-60 mt-1 max-w-[200px] leading-relaxed">You haven't booked any pros yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {bookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-[var(--muted)]">
                <Calendar size={32} className="opacity-20 mb-3" />
                <p className="text-sm font-black">No Turf Bookings</p>
                <p className="text-[11px] opacity-60 mt-1 max-w-[200px] leading-relaxed">Your turf booking history will appear here.</p>
              </div>
            ) : (
              bookings.map((b, i) => {
                const slot = slots.find(s => s.id === b.slotId);
                const turf = slot ? turfs.find(t => t.id === slot.turfId) : null;
                const code = matchCode(b.id);
                const price = b.price ?? slot?.price ?? 0;
                
                return (
                  <div key={b.id}
                       className="px-5 py-4 flex items-start justify-between gap-3 hover:bg-white/[0.02] transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300"
                       style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="min-w-0">
                      <p className="text-sm font-black truncate text-white/90">{turf?.name || 'Turf'}</p>
                      <p className="text-[11px] text-[var(--muted)] mt-0.5">{b.date} • {slot?.startTime}–{slot?.endTime}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-sm font-black text-accent">৳{price.toLocaleString()}</span>
                      <div className="flex gap-0.5">
                        {code.split('').map((c, i) => (
                          <span key={i} className="w-4 h-4 rounded text-[8px] font-black flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.15)', color: '#d8b4fe' }}>{c}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
