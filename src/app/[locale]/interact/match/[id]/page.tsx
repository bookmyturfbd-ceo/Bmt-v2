'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Users, MapPin, MessageCircle, ChevronLeft, Loader2, Shield,
  Lock, Send, AlertCircle, CheckCircle, Swords, Clock, Search, X, Edit3, ChevronDown, ChevronUp, BarChart2
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
      // Only initialize picks once — never overwrite user's unsaved selections
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
      // Auto-redirect once venue is booked (SCHEDULED) — the Start button is on the active tab
      if (d.match?.status === 'SCHEDULED' || d.match?.venueBookedAt) {
        router.replace(`/${locale}/interact`);
        return;
      }
    }
    if (!loading) return; // only set loading false once
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
    const t = setInterval(() => {
      loadMatch();
      if (activeTab === 'chat') loadChat();
    }, 5000);
    return () => clearInterval(t);
  }, [activeTab, loadMatch, loadChat]);

  useEffect(() => {
    if (activeTab === 'chat') loadChat();
    if (activeTab === 'venue' && matchData) {
      loadVenues(matchData.match.teamA.sportType);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'venue' && matchData) {
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

      {/* ── TABS ── */}
      <div className="shrink-0 flex gap-1 px-4 pt-3 pb-2">
        {(['roster','venue','chat'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-black rounded-xl transition-all ${
              activeTab === tab ? 'bg-fuchsia-600 text-white' : 'bg-neutral-900 text-neutral-500 hover:text-white border border-white/5'
            }`}>
            {tab === 'roster' ? <><Users size={12} /> Roster</> : tab === 'venue' ? <><MapPin size={12} /> Venue</> : <><MessageCircle size={12} /> Chat</>}
          </button>
        ))}
      </div>

      {/* ── STATUS MSG ── */}
      {msg && (
        <div className={`shrink-0 mx-4 mb-1 px-3 py-2 rounded-xl text-xs font-bold ${msg.startsWith('✅') ? 'bg-[#00ff41]/10 text-[#00ff41] border border-[#00ff41]/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {msg}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 1: ROSTER & FORMATION
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'roster' && (
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

                  <div className="flex flex-col gap-2">
                    {myMembers.map((m: any) => {
                      const inPick = picks.hasOwnProperty(m.id);
                      const isStarter = picks[m.id] === true;
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
                          className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all w-full hover:border-fuchsia-500/30 active:scale-[0.98] ${
                            inPick ? (isStarter ? 'bg-[#00ff41]/5 border-[#00ff41]/20' : 'bg-amber-500/5 border-amber-500/20') : 'bg-neutral-900 border-white/5'
                          }`}>
                          <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                            {m.player?.avatarUrl ? <img src={m.player.avatarUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-xs font-black text-white/50">{m.player?.fullName?.[0]}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{m.player?.fullName}</p>
                            <p className="text-[10px] text-neutral-500 capitalize">{m.sportRole || m.role}</p>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            <div className={`flex items-center justify-center gap-1 text-[10px] font-bold ${rank.text}`}><img src={rank.icon} className="w-3.5 h-3.5 object-contain" alt="" />{rank.label}</div>
                            <span className="text-[10px] text-neutral-500 font-bold">{m.player?.mmr ?? 1000}</span>
                          </div>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black ${
                            inPick ? (isStarter ? 'bg-[#00ff41]/20 text-[#00ff41]' : 'bg-amber-500/20 text-amber-400') : 'bg-white/5 text-white/20'
                          }`}>
                            {inPick ? (isStarter ? '▶' : 'S') : '—'}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[9px] text-neutral-600 mt-2 mb-4 italic text-center">Tap: Not selected → Starter → Sub → Remove</p>

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
                        <p className="text-[9px] font-black uppercase tracking-wider text-[#00ff41] mb-1.5">Starters</p>
                        <div className="flex flex-col gap-1.5 mb-3">
                          {myStarters.map((p: any) => {
                            const rank = getRankData(p.player?.mmr ?? 1000);
                            return (
                              <div key={p.id} className="flex items-center gap-2.5 px-3 py-2.5 bg-neutral-900 border border-[#00ff41]/15 rounded-xl">
                                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                                  {p.player?.avatarUrl ? <img src={p.player.avatarUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-xs font-black text-white/40">{p.player?.fullName?.[0]}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold truncate">{p.player?.fullName ?? 'Player'}</p>
                                  <p className="text-[9px] text-neutral-500 capitalize">{p.sportRole || p.role}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold ${rank.text}`}><img src={rank.icon} className="w-3.5 h-3.5 object-contain" alt="" />{rank.label}</span>
                                  <span className="text-[9px] text-neutral-600">{p.player?.mmr ?? 1000}</span>
                                  <span className="text-[9px] font-black text-[#00ff41] bg-[#00ff41]/10 px-1.5 py-0.5 rounded">▶</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {mySubs.length > 0 && (
                      <>
                        <p className="text-[9px] font-black uppercase tracking-wider text-amber-400 mb-1.5">Substitutes</p>
                        <div className="flex flex-col gap-1.5 mb-3">
                          {mySubs.map((p: any) => {
                            const rank = getRankData(p.player?.mmr ?? 1000);
                            return (
                              <div key={p.id} className="flex items-center gap-2.5 px-3 py-2.5 bg-neutral-900 border border-amber-500/10 rounded-xl">
                                <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                                  {p.player?.avatarUrl ? <img src={p.player.avatarUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-xs font-black text-white/40">{p.player?.fullName?.[0]}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold truncate">{p.player?.fullName ?? 'Player'}</p>
                                  <p className="text-[9px] text-neutral-500 capitalize">{p.sportRole || p.role}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold ${rank.text}`}><img src={rank.icon} className="w-3.5 h-3.5 object-contain" alt="" />{rank.label}</span>
                                  <span className="text-[9px] text-neutral-600">{p.player?.mmr ?? 1000}</span>
                                  <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">S</span>
                                </div>
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
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#00ff41] mb-1.5">Starters</p>
                      <div className="flex flex-col gap-1.5 mb-3">
                        {opStarters.map((p: any) => {
                          const rank = getRankData(p.player?.mmr ?? 1000);
                          return (
                            <div key={p.id} className="flex items-center gap-2.5 px-3 py-2.5 bg-neutral-900 border border-[#00ff41]/10 rounded-xl">
                              <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                                {p.player?.avatarUrl ? <img src={p.player.avatarUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-xs font-black text-white/40">{p.player?.fullName?.[0]}</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate">{p.player?.fullName ?? 'Player'}</p>
                                <p className="text-[9px] text-neutral-500 capitalize">{p.sportRole || p.role}</p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`inline-flex items-center gap-1 text-[9px] font-bold ${rank.text}`}><img src={rank.icon} className="w-3.5 h-3.5 object-contain" alt="" />{rank.label}</span>
                                <span className="text-[9px] text-neutral-600">{p.player?.mmr ?? 1000}</span>
                                <span className="text-[9px] font-black text-[#00ff41] bg-[#00ff41]/10 px-1.5 py-0.5 rounded">▶</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {opSubs.length > 0 && (
                    <>
                      <p className="text-[9px] font-black uppercase tracking-wider text-amber-400 mb-1.5">Substitutes</p>
                      <div className="flex flex-col gap-1.5">
                        {opSubs.map((p: any) => {
                          const rank = getRankData(p.player?.mmr ?? 1000);
                          return (
                            <div key={p.id} className="flex items-center gap-2.5 px-3 py-2.5 bg-neutral-900 border border-amber-500/10 rounded-xl">
                              <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                                {p.player?.avatarUrl ? <img src={p.player.avatarUrl} className="w-full h-full object-cover" alt="" /> : <span className="text-xs font-black text-white/40">{p.player?.fullName?.[0]}</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate">{p.player?.fullName ?? 'Player'}</p>
                                <p className="text-[9px] text-neutral-500 capitalize">{p.sportRole || p.role}</p>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`inline-flex items-center gap-1 text-[9px] font-bold ${rank.text}`}><img src={rank.icon} className="w-3.5 h-3.5 object-contain" alt="" />{rank.label}</span>
                                <span className="text-[9px] text-neutral-600">{p.player?.mmr ?? 1000}</span>
                                <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">S</span>
                              </div>
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

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 2: VENUE
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'venue' && (
        <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-20">
          {venueConfirmed ? (
            <div className="mt-4 flex flex-col gap-3">
              {/* Venue confirmed info */}
              <div className="p-4 bg-[#00ff41]/5 border border-[#00ff41]/20 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-[#00ff41]" />
                  <p className="text-[#00ff41] font-black text-sm">Venue Confirmed!</p>
                </div>
                <p className="text-xs text-neutral-400">📅 {match.matchDate}</p>
                {match.bookingCode && (
                  <div className="mt-3 py-2 px-3 bg-neutral-900 border border-white/10 rounded-xl">
                    <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mb-1">Booking Code</p>
                    <p className="text-2xl font-black tracking-[0.3em] text-white">{match.bookingCode}</p>
                    <p className="text-[9px] text-neutral-600 mt-0.5">Show to turf manager on match day</p>
                  </div>
                )}
              </div>

              {/* ── Start Match (SCHEDULED) ── */}
              {match.status === 'SCHEDULED' && (isOMC || isScorer) && (
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                  <p className="text-amber-400 font-black text-sm mb-1">⏳ Match Day</p>
                  <p className="text-xs text-neutral-400 mb-3">
                    Both sides must tap <strong className="text-white">Start Match</strong> to go live.
                    {match.matchStartedByA && !match.matchStartedByB && <span className="text-[#00ff41]"> Your team is ready!</span>}
                    {!match.matchStartedByA && match.matchStartedByB && <span className="text-[#00ff41]"> Opponent is ready!</span>}
                    {isScorer && !isOMC && <span className="text-fuchsia-400"> You are the assigned scorer.</span>}
                  </p>
                  <button
                    onClick={() => doAction('start_match')}
                    disabled={saving || (isTeamA ? match.matchStartedByA : match.matchStartedByB)}
                    className="w-full py-3.5 rounded-2xl bg-[#00ff41] text-black font-black text-sm uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : (isTeamA ? match.matchStartedByA : match.matchStartedByB) ? '✓ Ready — waiting for opponent' : '🚀 Start Match'}
                  </button>
                </div>
              )}

              {/* ── Already LIVE ── */}
              {(match.status === 'LIVE' || match.status === 'SCORE_ENTRY') && (() => {
                const sport = match.teamA?.sportType ?? '';
                const isCricket = ['CRICKET_7', 'CRICKET_FULL'].includes(sport);
                const liveRoute = isCricket
                  ? `/${locale}/matches/${matchId}/cricket`
                  : `/${locale}/matches/${matchId}/live`;
                return (
                  <button
                    onClick={() => router.push(liveRoute)}
                    className="w-full py-4 rounded-2xl bg-red-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse"
                  >
                    {isCricket ? '🏏 Enter Live Scoring' : '🔴 Enter Live Scoring'}
                  </button>
                );
              })()}

              {/* ── Completed ── */}
              {match.status === 'COMPLETED' && (
                <button
                  onClick={() => router.push(`/${locale}/matches/${matchId}/stats`)}
                  className="w-full py-4 rounded-2xl bg-fuchsia-600 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  📊 Enter Player Stats
                </button>
              )}
            </div>
          ) : (
            <>
              {iChallenger && !hasSuggestions && isOMC && (() => {
                // Group turfs by city
                const citiesMap: Record<string, typeof filteredTurfs> = {};
                filteredTurfs.forEach(t => {
                  const c = t.city || 'Other';
                  if (!citiesMap[c]) citiesMap[c] = [];
                  citiesMap[c].push(t);
                });
                const cities = Object.keys(citiesMap).sort();

                return (
                  <div className="mt-3">
                    {/* Date picker */}
                    <div className="mb-4">
                      <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500 mb-2">Match Date</p>
                      <input type="date" value={venueDate} min={new Date().toISOString().split('T')[0]}
                        onChange={e => setVenueDate(e.target.value)}
                        className="w-full bg-neutral-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-fuchsia-500/50" />
                    </div>

                    {/* Suggestions basket */}
                    {suggestions.length > 0 && (
                      <div className="mb-4 p-3 bg-fuchsia-500/5 border border-fuchsia-500/15 rounded-2xl">
                        <p className="text-[10px] font-black uppercase tracking-wider text-fuchsia-400 mb-2">
                          Your Picks {suggestions.length}/3
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {suggestions.map((s, i) => (
                            <div key={s.slotId} className="flex items-center gap-2 px-2 py-1.5 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl">
                              <span className="text-[10px] font-black text-fuchsia-500 w-4 shrink-0">#{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-[11px] truncate">{s.turfName}</p>
                                <p className="text-[9px] text-neutral-400">🕒 {s.slotLabel} · ৳{s.price / 2} each</p>
                              </div>
                              <button onClick={() => removeSuggestion(s.slotId)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white/10 text-neutral-500 hover:text-white transition-colors shrink-0">
                                <X size={11} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* City-grouped carousel rows */}
                    {venuesLoading ? (
                      <div className="py-10 flex justify-center"><Loader2 size={24} className="animate-spin text-fuchsia-500" /></div>
                    ) : filteredTurfs.length === 0 ? (
                      <div className="py-10 text-center text-neutral-500">
                        <MapPin size={28} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No venues available for this date</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-5">
                        {cities.map(city => (
                          <div key={city}>
                            {/* City header */}
                            <div className="flex items-center gap-2 mb-2.5">
                              <MapPin size={11} className="text-fuchsia-400 shrink-0" />
                              <p className="text-[11px] font-black uppercase tracking-widest text-fuchsia-400">{city}</p>
                              <div className="flex-1 h-px bg-fuchsia-500/10" />
                              <span className="text-[9px] text-neutral-600 font-bold">{citiesMap[city].length} turf{citiesMap[city].length !== 1 ? 's' : ''}</span>
                            </div>

                            {/* Horizontal carousel */}
                            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide" style={{ scrollSnapType: 'x mandatory' }}>
                              {citiesMap[city].map(turf => {
                                const isSelected = expandedTurf === turf.id;
                                const coverImg = turf.imageUrls?.[0] || null;
                                const hasSuggestionFromTurf = suggestions.some(s => s.turfId === turf.id);
                                return (
                                  <button
                                    key={turf.id}
                                    onClick={() => setExpandedTurf(isSelected ? null : turf.id)}
                                    style={{ scrollSnapAlign: 'start', minWidth: '130px', maxWidth: '130px' }}
                                    className={`relative flex-shrink-0 rounded-2xl overflow-hidden border transition-all ${ 
                                      isSelected
                                        ? 'border-fuchsia-500/60 ring-2 ring-fuchsia-500/30'
                                        : hasSuggestionFromTurf
                                        ? 'border-[#00ff41]/40 ring-1 ring-[#00ff41]/20'
                                        : 'border-white/8 hover:border-white/20'
                                    }`}>
                                    {/* Turf image / gradient */}
                                    <div className="w-full h-[78px] relative overflow-hidden">
                                      {coverImg ? (
                                        <img src={coverImg} className="w-full h-full object-cover" alt={turf.name} />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                                           <span className="text-4xl font-black text-white/10">{turf.name[0]}</span>
                                         </div>
                                      )}
                                      {/* Slot count badge */}
                                      <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-black/60 backdrop-blur rounded-lg">
                                        <span className="text-[9px] font-black text-[#00ff41]">{turf.totalSlots}✓</span>
                                      </div>
                                      {/* Selected overlay */}
                                      {isSelected && (
                                        <div className="absolute inset-0 bg-fuchsia-500/20 flex items-center justify-center">
                                          <div className="w-6 h-6 rounded-full bg-fuchsia-500 flex items-center justify-center">
                                            <CheckCircle size={14} className="text-white" />
                                          </div>
                                        </div>
                                      )}
                                      {/* Green check if has suggestion */}
                                      {!isSelected && hasSuggestionFromTurf && (
                                        <div className="absolute bottom-1 right-1">
                                          <CheckCircle size={14} className="text-[#00ff41] drop-shadow" />
                                        </div>
                                      )}
                                    </div>
                                    {/* Card info */}
                                    <div className="px-2 py-1.5 bg-neutral-950 text-left">
                                      <p className="text-[11px] font-black text-white leading-tight line-clamp-1">{turf.name}</p>
                                      <p className="text-[9px] text-neutral-500 mt-0.5">{turf.area || city}</p>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Slot picker — appears below the row for the selected turf in this city */}
                            {expandedTurf && citiesMap[city].some(t => t.id === expandedTurf) && (() => {
                              const turf = citiesMap[city].find(t => t.id === expandedTurf)!;
                              return (
                                <div className="mt-3 p-3 bg-neutral-900 border border-white/8 rounded-2xl">
                                  <div className="flex items-center justify-between mb-3">
                                    <div>
                                      <p className="font-black text-sm">{turf.name}</p>
                                      <p className="text-[10px] text-neutral-500 mt-0.5">{[turf.area, turf.city].filter(Boolean).join(' · ')}</p>
                                    </div>
                                    <button onClick={() => setExpandedTurf(null)} className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center">
                                      <X size={13} />
                                    </button>
                                  </div>

                                  {turf.availableSlots.length === 0 ? (
                                    <p className="text-xs text-neutral-500 italic text-center py-4">No available slots for {venueDate || 'this date'}</p>
                                  ) : (
                                    <>
                                      <p className="text-[9px] text-neutral-500 font-bold mb-2">Tap a slot to select, then add it to your picks</p>
                                      <div className="grid grid-cols-2 gap-2">
                                        {turf.availableSlots.map((slot: any) => {
                                          const alreadyPicked  = suggestions.some(s => s.slotId === slot.id);
                                          const isHighlighted  = pendingSlot?.slotId === slot.id;
                                          const isFull         = suggestions.length >= 3;
                                          return (
                                            <button key={slot.id}
                                              disabled={alreadyPicked || (!isHighlighted && isFull)}
                                              onClick={() => {
                                                if (alreadyPicked) return;
                                                setPendingSlot(isHighlighted ? null : { slotId: slot.id, startTime: slot.startTime, endTime: slot.endTime, price: slot.price });
                                              }}
                                              className={`flex flex-col items-center px-2 py-2.5 rounded-xl border text-center transition-all ${
                                                alreadyPicked
                                                  ? 'bg-[#00ff41]/10 border-[#00ff41]/30 text-[#00ff41] cursor-default'
                                                  : isHighlighted
                                                  ? 'bg-fuchsia-600 border-fuchsia-400 text-white ring-2 ring-fuchsia-400/40'
                                                  : isFull
                                                  ? 'bg-neutral-800 border-white/5 text-neutral-600 cursor-not-allowed'
                                                  : 'bg-neutral-800 border-white/10 hover:border-fuchsia-500/40 hover:bg-fuchsia-500/5 text-white'
                                              }`}>
                                              <span className="text-[10px] font-black">{slot.startTime}</span>
                                              <span className="text-[9px] opacity-70">–{slot.endTime}</span>
                                              <span className={`text-[9px] font-bold mt-0.5 ${
                                                alreadyPicked ? 'text-[#00ff41]' : isHighlighted ? 'text-white/80' : 'text-[#00ff41]'
                                              }`}>
                                                {alreadyPicked ? '✓ Added' : `৳${slot.price}`}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>

                                      {/* Sticky Add button — only shows when a slot is highlighted */}
                                      {pendingSlot && !suggestions.some(s => s.slotId === pendingSlot.slotId) && (
                                        <button
                                          onClick={() => {
                                            addSuggestion(turf.id, turf.name, pendingSlot.slotId, pendingSlot.startTime, pendingSlot.endTime, pendingSlot.price);
                                            setPendingSlot(null);
                                          }}
                                          className="w-full mt-3 py-2.5 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all">
                                          <CheckCircle size={14} /> Add Suggestion — {pendingSlot.startTime}–{pendingSlot.endTime}
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Send suggestions CTA */}
                    <button
                      onClick={() => doAction('suggest_venue', { suggestions: suggestions.map(s => ({ turfId: s.turfId, slotId: s.slotId, date: s.date, priority: s.priority })) })}
                      disabled={saving || suggestions.length === 0}
                      className={`w-full mt-5 py-3 text-black font-black uppercase rounded-2xl flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all ${
                        suggestions.length === 3 ? 'bg-[#00ff41] hover:bg-[#00dd38]' : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white'
                      }`}>
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <><MapPin size={16} /> Send {suggestions.length}/3 Suggestions</>}
                    </button>
                  </div>
                );
              })()}

              {/* Challenger already suggested */}
              {iChallenger && hasSuggestions && !hasSelection && (
                <div className="mt-6 text-center text-neutral-400">
                  <Clock size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold text-sm">Suggestions sent!</p>
                  <p className="text-xs mt-1">Waiting for {opponent.name} to pick a slot…</p>
                  <div className="mt-4 flex flex-col gap-2">
                    {match.venueSuggestions.map((s: any, i: number) => (
                      <div key={s.id} className="p-3 bg-neutral-900 border border-white/10 rounded-xl text-left">
                        <p className="text-xs font-bold">{i + 1}. {s.turf?.name || 'Turf'}</p>
                        <p className="text-[10px] text-neutral-500">🕒 {s.slot?.startTime}–{s.slot?.endTime} · 📅 {s.date}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Challenged: pick from 3 suggestions */}
              {!iChallenger && hasSuggestions && !hasSelection && (
                <div className="mt-3">
                  <p className="text-xs font-black text-white mb-3">Pick one venue for the match:</p>
                  {match.venueSuggestions.map((s: any) => (
                    <div key={s.id} onClick={() => setSelectedSuggestionId(s.id)}
                      className={`mb-3 p-4 rounded-2xl border cursor-pointer transition-all ${selectedSuggestionId === s.id ? 'bg-[#00ff41]/10 border-[#00ff41]/30' : 'bg-neutral-900 border-white/10 hover:border-white/20'}`}>
                      <p className="font-black text-sm">{s.turf?.name || 'Turf'}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">🕒 {s.slot?.startTime}–{s.slot?.endTime} · 📅 {s.date}</p>
                      <p className="text-xs font-bold text-fuchsia-400 mt-1">৳{((s.slot?.price || 0) / 2).toFixed(0)} each (50/50 split = ৳{s.slot?.price || 0} total)</p>
                    </div>
                  ))}
                  {isOMC && selectedSuggestionId && (
                    <button onClick={() => doAction('select_venue', { suggestionId: selectedSuggestionId })}
                      disabled={saving}
                      className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black uppercase rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                      {saving ? <Loader2 size={16} className="animate-spin" /> : 'Confirm This Venue'}
                    </button>
                  )}
                </div>
              )}

              {/* Non-OMC: waiting */}
              {!isOMC && !hasSuggestions && (
                <div className="mt-8 text-center text-neutral-500">
                  <Clock size={36} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Waiting for team captain to manage venue…</p>
                </div>
              )}

              {/* Non-challenger waiting for suggestions */}
              {!iChallenger && !hasSuggestions && (
                <div className="mt-8 text-center text-neutral-500">
                  <Clock size={36} className="mx-auto mb-3 opacity-20" />
                  <p className="font-bold text-sm">Waiting for {opponent.name}</p>
                  <p className="text-xs mt-1">to suggest 3 venue options…</p>
                </div>
              )}

              {/* Challenger confirms booking */}
              {iChallenger && hasSelection && !venueConfirmed && (
                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                  <p className="font-black text-amber-400 mb-1">Opponent selected a venue!</p>
                  <p className="text-xs text-white/70 mb-3">📅 {match.matchDate}</p>
                  {(!match.rosterLockedA || !match.rosterLockedB) ? (
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                      <AlertCircle size={13} /> Both teams must lock rosters before booking
                    </div>
                  ) : isOMC && (
                    <button onClick={() => doAction('book_venue')} disabled={saving}
                      className="w-full py-3 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black uppercase rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <><MapPin size={16} /> Confirm & Book (50/50 Split)</>}
                    </button>
                  )}
                </div>
              )}

              {/* Challenged waiting for challenger to confirm */}
              {!iChallenger && hasSelection && !venueConfirmed && (
                <div className="mt-8 text-center text-neutral-500">
                  <Clock size={36} className="mx-auto mb-3 opacity-20" />
                  <p className="font-bold text-sm">Waiting for {opponent.name}</p>
                  <p className="text-xs mt-1">to confirm and book the venue…</p>
                </div>
              )}

            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          TAB 3: CHAT
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'chat' && (
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Scrollable messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
            {chatMessages.length === 0 && (
              <p className="text-center text-neutral-500 text-xs italic py-10">No messages yet. OMC-only channel.</p>
            )}
            {chatMessages.map((m: any) => {
              const isMe = m.teamId === myTeamId;
              const senderTeam  = isMe ? myTeam : opponent;
              const memberEntry = senderTeam?.members?.find((mem: any) => mem.playerId === m.player?.id);
              const senderRole  = memberEntry?.role || (senderTeam?.ownerId === m.player?.id ? 'owner' : '');
              const roleLabel   = senderRole === 'owner' ? 'Owner' : senderRole === 'manager' ? 'Manager' : senderRole === 'captain' ? 'Captain' : 'OMC';
              return (
                <div key={m.id} className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-center gap-1.5 px-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="text-[9px] text-neutral-500 font-bold">{m.player?.fullName}</span>
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${
                      isMe
                        ? 'bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>{roleLabel}</span>
                    <span className={`text-[8px] font-bold ${isMe ? 'text-fuchsia-600/70' : 'text-amber-700/70'}`}>{isMe ? myTeam.name : opponent.name}</span>
                  </div>
                  <div className={`px-3 py-2.5 rounded-2xl max-w-[78%] text-sm font-medium ${
                    isMe
                      ? 'bg-fuchsia-600 text-white rounded-tr-sm'
                      : 'bg-neutral-800 border border-white/10 text-white rounded-tl-sm'
                  }`}>
                    {m.message}
                  </div>
                  <span className="text-[9px] text-neutral-600 px-1">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>

          {/* Fixed-bottom input bar */}
          <div className="shrink-0 border-t border-white/5 bg-neutral-950">
            {isOMC && !boardLocked ? (
              <div className="flex gap-2 px-4 py-3">
                <input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendChat()}
                  placeholder="Message opponent OMC…"
                  className="flex-1 bg-neutral-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-neutral-600 outline-none focus:border-fuchsia-500/50" />
                <button onClick={sendChat} disabled={chatSending || !chatMsg.trim()}
                  className="w-10 h-10 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 flex items-center justify-center disabled:opacity-50 transition-all shrink-0">
                  {chatSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            ) : isOMC && boardLocked ? (
              <div className="px-4 py-3 text-center text-[10px] text-amber-500 font-bold flex items-center justify-center gap-1.5">
                <Lock size={12} /> Venue confirmed — chat is closed.
              </div>
            ) : (
              <div className="px-4 py-3 text-center text-[10px] text-neutral-500 font-bold">
                Only OMC (Owner / Manager / Captain) can chat
              </div>
            )}
          </div>
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
