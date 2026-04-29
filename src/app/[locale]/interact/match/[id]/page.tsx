'use client';

import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Users, MapPin, MessageCircle, ChevronLeft, Loader2, Shield,
  Lock, Send, AlertCircle, CheckCircle, Swords, Clock, Search, X, Edit3, ChevronDown, ChevronUp, BarChart2,
  Globe, ChevronRight, Wifi, Building2
} from 'lucide-react';

// Sport-specific constants
const FUTSAL5_FORMATIONS = ['2-2', '2-1-1', '1-2-1', '3-1', '1-3'];
const FUTSAL6_FORMATIONS = ['3-2', '2-3', '2-2-1', '1-3-1', '3-1-1'];
const MIN_STARTERS: Record<string, number> = { FUTSAL_5: 5, FUTSAL_6: 6, FUTSAL_7: 7, CRICKET_7: 7, CRICKET_FULL: 11, FOOTBALL_FULL: 11 };

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

export default function InteractionBoardPage() {
  const { id: matchId, locale } = useParams() as { id: string; locale: string };
  const router = useRouter();

  // Step navigation: 1=roster, 2=venueType, 3a=bmt, 3b=wbt, 4=complete
  const [currentStep, setCurrentStep] = useState(1);
  const [venueTypeLocal, setVenueTypeLocal] = useState<'BMT' | 'OPEN_WBT' | null>(null);
  // BMT booking state
  const [pendingBmtSlot, setPendingBmtSlot] = useState<{slotId:string;date:string;turfName:string;startTime:string;endTime:string;price:number}|null>(null);
  // WBT state
  const [wbtTurfSearch, setWbtTurfSearch] = useState('');
  const [wbtTurfs, setWbtTurfs] = useState<any[]>([]);
  const [selectedWbtTurf, setSelectedWbtTurf] = useState<any>(null);
  const [wbtFrom, setWbtFrom] = useState('');
  const [wbtTo, setWbtTo] = useState('');
  const [wbtMatchDate, setWbtMatchDate] = useState(() => { const d=new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0]; });
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [wbtFee, setWbtFee] = useState(500);
  // Chat overlay state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const realtimeRef = useRef<any>(null);
  // Legacy tab kept for stats only
  const [activeTab, setActiveTab] = useState<'roster' | 'venue' | 'chat' | 'stats'>('roster');
  
  // Stats entry state
  const [selectedStatCell, setSelectedStatCell] = useState<{playerId: string, statType: 'statA' | 'statB'} | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<number | null>(null);
  const [matchData, setMatchData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [scorerPanelOpen, setScorerPanelOpen] = useState(false);
  const [scorerPlayerId, setScorerPlayerId] = useState<string | null>(null);
  const [scorerSaving, setScorerSaving] = useState(false);

  // Roster state — never reset by polling once user has touched it
  const picksInitialized = useRef(false);
  const [picks, setPicks] = useState<Record<string, boolean>>({}); // memberId -> isStarter
  const [formation, setFormation] = useState('');
  const [rosterView, setRosterView] = useState<'mine' | 'opponent'>('mine'); // which side to show

  // Venue state
  const [venueSearch, setVenueSearch] = useState('');
  const [venueDate, setVenueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [turfs, setTurfs] = useState<any[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [expandedTurf, setExpandedTurf] = useState<string | null>(null);

  // 3-suggestion builder state
  const [suggestions, setSuggestions] = useState<{turfId: string; turfName: string; slotId: string; slotLabel: string; date: string; price: number; priority: number}[]>([]);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState('');
  const [pendingSlot, setPendingSlot] = useState<{slotId: string; startTime: string; endTime: string; price: number} | null>(null);

  // Chat state
  const [chatMsg, setChatMsg] = useState('');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatSending, setChatSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const loadMatch = useCallback(async () => {
    const res = await fetch(`/api/interact/match/${matchId}`);
    if (res.ok) {
      const d = await res.json();
      setMatchData(d);
      if (!picksInitialized.current) {
        const existing: Record<string, boolean> = {};
        d.match.rosterPicks?.forEach((p: any) => {
          if (p.teamId === d.myTeamId) existing[p.memberId] = p.isStarter;
        });
        if (Object.keys(existing).length > 0 || d.match.rosterLockedA || d.match.rosterLockedB) {
          setPicks(existing);
          setFormation(d.isTeamA ? d.match.formationA || '' : d.match.formationB || '');
          picksInitialized.current = true;
        }
      }
      // Auto-advance step based on match state
      if (d.match?.venueBookedAt || d.match?.status === 'SCHEDULED') {
        setCurrentStep(4);
      } else if (d.match?.venueType === 'BMT') {
        setCurrentStep(s => s < 3 ? 3 : s); setVenueTypeLocal('BMT');
      } else if (d.match?.venueType === 'OPEN_WBT') {
        setCurrentStep(s => s < 3 ? 3 : s); setVenueTypeLocal('OPEN_WBT');
      } else if (d.match?.rosterLockedA && d.match?.rosterLockedB) {
        setCurrentStep(s => s < 2 ? 2 : s);
      }
    }
    if (!loading) return;
    setLoading(false);
  }, [matchId, locale]);

  const loadVenues = useCallback(async (sport: string) => {
    setVenuesLoading(true);
    const res = await fetch(`/api/interact/venues?sport=${sport}&date=${venueDate}`);
    if (res.ok) {
      const d = await res.json();
      setTurfs(d.turfs || []);
    }
    setVenuesLoading(false);
  }, [venueDate]);

  const loadChat = useCallback(async () => {
    const res = await fetch(`/api/interact/match/${matchId}/chat`);
    if (res.ok) {
      const d = await res.json();
      setChatMessages(d.messages || []);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [matchId]);

  useEffect(() => { loadMatch(); setLoading(true); }, [matchId]);

  // Poll every 5s
  useEffect(() => {
    const t = setInterval(() => { loadMatch(); }, 5000);
    return () => clearInterval(t);
  }, [loadMatch]);

  // Supabase realtime
  useEffect(() => {
    let ch: any;
    const setup = async () => {
      try {
        const { getSupabaseClient } = await import('@/lib/supabaseRealtime');
        const sb = getSupabaseClient();
        ch = sb.channel(`interact:${matchId}`);
        ch.on('broadcast', { event: 'chat_message' }, (payload: any) => {
          const m = payload.payload?.message;
          if (m) { setChatMessages(prev => [...prev, m]); if (!chatOpen) setChatUnread(u => u+1); }
        });
        ch.on('broadcast', { event: 'venue_type_set' }, (payload: any) => {
          const vt = payload.payload?.venueType;
          if (vt) { setVenueTypeLocal(vt); setCurrentStep(3); }
        });
        ch.on('broadcast', { event: 'bmt_slot_selected' }, (payload: any) => {
          setPendingBmtSlot(payload.payload); setCurrentStep(3);
        });
        ch.on('broadcast', { event: 'bmt_slot_response' }, (payload: any) => {
          if (payload.payload?.accepted) { setCurrentStep(4); loadMatch(); }
          else { setPendingBmtSlot(null); setMsg('❌ Opponent declined — pick another slot'); }
        });
        ch.on('broadcast', { event: 'wbt_turf_selected' }, () => { loadMatch(); });
        ch.on('broadcast', { event: 'wbt_payment_update' }, () => { loadMatch(); });
        ch.on('broadcast', { event: 'wbt_booking_complete' }, () => { setCurrentStep(4); loadMatch(); });
        ch.subscribe();
        realtimeRef.current = ch;
      } catch {}
    };
    setup();
    return () => { if (realtimeRef.current) { try { const sb = realtimeRef.current?._client; sb?.removeChannel(realtimeRef.current); } catch {} } };
  }, [matchId]);

  // Load WBT turfs & match fee
  useEffect(() => {
    const loadWbt = async () => {
      const [tRes, fRes] = await Promise.all([fetch('/api/interact/wbt/turfs'), fetch('/api/admin/wbt/settings')]);
      if (tRes.ok) { const d = await tRes.json(); setWbtTurfs(d.turfs || []); }
      if (fRes.ok) { const d = await fRes.json(); setWbtFee(d.fee ?? 500); }
    };
    loadWbt();
  }, []);

  // Load BMT turfs when entering step 3 BMT
  useEffect(() => {
    const vt = venueTypeLocal ?? matchData?.match.venueType;
    if (currentStep === 3 && vt === 'BMT' && matchData) {
      loadVenues(matchData.match.teamA.sportType);
    }
  }, [currentStep, venueTypeLocal]);

  // Reload turfs when date changes (BMT step 3)
  useEffect(() => {
    const vt = venueTypeLocal ?? matchData?.match.venueType;
    if (currentStep === 3 && vt === 'BMT' && matchData) {
      loadVenues(matchData.match.teamA.sportType);
    }
  }, [venueDate]);

  const doAction = async (action: string, extra: object = {}) => {
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch(`/api/interact/match/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await res.json();
      if (res.ok) {
        setMsg('✅ ' + (d.message || 'Saved!'));
        picksInitialized.current = false;
        await loadMatch();
        // If both started → redirect to live scoring
        if (action === 'start_match') {
          const re = await fetch(`/api/interact/match/${matchId}`);
          const dd = await re.json();
          if (dd.match?.status === 'LIVE') {
            const sport = dd.match?.teamA?.sportType ?? '';
            const isCricket = ['CRICKET_7', 'CRICKET_FULL'].includes(sport);
            router.push(isCricket ? `/${locale}/matches/${matchId}/cricket` : `/${locale}/matches/${matchId}/live`);
          }
        }
      } else {
        setMsg('❌ ' + d.error);
      }
    } catch { setMsg('❌ Network error'); }
    setSaving(false);
  };

  const sendChat = async () => {
    if (!chatMsg.trim() || chatSending) return;
    setChatSending(true);
    try {
      const res = await fetch(`/api/interact/match/${matchId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatMsg }),
      });
      if (res.ok) { setChatMsg(''); loadChat(); }
    } catch {}
    setChatSending(false);
  };

  const assignScorer = async () => {
    if (!scorerPlayerId) return;
    setScorerSaving(true);
    const res = await fetch(`/api/matches/${matchId}/scorer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scorerPlayerId }),
    });
    const d = await res.json();
    setScorerSaving(false);
    if (res.ok) {
      setMsg('✅ Scorer assigned!');
      setScorerPanelOpen(false);
      setScorerPlayerId(null);
    } else {
      setMsg('❌ ' + d.error);
    }
  };

  const addSuggestion = (turfId: string, turfName: string, slotId: string, startTime: string, endTime: string, price: number) => {
    if (suggestions.length >= 3) return;
    if (suggestions.some(s => s.slotId === slotId)) return; // no duplicates
    const priority = suggestions.length + 1;
    setSuggestions(prev => [...prev, {
      turfId, turfName, slotId,
      slotLabel: `${startTime}–${endTime}`,
      date: venueDate, price, priority
    }]);
  };
  const removeSuggestion = (slotId: string) => {
    setSuggestions(prev => prev.filter(s => s.slotId !== slotId).map((s, i) => ({ ...s, priority: i + 1 })));
  };

  if (loading) return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] flex items-center justify-center">
      <Loader2 size={36} className="animate-spin text-fuchsia-500" />
    </div>
  );
  if (!matchData) return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-neutral-500">Match not found.</p>
    </div>
  );

  const { match, myTeamId, isTeamA, isOMC, isScorer } = matchData;
  const myTeam = isTeamA ? match.teamA : match.teamB;
  const opponent = isTeamA ? match.teamB : match.teamA;
  const amLocked = isTeamA ? match.rosterLockedA : match.rosterLockedB;
  const opponentLocked = isTeamA ? match.rosterLockedB : match.rosterLockedA;
  const sportType: string = match.teamA.sportType;
  const isCricket = sportType === 'CRICKET_7' || sportType === 'CRICKET_FULL';
  const isFutsal = !isCricket && sportType !== 'FOOTBALL_FULL';
  const formations = sportType === 'FUTSAL_5' ? FUTSAL5_FORMATIONS : sportType === 'FUTSAL_6' ? FUTSAL6_FORMATIONS : [];
  const minStarters = MIN_STARTERS[sportType] ?? 5;

  const myMembers = myTeam.members || [];
  const starterCount = Object.values(picks).filter(Boolean).length;
  const venueConfirmed = !!match.venueBookedAt;

  // Lock the entire board once venue is booked
  const boardLocked = venueConfirmed;

  // Filtered turfs
  const filteredTurfs = turfs.filter(t =>
    !venueSearch || t.name.toLowerCase().includes(venueSearch.toLowerCase()) || (t.area || '').toLowerCase().includes(venueSearch.toLowerCase()) || (t.city || '').toLowerCase().includes(venueSearch.toLowerCase())
  );

  // Challenger = teamA
  const iChallenger = isTeamA;
  const hasSuggestions = (match.venueSuggestions || []).length > 0;
  const hasSelection = !!match.selectedSlotId;

  return (
    <>
    <div className="bg-[#0a0a0a] text-white font-sans flex flex-col w-full" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: '64px', overflow: 'hidden' }}>

      {/* ── SLIM HEADER ── */}
      <div className="shrink-0 bg-neutral-900/95 backdrop-blur-md border-b border-white/5">
        {/* Back + status row */}
        <div className="flex items-center justify-between px-4 pt-2.5 pb-2">
          <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full border ${
              match.status === 'INTERACTION' ? 'bg-fuchsia-500/20 border-fuchsia-500/30 text-fuchsia-400' :
              match.status === 'SCHEDULED'   ? 'bg-amber-500/20  border-amber-500/30  text-amber-400' :
              match.status === 'LIVE'        ? 'bg-red-500/20    border-red-500/30    text-red-400 animate-pulse' :
              match.status === 'SCORE_ENTRY' ? 'bg-blue-500/20   border-blue-500/30   text-blue-400' :
              'bg-neutral-800 border-white/10 text-neutral-500'
            }`}>{match.status === 'LIVE' ? '🔴 LIVE' : match.status}</span>
            {boardLocked && <span className="text-[9px] text-[#00ff41] font-black flex items-center gap-1"><Lock size={9} /> Locked</span>}
          </div>
        </div>

        {/* Compact teams strip */}
        <div className="flex items-center px-3 pb-2.5 gap-2">
          {/* My team */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-[#00ff41]/30 overflow-hidden flex items-center justify-center shrink-0">
              {myTeam.logoUrl
                ? <img src={myTeam.logoUrl} className="w-full h-full object-cover" alt={myTeam.name} />
                : <Shield size={14} className="text-[#00ff41]" />}
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-black text-white truncate leading-tight">{myTeam.name}</p>
              {(() => {
                const r = getRankData(myTeam.teamMmr ?? 1000);
                return <span className={`inline-flex items-center gap-1 text-[9px] font-bold ${r.text}`}><img src={r.icon} className="w-3 h-3 object-contain" alt="" />{r.label}</span>;
              })()}
            </div>
          </div>

          {/* VS pill */}
          <div className="flex flex-col items-center gap-0.5 shrink-0 px-1">
            <span className="text-[9px] font-black text-neutral-600 uppercase tracking-widest">
              {isCricket ? '🏏' : sportType === 'FOOTBALL_FULL' ? '⚽' : '⚽'}
            </span>
            <span className="text-[10px] font-black text-neutral-500">VS</span>
            <span className="text-[7px] text-neutral-700 font-bold uppercase tracking-wide">
              {sportType === 'CRICKET_7' ? '7-a-side Cricket'
                : sportType === 'CRICKET_FULL' ? 'Full Cricket'
                : sportType === 'FUTSAL_5' ? '5-a-side'
                : sportType === 'FUTSAL_6' ? '6-a-side'
                : sportType === 'FUTSAL_7' ? '7-a-side'
                : sportType === 'FOOTBALL_FULL' ? 'Full 11v11'
                : sportType}
            </span>
          </div>

          {/* Opponent */}
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <div className="min-w-0 text-right">
              <p className="text-[12px] font-black text-white truncate leading-tight">{opponent.name}</p>
              {(() => {
                const r = getRankData(opponent.teamMmr ?? 1000);
                return <span className={`inline-flex items-center justify-end gap-1 text-[9px] font-bold ${r.text}`}><img src={r.icon} className="w-3 h-3 object-contain" alt="" />{r.label}</span>;
              })()}
            </div>
            <div className="w-8 h-8 rounded-xl bg-neutral-800 border border-fuchsia-500/30 overflow-hidden flex items-center justify-center shrink-0">
              {opponent.logoUrl
                ? <img src={opponent.logoUrl} className="w-full h-full object-cover" alt={opponent.name} />
                : <Shield size={14} className="text-fuchsia-400" />}
            </div>
          </div>
        </div>
      </div>

      {/* ── STEP INDICATOR ── */}
      <div className="shrink-0 px-4 pt-2 pb-2">
        <div className="flex items-center gap-1">
          {[{n:1,label:'Roster'},{n:2,label:'Venue Type'},{n:3,label:'Booking'},{n:4,label:'Complete'}].map(({n,label},i,arr) => (
            <Fragment key={n}>
              <div className={`flex items-center gap-1 ${ currentStep === n ? 'text-[#00ff41]' : currentStep > n ? 'text-[#00ff41]/50' : 'text-neutral-700' }`}>
                <span className={`w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center border ${ currentStep === n ? 'bg-[#00ff41]/20 border-[#00ff41]/50 text-[#00ff41]' : currentStep > n ? 'bg-[#00ff41]/10 border-[#00ff41]/20' : 'bg-neutral-900 border-white/10' }`}>{n}</span>
                {currentStep === n && <span className="text-[9px] font-black">{label}</span>}
              </div>
              {i < arr.length-1 && <div className={`flex-1 h-px ${ currentStep > n ? 'bg-[#00ff41]/30' : 'bg-white/5' }`} />}
            </Fragment>
          ))}
        </div>
      </div>

      {/* ── STATUS MSG ── */}
      {msg && (
        <div className={`shrink-0 mx-4 mb-1 px-3 py-2 rounded-xl text-xs font-bold ${msg.startsWith('✅') ? 'bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {msg}
        </div>
      )}

      {/* ── STEP 1: ROSTER ── */}
      {currentStep === 1 && (
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-20">

          {/* ── ROSTER SIDE TABS ── */}
          <div className="flex gap-2 my-3">
            <button onClick={() => setRosterView('mine')}
              className={`flex-1 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black transition-all ${
                rosterView === 'mine'
                  ? amLocked ? 'bg-[#00ff41]/20 border-[#00ff41]/40 text-[#00ff41]' : 'bg-fuchsia-600/20 border-fuchsia-500/40 text-fuchsia-300'
                  : amLocked ? 'bg-[#00ff41]/10 border-[#00ff41]/20 text-[#00ff41]/70' : 'bg-neutral-900 border-white/5 text-neutral-500'
              }`}>
              {amLocked ? <Lock size={11} /> : <Clock size={11} />}
              <span className="truncate">You</span>
              <span className="ml-auto">{amLocked ? 'Locked' : 'Pending'}</span>
            </button>

            <button onClick={() => setRosterView('opponent')}
              className={`flex-1 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black transition-all ${
                rosterView === 'opponent'
                  ? opponentLocked ? 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-200' : 'bg-neutral-800 border-white/10 text-neutral-400'
                  : opponentLocked ? 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400' : 'bg-neutral-900 border-white/5 text-neutral-500'
              }`}>
              {opponentLocked ? <Lock size={11} /> : <Clock size={11} />}
              <span className="truncate">{opponent.name}</span>
              <span className="ml-auto">{opponentLocked ? 'Locked' : 'Pending'}</span>
            </button>
          </div>

          {/* ═══════ MY SIDE ═══════ */}
          {rosterView === 'mine' && (
            <>
              {boardLocked && (
                <div className="mb-3 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400 font-bold flex items-center gap-2">
                  <Lock size={12} /> Venue confirmed — roster is locked
                </div>
              )}

              {/* Not yet locked: selection UI */}
              {!amLocked && !boardLocked && (
                <>
                  {isFutsal && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Formation <span className="text-red-400">*</span></p>
                        {formation && <span className="text-[10px] font-black text-fuchsia-400">{formation} selected</span>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formations.map(f => (
                          <button key={f} onClick={() => setFormation(f)}
                            className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${formation === f ? 'bg-fuchsia-600 border-fuchsia-500 text-white' : 'bg-neutral-900 border-white/10 text-neutral-500 hover:border-fuchsia-500/40'}`}>
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Roster <span className="text-red-400">*</span></p>
                    <p className="text-[10px] font-bold">
                      <span className={starterCount >= minStarters ? 'text-[#00ff41]' : 'text-amber-400'}>{starterCount}</span>
                      <span className="text-neutral-500">/{minStarters} starters</span>
                    </p>
                  </div>

                  {/* 3-col grid of box cards */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {myMembers.map((m: any) => {
                      const inPick = picks.hasOwnProperty(m.id);
                      const isStarter = picks[m.id] === true;
                      const isSub = inPick && !isStarter;
                      const rank = getRankData(m.player?.mmr ?? 1000);
                      return (
                        <button key={m.id}
                          onClick={() => {
                            setPicks(prev => {
                              const next = { ...prev };
                              if (!inPick) { next[m.id] = true; }
                              else if (prev[m.id] === true) { next[m.id] = false; }
                              else { delete next[m.id]; }
                              picksInitialized.current = true;
                              return next;
                            });
                          }}
                          className={`relative flex flex-col items-center gap-1.5 pt-3 pb-2.5 px-1.5 rounded-2xl border text-center transition-all active:scale-[0.96] ${
                            isStarter ? 'bg-[#00ff41]/8 border-[#00ff41]/35'
                            : isSub   ? 'bg-amber-500/8 border-amber-500/30'
                            :           'bg-neutral-900 border-white/6'
                          }`}>
                          {/* Status badge — top right */}
                          <span className={`absolute top-1.5 right-1.5 text-[8px] font-black px-1.5 py-0.5 rounded-md ${
                            isStarter ? 'bg-[#00ff41]/20 text-[#00ff41]'
                            : isSub   ? 'bg-amber-500/20 text-amber-400'
                            :           'bg-white/5 text-white/20'
                          }`}>
                            {isStarter ? '▶ START' : isSub ? 'SUB' : '—'}
                          </span>

                          {/* Avatar */}
                          <div className={`w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center border-2 shrink-0 ${
                            isStarter ? 'border-[#00ff41]/50'
                            : isSub   ? 'border-amber-500/40'
                            :           'border-white/10'
                          } bg-neutral-800`}>
                            {m.player?.avatarUrl
                              ? <img src={m.player.avatarUrl} className="w-full h-full object-cover" alt="" />
                              : <span className="text-base font-black text-white/40">{m.player?.fullName?.[0]}</span>}
                          </div>

                          {/* Name */}
                          <p className="text-[11px] font-black text-white leading-tight w-full truncate px-0.5">{m.player?.fullName}</p>

                          {/* Position */}
                          {(m.sportRole || m.role) && (
                            <p className="text-[9px] text-neutral-500 capitalize leading-none truncate w-full px-0.5">{m.sportRole || m.role}</p>
                          )}

                          {/* Rank */}
                          <div className={`flex items-center justify-center gap-0.5 ${rank.text}`}>
                            <img src={rank.icon} className="w-3.5 h-3.5 object-contain" alt="" />
                            <span className="text-[9px] font-black">{rank.label}</span>
                          </div>

                          {/* MMR */}
                          <span className="text-[8px] text-neutral-600 font-bold">{m.player?.mmr ?? 1000} MMR</span>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[9px] text-neutral-600 mt-2 mb-4 italic text-center">Tap: Unselected → Starter → Sub → Remove</p>

                  {isOMC && (
                    <div className="flex flex-col gap-2">
                      {isFutsal && !formation && <p className="text-xs text-amber-400 font-bold flex items-center gap-1.5"><AlertCircle size={12} /> Select a formation first</p>}
                      {starterCount < minStarters && <p className="text-xs text-amber-400 font-bold flex items-center gap-1.5"><AlertCircle size={12} /> Need {minStarters - starterCount} more starter{minStarters - starterCount !== 1 ? 's' : ''}</p>}
                      <button
                        onClick={() => doAction('lock_roster', { picks: Object.entries(picks).map(([memberId, isStarter]) => ({ memberId, isStarter })), formation })}
                        disabled={saving || starterCount < minStarters || (isFutsal && !formation)}
                        className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black uppercase rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <><Lock size={16} /> Lock Roster for This Match</>}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Locked: show my full locked roster */}
              {amLocked && (() => {
                const myLockedPicks = (match.rosterPicks || []).filter((p: any) => p.teamId === myTeamId);
                const myStarters   = myLockedPicks.filter((p: any) => p.isStarter);
                const mySubs       = myLockedPicks.filter((p: any) => !p.isStarter);
                const myFormation  = isTeamA ? match.formationA : match.formationB;
                return (
                  <div className="mt-1">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2 text-[#00ff41]">
                        <CheckCircle size={13} />
                        <span className="text-xs font-black">Roster Locked ✓</span>
                      </div>
                      {myFormation && <span className="text-[10px] font-black text-[#00ff41] bg-[#00ff41]/20 border border-[#00ff41]/30 px-2 py-0.5 rounded-lg">{myFormation}</span>}
                    </div>

                  {myStarters.length > 0 && (
                    <>
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#00ff41] mb-2">Starters</p>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {myStarters.map((p: any) => {
                          const rank = getRankData(p.player?.mmr ?? 1000);
                          return (
                            <div key={p.id} className="flex flex-col items-center gap-1 pt-2.5 pb-2 px-1 rounded-2xl bg-[#00ff41]/5 border border-[#00ff41]/20 text-center">
                              <div className="w-11 h-11 rounded-xl bg-neutral-800 overflow-hidden flex items-center justify-center border-2 border-[#00ff41]/40">
                                {p.player?.avatarUrl ? <img src={p.player.avatarUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-base font-black text-white/40">{p.player?.fullName?.[0]}</span>}
                              </div>
                              <p className="text-[11px] font-black text-white truncate w-full px-0.5 leading-tight">{p.player?.fullName ?? 'Player'}</p>
                              {(p.sportRole || p.role) && <p className="text-[9px] text-neutral-500 capitalize truncate w-full px-0.5">{p.sportRole || p.role}</p>}
                              <div className={`flex items-center justify-center gap-0.5 ${rank.text}`}>
                                <img src={rank.icon} className="w-3 h-3 object-contain" alt="" />
                                <span className="text-[8px] font-black">{rank.label}</span>
                              </div>
                              <span className="text-[8px] text-[#00ff41]/60 font-black">▶ START</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {mySubs.length > 0 && (
                    <>
                      <p className="text-[9px] font-black uppercase tracking-wider text-amber-400 mb-2">Substitutes</p>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {mySubs.map((p: any) => {
                          const rank = getRankData(p.player?.mmr ?? 1000);
                          return (
                            <div key={p.id} className="flex flex-col items-center gap-1 pt-2.5 pb-2 px-1 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-center">
                              <div className="w-11 h-11 rounded-xl bg-neutral-800 overflow-hidden flex items-center justify-center border-2 border-amber-500/35">
                                {p.player?.avatarUrl ? <img src={p.player.avatarUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-base font-black text-white/40">{p.player?.fullName?.[0]}</span>}
                              </div>
                              <p className="text-[11px] font-black text-white truncate w-full px-0.5 leading-tight">{p.player?.fullName ?? 'Player'}</p>
                              {(p.sportRole || p.role) && <p className="text-[9px] text-neutral-500 capitalize truncate w-full px-0.5">{p.sportRole || p.role}</p>}
                              <div className={`flex items-center justify-center gap-0.5 ${rank.text}`}>
                                <img src={rank.icon} className="w-3 h-3 object-contain" alt="" />
                                <span className="text-[8px] font-black">{rank.label}</span>
                              </div>
                              <span className="text-[8px] text-amber-400/70 font-black">SUB</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Edit Roster button — only before venue confirmed */}
                  {isOMC && !boardLocked && (
                    <button onClick={() => doAction('unlock_roster')} disabled={saving}
                      className="w-full mt-1 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                      <Edit3 size={13} /> Edit Roster
                    </button>
                  )}
                </div>
              );
            })()}
            </>
          )}

          {/* ═══════ OPPONENT SIDE ═══════ */}
          {rosterView === 'opponent' && (
            opponentLocked ? (() => {
              const opponentTeamId  = isTeamA ? match.teamB_Id : match.teamA_Id;
              const opponentFormation = isTeamA ? match.formationB : match.formationA;
              const opponentPicks   = (match.rosterPicks || []).filter((p: any) => p.teamId === opponentTeamId);
              const opStarters      = opponentPicks.filter((p: any) => p.isStarter);
              const opSubs          = opponentPicks.filter((p: any) => !p.isStarter);
              return (
                <div className="mt-1">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2 text-fuchsia-400">
                      <Lock size={13} />
                      <span className="text-xs font-black">{opponent.name} — Locked</span>
                    </div>
                    {opponentFormation && (
                      <span className="text-[10px] font-black text-fuchsia-300 bg-fuchsia-500/20 border border-fuchsia-500/30 px-2 py-0.5 rounded-lg">{opponentFormation}</span>
                    )}
                  </div>

                  {opStarters.length > 0 && (
                    <>
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#00ff41] mb-2">Starters</p>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {opStarters.map((p: any) => {
                          const rank = getRankData(p.player?.mmr ?? 1000);
                          return (
                            <div key={p.id} className="flex flex-col items-center gap-1 pt-2.5 pb-2 px-1 rounded-2xl bg-[#00ff41]/5 border border-[#00ff41]/15 text-center">
                              <div className="w-11 h-11 rounded-xl bg-neutral-800 overflow-hidden flex items-center justify-center border-2 border-[#00ff41]/35">
                                {p.player?.avatarUrl ? <img src={p.player.avatarUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-base font-black text-white/40">{p.player?.fullName?.[0]}</span>}
                              </div>
                              <p className="text-[11px] font-black text-white truncate w-full px-0.5 leading-tight">{p.player?.fullName ?? 'Player'}</p>
                              {(p.sportRole || p.role) && <p className="text-[9px] text-neutral-500 capitalize truncate w-full px-0.5">{p.sportRole || p.role}</p>}
                              <div className={`flex items-center justify-center gap-0.5 ${rank.text}`}>
                                <img src={rank.icon} className="w-3 h-3 object-contain" alt="" />
                                <span className="text-[8px] font-black">{rank.label}</span>
                              </div>
                              <span className="text-[8px] text-[#00ff41]/60 font-black">▶ START</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {opSubs.length > 0 && (
                    <>
                      <p className="text-[9px] font-black uppercase tracking-wider text-amber-400 mb-2">Substitutes</p>
                      <div className="grid grid-cols-3 gap-2">
                        {opSubs.map((p: any) => {
                          const rank = getRankData(p.player?.mmr ?? 1000);
                          return (
                            <div key={p.id} className="flex flex-col items-center gap-1 pt-2.5 pb-2 px-1 rounded-2xl bg-amber-500/5 border border-amber-500/15 text-center">
                              <div className="w-11 h-11 rounded-xl bg-neutral-800 overflow-hidden flex items-center justify-center border-2 border-amber-500/30">
                                {p.player?.avatarUrl ? <img src={p.player.avatarUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-base font-black text-white/40">{p.player?.fullName?.[0]}</span>}
                              </div>
                              <p className="text-[11px] font-black text-white truncate w-full px-0.5 leading-tight">{p.player?.fullName ?? 'Player'}</p>
                              {(p.sportRole || p.role) && <p className="text-[9px] text-neutral-500 capitalize truncate w-full px-0.5">{p.sportRole || p.role}</p>}
                              <div className={`flex items-center justify-center gap-0.5 ${rank.text}`}>
                                <img src={rank.icon} className="w-3 h-3 object-contain" alt="" />
                                <span className="text-[8px] font-black">{rank.label}</span>
                              </div>
                              <span className="text-[8px] text-amber-400/70 font-black">SUB</span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })() : (
              <div className="mt-12 text-center text-neutral-500">
                <Clock size={36} className="mx-auto mb-3 opacity-20" />
                <p className="font-bold text-sm">{opponent.name}</p>
                <p className="text-xs mt-1">hasn't locked their roster yet</p>
              </div>
            )
          )}

        </div>
      )}

      {/* ── STEP 2: VENUE TYPE SELECTION ── */}
      {currentStep === 2 && (
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-20">

          {/* Team A (challenger) — proposes venue type, not yet set */}
          {isTeamA && isOMC && !match.venueType && (
            <div className="mt-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Both rosters locked!</p>
              <p className="text-sm font-bold text-white mb-5">How will you book the turf?</p>
              <div className="flex flex-col gap-4">
                {/* BMT card */}
                <button
                  onClick={async () => {
                    setSaving(true); setMsg('');
                    const r = await fetch(`/api/interact/match/${matchId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'set_venue_type', venueType:'BMT'}) });
                    const d = await r.json();
                    if (r.ok) { setVenueTypeLocal('BMT'); loadMatch(); }
                    else setMsg('❌ ' + d.error);
                    setSaving(false);
                  }}
                  disabled={saving}
                  className="relative w-full p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/40 to-green-900/20 text-left hover:border-emerald-400/50 hover:from-emerald-900/60 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <span className="absolute top-3 right-3 text-[8px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">FREE · RECOMMENDED</span>
                  <div className="text-3xl mb-2">🏟️</div>
                  <p className="text-base font-black text-white">Book Turf via BMT</p>
                  <p className="text-xs text-neutral-400 mt-1">Search our platform's verified turfs. Opponent accepts your slot pick. Fully managed.</p>
                  {saving && <Loader2 size={14} className="absolute bottom-3 right-3 animate-spin text-emerald-400" />}
                </button>
                {/* Open WBT card */}
                <button
                  onClick={async () => {
                    setSaving(true); setMsg('');
                    const r = await fetch(`/api/interact/match/${matchId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'set_venue_type', venueType:'OPEN_WBT'}) });
                    const d = await r.json();
                    if (r.ok) { setVenueTypeLocal('OPEN_WBT'); loadMatch(); }
                    else setMsg('❌ ' + d.error);
                    setSaving(false);
                  }}
                  disabled={saving}
                  className="relative w-full p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-900/40 to-orange-900/20 text-left hover:border-amber-400/50 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  <span className="absolute top-3 right-3 text-[8px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">PAID</span>
                  <div className="text-3xl mb-2">📋</div>
                  <p className="text-base font-black text-white">We'll Book Ourselves</p>
                  <p className="text-xs text-neutral-400 mt-1">Use an external turf. Match fee of ৳{wbtFee} applies (৳{wbtFee/2} each). Manage your own booking.</p>
                  {saving && <Loader2 size={14} className="absolute bottom-3 right-3 animate-spin text-amber-400" />}
                </button>
              </div>
            </div>
          )}

          {/* Team A — proposed, waiting for opponent to accept */}
          {isTeamA && match.venueType && !match.venueConfirmedByB && (
            <div className="mt-8 text-center">
              <div className="text-5xl mb-3">{match.venueType === 'BMT' ? '🏟️' : '📋'}</div>
              <p className="font-black text-white">{match.venueType === 'BMT' ? 'Book via BMT' : 'We&apos;ll Book Ourselves'} proposed</p>
              <p className="text-xs text-neutral-500 mt-1">Waiting for {opponent?.name} to accept…</p>
              <div className="flex gap-1 justify-center mt-3">
                {[1,2,3].map(i => <div key={i} className="w-2 h-2 rounded-full bg-fuchsia-500 animate-bounce" style={{animationDelay:`${i*0.15}s`}} />)}
              </div>
              {/* Allow Team A to change their mind */}
              {isOMC && (
                <button
                  onClick={async () => {
                    setSaving(true);
                    await fetch(`/api/interact/match/${matchId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'clear_venue_type'}) });
                    setVenueTypeLocal(null); loadMatch(); setSaving(false);
                  }}
                  disabled={saving}
                  className="mt-4 text-xs text-neutral-600 hover:text-red-400 transition-colors"
                >
                  ↩ Change selection
                </button>
              )}
            </div>
          )}

          {/* Team A — both confirmed, advance */}
          {isTeamA && match.venueType && match.venueConfirmedByB && (
            <div className="mt-8 text-center">
              <div className="text-4xl mb-3">{match.venueType === 'BMT' ? '🏟️' : '📋'}</div>
              <p className="font-black text-[#00ff41]">✓ Opponent accepted!</p>
              <p className="text-xs text-neutral-500 mt-1">Advancing to booking…</p>
              <button onClick={() => setCurrentStep(3)} className="mt-4 px-5 py-2 bg-fuchsia-600 text-white font-black rounded-xl text-sm">Continue →</button>
            </div>
          )}

          {/* Team B — waiting for Team A to propose */}
          {!isTeamA && !match.venueType && (
            <div className="mt-12 text-center text-neutral-500">
              <Clock size={36} className="mx-auto mb-3 opacity-20" />
              <p className="font-bold text-sm">Waiting for {match.teamA?.name}</p>
              <p className="text-xs mt-1">to choose how to book the turf…</p>
            </div>
          )}

          {/* Team B — accept or reject opponent's venue proposal */}
          {!isTeamA && match.venueType && !match.venueConfirmedByB && isOMC && (
            <div className="mt-6">
              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-4">Opponent's Venue Proposal</p>
              <div className={`p-5 rounded-2xl border mb-5 ${
                match.venueType === 'BMT'
                  ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-900/30 to-green-900/10'
                  : 'border-amber-500/30 bg-gradient-to-br from-amber-900/30 to-orange-900/10'
              }`}>
                <div className="text-4xl mb-2">{match.venueType === 'BMT' ? '🏟️' : '📋'}</div>
                <p className="font-black text-white text-lg">{match.venueType === 'BMT' ? 'Book Turf via BMT' : 'We&apos;ll Book Ourselves'}</p>
                <p className="text-xs text-neutral-400 mt-1">
                  {match.venueType === 'BMT'
                    ? "Search our platform's verified turfs. Opponent picks the slot, you accept."
                    : `Use an external turf. Match fee of ৳${wbtFee} applies (৳${wbtFee/2} each).`}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    setSaving(true); setMsg('');
                    const r = await fetch(`/api/interact/match/${matchId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'respond_venue_type', accept: false}) });
                    const d = await r.json();
                    if (!r.ok) setMsg('❌ ' + d.error);
                    else { setMsg('Rejected — opponent can choose again'); loadMatch(); }
                    setSaving(false);
                  }}
                  disabled={saving}
                  className="flex-1 py-3.5 rounded-2xl border border-red-500/40 text-red-400 font-black text-sm hover:bg-red-500/10 transition-all disabled:opacity-50"
                >
                  ✕ Reject
                </button>
                <button
                  onClick={async () => {
                    setSaving(true); setMsg('');
                    const r = await fetch(`/api/interact/match/${matchId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({action:'respond_venue_type', accept: true}) });
                    const d = await r.json();
                    if (r.ok) { setCurrentStep(3); loadMatch(); }
                    else setMsg('❌ ' + d.error);
                    setSaving(false);
                  }}
                  disabled={saving}
                  className="flex-[2] py-3.5 rounded-2xl bg-[#00ff41] text-black font-black text-sm hover:bg-[#00dd38] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : '✓ Accept'}
                </button>
              </div>
              {msg && <p className="text-xs text-amber-400 text-center font-bold mt-3">{msg}</p>}
            </div>
          )}

          {/* Team B — waiting, not OMC */}
          {!isTeamA && match.venueType && !match.venueConfirmedByB && !isOMC && (
            <div className="mt-12 text-center text-neutral-500">
              <Clock size={36} className="mx-auto mb-3 opacity-20" />
              <p className="font-bold text-sm">Waiting for your captain to accept</p>
              <p className="text-xs mt-1">{match.venueType === 'BMT' ? '🏟️ BMT Booking' : '📋 Open WBT'} proposed</p>
            </div>
          )}

          {/* Team B — confirmed, advance */}
          {!isTeamA && match.venueType && match.venueConfirmedByB && (
            <div className="mt-8 text-center">
              <div className="text-4xl mb-3">{match.venueType === 'BMT' ? '🏟️' : '📋'}</div>
              <p className="font-black text-[#00ff41]">✓ Venue confirmed!</p>
              <button onClick={() => setCurrentStep(3)} className="mt-4 px-5 py-2 bg-fuchsia-600 text-white font-black rounded-xl text-sm">Go to Booking →</button>
            </div>
          )}

        </div>
      )}

      {/* ── STEP 3a: BMT BOOKING ── */}
      {currentStep === 3 && (venueTypeLocal ?? match.venueType) === 'BMT' && (() => {
        const vt = venueTypeLocal ?? match.venueType;
        const slotPending = match.selectedSlotId && !match.venueBookedAt;
        const isChallengerView = isTeamA;

        // ── Challenged team view: Accept/Decline pending slot
        if (!isChallengerView && slotPending && isOMC) {
          const slot = pendingBmtSlot ?? { turfName: match.wbtTurfName ?? '—', startTime: match.wbtFrom ?? '—', endTime: match.wbtTo ?? '—', price: 0, date: match.matchDate ?? '—', slotId: match.selectedSlotId! };
          return (
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-20">
              <div className="mt-4 p-5 rounded-2xl border border-amber-500/30 bg-amber-900/10">
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2">Challenger Picked a Slot!</p>
                <p className="font-black text-white text-sm">{slot.turfName}</p>
                <p className="text-xs text-neutral-400 mt-0.5">🕒 {slot.startTime}–{slot.endTime} · 📅 {slot.date}</p>
                {slot.price > 0 && <p className="text-xs font-bold text-fuchsia-400 mt-1">৳{(slot.price/2).toFixed(0)} each (50/50)</p>}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={async () => {
                      setSaving(true); setMsg('');
                      const r = await fetch(`/api/interact/match/${matchId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'bmt_slot_respond', accept: false }) });
                      const d = await r.json();
                      if (!r.ok) setMsg('❌ ' + d.error);
                      else { setMsg('Slot declined — challenger will pick another'); loadMatch(); }
                      setSaving(false);
                    }}
                    disabled={saving}
                    className="flex-1 py-3 rounded-2xl border border-red-500/40 text-red-400 font-black text-sm hover:bg-red-500/10 transition-all disabled:opacity-50"
                  >
                    ✕ Decline
                  </button>
                  <button
                    onClick={async () => {
                      setSaving(true); setMsg('');
                      const r = await fetch(`/api/interact/match/${matchId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'bmt_slot_respond', accept: true }) });
                      const d = await r.json();
                      if (r.ok) { setMsg('✅ Booked! ' + d.bookingCode); setCurrentStep(4); loadMatch(); }
                      else setMsg('❌ ' + d.error);
                      setSaving(false);
                    }}
                    disabled={saving}
                    className="flex-1 py-3 rounded-2xl bg-[#00ff41] text-black font-black text-sm hover:bg-[#00dd38] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : '✓ Accept & Book'}
                  </button>
                </div>
              </div>
            </div>
          );
        }

        // ── Challenged waiting for challenger to pick
        if (!isChallengerView && !slotPending) {
          return (
            <div className="flex-1 min-h-0 flex items-center justify-center">
              <div className="text-center text-neutral-500">
                <Clock size={36} className="mx-auto mb-3 opacity-20" />
                <p className="font-bold text-sm">Waiting for {match.teamA?.name}</p>
                <p className="text-xs mt-1">to pick a turf slot…</p>
              </div>
            </div>
          );
        }

        // ── Challenger: slot already sent — waiting for response
        if (isChallengerView && slotPending) {
          return (
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-20">
              <div className="mt-4 p-4 bg-[#00ff41]/5 border border-[#00ff41]/20 rounded-2xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#00ff41] mb-1">Slot Sent!</p>
                <p className="font-black text-sm text-white">{match.wbtTurfName ?? '—'}</p>
                <p className="text-xs text-neutral-400 mt-0.5">📅 {match.matchDate} · 🕒 {pendingBmtSlot?.startTime ?? '—'}–{pendingBmtSlot?.endTime ?? '—'}</p>
                <p className="text-xs text-neutral-500 mt-3 flex items-center gap-1.5"><Clock size={10} className="animate-spin" /> Waiting for {match.teamB?.name} to accept…</p>
                <button onClick={() => { setSaving(true); fetch(`/api/interact/match/${matchId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'book_bmt_slot', slotId: match.selectedSlotId, date: match.matchDate, _cancel: true }) }).finally(() => { setSaving(false); loadMatch(); }); setMsg(''); }} className="mt-3 text-xs text-neutral-600 hover:text-red-400 transition-colors">Cancel &amp; Pick Again</button>
              </div>
            </div>
          );
        }

        // ── Challenger: pick a turf + slot (main UI)
        return (
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-20">
            <div className="mt-3 mb-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input value={venueSearch} onChange={e => { setVenueSearch(e.target.value); }}
                  placeholder="Search turfs…"
                  className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-fuchsia-500/50 placeholder:text-neutral-600" />
              </div>
              <input type="date" value={venueDate} onChange={e => { setVenueDate(e.target.value); loadVenues(matchData?.match.teamA.sportType ?? ''); }}
                className="bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none focus:border-fuchsia-500/50 shrink-0 w-36" />
            </div>

            {venuesLoading ? (
              <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-fuchsia-500" /></div>
            ) : turfs.filter((t:any) => !venueSearch || t.name.toLowerCase().includes(venueSearch.toLowerCase())).length === 0 ? (
              <div className="py-16 text-center text-neutral-500">
                <MapPin size={32} className="mx-auto mb-3 opacity-20" />
                <p className="font-bold text-sm">No turfs available</p>
                <p className="text-xs mt-1">Try a different date</p>
              </div>
            ) : (
              turfs.filter((t:any) => !venueSearch || t.name.toLowerCase().includes(venueSearch.toLowerCase())).map((turf: any) => (
                <div key={turf.id} className="mb-3 rounded-2xl border border-white/10 bg-neutral-900 overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                    <Building2 size={14} className="text-neutral-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm truncate">{turf.name}</p>
                      <p className="text-[10px] text-neutral-500">{turf.area || turf.city || ''}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1 p-2">
                    {(turf.slots || []).map((slot: any) => {
                      const isPicked = match.selectedSlotId === slot.id;
                      const isFull = slot.status === 'booked';
                      return (
                        <button key={slot.id} disabled={isFull || saving}
                          onClick={async () => {
                            if (isFull) return;
                            setSaving(true); setMsg('');
                            const r = await fetch(`/api/interact/match/${matchId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'book_bmt_slot', slotId: slot.id, date: venueDate }) });
                            const d = await r.json();
                            if (r.ok) { setPendingBmtSlot({ slotId: slot.id, date: venueDate, turfName: turf.name, startTime: slot.startTime, endTime: slot.endTime, price: slot.price }); setMsg('✅ Slot sent to opponent!'); loadMatch(); }
                            else setMsg('❌ ' + d.error);
                            setSaving(false);
                          }}
                          className={`flex flex-col items-center py-2.5 rounded-xl border text-center transition-all ${isPicked ? 'bg-[#00ff41]/15 border-[#00ff41]/40 text-[#00ff41]' : isFull ? 'bg-neutral-800 border-white/5 text-neutral-600 cursor-not-allowed' : 'bg-neutral-800 border-white/10 text-white hover:border-fuchsia-500/40'}`}
                        >
                          <span className="text-[10px] font-black">{slot.startTime}</span>
                          <span className="text-[8px] opacity-70">–{slot.endTime}</span>
                          <span className="text-[9px] font-bold mt-0.5 text-[#00ff41]">{isFull ? 'Full' : `৳${slot.price/2}`}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        );
      })()}

      {/* ── STEP 3b: OPEN WBT BOOKING ── */}
      {currentStep === 3 && (venueTypeLocal ?? match.venueType) === 'OPEN_WBT' && (() => {
        const myPaid = isTeamA ? match.wbtPaymentA : match.wbtPaymentB;
        const oppPaid = isTeamA ? match.wbtPaymentB : match.wbtPaymentA;
        const perTeam = wbtFee / 2 - (match.wbtCouponDiscount ?? 0);
        const turfSelected = !!match.wbtTurfId;

        return (
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-20">
            {/* ── Section 1: Turf selection (challenger only) ── */}
            {isTeamA && isOMC && !turfSelected && (
              <div className="mt-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Select Your External Turf</p>
                <div className="relative mb-3">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input value={wbtTurfSearch} onChange={e => setWbtTurfSearch(e.target.value)}
                    placeholder="Search WBT turfs…"
                    className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white outline-none focus:border-fuchsia-500/50 placeholder:text-neutral-600" />
                </div>
                <div className="flex flex-col gap-2 mb-4">
                  {wbtTurfs.filter((t:any) => !wbtTurfSearch || t.name.toLowerCase().includes(wbtTurfSearch.toLowerCase())).map((t:any) => (
                    <button key={t.id} onClick={() => setSelectedWbtTurf(t)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${selectedWbtTurf?.id === t.id ? 'bg-amber-500/15 border-amber-500/40' : 'bg-neutral-900 border-white/10 hover:border-white/20'}`}>
                      <Globe size={14} className="text-amber-400 shrink-0" />
                      <div>
                        <p className="font-black text-sm">{t.name}</p>
                        <p className="text-[10px] text-neutral-500">{t.division?.name} · {t.city?.name}</p>
                      </div>
                      {selectedWbtTurf?.id === t.id && <CheckCircle size={14} className="text-amber-400 ml-auto shrink-0" />}
                    </button>
                  ))}
                  {wbtTurfs.length === 0 && <p className="text-xs text-neutral-500 py-4 text-center">No WBT turfs registered. Ask admin to add some.</p>}
                </div>
                {selectedWbtTurf && (
                  <div className="flex flex-col gap-3 p-4 bg-neutral-900 border border-white/10 rounded-2xl mb-3">
                    <p className="text-xs font-black text-amber-400">Set Match Details</p>
                    <input type="date" value={wbtMatchDate} onChange={e => setWbtMatchDate(e.target.value)}
                      className="bg-neutral-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50" />
                    <div className="flex gap-2">
                      <input type="time" value={wbtFrom} onChange={e => setWbtFrom(e.target.value)}
                        className="flex-1 bg-neutral-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50" />
                      <span className="flex items-center text-neutral-500 text-sm">to</span>
                      <input type="time" value={wbtTo} onChange={e => setWbtTo(e.target.value)}
                        className="flex-1 bg-neutral-800 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50" />
                    </div>
                    <button
                      onClick={async () => {
                        if (!wbtFrom || !wbtTo || !wbtMatchDate) { setMsg('❌ Fill in all date/time fields'); return; }
                        setSaving(true); setMsg('');
                        const r = await fetch(`/api/interact/match/${matchId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'select_wbt_turf', wbtTurfId: selectedWbtTurf.id, wbtFrom, wbtTo, matchDate: wbtMatchDate }) });
                        const d = await r.json();
                        if (r.ok) { setMsg('✅ Turf selected!'); loadMatch(); }
                        else setMsg('❌ ' + d.error);
                        setSaving(false);
                      }}
                      disabled={saving}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                      Confirm Turf &amp; Time
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Section 2: Turf confirmed — show details + payment ── */}
            {turfSelected && (
              <div className="mt-3 flex flex-col gap-3">
                {/* Turf info card */}
                <div className="p-4 bg-amber-900/10 border border-amber-500/20 rounded-2xl">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1">External Turf Selected</p>
                  <p className="font-black text-white">{match.wbtTurfName}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">📅 {match.matchDate} · 🕒 {match.wbtFrom}–{match.wbtTo}</p>
                </div>

                {/* Payment status cards */}
                <div className="grid grid-cols-2 gap-2">
                  {[{ name: match.teamA?.name, paid: match.wbtPaymentA }, { name: match.teamB?.name, paid: match.wbtPaymentB }].map((t, i) => (
                    <div key={i} className={`p-3 rounded-xl border text-center ${t.paid ? 'bg-[#00ff41]/10 border-[#00ff41]/30' : 'bg-neutral-900 border-white/10'}`}>
                      <p className="text-[9px] font-black uppercase tracking-widest text-neutral-500 mb-0.5">{t.name}</p>
                      {t.paid
                        ? <p className="text-[#00ff41] font-black text-xs flex items-center justify-center gap-1"><CheckCircle size={11} /> Paid</p>
                        : <p className="text-neutral-500 text-xs font-bold">৳{perTeam.toFixed(0)} pending</p>
                      }
                    </div>
                  ))}
                </div>

                {/* Coupon (only if not yet paid) */}
                {!myPaid && isOMC && (
                  <div className="flex gap-2">
                    <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Coupon code (optional)"
                      className="flex-1 bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-mono text-white outline-none focus:border-amber-500/50 placeholder:text-neutral-600" />
                    <button
                      onClick={async () => {
                        if (!couponCode) return;
                        setSaving(true); setMsg('');
                        const r = await fetch(`/api/interact/match/${matchId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'apply_wbt_coupon', couponCode }) });
                        const d = await r.json();
                        if (r.ok) { setCouponDiscount(d.discount); setMsg(`✅ Coupon applied — ৳${d.discount} off each team`); loadMatch(); }
                        else setMsg('❌ ' + d.error);
                        setSaving(false);
                      }}
                      disabled={saving || !couponCode}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl disabled:opacity-50 transition-all"
                    >
                      Apply
                    </button>
                  </div>
                )}
                {match.wbtCouponCode && (
                  <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5"><CheckCircle size={11} /> Coupon <span className="font-mono">{match.wbtCouponCode}</span> — ৳{(match.wbtCouponDiscount??0).toFixed(0)} off each team</p>
                )}

                {/* Fee summary */}
                <div className="p-3 bg-neutral-900 border border-white/10 rounded-xl text-xs">
                  <div className="flex justify-between mb-1"><span className="text-neutral-500">Match Fee</span><span className="font-bold">৳{wbtFee}</span></div>
                  {(match.wbtCouponDiscount ?? 0) > 0 && <div className="flex justify-between mb-1 text-amber-400"><span>Coupon discount (each)</span><span>-৳{(match.wbtCouponDiscount??0).toFixed(0)}</span></div>}
                  <div className="flex justify-between font-black text-white border-t border-white/10 pt-1 mt-1"><span>Your share</span><span>৳{Math.max(0, perTeam).toFixed(0)}</span></div>
                </div>

                {/* Pay button */}
                {isOMC && !myPaid && (
                  <button
                    onClick={async () => {
                      setSaving(true); setMsg('');
                      const r = await fetch(`/api/interact/match/${matchId}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ action:'pay_wbt' }) });
                      const d = await r.json();
                      if (r.ok) {
                        setMsg(d.bothPaid ? '✅ Both paid! Booking confirmed.' : '✅ Payment sent — waiting for opponent');
                        if (d.bothPaid) setCurrentStep(4);
                        loadMatch();
                      } else setMsg('❌ ' + d.error);
                      setSaving(false);
                    }}
                    disabled={saving}
                    className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : `Pay ৳${Math.max(0, perTeam).toFixed(0)} from Wallet`}
                  </button>
                )}
                {myPaid && !oppPaid && (
                  <div className="p-4 bg-[#00ff41]/5 border border-[#00ff41]/20 rounded-2xl text-center">
                    <p className="text-[#00ff41] font-black text-sm mb-1">✅ You've paid!</p>
                    <p className="text-xs text-neutral-400 flex items-center justify-center gap-1.5"><Clock size={10} className="animate-spin" /> Waiting for {isTeamA ? match.teamB?.name : match.teamA?.name} to pay…</p>
                  </div>
                )}
                {!isOMC && !myPaid && (
                  <p className="text-xs text-neutral-500 text-center py-2">Only OMC can make payment</p>
                )}
              </div>
            )}

            {/* ── Not challenger waiting ── */}
            {!isTeamA && !turfSelected && (
              <div className="flex-1 flex items-center justify-center mt-16 text-center text-neutral-500">
                <div>
                  <Clock size={36} className="mx-auto mb-3 opacity-20" />
                  <p className="font-bold text-sm">Waiting for {match.teamA?.name}</p>
                  <p className="text-xs mt-1">to select the external turf &amp; time…</p>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── STEP 4: BOOKING COMPLETE ── */}
      {currentStep === 4 && (
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-24">
          <div className="mt-4 flex flex-col gap-3">

            {/* Confirmed banner */}
            <div className="p-4 bg-[#00ff41]/5 border border-[#00ff41]/20 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-[#00ff41]" />
                <p className="text-[#00ff41] font-black text-sm">
                  {match.venueType === 'OPEN_WBT' ? 'Open WBT Booking' : 'BMT Venue'} Confirmed!
                </p>
              </div>
              {match.matchDate && <p className="text-xs text-neutral-400">📅 {match.matchDate}</p>}
              {match.venueType === 'OPEN_WBT' && match.wbtTurfName && (
                <p className="text-xs text-neutral-400">📍 {match.wbtTurfName} · {match.wbtFrom}–{match.wbtTo}</p>
              )}
              {match.bookingCode && (
                <div className="mt-3 py-3 px-4 bg-neutral-950 border border-white/10 rounded-xl">
                  <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Booking Code</p>
                  <p className="text-3xl font-black tracking-[0.4em] text-white">{match.bookingCode}</p>
                  <p className="text-[9px] text-neutral-600 mt-1">Show this to the turf manager on match day</p>
                </div>
              )}
            </div>

            {/* Match summary chips */}
            <div className="flex gap-2 flex-wrap">
              <span className="px-3 py-1.5 rounded-full bg-neutral-900 border border-white/10 text-[10px] font-black text-neutral-400">
                {match.teamA?.sportType?.replace(/_/g,' ')}
              </span>
              <span className="px-3 py-1.5 rounded-full bg-neutral-900 border border-white/10 text-[10px] font-black text-neutral-400">
                {match.venueType === 'OPEN_WBT' ? '📋 Open WBT' : '🏟️ BMT Managed'}
              </span>
              {match.formationA && (
                <span className="px-3 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20 text-[10px] font-black text-fuchsia-400">
                  {isTeamA ? match.formationA : match.formationB}
                </span>
              )}
            </div>

            {/* SCHEDULED — Start Match flow */}
            {match.status === 'SCHEDULED' && (isOMC || isScorer) && (
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                <p className="text-amber-400 font-black text-sm mb-1">⏳ Match Day</p>
                <p className="text-xs text-neutral-400 mb-3">
                  Both captains must tap <strong className="text-white">Start Match</strong> to go live.
                </p>

                {/* Readiness indicator */}
                <div className="flex gap-2 mb-3">
                  {[{name: match.teamA?.name, ready: match.matchStartedByA},{name: match.teamB?.name, ready: match.matchStartedByB}].map((t,i) => (
                    <div key={i} className={`flex-1 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-black ${
                      t.ready ? 'bg-[#00ff41]/10 border-[#00ff41]/30 text-[#00ff41]' : 'bg-neutral-900 border-white/10 text-neutral-500'
                    }`}>
                      {t.ready ? <CheckCircle size={11} /> : <Clock size={11} />}
                      <span className="truncate">{t.name}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => doAction('start_match')}
                  disabled={saving || (isTeamA ? match.matchStartedByA : match.matchStartedByB)}
                  className="w-full py-3.5 rounded-2xl bg-[#00ff41] text-black font-black text-sm uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {saving
                    ? <Loader2 size={16} className="animate-spin" />
                    : (isTeamA ? match.matchStartedByA : match.matchStartedByB)
                    ? '✓ Ready — waiting for opponent'
                    : '🚀 Start Match'}
                </button>
              </div>
            )}

            {/* Assign scorer button (SCHEDULED, OMC only, scorer not yet assigned) */}
            {match.status === 'SCHEDULED' && isOMC && !match.scorers?.some((s:any) => s.teamId === myTeamId) && (
              <button onClick={() => setScorerPanelOpen(true)}
                className="w-full py-3 rounded-2xl border border-fuchsia-500/30 bg-fuchsia-500/5 text-fuchsia-400 font-black text-sm flex items-center justify-center gap-2 hover:bg-fuchsia-500/10 transition-all">
                <Swords size={14} /> Assign Live Scorer
              </button>
            )}

            {/* LIVE / SCORE_ENTRY — Enter live scoring */}
            {(match.status === 'LIVE' || match.status === 'SCORE_ENTRY') && (() => {
              const sport = match.teamA?.sportType ?? '';
              const isCricketSport = ['CRICKET_7','CRICKET_FULL'].includes(sport);
              return (
                <button onClick={() => router.push(`/${locale}/matches/${matchId}/${isCricketSport ? 'cricket' : 'live'}`)}
                  className="w-full py-4 rounded-2xl bg-red-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(239,68,68,0.4)] animate-pulse">
                  {isCricketSport ? '🏏' : '🔴'} Enter Live Scoring
                </button>
              );
            })()}

            {/* Non-OMC / non-scorer info */}
            {!isOMC && !isScorer && match.status === 'SCHEDULED' && (
              <div className="p-4 bg-neutral-900 border border-white/10 rounded-2xl text-center">
                <Clock size={20} className="mx-auto mb-2 text-neutral-500" />
                <p className="text-xs text-neutral-500">Waiting for match day.</p>
                <p className="text-[10px] text-neutral-600 mt-0.5">Only OMC/Scorer can start the match.</p>
              </div>
            )}

          </div>
        </div>
      )}


      {/* ── FLOATING CHAT BUBBLE ── */}
      <button
        onClick={() => {
          setChatOpen(true);
          setChatUnread(0);
          if (!chatMessages.length) loadChat();
          setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 150);
        }}
        className="fixed bottom-20 right-4 z-[100] w-12 h-12 rounded-full bg-fuchsia-600 hover:bg-fuchsia-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/30 transition-all active:scale-95"
      >
        <MessageCircle size={20} className="text-white" />
        {chatUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center animate-bounce">
            {chatUnread > 9 ? '9+' : chatUnread}
          </span>
        )}
      </button>

      {/* Chat Overlay — full screen, input above bottom nav */}
      {chatOpen && (
        <div className="fixed inset-0 z-[9000] flex flex-col bg-[#0d0d0d]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0 bg-[#0d0d0d]">
            <div className="flex items-center gap-2">
              <Wifi size={13} className="text-[#00ff41]" />
              <span className="text-sm font-black">Match Chat</span>
              <span className="text-[9px] text-neutral-500">OMC only</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400">
              <X size={15} />
            </button>
          </div>

          {/* Messages — fills remaining space */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-0">
            {chatMessages.length === 0 && <p className="text-center text-neutral-500 text-xs italic py-8">No messages yet.</p>}
            {chatMessages.map((m: any) => {
              const isMe = m.teamId === myTeamId;
              const senderTeam = isMe ? myTeam : opponent;
              const memberEntry = senderTeam?.members?.find((mem: any) => mem.playerId === m.player?.id);
              const senderRole = memberEntry?.role || (senderTeam?.ownerId === m.player?.id ? 'owner' : '');
              const roleLabel = senderRole === 'owner' ? 'Owner' : senderRole === 'manager' ? 'Manager' : senderRole === 'captain' ? 'Captain' : 'OMC';
              return (
                <div key={m.id} className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-1.5 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-[9px] text-neutral-500 font-bold">{m.player?.fullName}</span>
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${isMe ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>{roleLabel}</span>
                  </div>
                  <div className={`px-3 py-2 rounded-2xl max-w-[78%] text-sm ${isMe ? 'bg-fuchsia-600 text-white rounded-tr-sm' : 'bg-neutral-800 border border-white/10 text-white rounded-tl-sm'}`}>{m.message}</div>
                  <span className="text-[9px] text-neutral-600 px-1">{new Date(m.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          {/* Input — pinned above bottom nav (64px) */}
          {isOMC ? (
            <div className="shrink-0 flex gap-2 px-4 pb-5 pt-3 border-t border-white/10 bg-[#0d0d0d]">
              <input
                value={chatMsg}
                onChange={e => setChatMsg(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Message opponent OMC…"
                autoFocus
                className="flex-1 bg-neutral-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-fuchsia-500/50"
              />
              <button
                onClick={sendChat}
                disabled={chatSending || !chatMsg.trim()}
                className="w-11 h-11 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 flex items-center justify-center disabled:opacity-50 shrink-0"
              >
                {chatSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          ) : (
            <div className="shrink-0 px-4 pb-5 pt-3 text-center text-[10px] text-neutral-500 font-bold border-t border-white/5">Only OMC can chat</div>
          )}
        </div>
      )}
    </div>

      {/* ── Scorer Selection Overlay ── */}
      {scorerPanelOpen && (() => {
        const myRosterPicks = (match.rosterPicks || []).filter((p: any) => p.teamId === myTeamId);
        const rosteredMembers = myTeam.members.filter((m: any) =>
          myRosterPicks.some((p: any) => p.memberId === m.id)
        );
        return (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex flex-col justify-end">
            <div className="bg-[#111318] rounded-t-3xl border-t border-white/10 p-5 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                  <h2 className="text-lg font-black text-white">Assign Scorer</h2>
                  <p className="text-xs text-neutral-500 mt-0.5">This player will score for {myTeam.name} in the live match.</p>
                </div>
                <button onClick={() => { setScorerPanelOpen(false); setScorerPlayerId(null); }}
                  className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400">
                  &times;
                </button>
              </div>
              <div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">
                {rosteredMembers.length === 0 && (
                  <p className="text-neutral-500 text-sm text-center py-8">No rostered players found. Lock roster first.</p>
                )}
                {rosteredMembers.map((m: any) => (
                  <button key={m.id} onClick={() => setScorerPlayerId(m.playerId)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      scorerPlayerId === m.playerId
                        ? 'bg-fuchsia-600/20 border-fuchsia-500/50 text-fuchsia-300'
                        : 'bg-neutral-900 border-white/5 text-white hover:border-white/15'
                    }`}>
                    <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
                      {m.player?.avatarUrl ? <img src={m.player.avatarUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-sm font-black text-white/40">{m.player?.fullName[0]}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm truncate">{m.player?.fullName}</p>
                      <p className="text-[10px] text-neutral-500 capitalize">{m.sportRole || m.role}</p>
                    </div>
                    {scorerPlayerId === m.playerId && <CheckCircle size={16} className="text-fuchsia-400 shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="shrink-0 pt-4">
                <button onClick={assignScorer} disabled={!scorerPlayerId || scorerSaving}
                  className="w-full py-3.5 rounded-2xl bg-fuchsia-600 text-white font-black text-sm disabled:opacity-40 flex items-center justify-center gap-2 transition-all">
                  {scorerSaving ? <Loader2 size={16} className="animate-spin" /> : '✓ Assign Scorer'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
