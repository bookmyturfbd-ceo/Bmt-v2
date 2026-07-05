'use client';
import { useState, useEffect } from 'react';
import { getCookie } from '@/lib/cookies';
import { UserCircle, Loader2, Save, MapPin, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useApiEntity } from '@/hooks/useApiEntity';
import PremiumUploader from '@/components/shared/PremiumUploader';
import { uploadFileToCDN } from '@/lib/supabase';

interface City { id: string; name: string; }
interface Division { id: string; name: string; }
interface Turf {
  id: string; name: string; ownerId: string; status: string;
  cityId: string; divisionId: string; area?: string; imageUrls: string[];
  isCoachProfile: boolean; coachType: string;
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
    const bmtName = getCookie('bmt_name');
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

  if (turfsStore.loading || divisionsStore.loading || citiesStore.loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-[var(--muted)]">
        <Loader2 size={18} className="animate-spin" /> Loading your profile…
      </div>
    );
  }

  // Find the coach's profile (turf where ownerId matches and isCoachProfile is true)
  const myProfile = turfsStore.items.find(t => t.ownerId === ownerId);

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

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          ownerId,
          divisionId,
          cityId,
          area,
          imageUrls: uploadedImageUrls,
          status: 'published', // Coach profiles can auto-publish or be pending depending on policy, we use pending by default in turf API, let's pass published if the API allows or just let the admin approve.
          isCoachProfile: true,
          coachType
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to create profile');
      } else {
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
      setCoachType(myProfile.coachType || '');
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
      <div className="max-w-2xl mx-auto w-full glass-panel border border-[var(--panel-border)] rounded-[32px] p-6 md:p-10 animate-in fade-in slide-in-from-bottom-6 duration-300 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col items-center text-center mb-8 relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 border border-blue-500/30 flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
            <UserCircle size={32} className="text-blue-500" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">{myProfile ? 'Edit Professional Profile' : 'Setup Your Pro Profile'}</h2>
          <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed max-w-sm">
            {myProfile ? 'Update your personal brand and details.' : 'Create a premium personal profile to start listing your training and coaching slots.'}
          </p>
        </div>

        <form onSubmit={handleSaveProfile} className="flex flex-col gap-6 relative z-10">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Display / Professional Name</label>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Coach Rahim Uddin"
              className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-3.5 text-sm font-bold text-white focus:border-blue-500/50 outline-none transition-colors" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Profession / Specialty Type</label>
            <select required value={coachType || ''} onChange={e => setCoachType(e.target.value)}
              className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-3.5 text-sm font-bold text-white focus:border-blue-500/50 outline-none transition-colors">
              {COACH_TYPES.map(type => (
                <option key={type} value={type} className="text-black bg-white dark:bg-neutral-900 dark:text-white font-bold">{type}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Base Location / Area</label>
            <input value={area} onChange={e => setArea(e.target.value)} placeholder="e.g., Dhanmondi, Dhaka"
              className="w-full bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl px-4 py-3.5 text-sm font-bold text-white focus:border-blue-500/50 outline-none transition-colors" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Profile Picture / Avatar</label>
            <PremiumUploader label="Upload Photo" maxFiles={1} 
              initialUrls={existingImages}
              onRemoveInitialUrl={(url) => setExistingImages(prev => prev.filter(u => u !== url))}
              onFilesChange={setImageFiles} />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button type="submit" disabled={isCreating || !name || !coachType || !divisionId || !cityId}
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

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">My Profile</h2>
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
      <div className="glass-panel p-6 sm:p-8 rounded-[32px] border border-[var(--panel-border)] flex flex-col sm:flex-row items-center sm:items-start gap-6 shadow-xl relative overflow-hidden">
        {/* Profile Picture Frame with neon ring */}
        <div className="relative w-32 h-32 shrink-0 rounded-full p-[3px] bg-gradient-to-tr from-blue-500 via-cyan-400 to-blue-600 shadow-lg">
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
             <h2 className="text-3xl font-black text-white tracking-tight leading-none">{myProfile.name}</h2>
             {myProfile.status === 'published' && (
               <span className="text-[8px] font-black uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/25 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                 <ShieldCheck size={9} /> Verified
               </span>
             )}
           </div>
           
           <p className="text-blue-400 font-bold tracking-widest uppercase text-xs mt-2.5 leading-none">{myProfile.coachType}</p>
           
           <div className="flex items-center gap-1.5 mt-4 text-xs font-semibold text-[var(--muted)]">
             <MapPin size={13} className="text-blue-500/70 shrink-0" />
             <span>{myProfile.area ? `${myProfile.area}, ` : ''}{cityName}</span>
           </div>

           <div className="mt-7 flex gap-3">
             <button 
               onClick={handleEditClick} 
               className="px-5 py-2.5 rounded-xl bg-neutral-900 border border-white/5 hover:border-blue-500/30 text-white hover:text-blue-400 text-xs font-black transition-all active:scale-95"
             >
               Edit Details
             </button>
             {myProfile.status === 'published' && (
               <a 
                 href={`/turf/${myProfile.id}`}
                 target="_blank"
                 className="px-5 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white text-xs font-black transition-all flex items-center gap-1.5"
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
