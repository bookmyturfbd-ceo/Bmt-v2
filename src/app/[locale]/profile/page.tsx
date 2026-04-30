'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { getCookie } from '@/lib/cookies';
import { Link } from '@/i18n/routing';
import {
  LogIn, UserPlus, LogOut, User, Calendar, Wallet, Shield,
  ChevronRight, Crown, Star, Phone, Mail, Hash, CalendarCheck2,
  Camera, Edit3, Check, X, RefreshCw, Banknote, Clock,
  AlertTriangle, Package
} from 'lucide-react';
import { uploadFileToCDN } from '@/lib/supabase';
import { getRankData, isProvisional } from '@/lib/rankUtils';

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlayerProfile {
  id: string; fullName: string; email: string; phone: string;
  joinedAt: string; walletBalance?: number; loyaltyPoints?: number;
  level?: number; levelProgress?: number; avatarBase64?: string; avatarUrl?: string;
  banStatus?: 'none' | 'soft' | 'perma'; banUntil?: string; banReason?: string;
  mmr?: number; footballMmr?: number; cricketMmr?: number;
  teamMemberships?: any[]; matchStats?: any[];
  badges?: any[];
  battingPerformances?: any[];
  bowlingPerformances?: any[];
}
interface Booking { id: string; slotId: string; date: string; price?: number; playerName?: string; playerId?: string; }
interface Slot    { id: string; turfId: string; startTime: string; endTime: string; price: number; }

// ── Rank Badge Component ───────────────────────────────────────────────────
function RankBadge({ mmr, inline = false }: { mmr: number, inline?: boolean }) {
  const d = getRankData(mmr);
  if (inline) return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/10 bg-white/5 shrink-0"><img src={d.icon} className="h-4 w-auto object-contain drop-shadow-sm" alt="Rank" /><span className={`font-black text-[10px]`} style={{ color: d.color }}>{d.label} · {mmr}</span></span>;
  return null;
}

function BentoRank({ mmr, sport, provCount }: { mmr: number, sport: 'Football' | 'Cricket', provCount?: number }) {
  const d = getRankData(mmr);
  const isProv = isProvisional(provCount ?? 0);
  
  return (
    <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.02] border border-white/5 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute top-3 left-3 flex items-center gap-1.5">
        <span className="text-xs">{sport === 'Football' ? '⚽' : '🏏'}</span>
        <span className="text-[9px] text-[var(--muted)] font-black uppercase tracking-widest">{sport === 'Football' ? 'Futsal' : 'Cricket'}</span>
      </div>
      
      {isProv ? (
         <div className="mt-8 mb-2 flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center text-white/30 text-lg font-black">?</div>
            <div className="text-center">
               <p className="text-[10px] font-black text-white/80 uppercase">Provisional</p>
               <p className="text-[9px] font-bold text-[var(--muted)]">{provCount}/3 Matches</p>
            </div>
         </div>
      ) : (
         <div className="mt-8 mb-2 flex flex-col items-center gap-1 relative z-10">
            <img src={d.icon} className="h-14 w-auto object-contain drop-shadow-2xl mb-1 filter hover:brightness-125 transition-all" alt="Rank" />
            <span className="text-xs uppercase font-black tracking-widest drop-shadow-md leading-none" style={{ color: d.color }}>{d.tier}</span>
            {d.division && <span className="text-[9px] font-black opacity-80 leading-none mt-0.5" style={{ color: d.color }}>{d.division}</span>}
            <span className="text-[10px] font-bold text-white/50 mt-1 tracking-wider">{mmr} MMR</span>
         </div>
      )}
    </div>
  );
}
interface Turf    { id: string; name: string; }

function slotHours(s: Slot) {
  const [sh, sm] = s.startTime.split(':').map(Number);
  const [eh, em] = s.endTime.split(':').map(Number);
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
}


