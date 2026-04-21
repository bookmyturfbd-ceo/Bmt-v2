'use client';
import { useState, useEffect } from 'react';
import { Plus, Building2, Clock, Loader2, ChevronLeft, Edit3, Trash2 } from 'lucide-react';
import { useApiEntity } from '@/hooks/useApiEntity';
import { getCookie } from '@/lib/cookies';
import CreateTurfModal from './CreateTurfModal';
import CustomSlotModal from './CustomSlotModal';
import EditSlotModal from './EditSlotModal';
import EditTurfModal from './EditTurfModal';
import RulesEditorModal from './RulesEditorModal';
import { FileText } from 'lucide-react';

interface Sport  { id: string; name: string; }
interface City   { id: string; name: string; }
interface Turf   {
  id: string; name: string; ownerId: string; status: string;
  cityId: string; area?: string; sportIds: string[]; logoUrl?: string;
  imageUrls: string[]; revenueModel?: { type: string; value: number };
  rules?: string;
}
interface Slot {
  id: string; turfId: string; groundId: string; days: string[]; gameType: string; sports: string[];
  startTime: string; endTime: string; price: number; timeCategory?: string;
}
interface Ground {
  id: string; turfId: string; name: string;
}

const OWNER_ID_PLACEHOLDER = ''; 

