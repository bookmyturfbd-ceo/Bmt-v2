'use client';

import { useState, useEffect } from 'react';
import { getCookie } from '@/lib/cookies';
import { Plus, Clock, Dumbbell, Trash2, Edit3, Loader2, Sparkles, AlertTriangle } from 'lucide-react';
import { useApiEntity } from '@/hooks/useApiEntity';
import CoachSlotModal from './CoachSlotModal';

interface Turf { id: string; name: string; ownerId: string; status: string; isCoachProfile: boolean; }
interface Ground { id: string; turfId: string; name: string; }
interface Slot {
  id: string; turfId: string; groundId: string;
  days: string[]; gameType: string; sports: string[];
  startTime: string; endTime: string; price: number;
  timeCategory?: string; slotType?: string;
  admissionFee?: number; monthlyFee?: number; pricingType?: string;
}

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
        <Loader2 size={18} className="animate-spin text-blue-500" /> Loading services…
      </div>
    );
  }

  const myProfile = turfsStore.items.find(t => t.ownerId === ownerId);

  if (!myProfile) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center gap-3 border border-dashed border-[var(--panel-border)] rounded-3xl glass-panel">
        <Dumbbell size={32} className="text-[var(--muted)] opacity-50" />
        <p className="font-bold text-white">No Profile Found</p>
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
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">My Services</h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Define your service types (e.g. 1-on-1, Monthly Group) and configure custom pricing & availability.
          </p>
        </div>
        <button 
          onClick={() => setIsCreatingService(!isCreatingService)} 
          className="bg-blue-500 hover:brightness-110 text-white px-4 py-3 rounded-xl text-xs font-black tracking-wider shadow-[0_4px_15px_rgba(59,130,246,0.25)] active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus size={14} strokeWidth={3}/> Add Service Type
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {/* Create Service Form */}
        {isCreatingService && (
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!newServiceName.trim()) return;
            await fetch('/api/bmt/grounds', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ turfId: myProfile.id, name: newServiceName.trim() })
            });
            setNewServiceName('');
            setIsCreatingService(false);
            groundsStore.reload();
          }} className="glass-panel p-5 rounded-3xl border border-[var(--panel-border)] flex flex-col sm:flex-row items-end gap-3 shadow-lg animate-in slide-in-from-top-3 duration-200">
            <div className="flex-1 flex flex-col gap-1.5 w-full">
               <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Service / Format Name</label>
               <input autoFocus required value={newServiceName} onChange={e => setNewServiceName(e.target.value)} placeholder="e.g. Personal 1-on-1 Coaching, Monthly Group Drill" 
                 className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500/50" />
            </div>
            <button type="submit" className="bg-blue-500 hover:brightness-110 text-white px-6 py-3 rounded-xl text-sm font-black w-full sm:w-auto active:scale-95 transition-all">
              Create Service
            </button>
          </form>
        )}

        {/* Empty state */}
        {myServices.length === 0 && !isCreatingService && (
          <div className="py-16 glass-panel border border-dashed border-[var(--panel-border)] rounded-[32px] flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--panel-bg)] flex items-center justify-center border border-[var(--panel-border)] shadow-inner">
              <Dumbbell size={24} className="text-blue-500 opacity-60" />
            </div>
            <div>
              <p className="text-sm font-black text-white">No Services Defined</p>
              <p className="text-xs text-[var(--muted)] max-w-[300px] mt-1.5 mx-auto">Create your first service type to start defining your available training/coaching slots.</p>
            </div>
            <button onClick={() => setIsCreatingService(true)} className="text-blue-400 font-bold text-xs hover:underline decoration-2 underline-offset-4 tracking-wider uppercase">
              Add your first service
            </button>
          </div>
        )}

        {/* Services List */}
        {myServices.map(service => {
           const serviceSlots = mySlots.filter(s => s.groundId === service.id).sort((a,b) => parseTime12h(a.startTime) - parseTime12h(b.startTime));
           return (
             <div key={service.id} className="glass-panel p-5 sm:p-6 rounded-3xl border border-[var(--panel-border)] flex flex-col gap-4 shadow-sm relative overflow-hidden">
               <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--panel-border)] pb-4 gap-3">
                  <div>
                    <h4 className="font-black text-base text-white flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" /> {service.name}
                    </h4>
                    <p className="text-[10px] text-[var(--muted)] mt-1 font-bold uppercase tracking-widest">{serviceSlots.length} available slots</p>
                  </div>

                  {/* Actions for Service: Add Slot & Delete Service */}
                  <div className="flex flex-wrap items-center gap-2">
                     <button 
                       onClick={() => setSlotGroundId(service.id)} 
                       className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1.5"
                     >
                       <Clock size={12} /> Add Availability
                     </button>

                     <button 
                       onClick={async () => {
                         if (window.confirm(`Are you sure you want to delete service type "${service.name}"? This will permanently delete this service and all its availability slots.`)) {
                           await fetch(`/api/bmt/grounds/${service.id}`, { method: 'DELETE' });
                           groundsStore.reload();
                           slotsStore.reload();
                         }
                       }} 
                       className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider active:scale-95 hover:bg-red-500 hover:text-white transition-all flex items-center gap-1.5"
                     >
                       <Trash2 size={12} /> Delete Service
                     </button>
                  </div>
               </div>
               
               {/* Slot Cards */}
               {serviceSlots.length === 0 ? (
                  <div className="py-8 bg-[var(--panel-bg)] rounded-2xl flex flex-col items-center justify-center text-center border border-[var(--panel-border)] border-dashed">
                    <p className="text-xs font-bold text-[var(--muted)]">No active availability slots set for this service.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                    {serviceSlots.map(slot => {
                      const isMonthly = slot.pricingType === 'MONTHLY' || slot.slotType === 'MONTHLY';
                      return (
                        <div key={slot.id} className="relative bg-[var(--panel-bg)] p-4 rounded-2xl border border-[var(--panel-border)] hover:border-blue-500/30 transition-all group overflow-hidden flex flex-col justify-between">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                isMonthly ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20' : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                              }`}>
                                {isMonthly ? 'Monthly Package' : '1-on-1 Package'}
                              </span>
                              <h4 className="text-sm font-black tracking-tight text-white mt-1.5">{slot.startTime} - {slot.endTime}</h4>
                            </div>

                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
                              <button onClick={() => setEditingSlot(slot)} className="w-7 h-7 rounded-lg bg-[var(--panel-bg)] border border-[var(--panel-border)] text-white hover:bg-blue-500 hover:text-white hover:border-blue-500 flex items-center justify-center shadow-sm transition-all hover:scale-105">
                                <Edit3 size={11} />
                              </button>
                              <button onClick={() => slotsStore.remove(slot.id)} className="w-7 h-7 rounded-lg bg-[var(--panel-bg)] border border-[var(--panel-border)] text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 flex items-center justify-center shadow-sm transition-all hover:scale-105">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>

                          {/* Pricing Display */}
                          <div className="mt-3 pt-2.5 border-t border-white/5">
                            {isMonthly ? (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-baseline justify-between text-xs">
                                  <span className="text-[10px] text-neutral-400 font-bold">Admission:</span>
                                  <span className="font-black text-purple-300">৳{slot.admissionFee || 0}</span>
                                </div>
                                <div className="flex items-baseline justify-between text-xs">
                                  <span className="text-[10px] text-neutral-400 font-bold">Monthly Fee:</span>
                                  <span className="font-black text-blue-400">৳{slot.monthlyFee || slot.price}/mo</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-baseline justify-between text-xs">
                                <span className="text-[10px] text-neutral-400 font-bold">Session Price:</span>
                                <span className="font-black text-blue-400">৳{slot.price}</span>
                              </div>
                            )}

                            {/* Active Days */}
                            <div className="flex items-center gap-1 mt-2.5 flex-wrap">
                              {slot.days.map(d => (
                                <span key={d} className="text-[8px] bg-blue-500/5 border border-blue-500/10 text-blue-400 font-black px-1.5 py-0.5 rounded-md">
                                  {d.slice(0,3)}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
             </div>
           );
        })}
      </div>

      <CoachSlotModal 
        open={slotGroundId !== null || editingSlot !== null} 
        onClose={() => { setSlotGroundId(null); setEditingSlot(null); slotsStore.reload(); }} 
        turfId={myProfile.id} 
        groundId={editingSlot ? editingSlot.groundId : slotGroundId}
        editingSlot={editingSlot} 
      />
    </div>
  );
}