// ─── Guest gate ───────────────────────────────────────────────────────────────
function GuestProfile() {
  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <div className="px-5 pt-12 pb-6"><h1 className="text-2xl font-black tracking-tight">Profile</h1></div>
      <div className="mx-4 glass-panel border border-[var(--panel-border)] rounded-3xl p-8 flex flex-col items-center gap-5 text-center">
        <div className="w-20 h-20 rounded-full bg-white/5 border-2 border-dashed border-white/20 flex items-center justify-center">
          <User size={32} className="text-neutral-600" />
        </div>
        <div>
          <h2 className="text-xl font-black">You're not signed in</h2>
          <p className="text-sm text-[var(--muted)] mt-1 leading-relaxed">Sign in to view your bookings, wallet, and manage your account.</p>
        </div>
        <div className="flex flex-col w-full gap-3">
          <Link href="/login" className="w-full py-3.5 rounded-2xl bg-accent text-black font-black text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-[0_4px_20px_rgba(0,255,65,0.2)]">
            <LogIn size={16} /> Sign In
          </Link>
          <Link href="/register" className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
            <UserPlus size={16} /> Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main Profile Page ────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [profile, setProfile]   = useState<PlayerProfile | null>(null);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [myShopOrders, setMyShopOrders] = useState<any[]>([]);
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [allTurfs, setAllTurfs] = useState<Turf[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeSport, setActiveSport] = useState<string>('');
  const [editName, setEditName]   = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [togglingBadge, setTogglingBadge] = useState<string | null>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async (pid: string) => {
    const [ps, bs, ss, ts, so] = await Promise.all([
      fetch(`/api/bmt/players/${pid}`).then(r => r.json()),
      fetch('/api/bmt/bookings').then(r => r.json()),
      fetch('/api/bmt/slots').then(r => r.json()),
      fetch('/api/bmt/turfs').then(r => r.json()),
      fetch(`/api/shop/orders?playerId=${pid}`).then(r => r.json()),
    ]);
    setProfile(ps?.id ? ps : null);
    setMyBookings(Array.isArray(bs) ? (bs as Booking[]).filter(b => b.playerId === pid || b.playerName === getCookie('bmt_name')).sort((a, b) => b.date.localeCompare(a.date)) : []);
    setAllSlots(Array.isArray(ss) ? ss : []);
    setAllTurfs(Array.isArray(ts) ? ts : []);
    setMyShopOrders(Array.isArray(so) ? so : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const auth = document.cookie.includes('bmt_auth=');
    const role  = getCookie('bmt_role');
    if (!auth || (role && role !== 'player')) { setIsAuthed(false); setLoading(false); return; }
    setIsAuthed(true);
    const pid = getCookie('bmt_player_id');
    setPlayerId(pid);
    loadData(pid);
  }, [loadData]);

  if (isAuthed === false) return <GuestProfile />;
  if (isAuthed === null || loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  );

  // ── Ban overlay ────────────────────────────────────────────────────────────
  if (profile?.banStatus === 'perma') return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full glass-panel border border-red-500/30 rounded-3xl p-8 flex flex-col items-center gap-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center"><AlertTriangle size={28} className="text-red-400" /></div>
        <div>
          <h2 className="text-xl font-black text-red-400">Account Permanently Banned</h2>
          <p className="text-sm text-neutral-400 mt-2">Your account has been permanently suspended. Contact support for assistance.</p>
        </div>
      </div>
    </div>
  );

  if (profile?.banStatus === 'soft' && profile.banUntil && new Date(profile.banUntil) > new Date()) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-sm w-full glass-panel border border-orange-500/30 rounded-3xl p-8 flex flex-col items-center gap-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center"><AlertTriangle size={28} className="text-orange-400" /></div>
        <div>
          <h2 className="text-xl font-black text-orange-400">Account Temporarily Suspended</h2>
          <p className="text-sm text-neutral-400 mt-2">Your account is suspended until <span className="font-black text-white">{new Date(profile.banUntil).toLocaleDateString('en-BD')}</span>. You can still browse.</p>
        </div>
      </div>
    </div>
  );

  const name     = profile?.fullName || getCookie('bmt_name') || 'Player';
  const initials = name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  const balance  = profile?.walletBalance  ?? 0;
  const lp       = profile?.loyaltyPoints  ?? 0;
  const level    = profile?.level          ?? 1;
  const progress = profile?.levelProgress  ?? 0;
  const avatar   = profile?.avatarUrl || profile?.avatarBase64;

  // Dual-sport MMR
  const footballMmr = profile?.footballMmr ?? profile?.mmr ?? 1000;
  const cricketMmr  = profile?.cricketMmr  ?? 1000;
  const fbRank      = getRankData(footballMmr);
  const ckRank      = getRankData(cricketMmr);

  // Provisional: count matches per sport category
  const fbMatchCount = (profile?.matchStats || []).filter((s: any) => !s.team?.sportType?.includes('CRICKET')).length;
  const ckMatchCount = (profile?.matchStats || []).filter((s: any) =>  s.team?.sportType?.includes('CRICKET')).length;
  const fbProvisional = isProvisional(fbMatchCount);
  const ckProvisional = isProvisional(ckMatchCount);

  // Current team(s) per sport
  const fbTeam = profile?.teamMemberships?.find((m: any) => !m.team?.sportType?.includes('CRICKET'))?.team;
  const ckTeam = profile?.teamMemberships?.find((m: any) =>  m.team?.sportType?.includes('CRICKET'))?.team;
  const currentTeam = fbTeam ?? profile?.teamMemberships?.[0]?.team;

  const totalSpent   = myBookings.reduce((s, b) => { const slot = allSlots.find(sl => sl.id === b.slotId); return s + (b.price ?? slot?.price ?? 0); }, 0);
  const totalMinutes = myBookings.reduce((s, b) => { 
    const slot = allSlots.find(sl => sl.id === b.slotId); 
    if (!slot || !slot.startTime || !slot.endTime) return s;
    const [sh, sm] = slot.startTime.split(':').map(Number);
    const [eh, em] = slot.endTime.split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return s;
    return s + Math.max(0, (eh * 60 + em - sh * 60 - sm));
  }, 0);

  const showcasedBadges = (profile?.badges || []).filter((b: any) => b.isShowcased).slice(0, 3);
  const cmTeams = profile?.teamMemberships?.map((m: any) => m.team)?.filter((t: any) => t && (t.isSubscribed || t.challengeSubscription?.active)) || [];

  // Group stats
  const statsBySport = (profile?.matchStats || []).reduce((acc: any, stat: any) => {
    const s = stat.team?.sportType || 'FUTSAL_5';
    if (!acc[s]) acc[s] = [];
    acc[s].push(stat);
    return acc;
  }, {});
  const sportsFilter = Object.keys(statsBySport);
  if (!activeSport && sportsFilter.length > 0) setActiveSport(sportsFilter[0]);

  const displaySport = activeSport || (sportsFilter.length > 0 ? sportsFilter[0] : 'FUTSAL_5');
  const isCricketDisplay = displaySport.includes('CRICKET');
  const displayMmr = isCricketDisplay ? cricketMmr : footballMmr;
  const displayMatchCount = isCricketDisplay ? ckMatchCount : fbMatchCount;

  const saveName = async () => {
    if (!editName.trim()) return;
    setSavingName(true);
    const res = await fetch(`/api/bmt/players/${playerId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fullName: editName.trim() }) });
    const data = await res.json();
    if (data?.fullName) { setProfile(p => p ? { ...p, fullName: data.fullName } : p); document.cookie = `bmt_name=${encodeURIComponent(data.fullName)}; path=/; max-age=86400; SameSite=Lax`; }
    setSavingName(false); setIsEditing(false);
  };

  const handleAvatar = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async e => {
      const base64 = e.target?.result as string;
      setProfile(p => p ? { ...p, avatarBase64: base64 } : p);
    };
    reader.readAsDataURL(file);
    const cdnUrl = await uploadFileToCDN(file, 'profiles');
    if (cdnUrl) {
      await fetch(`/api/bmt/players/${playerId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avatarUrl: cdnUrl }) });
      setProfile(p => p ? { ...p, avatarUrl: cdnUrl } : p);
    }
  };

  const logout = () => {
    ['bmt_auth', 'bmt_role', 'bmt_player_id', 'bmt_name'].forEach(k => { document.cookie = `${k}=; path=/; max-age=0`; });
    window.location.href = '/en';
  };

  const toggleBadgeShowcase = async (badgeId: string, currentlyShowcased: boolean) => {
    if (!currentlyShowcased && showcasedBadges.length >= 3) return;
    setTogglingBadge(badgeId);
    try {
      const res = await fetch(`/api/bmt/players/${playerId}/badges`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeId, isShowcased: !currentlyShowcased })
      });
      if (res.ok) {
        setProfile(p => {
          if (!p) return p;
          const updatedBadges = p.badges?.map(b => b.id === badgeId ? { ...b, isShowcased: !currentlyShowcased } : b);
          return { ...p, badges: updatedBadges };
        });
      }
    } finally {
      setTogglingBadge(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-28">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight">Profile</h1>
        <button onClick={logout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-[var(--muted)] hover:text-white transition-all">
          <LogOut size={12} /> Sign Out
        </button>
      </div>

      {/* ── Player Card ── */}
      <div className="mx-4 glass-panel border border-[var(--panel-border)] rounded-3xl overflow-hidden">
        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(90deg, transparent, #00ff41, transparent)' }} />
        <div className="p-5 flex flex-col gap-4">
          {/* Avatar + Name */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div onClick={() => avatarRef.current?.click()}
                className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-accent/30 shadow-[0_0_20px_rgba(0,255,65,0.15)] bg-accent/10 flex items-center justify-center cursor-pointer relative group">
                {avatar ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" /> : <span className="text-2xl font-black text-accent">{initials}</span>}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Camera size={18} className="text-white" /></div>
              </div>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatar(f); }} />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              {isEditing ? (
                <div className="flex items-center gap-2 mb-1">
                  <input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveName()}
                    className="flex-1 bg-white/5 border border-white/20 rounded-xl px-3 py-1.5 text-sm font-black outline-none focus:border-accent/50" autoFocus />
                  <button onClick={saveName} disabled={savingName} className="text-accent hover:brightness-125">
                    {savingName ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  </button>
                  <button onClick={() => setIsEditing(false)} className="text-[var(--muted)] hover:text-white"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-xl font-black truncate leading-tight">{name}</h2>
                  <button onClick={() => { setEditName(name); setIsEditing(true); }} className="text-[var(--muted)] hover:text-accent transition-colors"><Edit3 size={13} /></button>
                </div>
              )}
              {profile?.id && (
                <p className="text-[10px] text-[var(--muted)] font-bold tracking-widest uppercase flex items-center gap-1">
                  <Hash size={10} /> {profile.id.slice(0, 8)}
                </p>
              )}
            </div>
          </div>
          
          {/* Bento Grid layout */}
          <div className="grid grid-cols-1 gap-3 mt-1">
            <BentoRank mmr={displayMmr} sport={isCricketDisplay ? 'Cricket' : 'Football'} provCount={displayMatchCount} />
            
            {cmTeams.length > 0 && (
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-3 flex flex-col gap-2 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                <p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)] px-1 mb-1">Challenge Market Teams</p>
                <div className="flex flex-col gap-1.5">
                  {cmTeams.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                      <div className="flex items-center gap-2 min-w-0">
                        {t.logoUrl ? (
                          <img src={t.logoUrl} className="w-6 h-6 rounded-md object-cover bg-neutral-800 shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                        ) : null}
                        <Shield size={16} className={`text-[var(--muted)] shrink-0 ${t.logoUrl ? 'hidden' : ''}`} />
                        <span className="text-xs font-bold text-white truncate leading-tight">{t.name}</span>
                      </div>
                      <span className="text-[9px] font-black uppercase text-fuchsia-400 bg-fuchsia-500/10 px-2 py-1 rounded-md border border-fuchsia-500/20 shrink-0 shadow-[0_0_10px_rgba(255,0,255,0.1)]">Listed</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Balance + LP + Level */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Wallet balance — read-only, tap hint removed; wallet lives in bottom nav */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/30">
              <Wallet size={13} className="text-accent" />
              <span className="text-sm font-black text-accent">৳{balance.toLocaleString()}</span>
              <span className="text-[9px] font-bold text-accent/60">BDT</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              <Star size={12} className="text-yellow-400" fill="currentColor" /><span className="text-sm font-black text-yellow-400">{lp}</span><span className="text-[9px] font-bold text-yellow-400/60">LP</span>
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[120px]">
              <span className="text-[10px] font-black text-[var(--muted)] whitespace-nowrap">LVL {level}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[9px] text-[var(--muted)]">{progress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats Pills ── */}
      <div className="mx-4 mt-3 flex gap-2 flex-wrap">
        {[
          { label: 'Bookings', value: String(myBookings.length), icon: CalendarCheck2, color: 'text-accent' },
          { label: 'Spent',    value: `৳${totalSpent.toLocaleString()}`, icon: Banknote, color: 'text-accent' },
          { label: 'Time',     value: `${Math.round(totalMinutes)} min`, icon: Clock, color: 'text-blue-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-panel border border-[var(--panel-border)] rounded-2xl px-4 py-2.5 flex items-center gap-2 flex-1 min-w-[90px]">
            <Icon size={13} className={color} />
            <div><p className="text-[8px] font-black uppercase tracking-widest text-[var(--muted)]">{label}</p><p className={`text-sm font-black ${color}`}>{value}</p></div>
          </div>
        ))}
      </div>

      {/* ── Player Statistics ── */}
      {sportsFilter.length > 0 && (
        <div className="mx-4 mt-4 glass-panel border border-[var(--panel-border)] rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex gap-2 overflow-x-auto no-scrollbar">
            {sportsFilter.map(sp => (
              <button key={sp} onClick={() => setActiveSport(sp)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeSport === sp ? 'bg-accent text-black' : 'bg-white/5 text-[var(--muted)] hover:text-white'}`}>
                {sp.includes('CRICKET') ? '🏏' : '⚽'} {sp.replace('_', ' ')}
              </button>
            ))}
          </div>
          
          <div className="p-4 flex gap-2 flex-wrap">
            {(() => {
              const stats = statsBySport[activeSport] || [];
              const matches = stats.length;
              const badgesCount = profile?.badges?.length || 0;

              if (activeSport.includes('CRICKET')) {
                const bPerf = profile?.battingPerformances || [];
                const bwPerf = profile?.bowlingPerformances || [];
                const runs = bPerf.reduce((s:number, p:any) => s + (p.runs || 0), 0);
                const ballsFaced = bPerf.reduce((s:number, p:any) => s + (p.ballsFaced || 0), 0);
                const sr = ballsFaced > 0 ? ((runs / ballsFaced) * 100).toFixed(1) : '0.0';
                
                const wickets = bwPerf.reduce((s:number, p:any) => s + (p.wickets || 0), 0);
                const runsConceded = bwPerf.reduce((s:number, p:any) => s + (p.runs || 0), 0);
                const legalBalls = bwPerf.reduce((s:number, p:any) => s + (p.legalBalls || 0), 0);
                const overs = Math.floor(legalBalls / 6) + (legalBalls % 6) / 6;
                const economy = overs > 0 ? (runsConceded / overs).toFixed(1) : '0.0';

                const mmrDelta = stats.reduce((s:number, st:any) => s + (st.mmrChange || 0), 0);
                return (
                  <>
                    <div className="flex-1 min-w-[30%] bg-white/5 rounded-2xl p-3 border border-white/5">
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Runs</p>
                      <p className="text-xl font-black text-amber-400">{runs}</p>
                    </div>
                    <div className="flex-1 min-w-[30%] bg-white/5 rounded-2xl p-3 border border-white/5">
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Strike Rate</p>
                      <p className="text-xl font-black text-white">{sr}</p>
                    </div>
                    <div className="flex-1 min-w-[30%] bg-white/5 rounded-2xl p-3 border border-white/5">
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Wickets</p>
                      <p className="text-xl font-black text-rose-400">{wickets}</p>
                    </div>
                    <div className="flex-1 min-w-[30%] bg-white/5 rounded-2xl p-3 border border-white/5">
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Economy</p>
                      <p className="text-xl font-black text-white">{economy}</p>
                    </div>
                    <div className="flex-1 min-w-[30%] bg-white/5 rounded-2xl p-3 border border-white/5">
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Form (MMR)</p>
                      <p className={`text-xl font-black ${mmrDelta >= 0 ? 'text-green-400' : mmrDelta < 0 ? 'text-red-400' : 'text-white'}`}>{mmrDelta > 0 ? '+' : ''}{mmrDelta}</p>
                    </div>
                    <div className="flex-1 min-w-[30%] bg-white/5 rounded-2xl p-3 border border-white/5">
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Badges</p>
                      <p className="text-xl font-black text-yellow-400">{badgesCount}</p>
                    </div>
                  </>
                );
              } else {
                const goals = stats.reduce((s:number, st:any) => s + (st.goals || 0), 0);
                const assists = stats.reduce((s:number, st:any) => s + (st.assists || 0), 0);
                const mmrDelta = stats.reduce((s:number, st:any) => s + (st.mmrChange || 0), 0);
                return (
                  <>
                    <div className="flex-1 min-w-[30%] bg-white/5 rounded-2xl p-3 border border-white/5">
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Matches</p>
                      <p className="text-xl font-black text-white">{matches}</p>
                    </div>
                    <div className="flex-1 min-w-[30%] bg-white/5 rounded-2xl p-3 border border-white/5">
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Goals</p>
                      <p className="text-xl font-black text-sky-400">{goals}</p>
                    </div>
                    <div className="flex-1 min-w-[30%] bg-white/5 rounded-2xl p-3 border border-white/5">
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Assists</p>
                      <p className="text-xl font-black text-indigo-400">{assists}</p>
                    </div>
                    <div className="flex-1 min-w-[30%] bg-white/5 rounded-2xl p-3 border border-white/5">
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Form (MMR)</p>
                      <p className={`text-xl font-black ${mmrDelta >= 0 ? 'text-green-400' : mmrDelta < 0 ? 'text-red-400' : 'text-white'}`}>{mmrDelta > 0 ? '+' : ''}{mmrDelta}</p>
                    </div>
                    <div className="flex-1 min-w-[30%] bg-white/5 rounded-2xl p-3 border border-white/5">
                      <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Badges</p>
                      <p className="text-xl font-black text-yellow-400">{badgesCount}</p>
                    </div>
                  </>
                );
              }
            })()}
          </div>
        </div>
      )}

      {/* ── Badge Showcase ── */}
      <div className="mx-4 mt-4 glass-panel border border-[var(--panel-border)] rounded-2xl overflow-hidden">
        <div className="px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center"><Star size={13} className="text-yellow-400" /></div>
            <p className="font-black text-sm">Badge Showcase</p>
          </div>
          <span className="text-[10px] text-[var(--muted)] font-bold">{showcasedBadges.length}/3 slots</span>
        </div>
        <div className="border-t border-white/5 px-4 py-5 flex gap-3 items-center justify-center">
          {[0, 1, 2].map(i => {
            const badge = showcasedBadges[i];
            return (
              <div key={i} onClick={() => setShowBadgeModal(true)}
                className="w-16 h-16 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center bg-white/5 relative group cursor-pointer hover:border-yellow-500/30 transition-colors">
                {badge ? (
                  <span className="text-3xl filter drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]" title={badge.title}>{badge.icon}</span>
                ) : (
                  <Star size={16} className="text-white/20 group-hover:text-yellow-500/40 transition-colors" />
                )}
              </div>
            );
          })}
        </div>
        <div className="pb-3 text-center text-[10px] text-[var(--muted)]">Tap to manage your showcased badges</div>
      </div>

      {/* ── Hall of Fame ── */}
      <div className="mx-4 mt-4 glass-panel border border-[var(--panel-border)] rounded-2xl overflow-hidden">
        <div className="px-4 py-3.5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center"><Crown size={13} className="text-orange-400" /></div>
          <p className="font-black text-sm">Hall of Fame</p>
        </div>
        <div className="border-t border-white/5 px-4 py-8 flex flex-col items-center gap-3 text-center">
          <Crown size={32} className="text-yellow-500/40" />
          <p className="text-sm text-[var(--muted)] leading-relaxed max-w-[240px]">Finish in the top 3 of a season to earn your Hall of Fame badge</p>
        </div>
      </div>

      {/* ── Account Details ── */}
      <div className="mx-4 mt-4 glass-panel border border-[var(--panel-border)] rounded-2xl overflow-hidden">
        <button onClick={() => setExpanded(expanded === 'account' ? null : 'account')}
          className="w-full flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"><User size={13} className="text-[var(--muted)]" /></div>
            <p className="font-black text-sm">Account Details</p>
          </div>
          <ChevronRight size={14} className={`text-[var(--muted)] transition-transform ${expanded === 'account' ? 'rotate-90' : ''}`} />
        </button>
        {expanded === 'account' && profile && (
          <div className="border-t border-white/5 px-4 py-4 flex flex-col gap-3">
            {[
              { icon: User,     label: 'Full Name', value: profile.fullName, editable: true },
              { icon: Mail,     label: 'Email',     value: profile.email,    locked: true },
              { icon: Phone,    label: 'Phone',     value: profile.phone || '—', locked: true },
              { icon: Hash,     label: 'Player ID', value: profile.id.toUpperCase() },
              { icon: Calendar, label: 'Joined',    value: profile.joinedAt },
            ].map(({ icon: Icon, label, value, locked, editable }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon size={14} className="text-[var(--muted)] shrink-0" />
                <div className="flex-1 min-w-0"><p className="text-[9px] font-black uppercase tracking-widest text-[var(--muted)]">{label}</p><p className="text-sm font-bold truncate">{value}</p></div>
                {locked   && <span className="text-[9px] text-[var(--muted)] bg-white/5 px-1.5 py-0.5 rounded-md">Locked</span>}
                {editable && <button onClick={() => { setEditName(value); setIsEditing(true); setExpanded(null); }} className="text-[var(--muted)] hover:text-accent transition-colors"><Edit3 size={12} /></button>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Shop Orders ── */}
      <div className="mx-4 mt-4 glass-panel border border-[var(--panel-border)] rounded-2xl overflow-hidden">
        <button onClick={() => setExpanded(expanded === 'orders' ? null : 'orders')}
          className="w-full flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center"><Package size={13} className="text-accent" /></div>
            <p className="font-black text-sm">Shop Orders ({myShopOrders.length})</p>
          </div>
          <ChevronRight size={14} className={`text-[var(--muted)] transition-transform ${expanded === 'orders' ? 'rotate-90' : ''}`} />
        </button>
        {expanded === 'orders' && (
          <div className="border-t border-[var(--panel-border)] px-4 py-4 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
            {myShopOrders.length === 0 ? (
              <p className="text-center text-[var(--muted)] text-sm py-4">No shop orders found.</p>
            ) : (
              myShopOrders.map(order => (
                <div key={order.id} className="bg-[var(--panel-bg)] border border-[var(--panel-border)] rounded-xl p-3 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-black">Order #{order.id.slice(0, 8).toUpperCase()}</span>
                      <span className="text-[10px] text-[var(--muted)]">{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${order.status === 'pending' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : order.status === 'completed' ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex gap-2">
                        {item.product?.mainImage && <img src={item.product.mainImage} className="w-8 h-8 rounded-lg object-cover bg-neutral-900 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold truncate leading-tight">{item.product?.name || 'Item'}</p>
                          <p className="text-[10px] text-[var(--muted)]">Size: {item.sizeLabel} x {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-[var(--panel-border)] flex items-center justify-between">
                    <span className="text-[var(--muted)] text-[10px] uppercase font-black tracking-widest">{order.paymentMethod}</span>
                    <span className="text-sm font-black text-accent">৳{order.total.toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      {/* ── Badge Showcase Modal ── */}
      {showBadgeModal && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowBadgeModal(false)} />
          <div className="relative z-10 w-full max-w-md mx-auto rounded-t-3xl border-t border-x border-white/10 overflow-hidden flex flex-col pb-6"
            style={{ background: 'linear-gradient(180deg, #0f1a0f 0%, #080808 100%)' }}>
            <div className="flex justify-center pt-3 pb-1 shrink-0"><div className="w-10 h-1 rounded-full bg-white/20" /></div>
            <div className="h-0.5 mx-6 rounded-full" style={{ background: 'linear-gradient(90deg, transparent, #eab308, transparent)' }} />
            <div className="px-5 pt-4 pb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black">Manage Showcase</h2>
                <p className="text-xs text-[var(--muted)]">Select up to 3 badges to display</p>
              </div>
              <button onClick={() => setShowBadgeModal(false)} className="w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5"><X size={14} /></button>
            </div>
            <div className="px-5 py-2 flex flex-col gap-3 max-h-[50vh] overflow-y-auto">
              {(!profile?.badges || profile.badges.length === 0) ? (
                <div className="py-8 text-center flex flex-col items-center">
                  <Star size={32} className="text-white/10 mb-2" />
                  <p className="text-sm font-bold text-neutral-500">No badges earned yet</p>
                  <p className="text-[10px] text-neutral-600 mt-1">Play matches and perform well to earn badges.</p>
                </div>
              ) : (
                profile.badges.map(b => {
                  const isShowcased = b.isShowcased;
                  const canToggle = isShowcased || showcasedBadges.length < 3;
                  const isLoading = togglingBadge === b.id;
                  
                  return (
                    <div key={b.id} className={`flex items-center gap-3 p-3 rounded-2xl border ${isShowcased ? 'border-yellow-500/30 bg-yellow-500/10' : 'border-white/5 bg-white/[0.02]'}`}>
                      <div className="w-12 h-12 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center text-2xl shrink-0">
                        {b.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black truncate">{b.title}</p>
                        {b.description && <p className="text-[10px] text-neutral-400 leading-tight mt-0.5">{b.description}</p>}
                        <p className="text-[9px] text-neutral-600 font-bold mt-1">Earned {new Date(b.earnedAt).toLocaleDateString()}</p>
                      </div>
                      <button
                        onClick={() => toggleBadgeShowcase(b.id, isShowcased)}
                        disabled={isLoading || !canToggle}
                        className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                          isShowcased ? 'bg-yellow-500 border-yellow-400 text-black' : 
                          canToggle ? 'bg-white/5 border-white/20 text-white hover:bg-white/10' : 'bg-black border-white/5 text-white/20 cursor-not-allowed'
                        }`}
                      >
                        {isLoading ? <RefreshCw size={12} className="animate-spin" /> : isShowcased ? <Check size={12} strokeWidth={3} /> : <div className="w-3 h-3 rounded-full border-2 border-current opacity-50" />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