export default function MyTurfsPanel() {
  const [ownerId, setOwnerId] = useState(OWNER_ID_PLACEHOLDER);
  
  const turfsStore = useApiEntity<Turf>('turfs');
  const sports     = useApiEntity<Sport>('sports');
  const cities     = useApiEntity<City>('cities');
  const slotsStore = useApiEntity<Slot>('slots');
  const groundsStore = useApiEntity<Ground>('grounds');

  const [newGroundName, setNewGroundName] = useState('');
  const [isCreatingGround, setIsCreatingGround] = useState(false);

  useEffect(() => { 
    setOwnerId(getCookie('bmt_owner_id')); 
  }, []);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTurfId, setSelectedTurfId] = useState<string | null>(null);
  const [slotTurfId, setSlotTurfId] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [editingRulesTurf, setEditingRulesTurf] = useState<Turf | null>(null);
  const [editingTurf, setEditingTurf] = useState<Turf | null>(null);

  const myTurfs    = turfsStore.items.filter(t => t.ownerId === ownerId);
  const cityName   = (id: string) => cities.items.find(c => c.id === id)?.name ?? id;
  const sportNames = (ids: string[]) => ids.map(id => sports.items.find(s => s.id === id)?.name ?? id).join(' · ');

  const statusStyle = (status: string) => {
    if (status === 'published') return 'bg-accent/10 border-accent/30 text-accent';
    if (status === 'pending')   return 'bg-orange-500/10 border-orange-500/30 text-orange-400';
    return 'bg-red-500/10 border-red-500/30 text-red-400';
  };

  function parseTime12h(t: string): number {
    if (!t) return 0;
    const parts = t.split(' ');
    let [hours, minutes] = parts[0].split(':').map(Number);
    const modifier = parts[1] || 'AM'; // fallback
    if (hours === 12) hours = 0;
    if (modifier.toUpperCase() === 'PM') hours += 12;
    
    let totalMins = hours * 60 + (minutes || 0);
    // Push late night slots (before 5 AM) to the bottom by treating them as the end of the operating day
    if (totalMins < 5 * 60) totalMins += 24 * 60;
    
    return totalMins;
  }

  if (turfsStore.loading) return (
    <div className="flex items-center justify-center gap-2 py-16 text-[var(--muted)]">
      <Loader2 size={18} className="animate-spin" /> Loading your turfs…
    </div>
  );

  // --- DETAIL VIEW ---
  if (selectedTurfId) {
    const turf = myTurfs.find(t => t.id === selectedTurfId);
    if (!turf) return <button onClick={() => setSelectedTurfId(null)}>← Back</button>;

    const turfSlots = slotsStore.items.filter(s => s.turfId === turf.id);
    const published = turf.status === 'published';

    return (
      <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 duration-300">
        {/* Detail Header / Nav */}
        <div className="flex items-center justify-between">
          <button onClick={() => setSelectedTurfId(null)} className="flex items-center gap-1.5 text-sm font-semibold text-neutral-400 hover:text-white transition-colors">
            <ChevronLeft size={18} /> Back to My Turfs
          </button>
          {!published && <span className="text-xs bg-orange-500/10 text-orange-400 px-3 py-1.5 rounded-lg border border-orange-500/20 font-bold tracking-wide">AWAITING REVIEW</span>}
        </div>

        {/* Turf Summary Card */}
        <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-[var(--panel-border)] flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-lg relative overflow-hidden">
          <img src={turf.imageUrls?.[0]} alt="cover" className="w-full sm:w-32 h-32 rounded-2xl object-cover shadow-inner" />
          <div className="flex-1 min-w-0">
             <div className="flex items-center gap-3">
                 <h2 className="text-2xl font-black tracking-tight">{turf.name}</h2>
                 {published && <span className="bg-accent/10 text-accent border border-accent/30 text-[9px] font-black tracking-widest px-2 py-0.5 rounded uppercase shadow-[inset_0_0_10px_rgba(0,255,0,0.1)]">LIVE</span>}
             </div>
             <p className="text-sm font-bold text-[var(--muted)] mt-1 flex items-center gap-1.5">{cityName(turf.cityId)}</p>
             <p className="text-xs text-[var(--muted)] mt-1">{sportNames(turf.sportIds ?? [])}</p>
             
             {/* Edit Buttons */}
             <div className="mt-4 flex gap-2">
                 <button onClick={() => setEditingTurf(turf)} className="px-5 py-2.5 rounded-xl bg-[var(--panel-bg)] border border-[var(--panel-border)] hover:bg-[var(--panel-bg-hover)] text-xs font-bold transition-colors flex items-center gap-2">
                   <Edit3 size={14}/> Edit Turf Info
                 </button>
                 <button onClick={() => setEditingRulesTurf(turf)} className="px-5 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white text-xs font-bold transition-colors flex items-center gap-2">
                   <FileText size={14}/> House Rules
                 </button>
             </div>
          </div>
        </div>

        {/* Grounds & Slots Section */}
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black tracking-tight">{published ? 'Facility Grounds & Slots' : 'Manage Grounds & Slots'}</h3>
              <p className="text-xs text-[var(--muted)] font-medium">Create grounds and automate slots</p>
            </div>
            {published && (
              <button 
                onClick={() => setIsCreatingGround(!isCreatingGround)} 
                className="bg-accent text-black px-4 py-2.5 rounded-xl text-xs font-black tracking-wide shadow-[0_4px_15px_rgba(0,255,0,0.15)] active:scale-95 hover:brightness-110 transition-all flex items-center gap-1.5"
              >
                <Plus size={15} strokeWidth={3}/> Create Ground
              </button>
            )}
          </div>

          {!published ? (
             <div className="py-12 glass-panel border border-dashed border-[var(--panel-border)] rounded-3xl flex flex-col items-center justify-center text-center gap-3">
               <Clock size={32} className="text-[var(--muted)] opacity-50" />
               <div>
                  <p className="text-sm font-semibold text-foreground">Slots locked</p>
                  <p className="text-xs text-[var(--muted)] max-w-xs mt-1">You can create grounds and automate slots once Super Admin approves this turf.</p>
               </div>
             </div>
          ) : (
             <div className="flex flex-col gap-6">
                {isCreatingGround && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newGroundName.trim()) return;
                    await fetch('/api/bmt/grounds', {
                      method: 'POST',
                      headers: {'Content-Type': 'application/json'},
                      body: JSON.stringify({ turfId: turf.id, name: newGroundName })
                    });
                    setNewGroundName('');
                    setIsCreatingGround(false);
                    groundsStore.reload();
                  }} className="glass-panel p-4 rounded-2xl border border-[var(--panel-border)] flex items-end gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex-1 flex flex-col gap-1.5">
                       <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Ground Name</label>
                       <input autoFocus required value={newGroundName} onChange={e => setNewGroundName(e.target.value)} placeholder="e.g., Futsal Court A" className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-2 text-sm outline-none focus:border-accent/50" />
                    </div>
                    <button type="submit" className="bg-accent text-black px-5 py-2 rounded-xl text-sm font-black active:scale-95 transition-transform">Create</button>
                  </form>
                )}

                {groundsStore.items.filter((g) => g.turfId === turf.id).length === 0 && !isCreatingGround && (
                  <div className="py-12 glass-panel border border-dashed border-[var(--panel-border)] rounded-3xl flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-[var(--panel-bg)] flex items-center justify-center shadow-inner">
                      <Plus size={28} className="text-[var(--muted)] opacity-60" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">No Grounds Configured</p>
                      <p className="text-xs text-[var(--muted)] max-w-[250px] mt-1 mx-auto">You must create at least one physical playing Ground before you can generate slots.</p>
                    </div>
                    <button onClick={() => setIsCreatingGround(true)} className="mt-2 text-accent font-bold text-xs hover:underline decoration-2 underline-offset-4">Create your first ground</button>
                  </div>
                )}

                {groundsStore.items.filter(g => g.turfId === turf.id).map(ground => {
                   const gSlots = turfSlots.filter(s => s.groundId === ground.id).sort((a,b) => parseTime12h(a.startTime) - parseTime12h(b.startTime));
                   return (
                     <div key={ground.id} className="flex flex-col gap-3">
                       <div className="flex items-center justify-between border-b border-[var(--panel-border)] pb-2">
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-accent" /> {ground.name}</h4>
                          <div className="flex gap-2">
                             {gSlots.length > 0 && (
                               <button 
                                 onClick={async () => {
                                   if (window.confirm('Are you sure you want to delete all slots for ' + ground.name + '?')) {
                                     const res = await fetch('/api/bmt/slots', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groundId: ground.id }) });
                                     const data = await res.json();
                                     if (!res.ok) {
                                       alert('Failed to delete slots: ' + data.error);
                                     } else {
                                       alert(`Deleted ${data.count} empty slots.\n${data.skipped > 0 ? `${data.skipped} slots were retained because they contain active player revenue/bookings.` : ''}`);
                                     }
                                     slotsStore.reload();
                                   }
                                 }} 
                                 className="bg-red-500/10 border border-red-500/20 text-red-500 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide active:scale-95 hover:bg-red-500 hover:text-white transition-all flex items-center gap-1"
                               >
                                 <Trash2 size={12} strokeWidth={3}/> Bulk Delete
                               </button>
                             )}
                             <button onClick={() => setSlotTurfId(ground.id)} className="bg-accent/10 border border-accent/20 text-accent px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide active:scale-95 hover:bg-accent hover:text-black transition-all flex items-center gap-1">
                               <Clock size={12} strokeWidth={3}/> Bulk Generate Slots
                             </button>
                          </div>
                       </div>
                       
                       {gSlots.length === 0 ? (
                          <div className="py-6 border border-dashed border-[var(--panel-border)] rounded-2xl flex flex-col items-center justify-center text-center">
                            <p className="text-xs font-semibold text-[var(--muted)]">No slots mapped to {ground.name}</p>
                          </div>
                        ) : (() => {
                          const TIME_ORDER = ['Morning', 'Afternoon', 'Evening', 'Night'];
                          const TIME_EMOJI: Record<string, string> = { Morning: '🌅', Afternoon: '☀️', Evening: '🌇', Night: '🌙' };
                          // Group slots by timeCategory
                          const grouped: Record<string, typeof gSlots> = {};
                          for (const slot of gSlots) {
                            const cat = slot.timeCategory || 'Other';
                            if (!grouped[cat]) grouped[cat] = [];
                            grouped[cat].push(slot);
                          }
                          const orderedKeys = [...TIME_ORDER.filter(k => grouped[k]), ...Object.keys(grouped).filter(k => !TIME_ORDER.includes(k))];
                          return (
                            <div className="flex flex-col gap-5">
                              {orderedKeys.map(cat => (
                                <div key={cat} className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-base leading-none">{TIME_EMOJI[cat] ?? '🕐'}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">{cat}</span>
                                    <span className="text-[9px] font-bold text-[var(--muted)] bg-[var(--panel-bg)] border border-[var(--panel-border)] px-1.5 py-0.5 rounded-full">{grouped[cat].length}</span>
                                    <div className="h-px flex-1 bg-[var(--panel-border)]" />
                                  </div>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {grouped[cat].map(slot => (
                                      <div key={slot.id} className="relative glass p-3 rounded-2xl border border-[var(--panel-border)] hover:border-accent/30 transition-colors group">
                                        <div className="absolute top-2 right-2 flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-all">
                                          <button onClick={() => setEditingSlot(slot)} className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white flex items-center justify-center shadow-sm">
                                            <Edit3 size={11} />
                                          </button>
                                          <button onClick={() => slotsStore.remove(slot.id)} className="w-6 h-6 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center shadow-sm">
                                            <Trash2 size={12} />
                                          </button>
                                        </div>
                                        <div className="flex flex-col gap-1 pr-14">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[10px] font-black text-[var(--muted)] line-clamp-1">{slot.gameType || (slot.sports || []).join(', ')}</span>
                                          </div>
                                          <h4 className="text-sm font-black tracking-tight text-foreground leading-none">{slot.startTime} - {slot.endTime}</h4>
                                          <div className="flex items-baseline gap-1 mt-0.5">
                                            <span className="text-sm font-black text-accent">৳{slot.price}</span>
                                          </div>
                                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                                            {slot.days.map(d => (
                                              <span key={d} className="text-[9px] bg-[var(--panel-bg)] border border-[var(--panel-border)] text-[var(--muted)] font-bold px-1.5 py-0.5 rounded-full">{d.slice(0,3)}</span>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                     </div>
                   );
                })}
             </div>
          )}
        </div>

        <CustomSlotModal open={slotTurfId !== null} onClose={() => { setSlotTurfId(null); slotsStore.reload(); }} turfId={turf.id} groundId={slotTurfId} />
        <EditSlotModal open={editingSlot !== null} onClose={() => { setEditingSlot(null); slotsStore.reload(); }} slot={editingSlot} />
        <RulesEditorModal open={editingRulesTurf !== null} onClose={() => { setEditingRulesTurf(null); turfsStore.reload(); }} turfId={editingRulesTurf?.id || ''} initialRules={editingRulesTurf?.rules || ''} />
        <EditTurfModal open={editingTurf !== null} onClose={() => { setEditingTurf(null); turfsStore.reload(); }} turf={editingTurf} />
      </div>
    );
  }

  // --- GRID VIEW ---
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black">My Turfs</h2>
          <p className="text-xs font-semibold text-[var(--muted)] mt-0.5">{myTurfs.length} platform(s) registered under you</p>
        </div>
        <button onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-black font-black text-xs hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_15px_rgba(0,255,0,0.2)]">
          <Plus size={15} strokeWidth={3} /> Register Turf
        </button>
      </div>

      {myTurfs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 text-center py-20 glass-panel rounded-3xl border border-dashed border-[var(--panel-border)]">
          <div className="w-16 h-16 rounded-full bg-[var(--panel-bg)] flex items-center justify-center shadow-inner">
             <Building2 size={32} className="text-[var(--muted)] opacity-60" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight text-foreground">No turfs yet</h3>
            <p className="text-xs font-medium text-[var(--muted)] mt-1">Click below to submit your turf for platform approval.</p>
          </div>
          <button onClick={() => setCreateOpen(true)}
            className="mt-2 px-6 py-3 rounded-full bg-accent text-black font-black text-sm hover:brightness-110 transition-all shadow-[0_4px_20px_rgba(0,255,0,0.2)]">
            Register New Turf
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {myTurfs.map(turf => (
            <div 
              key={turf.id} 
              onClick={() => setSelectedTurfId(turf.id)}
              className="group cursor-pointer glass-panel rounded-[24px] overflow-hidden border border-[var(--panel-border)] hover:border-accent/40 hover:shadow-[0_10px_30px_rgba(0,0,0,0.1),inset_0_0_20px_rgba(0,255,0,0.05)] transition-all flex flex-col active:scale-[0.98]"
            >
              <div className="relative h-36 w-full">
                {turf.imageUrls?.[0] ? (
                  <img src={turf.imageUrls[0]} alt={turf.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-900"><Building2 size={24} className="opacity-20"/></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--panel-bg)] to-transparent" />
                
                <span className={`absolute top-3 right-3 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg backdrop-blur-md border shadow-sm ${statusStyle(turf.status)}`}>
                  {turf.status}
                </span>

                {turf.logoUrl && (
                   <img src={turf.logoUrl} className="absolute bottom-[-10px] left-4 w-12 h-12 rounded-xl object-cover border-2 border-[var(--panel-bg)] shadow-lg" alt="logo" />
                )}
              </div>
              
               <div className="p-4 flex flex-col gap-1.5 flex-1 relative z-10 bg-[var(--panel-bg)]/80">
                 <h3 className="font-black text-lg tracking-tight leading-none text-foreground">{turf.name}</h3>
                 <p className="text-xs text-[var(--muted)] font-semibold flex items-center gap-1.5 truncate">
                   {cityName(turf.cityId)} {turf.area ? `· ${turf.area}` : ''}
                 </p>
                 <div className="mt-auto pt-4">
                   <button onClick={(e) => { e.stopPropagation(); setSelectedTurfId(turf.id); }} className="w-full bg-accent text-black font-black text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_15px_rgba(0,255,0,0.15)] focus:outline-none">
                     Enter Control Center <span>→</span>
                   </button>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateTurfModal
        open={createOpen}
        onClose={() => { setCreateOpen(false); turfsStore.reload(); }}
      />
    </div>
  );
}
