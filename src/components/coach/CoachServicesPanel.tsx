'use client';
import { useState, useEffect } from 'react';
import { getCookie } from '@/lib/cookies';
import { Plus, Clock, Dumbbell, Trash2, Edit3, Loader2 } from 'lucide-react';
import { useApiEntity } from '@/hooks/useApiEntity';
import CustomSlotModal from '@/components/owner/CustomSlotModal';
import EditSlotModal from '@/components/owner/EditSlotModal';

interface Turf   { id: string; name: string; ownerId: string; status: string; isCoachProfile: boolean; }
interface Ground { id: string; turfId: string; name: string; }
interface Slot   { id: string; turfId: string; groundId: string; days: string[]; gameType: string; sports: string[]; startTime: string; endTime: string; price: number; timeCategory?: string; }

export default function CoachServicesPanel() {
  const [ownerId, setOwnerId] = useState('');
  
  const turfsStore = useApiEntity<Turf>('turfs');
  const groundsStore = useApiEntity<Ground>('grounds');
  const slotsStore = useApiEntity<Slot>('slots');

  const [newServiceName, setNewServiceName] = useState('');
  const [isCreatingService, setIsCreatingService] = useState(false);
  const [slotGroundId, setSlotGroundId] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);

  useEffect(() => {
    setOwnerId(getCookie('bmt_owner_id'));
  }, []);

  if (turfsStore.loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-[var(--muted)]">
        <Loader2 size={18} className="animate-spin" /> Loading services…
      </div>
    );
  }

  const myProfile = turfsStore.items.find(t => t.ownerId === ownerId);

  if (!myProfile) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center gap-3 border border-dashed border-[var(--panel-border)] rounded-3xl glass-panel">
        <Dumbbell size={32} className="text-[var(--muted)] opacity-50" />
        <p className="font-bold">No Profile Found</p>
        <p className="text-sm text-[var(--muted)] max-w-xs">Please set up your professional profile first before adding services.</p>
      </div>
    );
  }

  const myServices = groundsStore.items.filter(g => g.turfId === myProfile.id);
  const mySlots = slotsStore.items.filter(s => s.turfId === myProfile.id);

  function parseTime12h(t: string): number {
    if (!t) return 0;
    const parts = t.split(' ');
    let [hours, minutes] = parts[0].split(':').map(Number);
    const modifier = parts[1] || 'AM';
    if (hours === 12) hours = 0;
    if (modifier.toUpperCase() === 'PM') hours += 12;
    let totalMins = hours * 60 + (minutes || 0);
    if (totalMins < 5 * 60) totalMins += 24 * 60;
    return totalMins;
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">My Services</h2>
          <p className="text-sm text-[var(--muted)] mt-0.5">Define what you offer (e.g., 1-on-1, Group) and your availability.</p>
        </div>
        <button 
          onClick={() => setIsCreatingService(!isCreatingService)} 
          className="bg-blue-500 text-white px-4 py-2.5 rounded-xl text-xs font-black tracking-wide shadow-[0_4px_15px_rgba(59,130,246,0.3)] active:scale-95 transition-all flex items-center gap-1.5"
        >
          <Plus size={15} strokeWidth={3}/> Add Service Type
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {isCreatingService && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!newServiceName.trim()) return;
            await fetch('/api/bmt/grounds', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ turfId: myProfile.id, name: newServiceName })
            });
            setNewServiceName('');
            setIsCreatingService(false);
            groundsStore.reload();
          }} className="glass-panel p-5 rounded-2xl border border-[var(--panel-border)] flex flex-col sm:flex-row items-end gap-3 shadow-lg">
            <div className="flex-1 flex flex-col gap-1.5 w-full">
               <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Service Name</label>
               <input autoFocus required value={newServiceName} onChange={e => setNewServiceName(e.target.value)} placeholder="e.g., Personal Coaching, Group Session (Max 5)" className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500/50" />
            </div>
            <button type="submit" className="bg-blue-500 text-white px-6 py-3 rounded-xl text-sm font-black w-full sm:w-auto active:scale-95 transition-transform">Create</button>
          </form>
        )}

        {myServices.length === 0 && !isCreatingService && (
          <div className="py-16 glass-panel border border-dashed border-[var(--panel-border)] rounded-3xl flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--panel-bg)] flex items-center justify-center shadow-inner">
              <Dumbbell size={28} className="text-[var(--muted)] opacity-60" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No Services Defined</p>
              <p className="text-xs text-[var(--muted)] max-w-[300px] mt-1 mx-auto">Create a service type to start defining your available coaching slots.</p>
            </div>
            <button onClick={() => setIsCreatingService(true)} className="text-blue-500 font-bold text-sm hover:underline decoration-2 underline-offset-4">Add your first service</button>
          </div>
        )}

        {myServices.map(service => {
           const serviceSlots = mySlots.filter(s => s.groundId === service.id).sort((a,b) => parseTime12h(a.startTime) - parseTime12h(b.startTime));
           return (
             <div key={service.id} className="glass-panel p-5 rounded-3xl border border-[var(--panel-border)] flex flex-col gap-4 shadow-sm">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--panel-border)] pb-4 gap-3">
                  <div>
                    <h4 className="font-black text-lg text-foreground flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" /> {service.name}
                    </h4>
                    <p className="text-[11px] text-[var(--muted)] mt-1 ml-4 font-semibold uppercase tracking-widest">{serviceSlots.length} available slots</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                     {serviceSlots.length > 0 && (
                       <button 
                         onClick={async () => {
                           if (window.confirm('Are you sure you want to delete all availability slots for ' + service.name + '?')) {
                             const res = await fetch('/api/bmt/slots', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ groundId: service.id }) });
                             await res.json();
                             slotsStore.reload();
                           }
                         }} 
                         className="bg-red-500/10 border border-red-500/20 text-red-500 px-3 py-2 rounded-lg text-xs font-bold tracking-wide active:scale-95 hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5"
                       >
                         <Trash2 size={14} strokeWidth={2.5}/> Delete All Slots
                       </button>
                     )}
                     <button onClick={() => setSlotGroundId(service.id)} className="bg-blue-500/10 border border-blue-500/20 text-blue-500 px-4 py-2 rounded-lg text-xs font-bold tracking-wide active:scale-95 hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1.5">
                       <Clock size={14} strokeWidth={2.5}/> Add Availability Slots
                     </button>
                  </div>
               </div>
               
               {serviceSlots.length === 0 ? (
                  <div className="py-8 bg-[var(--panel-bg)] rounded-2xl flex flex-col items-center justify-center text-center">
                    <p className="text-sm font-semibold text-[var(--muted)]">No availability set for this service.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-2">
                    {serviceSlots.map(slot => (
                      <div key={slot.id} className="relative bg-[var(--panel-bg)] p-3 rounded-2xl border border-[var(--panel-border)] hover:border-blue-500/30 transition-colors group">
                        <div className="absolute top-2 right-2 flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => setEditingSlot(slot)} className="w-7 h-7 rounded-lg bg-[var(--panel-bg)] border border-[var(--panel-border)] text-foreground hover:bg-blue-500 hover:text-white hover:border-blue-500 flex items-center justify-center shadow-sm transition-colors">
                            <Edit3 size={12} />
                          </button>
                          <button onClick={() => slotsStore.remove(slot.id)} className="w-7 h-7 rounded-lg bg-[var(--panel-bg)] border border-[var(--panel-border)] text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center shadow-sm transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div className="flex flex-col gap-1 pr-16">
                          <h4 className="text-sm font-black tracking-tight text-foreground leading-none">{slot.startTime} - {slot.endTime}</h4>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className="text-sm font-black text-blue-500">৳{slot.price}</span>
                            <span className="text-[10px] text-[var(--muted)] font-semibold">/ session</span>
                          </div>
                          <div className="flex items-center gap-1 mt-2 flex-wrap">
                            {slot.days.map(d => (
                              <span key={d} className="text-[9px] bg-blue-500/5 border border-blue-500/20 text-blue-400 font-bold px-2 py-0.5 rounded-full">{d.slice(0,3)}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
           );
        })}
      </div>

      <CustomSlotModal open={slotGroundId !== null} onClose={() => { setSlotGroundId(null); slotsStore.reload(); }} turfId={myProfile.id} groundId={slotGroundId} />
      <EditSlotModal open={editingSlot !== null} onClose={() => { setEditingSlot(null); slotsStore.reload(); }} slot={editingSlot} />
    </div>
  );
}
