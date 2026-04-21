'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MapPin, Tent, Trophy, Users, Star, X, Loader2, Swords, Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import SquadManager from '@/components/teams/SquadManager';

// ── Rank Math (mirrors SquadManager) ───────────────────────────────────────
function getRankData(mmr: number) {
  if (mmr <= 699)  return { label: 'Bronze III', rank: 'Bronze', tier: 'III', color: 'from-[#6e462d] to-[#4a2e1b]', text: 'text-[#cd7f32]', border: 'border-[#cd7f32]/30', min: 0, next: 700, glow: '165,80,0', icon: '/ranks/Bronze.svg' };
  if (mmr <= 799)  return { label: 'Bronze II',  rank: 'Bronze', tier: 'II', color: 'from-[#6e462d] to-[#4a2e1b]', text: 'text-[#cd7f32]', border: 'border-[#cd7f32]/40', min: 700, next: 800, glow: '165,80,0', icon: '/ranks/Bronze.svg' };
  if (mmr <= 899)  return { label: 'Bronze I',   rank: 'Bronze', tier: 'I', color: 'from-[#6e462d] to-[#4a2e1b]', text: 'text-[#cd7f32]', border: 'border-[#cd7f32]/50', min: 800, next: 900, glow: '165,80,0', icon: '/ranks/Bronze.svg' };
  if (mmr <= 999)  return { label: 'Silver III', rank: 'Silver', tier: 'III', color: 'from-[#606060] to-[#3a3a3a]', text: 'text-[#c0c0c0]', border: 'border-[#c0c0c0]/30', min: 900, next: 1000, glow: '180,180,180', icon: '/ranks/Silver.svg' };
  if (mmr <= 1099) return { label: 'Silver II',  rank: 'Silver', tier: 'II',  color: 'from-[#606060] to-[#3a3a3a]', text: 'text-[#c0c0c0]', border: 'border-[#c0c0c0]/40', min: 1000, next: 1100, glow: '180,180,180', icon: '/ranks/Silver.svg' };
  if (mmr <= 1199) return { label: 'Silver I',   rank: 'Silver', tier: 'I',   color: 'from-[#606060] to-[#3a3a3a]', text: 'text-[#c0c0c0]', border: 'border-[#c0c0c0]/50', min: 1100, next: 1200, glow: '180,180,180', icon: '/ranks/Silver.svg' };
  if (mmr <= 1299) return { label: 'Gold III',   rank: 'Gold', tier: 'III',   color: 'from-[#8a6800] to-[#4d3a00]', text: 'text-[#ffd700]', border: 'border-[#ffd700]/30', min: 1200, next: 1300, glow: '200,160,0', icon: '/ranks/Gold.svg' };
  if (mmr <= 1399) return { label: 'Gold II',    rank: 'Gold', tier: 'II',    color: 'from-[#8a6800] to-[#4d3a00]', text: 'text-[#ffd700]', border: 'border-[#ffd700]/40', min: 1300, next: 1400, glow: '200,160,0', icon: '/ranks/Gold.svg' };
  if (mmr <= 1499) return { label: 'Gold I',     rank: 'Gold', tier: 'I',     color: 'from-[#8a6800] to-[#4d3a00]', text: 'text-[#ffd700]', border: 'border-[#ffd700]/50', min: 1400, next: 1500, glow: '200,160,0', icon: '/ranks/Gold.svg' };
  if (mmr <= 1599) return { label: 'Platinum III', rank: 'Platinum', tier: 'III', color: 'from-[#005e66] to-[#003338]', text: 'text-[#00e5ff]', border: 'border-[#00e5ff]/30', min: 1500, next: 1600, glow: '0,200,220', icon: '/ranks/Platinum.svg' };
  if (mmr <= 1699) return { label: 'Platinum II',  rank: 'Platinum', tier: 'II',  color: 'from-[#005e66] to-[#003338]', text: 'text-[#00e5ff]', border: 'border-[#00e5ff]/40', min: 1600, next: 1700, glow: '0,200,220', icon: '/ranks/Platinum.svg' };
  if (mmr <= 1799) return { label: 'Platinum I',   rank: 'Platinum', tier: 'I',   color: 'from-[#005e66] to-[#003338]', text: 'text-[#00e5ff]', border: 'border-[#00e5ff]/50', min: 1700, next: 1800, glow: '0,200,220', icon: '/ranks/Platinum.svg' };
  return { label: 'BMT Legend', rank: 'BMT Legend', tier: '', color: 'from-[#800080] to-[#330033]', text: 'text-[#ff00ff]', border: 'border-[#ff00ff]/60', min: 1800, next: 2000, glow: '200,0,200', icon: '/ranks/Legend.svg' };
}

// ── Season Countdown ──
function useCountdown(endDate: string | null) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!endDate) { setRemaining(''); return; }
    const tick = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Ended'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endDate]);
  return remaining;
}

