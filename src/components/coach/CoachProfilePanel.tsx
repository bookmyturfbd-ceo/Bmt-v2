'use client';

import { useState, useEffect } from 'react';
import { getCookie } from '@/lib/cookies';
import { UserCircle, Loader2, MapPin, CheckCircle2, ShieldCheck, Check } from 'lucide-react';
import { useApiEntity } from '@/hooks/useApiEntity';
import PremiumUploader from '@/components/shared/PremiumUploader';
import { uploadFileToCDN } from '@/lib/supabase';

interface City { id: string; name: string; }
interface Division { id: string; name: string; }
interface Turf {
  id: string; name: string; ownerId: string; status: string;
  cityId: string; divisionId: string; area?: string; imageUrls: string[];
  isCoachProfile: boolean; coachType: string; professions?: string[];
  rules?: string;
}

const COACH_TYPES = [
  'Cricket Coach', 'Football Coach', 'Futsal Coach', 'Swimming Trainer', 
  'Gym Trainer', 'Fitness Coach', 'Football Referee', 'Cricket Umpire', 
  'Scoreboard Manager', 'Physio', 'Nutritionist', 'Yoga Instructor', 'Other'
];

export default function CoachProfilePanel() {
  const [ownerId, setOwnerId] = useState('');
  
  const turfsStore = useApiEntity<Turf>('turfs');
  const citiesStore = useApiEntity<City>('cities');
  const divisionsStore = useApiEntity<Division>('divisions');

  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [coachType, setCoachType] = useState('Cricket Coach');
  const [selectedProfessions, setSelectedProfessions] = useState<string[]>([]);
  const [availableProfessions, setAvailableProfessions] = useState<string[]>(COACH_TYPES);
  const [divisionId, setDivisionId] = useState('');
  const [cityId, setCityId] = useState('');
  const [area, setArea] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);

  useEffect(() => {
    const id = getCookie('bmt_owner_id');
    setOwnerId(id);
    const bmtName = getCookie('bmt_name') || getCookie('bmt_owner_name');
    if (bmtName) setName(bmtName);

    fetch('/api/admin/turf-service-setting')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.professionTypes) && d.professionTypes.length > 0) {
          setAvailableProfessions(d.professionTypes);
        }
      })
      .catch(() => {});
  }, []);

  const myProfile = turfsStore.items.find(t => t.ownerId === ownerId);

  // Sync initial state when myProfile lands
  useEffect(() => {
    if (myProfile && !isEditing) {
      if (myProfile.name) setName(myProfile.name);
      if (myProfile.coachType) setCoachType(myProfile.coachType);
      if (Array.isArray(myProfile.professions) && myProfile.professions.length > 0) {
        setSelectedProfessions(myProfile.professions);
      } else if (myProfile.coachType) {
        setSelectedProfessions([myProfile.coachType]);
      }
    }
  }, [myProfile, isEditing]);

  if (turfsStore.loading || divisionsStore.loading || citiesStore.loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-[var(--muted)]">
        <Loader2 size={18} className="animate-spin text-blue-500" /> Loading your profile…
      </div>
    );
  }

  const toggleProfession = (prof: string) => {
    setSelectedProfessions(prev => {
      const exists = prev.includes(prof);
      const updated = exists ? prev.filter(p => p !== prof) : [...prev, prof];
      if (updated.length > 0) {
        setCoachType(updated[0]);
      }
      return updated;
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      let uploadedImageUrls: string[] = [...existingImages];
      if (imageFiles.length > 0) {
        const urls = await Promise.all(imageFiles.map(f => uploadFileToCDN(f, 'turfs')));
        const newUrls = urls.filter((url): url is string => url !== null);
        uploadedImageUrls = [...uploadedImageUrls, ...newUrls];
      }

      const method = myProfile ? 'PATCH' : 'POST';
      const url = myProfile ? `/api/bmt/turfs/${myProfile.id}` : '/api/bmt/turfs';

      const finalProfessions = selectedProfessions.length > 0 ? selectedProfessions : [coachType];
      const primaryCoachType = finalProfessions[0] || coachType || 'Professional';

      // 1. Save Turf Profile
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          ownerId,
          divisionId,
          cityId,
          area,
          imageUrls: uploadedImageUrls,
          status: 'published',
          isCoachProfile: true,
          coachType: primaryCoachType,
          professions: finalProfessions,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to save profile');
      } else {
        // 2. Sync Owner Name in DB
        if (ownerId && name.trim()) {
          await fetch(`/api/bmt/owners/${ownerId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim() }),
          }).catch(() => {});

          // 3. Update Client Session Cookies
          document.cookie = `bmt_name=${encodeURIComponent(name.trim())}; path=/; max-age=604800`;
          document.cookie = `bmt_owner_name=${encodeURIComponent(name.trim())}; path=/; max-age=604800`;
        }

        await turfsStore.reload();
        setIsEditing(false);
      }
    } catch (err) {
      console.error(err);
      alert('Error saving profile');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditClick = () => {
    if (myProfile) {
      setName(myProfile.name || '');
      setCoachType(myProfile.coachType || 'Cricket Coach');
      setSelectedProfessions(Array.isArray(myProfile.professions) && myProfile.professions.length > 0 ? myProfile.professions : [myProfile.coachType || 'Cricket Coach']);
      setDivisionId(myProfile.divisionId || '');
      setCityId(myProfile.cityId || '');
      setArea(myProfile.area || '');
      setExistingImages(myProfile.imageUrls || []);
      setImageFiles([]);
      setIsEditing(true);
    }
  };

  const availableCities = citiesStore.items.filter(c => c.id === divisionId || (c as any).divisionId === divisionId);

  if (!myProfile || isEditing) {
    // Show Onboarding / Edit Form
    return (
      <div className="max-w-2xl mx-auto w-full glass-panel border border-[var(--panel-border)] rounded-3xl md:rounded-[32px] p-5 sm:p-8 md:p-10 animate-in fade-in slide-in-from-bottom-6 duration-300 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col items-center text-center mb-6 sm:mb-8 relative z-10">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <UserCircle size={28} className="text-blue-500" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">{myProfile ? 'Edit Professional Profile' : 'Setup Your Pro Profile'}</h2>
          <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed max-w-sm">
            {myProfile ? 'Update your display name, specialty professions, and location.' : 'Create your pro profile to start listing your training slots on Book My Turf.'}
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="flex flex-col gap-5 relative z-10">
          {/* Display Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Display / Professional Name</label>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Coach Rahim Uddin"
              className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-3.5 text-sm font-bold text-white focus:border-blue-500/50 outline-none transition-colors" />
          </div>

          {/* Specialty Professions Multi-Select */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Profession / Specialty Types (Select all that apply)</label>
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto custom-scrollbar p-3 bg-black/20 rounded-2xl border border-white/5">
              {availableProfessions.map(type => {
                const isSelected = selectedProfessions.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleProfession(type)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-500 text-white border border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)]'
                        : 'bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {isSelected && <Check size={12} strokeWidth={3} />}
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Division</label>
              <select required value={divisionId || ''} onChange={e => { setDivisionId(e.target.value); setCityId(''); }}
                className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-blue-500/50">
                <option value="" className="text-neutral-500 bg-white dark:bg-neutral-900">Select Division</option>
                {divisionsStore.items.map(d => <option key={d.id} value={d.id} className="text-black bg-white dark:bg-neutral-900 dark:text-white font-bold">{d.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">City/Zone</label>
              <select required disabled={!divisionId} value={cityId || ''} onChange={e => setCityId(e.target.value)}
                className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-3.5 text-sm font-bold text-white outline-none focus:border-blue-500/50 disabled:opacity-50">
                <option value="" className="text-neutral-500 bg-white dark:bg-neutral-900">Select City</option>
                {availableCities.map(c => <option key={c.id} value={c.id} className="text-black bg-white dark:bg-neutral-900 dark:text-white font-bold">{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Area */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Base Location / Area</label>
            <input value={area} onChange={e => setArea(e.target.value)} placeholder="e.g., Dhanmondi, Dhaka"
              className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-3.5 text-sm font-bold text-white focus:border-blue-500/50 outline-none transition-colors" />
          </div>

          {/* Profile Picture Upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Profile Picture / Avatar</label>
            <PremiumUploader label="Upload Photo" maxFiles={1} 
              initialUrls={existingImages}
              onRemoveInitialUrl={(url) => setExistingImages(prev => prev.filter(u => u !== url))}
              onFilesChange={setImageFiles} />
          </div>

          {/* Submit Actions */}
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <button type="submit" disabled={isCreating || !name || !divisionId || !cityId}
              className="flex-1 bg-blue-500 hover:brightness-110 text-white font-black text-sm py-4 rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-[0_4px_15px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2">
              {isCreating && <Loader2 size={16} className="animate-spin" />}
              {myProfile ? 'Save Changes' : 'Publish Profile'}
            </button>
            {myProfile && (
              <button type="button" onClick={() => setIsEditing(false)} disabled={isCreating}
                className="px-6 py-4 rounded-2xl bg-[var(--panel-bg)] border border-[var(--panel-border)] hover:bg-[var(--panel-bg-hover)] text-sm font-bold transition-colors">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    );
  }

  // Profile View
  const cityName = citiesStore.items.find(c => c.id === myProfile.cityId)?.name || 'Unknown City';
  const displayProfessions = Array.isArray(myProfile.professions) && myProfile.professions.length > 0
    ? myProfile.professions
    : [myProfile.coachType || 'Professional'];

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">My Profile</h2>
          <p className="text-xs text-[var(--muted)] mt-0.5">Manage your public professional brand.</p>
        </div>
        {myProfile.status !== 'published' ? (
          <span className="text-[10px] font-black tracking-widest uppercase bg-orange-500/10 text-orange-400 px-3 py-1.5 rounded-xl border border-orange-500/20">
            Pending Review
          </span>
        ) : (
          <span className="text-[10px] font-black tracking-widest uppercase bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-xl border border-blue-500/20 flex items-center gap-1">
            <CheckCircle2 size={11} /> Published
          </span>
        )}
      </div>

      {/* Profile Detail Card */}
      <div className="glass-panel p-5 sm:p-8 rounded-3xl md:rounded-[32px] border border-[var(--panel-border)] flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-xl relative overflow-hidden">
        {/* Profile Picture Frame with neon ring */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-full p-[3px] bg-gradient-to-tr from-blue-500 via-cyan-400 to-blue-600 shadow-lg">
          <div className="w-full h-full rounded-full bg-neutral-950 overflow-hidden flex items-center justify-center">
            {myProfile.imageUrls?.[0] ? (
              <img src={myProfile.imageUrls[0]} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <UserCircle size={64} className="text-blue-500 opacity-40" />
            )}
          </div>
        </div>
        
        <div className="flex-1 flex flex-col items-center sm:items-start text-center sm:text-left min-w-0">
           <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
             <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-none">{name || myProfile.name}</h2>
             {myProfile.status === 'published' && (
               <span className="text-[8px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                 <ShieldCheck size={9} /> Verified
               </span>
             )}
           </div>
           
           {/* Professions Pills */}
           <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-start mt-2.5">
             {displayProfessions.map(prof => (
               <span key={prof} className="text-[10px] font-black tracking-wider uppercase text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-lg">
                 {prof}
               </span>
             ))}
           </div>
           
           <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-[var(--muted)]">
             <MapPin size={13} className="text-blue-500/70 shrink-0" />
             <span>{myProfile.area ? `${myProfile.area}, ` : ''}{cityName}</span>
           </div>

           <div className="mt-6 flex flex-wrap justify-center sm:justify-start gap-3 w-full sm:w-auto">
             <button 
               onClick={handleEditClick} 
               className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-neutral-900 border border-white/10 hover:border-blue-500/30 text-white hover:text-blue-400 text-xs font-black transition-all active:scale-95"
             >
               Edit Details
             </button>
             {myProfile.status === 'published' && (
               <a 
                 href={`/turf/${myProfile.id}`}
                 target="_blank"
                 className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white text-xs font-black transition-all flex items-center justify-center gap-1.5"
               >
                 View Public Page ↗
               </a>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