// ── Editable Decree Card ────────────────────────────────────────────────────
function EditableDecree({
  ann, isOMC, isEditing, saving,
  onEdit, onDelete, onSave, onCancel,
}: {
  ann: any;
  isOMC: boolean;
  isEditing: boolean;
  saving: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSave: (title: string, content: string) => void;
  onCancel: () => void;
}) {
  const [editTitle,   setEditTitle]   = useState(ann.title);
  const [editContent, setEditContent] = useState(ann.content);

  // Reset local state whenever a different decree enters edit mode
  useEffect(() => {
    if (isEditing) { setEditTitle(ann.title); setEditContent(ann.content); }
  }, [isEditing, ann.title, ann.content]);

  return (
    <div className="border border-[#a67c52]/20 rounded-2xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)' }}>
      {isEditing ? (
        <div className="p-4 flex flex-col gap-2">
          <p className="text-[#d4af37] text-[9px] font-black uppercase tracking-widest mb-1">✏️ Edit Decree</p>
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            className="w-full bg-black/50 border border-[#a67c52]/30 rounded-xl px-4 py-2.5 text-sm text-[#e6d0a3] focus:outline-none focus:border-[#d4af37] font-serif italic placeholder:text-[#a67c52]/40"
          />
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            rows={3}
            className="w-full bg-black/50 border border-[#a67c52]/30 rounded-xl px-4 py-2.5 text-sm text-[#e6d0a3] focus:outline-none focus:border-[#d4af37] font-serif resize-none"
          />
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => onSave(editTitle, editContent)}
              disabled={saving || !editTitle.trim() || !editContent.trim()}
              className="flex-1 py-2 rounded-xl font-black text-sm transition-all disabled:opacity-40 border border-[#d4af37]/50"
              style={{ background: 'linear-gradient(90deg, #6b3c10, #a06420, #6b3c10)', color: '#fde8a0' }}
            >
              💾 Save
            </button>
            <button
              onClick={onCancel}
              className="flex-1 py-2 rounded-xl font-black text-sm bg-neutral-800 hover:bg-neutral-700 text-[#a67c52] border border-[#a67c52]/20 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <p className="font-serif font-black text-[#e6d0a3] text-sm leading-snug flex-1">{ann.title}</p>
            {isOMC && (
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={onEdit}
                  className="text-[9px] px-2 py-1 rounded-lg bg-[#a67c52]/10 hover:bg-[#a67c52]/20 border border-[#a67c52]/20 text-[#a67c52] hover:text-[#d4af37] font-black uppercase tracking-wider transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={onDelete}
                  disabled={saving}
                  className="text-[9px] px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-black uppercase tracking-wider transition-colors disabled:opacity-40"
                >
                  Del
                </button>
              </div>
            )}
          </div>
          <p className="font-serif text-[#a67c52] text-xs leading-relaxed whitespace-pre-wrap">{ann.content}</p>
          <p className="text-[#a67c52]/40 text-[9px] font-bold mt-2 uppercase tracking-widest">
            {new Date(ann.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      )}
    </div>
  );
}

export default function SingleTeamPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  
  const [team, setTeam] = useState<any>(null);
  const [activeSeason, setActiveSeason] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [editingAnnId, setEditingAnnId] = useState<string | null>(null);
  const [showCMHistory, setShowCMHistory] = useState(false);
  const [cmSlots, setCmSlots] = useState<any[]>([]);
  
  const [myRole, setMyRole] = useState('none');
  const isOM  = ['owner', 'manager'].includes(myRole);
  const isOMC = ['owner', 'manager', 'captain'].includes(myRole);

  // Modals
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showTurfModal, setShowTurfModal] = useState(false);
  const [showSubModal,  setShowSubModal]  = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [search, setSearch] = useState('');

  // Lookup data for dropdowns
  const [cities, setCities] = useState<any[]>([]);
  const [turfs, setTurfs]   = useState<any[]>([]);

  const seasonCountdown = useCountdown(activeSeason?.endDate ?? null);

  useEffect(() => {
    fetch(`/api/teams/${id}`).then(r => r.json()).then(d => {
      setTeam(d.team);
      if (d.activeSeason) setActiveSeason(d.activeSeason);
      if (d.team && d.myPlayerId) {
        const me = d.team.members.find((m: any) => m.playerId === d.myPlayerId);
        setMyRole(me?.role || (d.team.ownerId === d.myPlayerId ? 'owner' : 'none'));
      }
      setLoading(false);
    });

    fetch('/api/bmt/cities').then(r => r.json()).then(d => setCities(Array.isArray(d) ? d : d.cities || []));
    fetch('/api/bmt/turfs').then(r => r.json()).then(d => setTurfs(Array.isArray(d) ? d : d.turfs || []));
    fetch(`/api/teams/${id}/announcements`).then(r => r.json()).then(d => setAnnouncements(Array.isArray(d) ? d : []));
    fetch('/api/bmt/slots').then(r => r.json()).then(d => setCmSlots(Array.isArray(d) ? d : []));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 size={32} className="text-accent animate-spin" />
      </div>
    );
  }

  if (!team) return <div className="text-center p-8">Team not found</div>;

  let sportName = '5-a-side Futsal';
  if (team.sportType === 'FUTSAL_6') sportName = '6-a-side Futsal';
  if (team.sportType === 'FUTSAL_7') sportName = '7-a-side Futsal';
  if (team.sportType === 'CRICKET_7') sportName = '7-a-side Cricket';
  if (team.sportType === 'FOOTBALL_FULL') sportName = 'Football (Full 11v11)';
  if (team.sportType === 'CRICKET_FULL') sportName = 'Cricket (Full 11v11)';
  
  const sportEmoji = team.sportType?.includes('CRICKET') ? '🏏' : '⚽';
  
  let maxRosterLimit = 9;
  if (team.sportType === 'FUTSAL_6') maxRosterLimit = 10;
  if (team.sportType === 'FUTSAL_7' || team.sportType === 'CRICKET_7') maxRosterLimit = 11;
  if (team.sportType === 'FOOTBALL_FULL' || team.sportType === 'CRICKET_FULL') maxRosterLimit = 15;

  const rankData = getRankData(team.teamMmr ?? 1000);
  const isSubActive = team.challengeSubscription?.active === true;

  // API Handlers
  const handleUpdateAreas = async (newCityIds: string[]) => {
    setSaving(true);
    const res = await fetch(`/api/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'set_home_areas', payload: { cityIds: newCityIds } })
    });
    if (res.ok) {
      const data = await res.json();
      setTeam({ ...team, homeAreas: data.homeAreas });
    }
    setSaving(false);
    setShowAreaModal(false);
  };

  const handleUpdateTurfs = async (newTurfIds: string[]) => {
    setSaving(true);
    const res = await fetch(`/api/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'set_home_turfs', payload: { turfIds: newTurfIds } })
    });
    if (res.ok) {
      const data = await res.json();
      setTeam({ ...team, homeTurfs: data.homeTurfs });
    }
    setSaving(false);
    setShowTurfModal(false);
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnTitle || !newAnnContent) return;
    setSaving(true);
    const res = await fetch(`/api/teams/${id}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newAnnTitle, content: newAnnContent })
    });
    if (res.ok) {
      const ann = await res.json();
      setAnnouncements([ann, ...announcements]);
      setNewAnnTitle(''); setNewAnnContent('');
    }
    setSaving(false);
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    setSaving(true);
    const res = await fetch(`/api/teams/${id}/announcements?annId=${annId}`, { method: 'DELETE' });
    if (res.ok) setAnnouncements(announcements.filter(a => a.id !== annId));
    setSaving(false);
  };

  const handleSaveEdit = async (annId: string, title: string, content: string) => {
    setSaving(true);
    const res = await fetch(`/api/teams/${id}/announcements?annId=${annId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content })
    });
    if (res.ok) {
      const ann = await res.json();
      setAnnouncements(announcements.map(a => a.id === annId ? ann : a));
    }
    setEditingAnnId(null);
    setSaving(false);
  };

  const cmMatches = [...(team?.matchesAsTeamA || []), ...(team?.matchesAsTeamB || [])]
    .filter(m => m.bookingCode)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleToggleSub = async () => {
    setSaving(true);
    const res = await fetch(`/api/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'toggle_subscription' })
    });
    if (res.ok) {
      const data = await res.json();
      setTeam({ ...team, isSubscribed: data.isSubscribed });
    }
    setSaving(false);
  };

  const handleDeleteTeam = async () => {
    if (!deletePassword) return;
    setSaving(true);
    setDeleteError('');
    const res = await fetch(`/api/teams/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_team', payload: { password: deletePassword } })
    });
    
    if (res.ok) {
       router.push('/en/teams');
    } else {
       const data = await res.json();
       setDeleteError(data.error || 'Failed to delete team.');
       setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 font-sans text-white">
      
      {/* HEADER SECTION */}
      <div className="relative w-full pb-6 px-4 overflow-hidden rounded-b-[40px] border-b border-accent/20 bg-gradient-to-b from-neutral-900 via-background to-background">
        {/* Rank-colored background glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl pointer-events-none"
          style={{ background: `rgba(${rankData.glow}, 0.08)` }}
        />

        <div className="max-w-md mx-auto grid grid-cols-3 items-start gap-2 relative z-10">
          
          {/* Left Banner: Rank & MMR */}
          <div className="flex flex-col items-center relative z-0">
            <div 
              style={{
                clipPath: 'polygon(0% 0%, 100% 0%, 95% 5%, 95% 85%, 100% 90%, 80% 90%, 50% 100%, 20% 90%, 0% 90%, 5% 85%, 5% 5%)',
                background: `linear-gradient(to bottom, rgba(${rankData.glow},0.4), rgba(10,10,10,0.9))`
              }}
              className="w-full h-80 backdrop-blur-md flex flex-col items-center justify-start pt-8 pb-10 shadow-2xl relative overflow-hidden group"
            >
              {/* Dynamic Banner Background colourized by the parent background mask through blend modes */}
              <img src="/banners/Banner%2001.svg" className="absolute top-0 left-0 w-full h-full object-cover mix-blend-overlay opacity-60 group-hover:scale-105 transition-transform duration-700 pointer-events-none" alt="" />
              <div 
                className="absolute inset-[2px] pointer-events-none"
                style={{ 
                  clipPath: 'polygon(0% 0%, 100% 0%, 95% 5%, 95% 85%, 100% 90%, 80% 90%, 50% 100%, 20% 90%, 0% 90%, 5% 85%, 5% 5%)',
                  background: `linear-gradient(to bottom, rgba(${rankData.glow},0.2), transparent)`
                }}
              />
              {/* MMR on top */}
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#00ff41]">MMR</p>
              <p className="text-sm font-black tracking-widest">{team.teamMmr ?? 1000}</p>
              <div className="w-8 h-[1px] my-2" style={{ background: `rgba(${rankData.glow},0.4)` }} />

              {/* Rank image + label at bottom */}
              <div className="mt-auto flex flex-col items-center w-full">
                <img src={rankData.icon} className="w-20 h-20 object-contain drop-shadow-[0_4px_16px_rgba(255,255,255,0.25)]" alt="Rank" />
                <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: rankData.color }}>Rank</p>
                <p className="text-xs font-black text-white text-center leading-tight px-1" style={{ color: rankData.color }}>
                  {rankData.label}
                </p>
              </div>
            </div>
          </div>

          {/* Middle: Logo, Name, Sport & subscription pill */}
          <div className="flex flex-col items-center mt-6 relative z-20">
            <div className="w-24 h-24 rounded-full border-4 border-[#0a0a0a] ring-2 ring-accent/60 shadow-[0_0_20px_rgba(0,255,65,0.2)] overflow-hidden flex items-center justify-center bg-neutral-800">
              {team.logoUrl ? (
                <img src={team.logoUrl} alt={team.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">{sportEmoji}</span>
              )}
            </div>
            <h1 className="mt-3 text-xl font-black text-center leading-tight whitespace-nowrap">{team.name}</h1>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs">{sportEmoji}</span>
              <span className="text-[11px] font-bold tracking-wide text-[var(--muted)]">
                {sportName}
              </span>
            </div>
            
            {/* CM Subscription Status Pill */}
            <div className="mt-2 w-full flex flex-col items-center gap-2 z-30">
              <button onClick={() => setShowSubModal(true)} className="relative group focus:outline-none">
                {isSubActive ? (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-fuchsia-600/20 border border-fuchsia-500/40 text-[10px] font-black text-fuchsia-400 uppercase tracking-wider group-hover:bg-fuchsia-600/30 transition-colors">
                    <Swords size={10} />
                    CM Subscribed
                  </div>
                ) : (
                  <div className="relative flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-800/60 border border-white/10 text-[10px] font-black text-white/30 uppercase tracking-wider overflow-hidden group-hover:bg-neutral-800 transition-colors">
                    <Swords size={10} />
                    <span>Subscribed</span>
                    {/* Strike-through line */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-[85%] h-[2px] bg-red-500/80 -rotate-2 mix-blend-screen" />
                    </div>
                  </div>
                )}
              </button>
              
              {/* Team Announcements Trigger */}
              <button onClick={() => setShowAnnouncements(true)} className="flex items-center gap-1.5 px-5 py-1 bg-neutral-800/80 hover:bg-neutral-800 rounded-full text-[10px] font-black uppercase text-amber-500 border border-amber-500/30 transition-colors shadow-[0_0_10px_rgba(245,158,11,0.1)]">
                📜 Team Scroll
              </button>
            </div>
          </div>

          {/* Right Banner: Roster & Season Countdown */}
          <div className="flex flex-col items-center relative z-0">
            <div 
               style={{ clipPath: 'polygon(0% 0%, 100% 0%, 95% 5%, 95% 85%, 100% 90%, 80% 90%, 50% 100%, 20% 90%, 0% 90%, 5% 85%, 5% 5%)' }}
               className="w-full h-80 bg-gradient-to-b from-amber-700/80 via-neutral-900/40 via-60% to-neutral-900/90 backdrop-blur-md flex flex-col items-center justify-start pt-8 pb-10 shadow-2xl relative overflow-hidden group"
            >
              <img src="/banners/Banner%2001.svg" className="absolute top-0 left-0 w-full h-full object-cover mix-blend-overlay opacity-60 group-hover:scale-105 transition-transform duration-700 pointer-events-none" alt="" />
              <div 
                className="absolute inset-[2px] bg-gradient-to-b from-amber-500/20 via-amber-500/5 to-transparent pointer-events-none"
                style={{ clipPath: 'polygon(0% 0%, 100% 0%, 95% 5%, 95% 85%, 100% 90%, 80% 90%, 50% 100%, 20% 90%, 0% 90%, 5% 85%, 5% 5%)' }}
              />
              <Users size={16} className="text-amber-500 mb-1" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80">Roster</p>
              <p className="text-sm font-black">{team.members?.length || 1} / {maxRosterLimit}</p>
              
              <div className="mt-auto flex flex-col items-center w-full">
                <div className="w-8 h-[1px] bg-amber-500/30 my-2" />
                {activeSeason && isSubActive ? (
                  <>
                    <Clock size={11} className="text-fuchsia-400 mb-0.5" />
                    <p className="text-[8px] font-bold uppercase tracking-widest text-fuchsia-400/80 leading-none">Season Ends</p>
                    <p className="text-[9px] font-black font-mono text-white mt-1 text-center leading-tight px-1">{seasonCountdown}</p>
                  </>
                ) : activeSeason ? (
                  <>
                    <p className="text-[8px] font-bold uppercase tracking-widest text-amber-500/60">Season</p>
                    <p className="text-[9px] font-black text-white/40 font-mono mt-0.5">{activeSeason.name}</p>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500/80">Season</p>
                    <p className="text-[11px] font-bold font-mono text-white/50">OFF</p>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Level Bar */}
        <div className="max-w-[280px] mx-auto mt-6 relative z-10">
           <div className="flex justify-between items-end mb-1.5 px-1">
             <span className="text-[11px] font-black text-accent uppercase tracking-wider">Level {team.level}</span>
             <span className="text-[10px] font-bold text-[var(--muted)]">{team.xp} XP</span>
           </div>
           <div className="w-full h-2.5 bg-black/60 rounded-full border border-white/5 overflow-hidden ring-1 ring-black/20">
             <div 
               className="h-full bg-gradient-to-r from-accent/50 to-accent rounded-full relative"
               style={{ width: `${Math.min(100, Math.max(5, (team.xp % 100)))}%` }}
             >
               <div className="absolute top-0 right-0 bottom-0 w-2 bg-white/30 rounded-full blur-[1px]" />
             </div>
           </div>
        </div>

      </div>

      {/* STRATEGY & INFO SECTIONS */}
      <div className="max-w-md mx-auto px-4 mt-6 flex flex-col gap-4">
        
        {/* Home Areas Box */}
        <div className="glass-panel p-1.5 rounded-lg border border-[var(--panel-border)]">
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin size={10} className="text-accent" />
            <h3 className="font-black text-[9px] tracking-widest uppercase">Home Areas</h3>
            <span className="text-[8px] text-[var(--muted)] ml-auto font-semibold">Max 3</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {team.homeAreas?.length === 0 ? (
              <p className="text-xs text-[var(--muted)] italic w-full text-center py-2">No home operating zones set.</p>
            ) : (
              team.homeAreas?.map((area: any) => (
                <div key={area.id} className="text-[9px] font-bold px-2 py-1 rounded-full bg-neutral-800/80 border border-white/10 flex items-center gap-1 group whitespace-nowrap">
                  <MapPin size={8} className="text-accent" />
                  <span className="truncate max-w-[120px]">{area.name}</span>
                  {isOM && (
                    <button 
                      onClick={() => handleUpdateAreas(team.homeAreas.filter((a: any) => a.id !== area.id).map((a: any) => a.id))}
                      className="ml-0.5 opacity-40 hover:opacity-100 hover:text-red-400 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              ))
            )}
            
            {isOM && (team.homeAreas?.length || 0) < 3 && (
              <button 
                onClick={() => { setSearch(''); setShowAreaModal(true); }}
                className="text-[11px] font-bold px-3 py-1.5 rounded-xl border border-dashed border-accent/40 text-accent hover:bg-accent/10 transition-colors flex items-center gap-1"
                disabled={saving}
              >
                + Add Area
              </button>
            )}
          </div>
        </div>

        {/* Home Turfs Box */}
        <div className="glass-panel p-1.5 rounded-lg border border-[var(--panel-border)]">
          <div className="flex items-center gap-1.5 mb-1">
            <Tent size={10} className="text-accent" />
            <h3 className="font-black text-[9px] tracking-widest uppercase">Home Turfs</h3>
            <span className="text-[8px] text-[var(--muted)] ml-auto font-semibold">Max 3</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {team.homeTurfs?.length === 0 ? (
              <p className="text-xs text-[var(--muted)] italic w-full text-center py-2">No preferred venues set.</p>
            ) : (
              team.homeTurfs?.map((turf: any) => (
                <div key={turf.id} className="text-[9px] font-bold px-2 py-1 rounded-full bg-neutral-800/80 border border-white/10 flex items-center gap-1 group whitespace-nowrap">
                  <Tent size={8} className="text-accent" />
                  <span className="truncate max-w-[120px]">{turf.name}</span>
                  {isOM && (
                    <button 
                      onClick={() => handleUpdateTurfs(team.homeTurfs.filter((t: any) => t.id !== turf.id).map((t: any) => t.id))}
                      className="ml-0.5 opacity-40 hover:opacity-100 hover:text-red-400 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              ))
            )}
            
            {isOM && (team.homeTurfs?.length || 0) < 3 && (
              <button 
                onClick={() => { setSearch(''); setShowTurfModal(true); }}
                className="text-xs w-full py-2.5 rounded-xl border border-dashed border-white/20 text-[var(--muted)] hover:border-accent/40 hover:text-accent font-bold transition-colors"
                disabled={saving}
              >
                + Connect Turf
              </button>
            )}
          </div>
        </div>

      </div>

      <div className="max-w-md mx-auto px-4 mt-6">
                {/* CM Booking History Box */}
        <div className="mt-4 glass-panel border border-[var(--panel-border)] rounded-2xl overflow-hidden mb-6 relative">
          <div className="px-4 py-3.5 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"><Clock size={13} className="text-blue-400" /></div>
              <p className="font-black text-sm">CM Joint Bookings</p>
            </div>
          </div>
          <div className="border-t border-white/5 p-4 flex flex-col gap-3 relative z-10">
            <button onClick={() => setShowCMHistory(true)} className="w-full py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-xs rounded-xl transition-colors border border-blue-500/30">
              View Shared Ledgers
            </button>
          </div>
        </div>
        <SquadManager team={team} setTeam={setTeam} myRole={myRole} />
        
        {/* TEAM DANGER ZONE */}
        {myRole === 'owner' && (
          <div className="mt-6 glass-panel border border-red-500/20 rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 group-hover:opacity-20 transition-all">
              <AlertTriangle size={80} className="text-red-500" />
            </div>
            <div className="flex items-center gap-2 text-red-500 mb-1 relative z-10">
              <AlertTriangle size={16} />
              <h3 className="font-black text-sm uppercase tracking-widest">Danger Zone</h3>
            </div>
            <p className="text-xs text-[var(--muted)] leading-relaxed mb-1 relative z-10">Deleting this team is permanent and cannot be undone. All matches, trophies, and CM progress will be forever lost.</p>
            <button 
              onClick={() => setShowDeleteModal(true)} 
              className="w-full py-3 rounded-xl border border-red-500/40 text-red-400 font-black text-xs hover:bg-red-500/10 transition-colors uppercase tracking-widest relative z-10"
            >
              Delete Team
            </button>
          </div>
        )}

      </div>

      {/* AREA MODAL */}
      {showAreaModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 pb-0 sm:pb-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAreaModal(false)} />
          <div className="relative w-full max-w-md bg-neutral-900 border border-[var(--panel-border)] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[70vh] sm:h-[600px] animate-in slide-in-from-bottom flex flex-col">
            <div className="p-4 border-b border-[var(--panel-border)] flex items-center justify-between shrink-0">
              <h2 className="font-black text-lg">Select Home Area</h2>
              <button onClick={() => setShowAreaModal(false)} className="p-2 hover:bg-white/5 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-4 shrink-0">
              <input 
                type="text" placeholder="Search cities..."
                className="w-full bg-neutral-800 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4 pt-0 gap-2 flex flex-col">
              {cities.filter((c: any) => c.name.toLowerCase().includes(search.toLowerCase()) && !team.homeAreas?.find((ha: any) => ha.id === c.id))
                .map((city: any) => (
                <button 
                  key={city.id}
                  onClick={() => handleUpdateAreas([...(team.homeAreas?.map((a: any) => a.id) || []), city.id])}
                  className="w-full text-left p-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 border border-transparent hover:border-accent/30 transition-colors flex items-center gap-3"
                >
                  <MapPin size={16} className="text-[var(--muted)]" />
                  <div>
                    <p className="font-bold text-sm leading-tight">{city.name}</p>
                    <p className="text-[10px] text-[var(--muted)]">{city.division?.name || 'Division'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TURF MODAL */}
      {showTurfModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 pb-0 sm:pb-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowTurfModal(false)} />
          <div className="relative w-full max-w-md bg-neutral-900 border border-[var(--panel-border)] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col h-[70vh] sm:h-[600px] animate-in slide-in-from-bottom flex flex-col">
            <div className="p-4 border-b border-[var(--panel-border)] flex items-center justify-between shrink-0">
              <h2 className="font-black text-lg">Connect Home Turf</h2>
              <button onClick={() => setShowTurfModal(false)} className="p-2 hover:bg-white/5 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-4 shrink-0">
              <input 
                type="text" placeholder="Search turfs..."
                className="w-full bg-neutral-800 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent"
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4 pt-0 gap-2 flex flex-col">
              {turfs.filter((t: any) => t.name.toLowerCase().includes(search.toLowerCase()) && !team.homeTurfs?.find((ht: any) => ht.id === t.id))
                .map((turf: any) => (
                <button 
                  key={turf.id}
                  onClick={() => handleUpdateTurfs([...(team.homeTurfs?.map((t: any) => t.id) || []), turf.id])}
                  className="w-full text-left p-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 border border-transparent hover:border-accent/30 transition-colors flex items-center gap-3"
                >
                  <Tent size={16} className="text-[var(--muted)]" />
                  <div>
                    <p className="font-bold text-sm leading-tight">{turf.name}</p>
                    <p className="text-[10px] text-[var(--muted)] uppercase tracking-wider mt-0.5">{turf.city?.name || 'City'} • {turf.area || 'Area'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Sub Modal ── */}
      {showSubModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowSubModal(false)}>
          <div className="bg-neutral-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center mb-4 text-[#00ff41]">
              <Swords size={20} />
            </div>
            <h3 className="font-black text-xl mb-1 text-white">Challenge Market Stats</h3>
            <p className="text-[11px] text-[var(--muted)] mb-6 font-bold">
              Subscription rules and history for <span className="text-white">{team.name}</span>
            </p>

            <div className="bg-black/50 border border-white/5 rounded-2xl p-4 mb-2 flex flex-col gap-3">
               <div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-[var(--muted)] block mb-1">Status</span>
                  {isSubActive ? (
                    <span className="text-xs font-black text-fuchsia-400 bg-fuchsia-500/20 px-2 py-1 rounded-lg border border-fuchsia-500/20">Active</span>
                  ) : (
                    <span className="text-xs font-black text-white/30 bg-white/5 px-2 py-1 rounded-lg border border-white/10">Inactive</span>
                  )}
               </div>

               {team.challengeSubscription?.subscribedAt && (
                 <div>
                   <span className="text-[10px] uppercase font-black tracking-widest text-[var(--muted)] block mb-1">Subscribed Since</span>
                   <p className="text-sm font-bold text-white">{new Date(team.challengeSubscription.subscribedAt).toLocaleDateString()}</p>
                 </div>
               )}

               {team.challengeSubscription?.gracePeriodEnd && (
                 <div>
                   <span className="text-[10px] uppercase font-black tracking-widest text-[var(--muted)] block mb-1">Grace Period Ends</span>
                   <p className="text-sm font-bold text-red-400">{new Date(team.challengeSubscription.gracePeriodEnd).toLocaleString()}</p>
                 </div>
               )}
            </div>

            <div className="mt-4 flex gap-2">
              <button 
                onClick={() => setShowSubModal(false)}
                className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANNOUNCEMENT MODAL - MEDIEVAL SCROLL */}
      {showAnnouncements && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-sm" onClick={() => setShowAnnouncements(false)}>
          <div 
            className="w-full max-w-md flex flex-col shadow-2xl relative overflow-hidden rounded-t-3xl sm:rounded-3xl border border-[#a67c52]/40"
            style={{ background: 'linear-gradient(180deg, #1e1208 0%, #120c06 60%, #0d0805 100%)', maxHeight: '85dvh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Scroll top rod */}
            <div className="h-3 w-full shrink-0" style={{ background: 'linear-gradient(90deg, #3a1e08, #8c5e2a, #d4af37, #8c5e2a, #3a1e08)' }} />
            {/* Decorative wood grain lines */}
            <div className="absolute top-3 left-0 w-full h-px bg-[#a67c52]/30 pointer-events-none" />

            {/* Header */}
            <div className="px-6 pt-4 pb-3 border-b border-[#a67c52]/20 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-serif text-xl text-[#d4af37] font-black italic tracking-wide">⚔️ Royal Decrees</h3>
                <p className="text-[#a67c52] text-[10px] font-bold uppercase tracking-widest">{team.name}</p>
              </div>
              <button onClick={() => setShowAnnouncements(false)} className="w-8 h-8 flex items-center justify-center rounded-full border border-[#a67c52]/30 text-[#a67c52] hover:text-[#d4af37] hover:border-[#d4af37]/50 transition-colors"><X size={16} /></button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4" style={{ scrollbarColor: '#a67c52 transparent' }}>
              {/* OMC: Write new decree */}
              {isOMC && (
                <div className="border border-[#a67c52]/30 rounded-2xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.4)' }}>
                  <div className="px-4 py-2.5 border-b border-[#a67c52]/20">
                    <p className="text-[#d4af37] text-[9px] font-black uppercase tracking-widest">✍️ Scribe New Decree</p>
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    <input
                      value={newAnnTitle}
                      onChange={e => setNewAnnTitle(e.target.value)}
                      placeholder="Decree Title..."
                      className="w-full bg-black/50 border border-[#a67c52]/20 rounded-xl px-4 py-2.5 text-sm text-[#e6d0a3] focus:outline-none focus:border-[#d4af37] font-serif italic placeholder:text-[#a67c52]/40"
                    />
                    <textarea
                      value={newAnnContent}
                      onChange={e => setNewAnnContent(e.target.value)}
                      placeholder="Write your decree here..."
                      rows={3}
                      className="w-full bg-black/50 border border-[#a67c52]/20 rounded-xl px-4 py-2.5 text-sm text-[#e6d0a3] focus:outline-none focus:border-[#d4af37] font-serif placeholder:text-[#a67c52]/40 resize-none"
                    />
                    <button
                      onClick={handleCreateAnnouncement}
                      disabled={saving || !newAnnTitle.trim() || !newAnnContent.trim()}
                      className="w-full py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-40 border border-[#d4af37]/50"
                      style={{ background: 'linear-gradient(90deg, #6b3c10, #a06420, #6b3c10)', color: '#fde8a0' }}
                    >
                      📜 Publish Decree
                    </button>
                  </div>
                </div>
              )}

              {/* Decree list */}
              {announcements.length === 0 ? (
                <div className="text-center py-12 text-[#a67c52]/60 font-serif italic text-sm">No decrees have been scribed yet.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {announcements.map(ann => {
                    const isEditing = editingAnnId === ann.id;
                    return (
                      <EditableDecree
                        key={ann.id}
                        ann={ann}
                        isOMC={isOMC}
                        isEditing={isEditing}
                        saving={saving}
                        onEdit={() => setEditingAnnId(ann.id)}
                        onDelete={() => handleDeleteAnnouncement(ann.id)}
                        onSave={(title, content) => handleSaveEdit(ann.id, title, content)}
                        onCancel={() => setEditingAnnId(null)}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Scroll bottom rod */}
            <div className="h-3 w-full shrink-0" style={{ background: 'linear-gradient(90deg, #3a1e08, #8c5e2a, #d4af37, #8c5e2a, #3a1e08)' }} />
          </div>
        </div>
      )}

      {/* CM HISTORY MODAL */}
      {showCMHistory && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 pb-0 sm:pb-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowCMHistory(false)}>
          <div className="bg-neutral-900 border border-[var(--panel-border)] rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md flex flex-col h-[75vh] shadow-2xl relative animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400"><Clock size={16} /></div>
                <div>
                  <h3 className="font-black text-lg text-white leading-none">Shared Ledger</h3>
                  <p className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-widest mt-1">Challenge Market</p>
                </div>
              </div>
              <button onClick={() => setShowCMHistory(false)} className="p-2 hover:bg-white/5 rounded-full"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
              {cmMatches.length === 0 ? (
                 <div className="text-center py-10 text-[var(--muted)] text-sm font-bold">No generated CM bookings found.</div>
              ) : cmMatches.map(m => {
                 const isTeamA = m.teamA_Id === team.id;
                 const opp = isTeamA ? m.teamB : m.teamA;
                 const oppName = opp?.name || 'Unknown Team';
                 const bookingId = isTeamA ? m.bookingIdA : m.bookingIdB;
                 return (
                   <div key={m.id} className="bg-neutral-800/40 border border-white/5 p-4 rounded-2xl flex flex-col gap-2 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                     <div className="absolute top-0 right-0 p-2 opacity-10 blur-sm pointer-events-none group-hover:blur-none group-hover:opacity-30 transition-all">
                       <Clock size={40} className="text-blue-500" />
                     </div>
                     <p className="text-[10px] uppercase font-black text-blue-400 tracking-widest leading-none">Booking #{bookingId?.slice(-6).toUpperCase() || m.bookingCode}</p>
                     
                     <div className="flex items-center justify-between mt-1">
                       <div className="font-black text-sm">vs {oppName}</div>
                       <div className="bg-blue-500/20 border border-blue-500/40 text-blue-300 text-[10px] uppercase font-black px-2 py-0.5 rounded-md">
                         CODE: {m.bookingCode}
                       </div>
                     </div>
                     <div className="flex justify-between items-center mt-1">
                       <span className="text-[11px] font-bold text-blue-100">{(() => { const sl = cmSlots.find((s) => s.id === m.selectedSlotId); return sl ? turfs.find((t) => t.id === sl.turfId)?.name || 'Venue' : (m.selectedSlotId ? 'Venue Booked' : 'Venue TBD'); })()}</span>
                       <span className="text-[11px] font-black text-blue-400">{(() => { const sl = cmSlots.find((s) => s.id === m.selectedSlotId); return sl ? '৳' + (sl.price / 2).toLocaleString() : '—'; })()}</span>
                     </div>
                     
                     <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                        <span className="text-xs text-[var(--muted)] font-bold">{m.matchDate ? new Date(m.matchDate).toLocaleDateString() : new Date(m.createdAt).toLocaleDateString()}</span>
                        <span className="text-xs font-black text-green-400">{m.status === 'COMPLETED' ? 'FINISHED' : 'PENDING'}</span>
                     </div>
                   </div>
                 );
              })}
            </div>
          </div>
        </div>
      )}

      {/* DELETE TEAM MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-neutral-900 border border-red-500/40 rounded-3xl p-6 w-full max-w-sm flex flex-col shadow-[0_0_50px_rgba(255,0,0,0.15)] relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-900/30 text-red-400 flex items-center justify-center mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-black text-xl mb-1 text-white">Delete Team?</h3>
            <p className="text-xs text-red-200/80 mb-6 font-medium leading-relaxed">
              This action is <span className="font-black text-red-400 underline">irreversible</span>. Enter your account password to confirm termination of <strong>{team.name}</strong>.
            </p>

            {deleteError && (
              <div className="w-full p-3 bg-red-500/10 border border-red-500/30 rounded-xl mb-4 text-xs text-red-400 font-bold">
                {deleteError}
              </div>
            )}

            <div className="flex flex-col gap-1.5 mb-6">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--muted)]">Your Password</label>
              <input 
                type="password"
                placeholder="Enter account password..."
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-red-500/50 text-white placeholder:text-white/20 font-mono"
              />
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-xl transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteTeam}
                disabled={saving || !deletePassword}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-all shadow-lg text-sm uppercase tracking-widest border border-red-400/30 disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
