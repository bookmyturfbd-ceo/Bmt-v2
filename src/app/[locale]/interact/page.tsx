'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Swords, ChevronLeft, Shield, Loader2, Trophy, Users, Flame,
  ChevronDown, X, CheckCircle, XCircle, Clock, ExternalLink,
  Zap, Lock, AlertTriangle, History, ChevronUp, Award
} from 'lucide-react';
import { getRankData, TIER_RANGES, BADGES_BY_SPORT, maxBadges, type BadgeDef } from '@/lib/rankUtils';

const sportName = (s: string) => {
  if (s === 'FUTSAL_5') return '5-a-side Futsal';
  if (s === 'FUTSAL_6') return '6-a-side Futsal';
  if (s === 'FUTSAL_7') return '7-a-side Futsal';
  if (s === 'CRICKET_7') return '7-a-side Cricket';
  if (s === 'FOOTBALL_FULL') return 'Football (Full 11v11)';
  if (s === 'CRICKET_FULL') return 'Cricket (Full 11v11)';
  return '5-a-side Futsal';
};
const sportEmoji = (s: string) => s?.includes('CRICKET') ? '🏏' : '⚽';

type MasterTab = 'discover' | 'active' | 'history';

export default function MarketPage() {
  const router   = useRouter();
  const pathname = usePathname();
  const locale   = pathname.split('/')[1] || 'en';

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [masterTab, setMasterTab] = useState<MasterTab>('active');

  // ── Discover filters ───────────────────────────────────────────────────────
  const [sportFilter,    setSportFilter]    = useState('ALL');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [scoutTeamId,    setScoutTeamId]    = useState('ALL');
  const [showRankMenu,   setShowRankMenu]   = useState(false);
  const [showSportMenu,  setShowSportMenu]  = useState(false);

  // ── Score modal ─────────────────────────────────────────────────────────────
  const [scoreModalId,     setScoreModalId]     = useState<string | null>(null);
  const [myGoalInput,      setMyGoalInput]      = useState('');
  const [oppGoalInput,     setOppGoalInput]     = useState('');
  const [myRunInput,       setMyRunInput]       = useState('');
  const [oppRunInput,      setOppRunInput]      = useState('');
  const [wicketInput,      setWicketInput]      = useState('');
  const [overInput,        setOverInput]        = useState('');
  const [scoreSubmitting,  setScoreSubmitting]  = useState(false);
  const [resultModal,      setResultModal]      = useState<any>(null);

  // ── Player stats modal ──────────────────────────────────────────────────────
  const [statsModal,     setStatsModal]     = useState<any>(null);
  const [statsData,      setStatsData]      = useState<Record<string, any>>({});
  const [statsLoading,   setStatsLoading]   = useState(false);
  const [statsSaving,    setStatsSaving]    = useState(false);
  const [statsSaveErr,   setStatsSaveErr]   = useState('');
  const [playerMmrResult,setPlayerMmrResult]= useState<any>(null);
  const [selectedStatCell, setSelectedStatCell] = useState<{playerId: string, statType: 'statA' | 'statB' | 'statC'} | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<number | null>(null);

  const shownResultIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bmt_shown_results');
      if (stored) JSON.parse(stored).forEach((id: string) => shownResultIdsRef.current.add(id));
    } catch {}
  }, []);

  // Animated MMR counter
  const [animMMR,   setAnimMMR]   = useState(0);
  const [animWidth, setAnimWidth] = useState(0);

  const [loading,   setLoading]   = useState(true);
  const [myTeams,   setMyTeams]   = useState<any[]>([]);
  const [otherTeams,setOtherTeams]= useState<any[]>([]);

  const [challenges,        setChallenges]        = useState<{ sent: any[]; received: any[]; upcoming: any[] }>({ sent: [], received: [], upcoming: [] });
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [challengedTeamIds, setChallengedTeamIds] = useState<Set<string>>(new Set());

  // ── Detail modals ───────────────────────────────────────────────────────────
  const [showChallengeModal, setShowChallengeModal] = useState<any>(null);
  const [eligibleTeams,      setEligibleTeams]      = useState<any[]>([]);
  const [selectedChallenger, setSelectedChallenger] = useState('');
  const [chalSending,        setChalSending]        = useState(false);
  const [chalMsg,            setChalMsg]            = useState('');
  const [teamDetailModal,    setTeamDetailModal]    = useState<any>(null);
  const [detailTab,          setDetailTab]          = useState<'roster' | 'history'>('roster');

  // ── Data loading ────────────────────────────────────────────────────────────
  const loadMarket = useCallback(() => {
    setLoading(true);
    fetch('/api/interact/market')
      .then(r => r.json())
      .then(d => { setMyTeams(d.myTeams || []); setOtherTeams(d.otherTeams || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadChallenges = useCallback(() => {
    setChallengesLoading(true);
    fetch('/api/interact/challenge')
      .then(r => r.json())
      .then(d => {
        setChallenges({ sent: d.sent || [], received: d.received || [], upcoming: d.upcoming || [] });
        const ids = new Set<string>();
        (d.sent || []).forEach((m: any) => {
          if (['PENDING', 'INTERACTION', 'SCHEDULED', 'LIVE', 'SCORE_ENTRY'].includes(m.status)) {
            if (m.teamB_Id) ids.add(m.teamB_Id);
            else if (m.teamB?.id) ids.add(m.teamB.id);
          }
        });
        setChallengedTeamIds(ids);
      })
      .catch(() => {})
      .finally(() => setChallengesLoading(false));
  }, []);

  useEffect(() => { loadMarket(); loadChallenges(); }, [loadMarket, loadChallenges]);

  // Auto-seed sport filter from first team when data loads (only on first load)
  useEffect(() => {
    if (myTeams.length === 0) return;
    if (scoutTeamId !== 'ALL') return; // already user-selected, don't override
    const first = myTeams[0];
    setScoutTeamId(first.id);
    setSportFilter(first.sportType);
    const lbl = getRankData(first.teamMmr ?? 1000).label;
    if (lbl.includes('Bronze')) setDivisionFilter('Bronze');
    else if (lbl.includes('Silver')) setDivisionFilter('Silver');
    else if (lbl.includes('Gold')) setDivisionFilter('Gold');
    else if (lbl.includes('Platinum')) setDivisionFilter('Platinum');
    else if (lbl.includes('Legend')) setDivisionFilter('Legend');
  }, [myTeams]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const ev = new EventSource('/api/interact/events');
    ev.onmessage = (e) => {
      if (e.data.startsWith(':')) return;
      try { const d = JSON.parse(e.data); if (d.type === 'refresh') loadChallenges(); } catch {}
    };
    return () => ev.close();
  }, [loadChallenges]);

  // Auto result modal
  useEffect(() => {
    challenges.upcoming.forEach((m: any) => {
      const amA_check = myTeams.some((t: any) => t.id === m.teamA_Id);
      const isSeen = amA_check ? m.resultSeenByA : m.resultSeenByB;
      if (m.status === 'COMPLETED' && !isSeen && !shownResultIdsRef.current.has(m.id)) {
        if (myTeams.some((t: any) => t.id === m.teamA_Id || t.id === m.teamB_Id)) {
          const amA = myTeams.some((t: any) => t.id === m.teamA_Id);
          shownResultIdsRef.current.add(m.id);
          try { localStorage.setItem('bmt_shown_results', JSON.stringify(Array.from(shownResultIdsRef.current))); } catch {}
          setScoreModalId(null);
          setResultModal({
            match: m, amA,
            mmrDelta: amA ? m.mmrChangeA : m.mmrChangeB,
            scoreA: m.scoreA, scoreB: m.scoreB, winnerId: m.winnerId,
            won: m.winnerId === (amA ? m.teamA_Id : m.teamB_Id),
            draw: m.winnerId === null && m.scoreA === m.scoreB,
            myScore: amA ? m.scoreA : m.scoreB, oppScore: amA ? m.scoreB : m.scoreA,
            myTeam: amA ? m.teamA : m.teamB, oppTeam: amA ? m.teamB : m.teamA,
          });
        }
      }
    });
  }, [challenges.upcoming, myTeams]);

  // MMR bar animation
  useEffect(() => {
    if (!resultModal) { setAnimMMR(0); setAnimWidth(0); return; }
    const newMmr = resultModal.myTeam.teamMmr ?? 1000;
    const oldMmr = newMmr - (resultModal.mmrDelta ?? 0);
    const target = Math.abs(resultModal.mmrDelta ?? 0);
    const sign   = resultModal.mmrDelta >= 0 ? 1 : -1;
    setAnimMMR(oldMmr);
    const initialRank = getRankData(oldMmr);
    setAnimWidth(Math.min(100, Math.max(0, ((oldMmr - initialRank.min) / (initialRank.next - initialRank.min)) * 100)));
    if (target === 0) return;
    let cur = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      const dyn = oldMmr + sign * cur;
      setAnimMMR(dyn);
      const dynR = getRankData(dyn);
      setAnimWidth(Math.min(100, Math.max(0, ((dyn - dynR.min) / (dynR.next - dynR.min)) * 100)));
      if (cur >= target) clearInterval(t);
    }, 40);
    return () => clearInterval(t);
  }, [resultModal]);

  // ── Discover helpers ────────────────────────────────────────────────────────
  const [minMmr, maxMmr] = TIER_RANGES[divisionFilter] ?? [0, 9999];
  const filteredTeams = otherTeams.filter(t =>
    (sportFilter === 'ALL' || t.sportType === sportFilter) &&
    (t.teamMmr ?? 1000) >= minMmr && (t.teamMmr ?? 1000) <= maxMmr
  );


  const handleChallengeAttempt = (e: React.MouseEvent, target: any) => {
    e.stopPropagation();
    const eligible = myTeams.filter(t => t.isSubscribed && t.sportType === target.sportType);
    setEligibleTeams(eligible);
    setSelectedChallenger(eligible[0]?.id || '');
    setChalMsg('');
    setShowChallengeModal(target);
  };

  const issueChallenge = async () => {
    if (!selectedChallenger || !showChallengeModal) return;
    setChalSending(true);
    try {
      const res  = await fetch('/api/interact/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengerTeamId: selectedChallenger, opponentTeamId: showChallengeModal.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setChalMsg('✅ Challenge sent!');
        setTimeout(() => { setShowChallengeModal(null); setChalMsg(''); loadChallenges(); }, 2000);
      } else {
        setChalMsg(`❌ ${data.error}`);
      }
    } catch { setChalMsg('❌ Network error.'); }
    setChalSending(false);
  };

  const respondChallenge = async (matchId: string, action: 'accept' | 'decline' | 'start') => {
    try {
      if (action === 'accept' || action === 'decline') {
        const res = await fetch('/api/interact/challenge', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId, action }),
        });
        if (res.ok) {
          if (action === 'accept') router.push(`/${locale}/interact/match/${matchId}`);
          loadChallenges();
        }
      } else {
        const res = await fetch(`/api/interact/match/${matchId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start_match' }),
        });
        if (res.ok) {
          if (action === 'start') {
             const mRes = await fetch(`/api/interact/match/${matchId}`);
             const d = await mRes.json();
             if (d.match?.status === 'LIVE') {
               const isCricket = ['CRICKET_7', 'CRICKET_FULL'].includes(d.match.teamA?.sportType);
               const liveRoute = isCricket ? `/${locale}/matches/${matchId}/cricket` : `/${locale}/matches/${matchId}/live`;
               router.push(liveRoute);
               return;
             }
          }
          loadChallenges();
        }
      }
    } catch {}
  };

  const scoreModalMatch = challenges.upcoming.find((m: any) => m.id === scoreModalId) ?? null;

  const openScoreModal = (m: any) => {
    setScoreModalId(m.id); setMyGoalInput(''); setMyRunInput(''); setWicketInput(''); setOverInput('');
  };

  const submitScore = async () => {
    if (!scoreModalMatch) return;
    const amA       = myTeams.some((t: any) => t.id === scoreModalMatch.teamA_Id);
    const isCricket = scoreModalMatch.teamA.sportType === 'CRICKET_7';
    const body = isCricket
      ? { myScore: Number(myRunInput), runs: Number(myRunInput), wickets: Number(wicketInput), overs: Number(overInput) }
      : { myScore: Number(myGoalInput), goals: Number(myGoalInput) };
    setScoreSubmitting(true);
    try {
      const res = await fetch(`/api/interact/match/${scoreModalMatch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit_score', ...body }),
      });
      if (res.ok) loadChallenges();
    } catch {}
    setScoreSubmitting(false);
  };

  const resolveMatch = async (resolution: 'agree' | 'dispute') => {
    if (!scoreModalMatch) return;
    setScoreSubmitting(true);
    try {
      const res = await fetch(`/api/interact/match/${scoreModalMatch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve_match', resolution }),
      });
      if (res.ok) loadChallenges();
    } catch {}
    setScoreSubmitting(false);
  };

  // ── Player badge distribution modal logic ───────────────────────────
  const openPlayerStatsModal = async (m: any) => {
    const amA = myTeams.some((t: any) => t.id === m.teamA_Id);
    setStatsLoading(true); setStatsSaveErr('');
    try {
      const res   = await fetch(`/api/interact/match/${m.id}`);
      const d     = await res.json();
      const full  = d.match;
      const myTeamId = amA ? m.teamA_Id : m.teamB_Id;
      const myScore  = amA ? m.scoreA   : m.scoreB;
      const sport    = m.teamA?.sportType ?? full?.teamA?.sportType ?? 'FUTSAL_5';
      const picks: any[] = (full.rosterPicks ?? []).filter((p: any) => p.teamId === myTeamId);
      const starterIds = new Set(picks.filter((p: any) => p.isStarter).map((p: any) => p.memberId));
      const myFull = amA ? full.teamA : full.teamB;
      const all: any[] = myFull.members ?? [];
      const sorted = [
        ...all.filter((mb: any) => picks.some((p: any) => p.memberId === mb.id && p.isStarter)),
        ...all.filter((mb: any) => picks.some((p: any) => p.memberId === mb.id && !p.isStarter)),
        ...all.filter((mb: any) => !picks.some((p: any) => p.memberId === mb.id)),
      ];
      const init: Record<string, any> = {};
      sorted.forEach((mb: any) => { init[mb.playerId] = { badge: 'NONE', yellowCard: false, redCard: false }; });
      setStatsModal({ match: m, myTeamId, myScore, sport, players: sorted, starterIds });
      setStatsData(init);
    } catch {}
    setStatsLoading(false);
  };

  const savePlayerStats = async () => {
    if (!statsModal) return;
    setStatsSaveErr(''); setStatsSaving(true);
    try {
      // Build stats array with badge keys
      const statsArr = Object.entries(statsData).map(([playerId, s]: [string, any]) => ({
        playerId,
        badgeKey: s.badge || 'NONE',
        yellowCard: !!s.yellowCard,
        redCard   : !!s.redCard,
      }));

      const res = await fetch(`/api/matches/${statsModal.match.id}/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stats: statsArr }),
      });
      const d = await res.json();
      if (res.ok) {
        setPlayerMmrResult(d.badgeResults);
        setStatsModal(null);
        setChallenges((prev: any) => ({
          ...prev,
          upcoming: prev.upcoming.map((m: any) => m.id === statsModal.match.id ? { ...m, badgeBonusApplied: true } : m)
        }));
        loadChallenges();
      } else setStatsSaveErr(d.error ?? 'Failed');
    } catch { setStatsSaveErr('Network error'); }
    setStatsSaving(false);
  };

  // ── Build the unified "Active" feed ─────────────────────────────────────────

  // Priority: 1=ACTION_REQUIRED, 2=LIVE, 3=BOOKED/SCORE_ENTRY, 4=INTERACTION, 5=PENDING
  const activeCards = (() => {
    const cards: any[] = [];
    const seen = new Set<string>();

    // 1. Received PENDING — action required (highest priority)
    challenges.received.filter((m: any) => m.status === 'PENDING').forEach((m: any) => {
      if (!seen.has(m.id)) { seen.add(m.id); cards.push({ ...m, _priority: 1, _cardType: 'received_pending' }); }
    });

    // 2. My upcoming matches — covers SCORE_ENTRY, LIVE, SCHEDULED
    challenges.upcoming.forEach((m: any) => {
      if (seen.has(m.id)) return;
      const amA = myTeams.some((t: any) => t.id === m.teamA_Id);
      if (m.status === 'SCORE_ENTRY') {
        const mySubmitted  = amA ? m.scoreSubmittedByA : m.scoreSubmittedByB;
        const oppSubmitted = amA ? m.scoreSubmittedByB : m.scoreSubmittedByA;
        if (!mySubmitted) { seen.add(m.id); cards.push({ ...m, _priority: 1, _cardType: 'score_entry', _amA: amA }); }
        else if (mySubmitted && oppSubmitted) { seen.add(m.id); cards.push({ ...m, _priority: 1, _cardType: 'score_review', _amA: amA }); }
        else { seen.add(m.id); cards.push({ ...m, _priority: 3, _cardType: 'waiting_score', _amA: amA }); }
      } else if (m.status === 'LIVE') {
        seen.add(m.id); cards.push({ ...m, _priority: 2, _cardType: 'live', _amA: amA });
      } else if (m.status === 'SCHEDULED') {
        seen.add(m.id); cards.push({ ...m, _priority: 3, _cardType: 'scheduled', _amA: amA });
      }
    });

    // 3. INTERACTION from SENT (Coffee Cup sent, Thanda accepted → status=INTERACTION, lives in sent[])
    challenges.sent.filter((m: any) => m.status === 'INTERACTION').forEach((m: any) => {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        const amA = myTeams.some((t: any) => t.id === m.teamA_Id);
        cards.push({ ...m, _priority: 4, _cardType: 'interaction', _amA: amA });
      }
    });

    // 4. INTERACTION from RECEIVED (Thanda's side — they received, now it's INTERACTION)
    challenges.received.filter((m: any) => m.status === 'INTERACTION').forEach((m: any) => {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        const amA = myTeams.some((t: any) => t.id === m.teamA_Id);
        cards.push({ ...m, _priority: 4, _cardType: 'interaction', _amA: amA });
      }
    });

    // 5. PENDING sent — lowest priority, dimmed waiting state
    challenges.sent.filter((m: any) => m.status === 'PENDING').forEach((m: any) => {
      if (!seen.has(m.id)) { seen.add(m.id); cards.push({ ...m, _priority: 5, _cardType: 'sent_pending' }); }
    });

    return cards.sort((a, b) => a._priority - b._priority);
  })();


  // Vault = completed/disputed
  const historyCards = challenges.upcoming.filter((m: any) => ['COMPLETED', 'DISPUTED'].includes(m.status));
  const vaultCards = historyCards; // alias kept for render block

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080808] text-white pb-28">

      {/* ═══ MMR Result modal (player) ═══ */}
      {playerMmrResult && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setPlayerMmrResult(null)} />
          <div className="relative bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <div className="p-5 border-b border-white/5 bg-gradient-to-br from-[#00ff41]/10 to-transparent">
              <h2 className="text-xl font-black mb-1">Squad MMR Updates</h2>
              <p className="text-xs text-neutral-400">Match stat bonuses applied.</p>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-5 py-4 flex flex-col gap-3">
              {playerMmrResult.map((pr: any, i: number) => (
                <div key={i} className="flex items-center gap-3 bg-neutral-900/50 p-2.5 rounded-2xl border border-white/5">
                  <div className="w-10 h-10 rounded-full bg-neutral-800 overflow-hidden border border-white/10 flex items-center justify-center shrink-0">
                    {pr.avatarUrl ? <img src={pr.avatarUrl} className="w-full h-full object-cover" /> : <span className="text-sm font-black text-neutral-500">{pr.name[0]}</span>}
                  </div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-black truncate">{pr.name}</p></div>
                  <div className={`px-3 py-1.5 rounded-xl font-black flex flex-col items-center ${pr.mmrChange > 0 ? 'bg-[#00ff41]/10 text-[#00ff41]' : pr.mmrChange < 0 ? 'bg-red-500/10 text-red-500' : 'bg-neutral-800 text-neutral-400'}`}>
                    <span className="text-base leading-none">{pr.mmrChange > 0 ? `+${pr.mmrChange}` : pr.mmrChange}</span>
                    <span className="text-[8px] uppercase tracking-wider opacity-70 mt-0.5">MMR</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-white/5">
              <button onClick={() => setPlayerMmrResult(null)} className="w-full py-3 bg-[#00ff41] text-black font-black text-sm rounded-xl">Dismiss</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TOP HEADER ═══ */}
      <header className="sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-md border-b border-white/5 px-4 py-4">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors shrink-0">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Swords size={18} className="text-purple-400" />
            <h1 className="font-black text-lg tracking-tight">Challenge Market</h1>
          </div>
          {/* Active count badge */}
          {activeCards.length > 0 && (
            <div className="flex items-center gap-1.5 bg-[#00ff41]/10 border border-[#00ff41]/20 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
              <span className="text-[11px] font-black text-[#00ff41]">{activeCards.filter(c => c._priority <= 2).length} live</span>
            </div>
          )}
        </div>

        {/* ── Master tabs — pill design ── */}
        <div className="flex gap-1.5 p-1 bg-white/5 border border-white/8 rounded-2xl">
          {([
            ['discover', 'Discover', Swords],
            ['active',   'Active',   Zap],
            ['history',  'History',  History],
          ] as const).map(([tab, label, Icon]) => {
            const isActive = masterTab === tab;
            const count = tab === 'active' ? activeCards.length : tab === 'history' ? vaultCards.length : null;
            return (
              <button
                key={tab}
                onClick={() => setMasterTab(tab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-[0_0_16px_rgba(147,51,234,0.4)]'
                    : 'text-neutral-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={13} />
                {label}
                {count !== null && count > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${isActive ? 'bg-white/20 text-white' : 'bg-purple-600/30 text-purple-300'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════
          DISCOVER TAB
      ═══════════════════════════════════════════════════ */}
      {masterTab === 'discover' && (
        <div className="flex flex-col gap-3 pb-8">

          {/* ── Scouting As Interactive Select ── */}
          {myTeams.length > 0 && (() => {
            const scout = myTeams.find(t => t.id === scoutTeamId) ?? myTeams[0];
            const sr = getRankData(scout.teamMmr ?? 1000);
            return (
              <div className="mx-4 mt-4 flex items-center gap-3 px-3.5 py-2.5 bg-[#0d0d0d] border border-white/8 rounded-2xl relative">
                <div className="w-7 h-7 rounded-lg bg-neutral-800 border border-white/10 overflow-hidden flex items-center justify-center shrink-0">
                  {scout.logoUrl ? <img src={scout.logoUrl} className="w-full h-full object-cover" /> : <Shield size={12} className="text-[#00ff41]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-neutral-600 font-bold uppercase tracking-widest leading-none mb-0.5">Scouting As</p>
                  <p className="text-[13px] font-black text-white leading-tight truncate">
                    {scout.name}{' '}
                    <span className="text-[10px] font-bold" style={{ color: sr.color }}>({sr.label})</span>
                  </p>
                </div>
                <ChevronDown size={14} className="text-neutral-600 shrink-0 pointer-events-none" />
                <select 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  value={scoutTeamId === 'ALL' ? scout.id : scoutTeamId}
                  onChange={(e) => {
                    const tid = e.target.value;
                    setScoutTeamId(tid);
                    const sel = myTeams.find(t => t.id === tid);
                    if (sel) {
                      setSportFilter(sel.sportType);
                      const lbl = getRankData(sel.teamMmr ?? 1000).label;
                      if (lbl.includes('Bronze')) setDivisionFilter('Bronze');
                      else if (lbl.includes('Silver')) setDivisionFilter('Silver');
                      else if (lbl.includes('Gold')) setDivisionFilter('Gold');
                      else if (lbl.includes('Platinum')) setDivisionFilter('Platinum');
                      else if (lbl.includes('Legend')) setDivisionFilter('Legend');
                    }
                  }}
                >
                  {myTeams.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({sportEmoji(t.sportType)} {getRankData(t.teamMmr ?? 1000).label})</option>
                  ))}
                </select>
              </div>
            );
          })()}

          {/* ── Native Dropdown Filters replaced with Trigger Buttons ── */}
          <div className="px-4 pt-4 flex gap-3">
             {/* Sport Filter Button */}
             <div className="flex-1 relative">
                <button 
                  onClick={() => setShowSportMenu(true)}
                  className="w-full bg-[#111] border border-white/10 text-[11px] font-black text-white rounded-xl px-3.5 py-3 flex items-center justify-between outline-none transition-colors hover:border-white/20"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{sportFilter === 'ALL' ? 'All Sports' : `${sportEmoji(sportFilter)} ${sportName(sportFilter)}`}</span>
                  </div>
                  <ChevronDown size={14} className="text-neutral-500 shrink-0" />
                </button>
             </div>

             {/* Division Filter Button */}
             <div className="flex-1 relative">
                <button 
                  onClick={() => setShowRankMenu(true)}
                  className="w-full bg-[#111] border border-white/10 text-[11px] font-black text-white rounded-xl px-3.5 py-3 flex items-center justify-between outline-none transition-colors hover:border-white/20"
                >
                  <div className="flex items-center gap-2 truncate">
                    {divisionFilter !== 'ALL' && <img src={`/ranks/${divisionFilter}.svg`} className="w-4 h-4 object-contain shrink-0" />}
                    <span>{divisionFilter === 'ALL' ? 'All Divisions' : divisionFilter}</span>
                  </div>
                  <ChevronDown size={14} className="text-neutral-500 shrink-0" />
                </button>
             </div>
          </div>

          {/* ── BOTTOM SHEET MENUS ── */}
          
          {/* Sport Menu Bottom Sheet */}
          {showSportMenu && (
            <div className="fixed inset-0 z-[100] flex flex-col justify-end" onClick={() => setShowSportMenu(false)}>
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
              <div className="relative bg-[#0d0d0d] border-t border-white/10 rounded-t-3xl overflow-hidden flex flex-col max-h-[75vh]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <h3 className="text-lg font-black text-white">Select Sport format</h3>
                  <button onClick={() => setShowSportMenu(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition">
                    <X size={16} className="text-neutral-400" />
                  </button>
                </div>
                <div className="overflow-y-auto px-4 pb-8 flex flex-col gap-2">
                  <button onClick={() => {setSportFilter('ALL'); setShowSportMenu(false)}} className={`w-full py-4 px-5 rounded-2xl text-left border ${sportFilter === 'ALL' ? 'bg-[#00ff41]/10 border-[#00ff41]/30 text-[#00ff41]' : 'border-white/5 bg-neutral-900 text-white'}`}>
                    <span className="font-black text-sm">🌐 All Sports</span>
                  </button>
                  {[['FUTSAL_5', '5-a-side Futsal'], ['FUTSAL_6', '6-a-side Futsal'], ['FUTSAL_7', '7-a-side Futsal'], ['CRICKET_7', '7-a-side Cricket'], ['FOOTBALL_FULL', 'Football (Full 11v11)'], ['CRICKET_FULL', 'Cricket (Full 11v11)']].map(([val, label]) => (
                    <button key={val} onClick={() => {setSportFilter(val); setShowSportMenu(false)}} className={`w-full py-4 px-5 rounded-2xl text-left border flex items-center gap-3 ${sportFilter === val ? 'bg-[#00ff41]/10 border-[#00ff41]/30 text-[#00ff41]' : 'border-white/5 bg-neutral-900 hover:bg-white/5 text-white'}`}>
                      <span className="text-lg">{sportEmoji(val)}</span>
                      <span className="font-black text-sm">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Rank Menu Bottom Sheet */}
          {showRankMenu && (
            <div className="fixed inset-0 z-[100] flex flex-col justify-end" onClick={() => setShowRankMenu(false)}>
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
              <div className="relative bg-[#0d0d0d] border-t border-white/10 rounded-t-3xl overflow-hidden flex flex-col max-h-[75vh]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <h3 className="text-lg font-black text-white">Select Division Target</h3>
                  <button onClick={() => setShowRankMenu(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition">
                    <X size={16} className="text-neutral-400" />
                  </button>
                </div>
                <div className="overflow-y-auto px-4 pb-8 flex flex-col gap-2">
                  <button onClick={() => {setDivisionFilter('ALL'); setShowRankMenu(false)}} className={`w-full py-4 px-5 rounded-2xl text-left border ${divisionFilter === 'ALL' ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'border-white/5 bg-neutral-900 text-white'}`}>
                    <span className="font-black text-sm">🌌 All Divisions</span>
                  </button>
                  {['Bronze', 'Silver', 'Gold', 'Platinum', 'Legend'].map(div => (
                    <button key={div} onClick={() => {setDivisionFilter(div); setShowRankMenu(false)}} className={`w-full py-4 px-5 rounded-2xl flex items-center gap-3 border transition ${divisionFilter === div ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' : 'border-white/5 bg-neutral-900 hover:bg-white/5 text-white'}`}>
                      <img src={`/ranks/${div}.svg`} className="w-8 h-8 object-contain scale-125 ml-1" />
                      <span className="font-black text-md">{div} Division</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Scouting report cards ── */}
          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 size={32} className="animate-spin text-purple-500" /></div>
          ) : (
            <div className="px-4 flex flex-col gap-3">
              {filteredTeams.map(t => {
                const rank = getRankData(t.teamMmr ?? 1000);
                const isChallenged = challengedTeamIds.has(t.id);
                return (
                  <div key={t.id} className="bg-[#101010] border border-white/8 rounded-3xl overflow-hidden hover:border-white/14 transition-all">
                    {/* Rank-tinted accent line */}
                    <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${rank.color}50, transparent)` }} />
                    <div className="p-4 flex flex-col gap-3">

                      {/* Header: logo + name/streak | rank block */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                            {t.logoUrl ? <img src={t.logoUrl} className="w-full h-full object-cover" /> : <Shield size={20} className="text-[#00ff41]" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-black text-[16px] text-white leading-tight truncate">{t.name}</p>
                              {t.winStreak >= 3 && (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/25 shrink-0">
                                  <Flame size={11} className="text-orange-400" />
                                  <span className="text-[9px] font-black text-orange-300">{t.winStreak}W</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-500 mt-0.5 font-medium">{sportEmoji(t.sportType)} {sportName(t.sportType)}</p>
                          </div>
                        </div>
                        {/* Rank */}
                        <div className="flex flex-col items-center gap-0.5 shrink-0">
                          <img src={rank.icon} className="w-10 h-10 object-contain" alt={rank.label} />
                          <span className={`text-[9px] font-black ${rank.text} leading-none`}>{rank.label}</span>
                          <span className="text-[9px] text-neutral-600 font-bold">{t.teamMmr ?? 1000} MMR</span>
                        </div>
                      </div>

                      {/* Territory tags */}
                      {((t.homeAreas?.length > 0) || (t.homeTurfs?.length > 0)) && (
                        <div className="flex flex-col gap-1.5 bg-neutral-950/70 border border-white/5 rounded-2xl px-3 py-2.5">
                          {t.homeAreas?.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] text-neutral-600 font-black shrink-0">📍 Areas:</span>
                              {t.homeAreas.slice(0, 3).map((a: any) => (
                                <span key={a.id} className="text-[10px] bg-neutral-900 border border-white/8 px-2 py-0.5 rounded-full text-neutral-300 font-medium">{a.name}</span>
                              ))}
                              {t.homeAreas.length > 3 && <span className="text-[9px] text-neutral-600 italic">+{t.homeAreas.length - 3}</span>}
                            </div>
                          )}
                          {t.homeTurfs?.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] text-neutral-600 font-black shrink-0">🏟️ Home Turfs:</span>
                              {t.homeTurfs.slice(0, 2).map((tu: any) => (
                                <span key={tu.id} className="text-[10px] bg-neutral-900 border border-white/8 px-2 py-0.5 rounded-full text-neutral-300 font-medium">{tu.name}</span>
                              ))}
                              {t.homeTurfs.length > 2 && <span className="text-[9px] text-neutral-600 italic">+{t.homeTurfs.length - 2}</span>}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action row */}
                      <div className="flex items-center justify-between pt-1 border-t border-white/5">
                        <button onClick={() => { setTeamDetailModal(t); setDetailTab('roster'); }}
                          className="flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-purple-300 font-black transition-colors">
                          <Users size={12} /> Roster & History <ChevronDown size={11} />
                        </button>
                        <button
                          onClick={(e) => !isChallenged && handleChallengeAttempt(e, t)}
                          disabled={isChallenged}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 ${
                            isChallenged
                              ? 'bg-purple-900/40 border border-purple-600/40 text-purple-400 cursor-not-allowed'
                              : 'bg-[#00ff41] text-black hover:bg-[#00dd38] shadow-[0_0_16px_rgba(0,255,65,0.3)] hover:shadow-[0_0_24px_rgba(0,255,65,0.45)]'
                          }`}>
                          <Swords size={13} />
                          {isChallenged ? 'CHALLENGED' : 'CHALLENGE ⚔️'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {!loading && filteredTeams.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center gap-3">
                  <Swords size={36} className="text-neutral-700" />
                  <p className="text-neutral-500 font-black text-sm">No opponents found</p>
                  <p className="text-neutral-700 text-xs">Try a different sport or division filter.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          ACTIVE TAB  — Prioritized feed
      ═══════════════════════════════════════════════════ */}
      {masterTab === 'active' && (
        <div className="px-4 pt-4 flex flex-col gap-3">
          {challengesLoading && activeCards.length === 0 && (
            <div className="py-20 flex justify-center"><Loader2 size={28} className="animate-spin text-purple-500" /></div>
          )}

          {!challengesLoading && activeCards.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-white/3 border border-white/8 flex items-center justify-center">
                <Swords size={28} className="text-neutral-600" />
              </div>
              <p className="font-black text-neutral-400">No active challenges</p>
              <p className="text-xs text-neutral-600 max-w-[200px]">Head to Discover to challenge a rival team!</p>
              <button onClick={() => setMasterTab('discover')}
                className="mt-2 px-5 py-2.5 bg-purple-600 text-white font-black rounded-xl text-sm hover:bg-purple-500 transition-colors">
                Browse Teams →
              </button>
            </div>
          )}

          {activeCards.map((m) => {
            const { _cardType, _amA: amA } = m;
            const myTeamHere  = amA ? m.teamA : m.teamB;
            const oppHere     = amA ? m.teamB : m.teamA;
            const opponent    = _cardType === 'received_pending' ? m.teamA : oppHere;
            const myTeamInCard= _cardType === 'received_pending' ? m.teamB : myTeamHere;

            // ── Card 1: ACTION REQUIRED (received challenge, score entry needed, score review) ──
            if (_cardType === 'received_pending' || _cardType === 'score_entry' || _cardType === 'score_review') {
              return (
                <div key={m.id}
                  className="relative bg-[#0d1a0d] border border-[#00ff41]/40 rounded-3xl overflow-hidden shadow-[0_0_24px_rgba(0,255,65,0.08)]">
                  {/* Green top accent line */}
                  <div className="h-0.5 w-full bg-gradient-to-r from-[#00ff41]/80 via-[#00ff41] to-[#00ff41]/80" />
                  <div className="p-5">
                    {/* Status badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 bg-[#00ff41]/10 border border-[#00ff41]/30 rounded-full px-3 py-1.5">
                        <AlertTriangle size={11} className="text-[#00ff41]" />
                        <span className="text-[10px] font-black text-[#00ff41] tracking-wider">ACTION REQUIRED</span>
                      </div>
                      <span className="text-[9px] text-neutral-600 font-bold">{new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    </div>

                    {/* Matchup */}
                    <div className="flex items-center gap-3 mb-4">
                      <TeamAvatar team={myTeamInCard} accent="green" />
                      <div className="flex-1 text-center">
                        <p className="text-xl font-black">vs</p>
                      </div>
                      <TeamAvatar team={opponent} accent="green" flip />
                    </div>

                    {/* Subtext */}
                    <p className="text-xs text-neutral-400 mb-4 text-center">
                      {_cardType === 'received_pending' && `${opponent?.name} challenged you.`}
                      {_cardType === 'score_entry' && 'Match ended — enter your team\'s score.'}
                      {_cardType === 'score_review' && 'Both scores submitted — review & agree.'}
                    </p>

                    {/* CTA Button */}
                    {_cardType === 'received_pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => respondChallenge(m.id, 'decline')}
                          className="flex-1 py-3 bg-red-500/10 border border-red-500/25 text-red-400 font-black text-xs rounded-2xl flex items-center justify-center gap-1.5 hover:bg-red-500/20 transition-colors">
                          <XCircle size={14} /> Decline
                        </button>
                        <button onClick={() => respondChallenge(m.id, 'accept')}
                          className="flex-[2] py-3 bg-[#00ff41] text-black font-black text-sm rounded-2xl flex items-center justify-center gap-2 hover:bg-[#00dd38] transition-all shadow-[0_4px_16px_rgba(0,255,65,0.25)]">
                          <CheckCircle size={15} /> Accept Challenge
                        </button>
                      </div>
                    )}
                    {(_cardType === 'score_entry' || _cardType === 'score_review') && (
                      <button onClick={() => openScoreModal(m)}
                        className="w-full py-3 bg-[#00ff41] text-black font-black text-sm rounded-2xl flex items-center justify-center gap-2 hover:bg-[#00dd38] transition-all shadow-[0_4px_16px_rgba(0,255,65,0.25)]">
                        {_cardType === 'score_entry' ? '📝 Enter Score' : '⚖️ Review & Agree'}
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            // ── Card 2: LIVE / SCHEDULED / BOOKED ──
            if (_cardType === 'live' || _cardType === 'scheduled') {
              const isLive = _cardType === 'live';
              return (
                <div key={m.id}
                  className="relative bg-[#120b1a] border border-purple-600/40 rounded-3xl overflow-hidden shadow-[0_0_20px_rgba(147,51,234,0.08)]">
                  {/* Purple top accent */}
                  <div className={`h-0.5 w-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-purple-600'}`} />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${isLive ? 'bg-red-500/15 border border-red-500/30' : 'bg-purple-600/15 border border-purple-600/30'}`}>
                        {isLive
                          ? <><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" /><span className="text-[10px] font-black text-red-300 tracking-wider">LIVE NOW</span></>
                          : <><Lock size={10} className="text-purple-300" /><span className="text-[10px] font-black text-purple-300 tracking-wider">BOOKED</span></>
                        }
                      </div>
                      {m.matchDate && (
                        <span className="text-[10px] text-neutral-500 font-bold">
                          {new Date(m.matchDate).toLocaleDateString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      <TeamAvatar team={myTeamHere} accent="purple" />
                      <div className="flex-1 text-center">
                        <p className="text-xl font-black text-purple-400">vs</p>
                      </div>
                      <TeamAvatar team={oppHere} accent="purple" flip />
                    </div>

                    {m.bookingCode && (
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-600/10 border border-purple-600/20 rounded-2xl mb-4">
                        <span className="text-[9px] text-purple-400 font-black">CODE</span>
                        <span className="font-mono font-black tracking-widest text-white flex-1">{m.bookingCode}</span>
                      </div>
                    )}

                    {isLive && (() => {
                      const sport = m.teamA?.sportType ?? '';
                      const isCricket = ['CRICKET_7', 'CRICKET_FULL'].includes(sport);
                      const liveRoute = isCricket ? `/${locale}/matches/${m.id}/cricket` : `/${locale}/matches/${m.id}/live`;
                      return (
                        <button onClick={() => router.push(liveRoute)}
                          className="w-full py-3.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-black text-sm rounded-2xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse">
                          {isCricket ? '🏏 Enter Live Scoring' : '🔴 Enter Live Scoring'}
                        </button>
                      );
                    })()}

                    {_cardType === 'scheduled' && (
                      <div className="flex flex-col gap-2">
                        <button onClick={() => respondChallenge(m.id, 'start')}
                          disabled={amA ? m.matchStartedByA : m.matchStartedByB}
                          className="w-full py-3 bg-[#00ff41] hover:bg-[#00dd38] border border-[#00ff41]/50 text-black font-black text-sm uppercase rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98]">
                          {(amA ? m.matchStartedByA : m.matchStartedByB) ? '✓ Ready — waiting for opponent' : '🚀 Start Match'}
                        </button>
                        <button onClick={() => router.push(`/${locale}/interact/match/${m.id}`)}
                          className="w-full py-2.5 text-xs font-bold text-neutral-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors">
                          <ExternalLink size={12} /> Open Match Board (History & Chat)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            // ── Card 3: INTERACTION (board open) ──
            if (_cardType === 'interaction') {
              return (
                <div key={m.id} className="bg-[#0f0f14] border border-purple-500/25 rounded-3xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-fuchsia-600/15 border border-fuchsia-600/25 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />
                      <span className="text-[10px] font-black text-fuchsia-300 tracking-wider">NEGOTIATING</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <TeamAvatar team={myTeamHere || m.teamB} accent="purple" />
                    <div className="flex-1 text-center"><p className="font-black text-fuchsia-400">vs</p></div>
                    <TeamAvatar team={oppHere || m.teamA} accent="purple" flip />
                  </div>
                  <button onClick={() => router.push(`/${locale}/interact/match/${m.id}`)}
                    className="w-full py-3 bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/30 text-fuchsia-300 font-black text-sm rounded-2xl flex items-center justify-center gap-2 transition-all">
                    <ExternalLink size={13} /> Open Interaction Board
                  </button>
                </div>
              );
            }

            // ── Card 4: PENDING sent / waiting ──
            if (_cardType === 'sent_pending' || _cardType === 'waiting_score') {
              const oppTeam = _cardType === 'sent_pending' ? m.teamB : (amA ? m.teamB : m.teamA);
              return (
                <div key={m.id} className="bg-[#0d0d0d] border border-white/8 rounded-3xl p-5 opacity-60">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                      <Clock size={10} className="text-amber-400" />
                      <span className="text-[10px] font-black text-amber-400/80 tracking-wider">PENDING</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-neutral-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                      {oppTeam?.logoUrl ? <img src={oppTeam.logoUrl} className="w-full h-full object-cover" /> : <Shield size={14} className="text-neutral-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm truncate">{oppTeam?.name || 'Unknown team'}</p>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-600 italic">
                    {_cardType === 'sent_pending' ? `Waiting for ${oppTeam?.name || 'opponent'} to accept your challenge…` : 'Waiting for opponent to submit their score…'}
                  </p>
                </div>
              );
            }

            return null;
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          VAULT TAB — Completed & Disputed
      ═══════════════════════════════════════════════════ */}
      {masterTab === 'history' && (
        <div className="px-4 pt-4 flex flex-col gap-3">
          {vaultCards.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
              <History size={36} className="text-neutral-700" />
              <p className="font-black text-neutral-500">No history yet</p>
              <p className="text-xs text-neutral-700">Completed matches will appear here.</p>
            </div>
          )}
          {vaultCards.map((m: any) => {
            const amA       = myTeams.some((t: any) => t.id === m.teamA_Id);
            const myTeamH   = amA ? m.teamA : m.teamB;
            const oppH      = amA ? m.teamB : m.teamA;
            const myScore   = amA ? m.scoreA : m.scoreB;
            const oppScore  = amA ? m.scoreB : m.scoreA;
            const myMmr     = amA ? m.mmrChangeA : m.mmrChangeB;
            const won       = m.winnerId === myTeamH?.id;
            const draw      = m.winnerId === null && m.scoreA === m.scoreB;
            const isDispute = m.status === 'DISPUTED';
            const hasStats  = m.playerStats?.length > 0 || m.playerMatchStats?.length > 0;

            return (
              <div key={m.id} className={`rounded-2xl border overflow-hidden ${
                isDispute     ? 'bg-amber-500/5 border-amber-500/20' :
                won           ? 'bg-[#00ff41]/5 border-[#00ff41]/20' :
                draw          ? 'bg-neutral-900 border-white/10' :
                                'bg-red-500/5 border-red-500/15'
              }`}>
                <div className="flex items-center gap-3 p-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 ${
                    isDispute ? 'bg-amber-500/20 text-amber-400' :
                    won       ? 'bg-[#00ff41]/20 text-[#00ff41]' :
                    draw      ? 'bg-neutral-700 text-neutral-400' :
                                'bg-red-500/20 text-red-400'
                  }`}>{isDispute ? '⚠️' : won ? 'W' : draw ? 'D' : 'L'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-sm">vs {oppH?.name}</p>
                    <p className="text-xs text-neutral-500 font-bold">{myScore !== undefined ? `${myScore} – ${oppScore}` : isDispute ? 'Disputed' : '–'}</p>
                    {m.matchDate && <p className="text-[9px] text-neutral-700">{new Date(m.matchDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className={`text-sm font-black ${myMmr > 0 ? 'text-[#00ff41]' : myMmr < 0 ? 'text-red-400' : 'text-neutral-500'}`}>
                      {myMmr > 0 ? `+${myMmr}` : myMmr === 0 ? '±0' : myMmr}
                    </span>
                    <span className="text-[9px] text-neutral-700 font-bold">MMR</span>
                  </div>
                </div>
                {!hasStats && !isDispute && (
                  <div className="px-4 pb-4">
                    <button onClick={() => openPlayerStatsModal(m)}
                      className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 border border-white/10 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all">
                      {statsLoading ? <Loader2 size={12} className="animate-spin" /> : '📊'} Enter Player Stats
                    </button>
                  </div>
                )}
                {isDispute && (
                  <div className="px-4 pb-4">
                    <p className="text-[10px] text-amber-400/70 leading-relaxed">BMT admin will review and resolve this result.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ TEAM DETAIL MODAL ═══ */}
      {teamDetailModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm" onClick={() => setTeamDetailModal(null)}>
          <div className="bg-neutral-900 border border-white/10 rounded-t-3xl w-full max-w-md max-h-[75vh] flex flex-col overflow-hidden shadow-2xl mb-[60px]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 p-5 border-b border-white/5 shrink-0">
              <div className="w-12 h-12 rounded-xl bg-neutral-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                {teamDetailModal.logoUrl ? <img src={teamDetailModal.logoUrl} className="w-full h-full object-cover" /> : <Shield size={20} className="text-[#00ff41]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-black text-lg truncate">{teamDetailModal.name}</p>
                  {teamDetailModal.winStreak >= 3 && <Flame size={16} className="text-orange-400 shrink-0" />}
                </div>
                <p className="text-[11px] text-neutral-500">{sportEmoji(teamDetailModal.sportType)} {sportName(teamDetailModal.sportType)} · {teamDetailModal.teamMmr} MMR</p>
              </div>
              <button onClick={() => setTeamDetailModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="flex gap-2 p-3 shrink-0">
              {(['roster', 'history'] as const).map(t => (
                <button key={t} onClick={() => setDetailTab(t)}
                  className={`flex-1 py-2 text-[11px] font-black rounded-xl transition-all ${detailTab === t ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}>
                  {t === 'roster' ? <><Users size={12} className="inline mr-1" />Roster</> : <><Clock size={12} className="inline mr-1" />History</>}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {detailTab === 'roster' && (
                <div className="flex flex-col gap-2">
                  {(teamDetailModal.members || []).length === 0 && <p className="text-center text-neutral-500 py-10 text-sm">No roster.</p>}
                  {(teamDetailModal.members || []).map((m: any) => {
                    const rank = getRankData(m.player?.mmr ?? 1000);
                    return (
                      <div key={m.playerId} className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-xl border border-white/5">
                        <div className="w-9 h-9 rounded-full bg-neutral-700 flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                          {m.player?.avatarUrl ? <img src={m.player.avatarUrl} className="w-full h-full object-cover" /> : <span className="text-xs font-black text-white/50">{m.player?.fullName?.[0] || '?'}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm truncate">{m.player?.fullName || 'Unknown'}</p>
                          <p className="text-[10px] text-neutral-500 capitalize">{m.role}{m.sportRole ? ` · ${m.sportRole}` : ''}</p>
                        </div>
                        <div className="flex items-center gap-1.5" style={{ color: rank.color }}>
                          <span className="text-[10px] font-bold">{rank.label}</span>
                          <img src={rank.icon} className="w-5 h-5 object-contain" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {detailTab === 'history' && (
                <div className="flex flex-col gap-2">
                  {(teamDetailModal.history || []).length === 0 && <p className="text-center text-neutral-500 py-10 text-sm italic">No match history.</p>}
                  {(teamDetailModal.history || []).map((h: any, i: number) => {
                    const wc = h.outcome === 'W' ? 'bg-[#00ff41]/5 border-[#00ff41]/20' : h.outcome === 'D' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-red-500/5 border-red-500/20';
                    const tc = h.outcome === 'W' ? 'text-[#00ff41]' : h.outcome === 'D' ? 'text-amber-500' : 'text-red-400';
                    return (
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${wc}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${tc}`}>{h.outcome}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate">vs {h.opponent?.name || 'Unknown'}</p>
                          <p className="text-[10px] text-neutral-500">{h.scoreA} – {h.scoreB}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ CHALLENGE SEND MODAL ═══ */}
      {showChallengeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowChallengeModal(null)}>
          <div className="bg-[#0f0f0f] border border-white/10 rounded-3xl p-6 w-full max-w-sm flex flex-col items-center text-center shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center overflow-hidden mb-4">
              {showChallengeModal.logoUrl ? <img src={showChallengeModal.logoUrl} className="w-full h-full object-cover" /> : <Shield size={32} className="text-[#00ff41]" />}
            </div>
            <h3 className="font-black text-xl mb-1">Challenge <span className="text-[#00ff41]">{showChallengeModal.name}</span></h3>
            <p className="text-xs text-neutral-500 mb-5 px-4">Formal match challenge via BMT Challenge Market</p>
            {eligibleTeams.length === 0 ? (
              <div className="w-full bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-5 text-left">
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-2">Access Denied</p>
                <p className="text-[11px] text-white/80 leading-relaxed">No subscribed CM team in <b>{sportName(showChallengeModal.sportType)}</b>.</p>
              </div>
            ) : (
              <div className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 mb-5 text-left">
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Challenging as</p>
                <select value={selectedChallenger} onChange={e => setSelectedChallenger(e.target.value)}
                  className="w-full bg-neutral-800 text-xs text-white px-3 py-2 rounded-lg border border-white/10 outline-none focus:border-[#00ff41]/50 mb-3">
                  {eligibleTeams.map(et => <option key={et.id} value={et.id}>{et.name}</option>)}
                </select>
              </div>
            )}
            {chalMsg && <p className={`text-xs font-bold mb-4 ${chalMsg.startsWith('✅') ? 'text-[#00ff41]' : 'text-red-400'}`}>{chalMsg}</p>}
            <div className="w-full flex gap-3">
              <button onClick={() => setShowChallengeModal(null)} className="flex-1 py-3 bg-neutral-800 hover:bg-neutral-700 font-bold rounded-xl text-sm transition-colors">
                {eligibleTeams.length === 0 ? 'Go Back' : 'Cancel'}
              </button>
              {eligibleTeams.length > 0 && (
                <button onClick={issueChallenge} disabled={chalSending}
                  className="flex-[2] py-3 bg-[#00ff41] hover:bg-[#00dd38] text-black font-black rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                  {chalSending ? <Loader2 size={16} className="animate-spin" /> : <><Swords size={14} /> Issue Challenge</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ PLAYER STATS MODAL ═══ */}
      {statsModal && (() => {
        const { myScore, sport, players, starterIds } = statsModal;
        const isCricket  = ['CRICKET_7','CRICKET_FULL'].includes(sport);
        const sportBadges: BadgeDef[]  = BADGES_BY_SPORT[sport] ?? BADGES_BY_SPORT['FUTSAL_5'];
        const badgeLimit = maxBadges(sport);
        const assignedCount = Object.values(statsData).filter((s: any) => s.badge && s.badge !== 'NONE').length;
        const upd = (pid: string, field: string, val: any) =>
          setStatsData((prev: any) => ({ ...prev, [pid]: { ...prev[pid], [field]: val } }));
        const canSave = true; // badges are all optional
        return (
          <div className="fixed inset-0 z-[60] flex flex-col" onClick={() => !statsSaving && setStatsModal(null)}>
            <div className="absolute inset-0 bg-black/85 backdrop-blur-sm" />
            <div className="relative mt-auto bg-[#0a0a0a] border-t border-white/10 rounded-t-3xl flex flex-col overflow-hidden"
              style={{ height: '92dvh' }} onClick={(e: any) => e.stopPropagation()}>
              <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>
              
              {/* 1. Sticky Top Header (Validation & Dynamic Badge Bank) */}
              <div className="shrink-0 bg-[#0d0d0d] border-b border-white/5 pb-3 pt-4 relative z-10 shadow-lg">
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-white/20 rounded-full" />
                {/* Score header - now badge-only mode */}
                <div className="mt-3 bg-[#111111] px-4 py-2 text-center border-b border-white/5">
                  <p className={`text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-1.5 ${
                    assignedCount <= badgeLimit ? 'text-[#00ff41]' : 'text-red-400'
                  }`}>
                    <Award size={12} />
                    Badge Distribution · {assignedCount}/{badgeLimit} used
                  </p>
                </div>

                {/* Sport-specific Badge Bank */}
                <div className="px-4 pt-3">
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2">
                    {sportBadges.filter(b => b.key !== 'NONE').map((b: BadgeDef, idx: number) => {
                      const isActive = selectedBadge === idx;
                      return (
                        <button
                          key={b.key}
                          onClick={() => setSelectedBadge(isActive ? null : idx)}
                          className={`shrink-0 px-3.5 py-2.5 rounded-full border text-[9px] font-black transition-all ${
                            isActive
                              ? 'bg-fuchsia-600 border-fuchsia-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)] scale-105'
                              : 'bg-neutral-900 border-white/10 text-neutral-400 hover:border-white/20'
                          }`}>
                          {b.emoji} {b.label} <span className="text-fuchsia-400">+{b.bonus}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[8px] text-neutral-500 font-bold uppercase tracking-wider mt-1 text-center">Select a badge, then tap a player’s avatar to award.</p>
                </div>
              </div>

              {/* 2. High-Density Player List (Slim Rows) */}
              <div className="flex-1 overflow-y-auto px-4 py-2 pb-[140px]">
                <div className="flex flex-col">
                  {players.map((mb: any) => {
                     const pid = mb.playerId;
                     const s   = statsData[pid] ?? {};
                     const isStart = starterIds?.has(mb.id);
                     const isAvatarTargeted = selectedBadge !== null;
                     const hasBadgeAssigned = s.badge && s.badge !== 'NONE';

                     return (
                       <div key={pid} className="flex items-center gap-3 py-3 border-b border-white/5">
                         {/* Left: Avatar & Name */}
                         <div className="flex items-center gap-2.5 flex-1 min-w-0">
                           <button onClick={() => {
                             if (selectedBadge !== null) {
                               const newlyAssignedBadge = sportBadges.filter(b => b.key !== 'NONE')[selectedBadge]?.key ?? 'NONE';
                               setStatsData((prev: any) => {
                                 const next = { ...prev };
                                 Object.keys(next).forEach(OtherPid => {
                                   if (next[OtherPid].badge === newlyAssignedBadge) {
                                     next[OtherPid] = { ...next[OtherPid], badge: 'NONE' };
                                   }
                                 });
                                 next[pid] = { ...next[pid], badge: newlyAssignedBadge };
                                 return next;
                               });
                               setSelectedBadge(null);
                             } else if (hasBadgeAssigned) {
                               upd(pid, 'badge', 'NONE');
                             }
                           }}
                           className={`relative w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-all ${
                             isAvatarTargeted ? 'bg-fuchsia-500/20 border border-fuchsia-500 border-dashed hover:bg-fuchsia-500/40 cursor-pointer animate-pulse' : 
                             hasBadgeAssigned ? 'bg-purple-600 border border-purple-400 cursor-pointer shadow-[0_0_8px_rgba(168,85,247,0.4)]' :
                             'bg-neutral-800 border border-white/10'
                           }`}>
                             {hasBadgeAssigned ? <span className="text-[10px]">💎</span> : mb.player?.avatarUrl ? <img src={mb.player.avatarUrl} className="w-full h-full object-cover rounded-full" /> : <span className="text-xs font-black text-white/50">{(mb.player?.fullName || 'P')[0]}</span>}
                             {isStart && !hasBadgeAssigned && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-[#00ff41] border-[2px] border-neutral-900 rounded-full" />}
                           </button>
                           <div className="flex flex-col min-w-0">
                             <span className="text-xs font-bold text-white truncate">{mb.player?.fullName || 'Unknown Player'}</span>
                             {hasBadgeAssigned && <span className="text-[8px] font-black text-fuchsia-400 capitalize">{s.badge.replace('_', ' ')}</span>}
                           </div>
                         </div>
                         
                         {/* Right: Dynamic Stat Columns */}
                         <div className="flex items-center gap-1.5 shrink-0">
                           <button
                             onClick={() => setSelectedStatCell({ playerId: pid, statType: 'statA' })}
                             className={`flex items-center gap-1.5 px-2.5 py-2 bg-neutral-900 border rounded-lg transition-all min-w-[50px] justify-between ${
                               selectedStatCell?.playerId === pid && selectedStatCell?.statType === 'statA'
                                 ? 'border-[#00ff41] shadow-[0_0_8px_rgba(0,255,65,0.2)] scale-105'
                                 : 'border-white/5 hover:border-white/15'
                             }`}>
                             <span className="text-[8px] font-black text-neutral-500 uppercase">{isFutsal ? 'GLS' : 'RUN'}</span>
                             <span className={`text-xs font-black tabular-nums ${s[isFutsal ? 'goals' : 'runs'] > 0 ? 'text-[#00ff41]' : 'text-neutral-300'}`}>{s[isFutsal ? 'goals' : 'runs'] ?? 0}</span>
                           </button>

                           <button
                             onClick={() => setSelectedStatCell({ playerId: pid, statType: 'statB' })}
                             className={`flex items-center gap-1.5 px-2.5 py-2 bg-neutral-900 border rounded-lg transition-all min-w-[50px] justify-between ${
                               selectedStatCell?.playerId === pid && selectedStatCell?.statType === 'statB'
                                 ? 'border-[#00ff41] shadow-[0_0_8px_rgba(0,255,65,0.2)] scale-105'
                                 : 'border-white/5 hover:border-white/15'
                             }`}>
                             <span className="text-[8px] font-black text-neutral-500 uppercase">{isFutsal ? 'AST' : 'WKT'}</span>
                             <span className={`text-xs font-black tabular-nums ${s[isFutsal ? 'assists' : 'wickets'] > 0 ? 'text-white' : 'text-neutral-400'}`}>{s[isFutsal ? 'assists' : 'wickets'] ?? 0}</span>
                           </button>

                           {!isFutsal && (
                             <button
                               onClick={() => setSelectedStatCell({ playerId: pid, statType: 'statC' })}
                               className={`flex items-center gap-1.5 px-2.5 py-2 bg-neutral-900 border rounded-lg transition-all min-w-[46px] justify-between ${
                                 selectedStatCell?.playerId === pid && selectedStatCell?.statType === 'statC'
                                   ? 'border-[#00ff41] shadow-[0_0_8px_rgba(0,255,65,0.2)] scale-105'
                                   : 'border-white/5 hover:border-white/15'
                               }`}>
                               <span className="text-[8px] font-black text-neutral-500 uppercase">OVS</span>
                               <span className={`text-xs font-black tabular-nums ${s.overs > 0 ? 'text-[#00ff41]' : 'text-neutral-400'}`}>{s.overs ?? 0}</span>
                             </button>
                           )}
                         </div>
                       </div>
                     );
                  })}
                </div>
              </div>

              {/* 4. Bottom Action */}
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0a0a0a] border-t border-white/5 z-40">
                 {statsSaveErr && <p className="text-[10px] text-red-400 font-bold mb-2 text-center uppercase tracking-wider">{statsSaveErr}</p>}
                 <button onClick={() => {
                     savePlayerStats();
                     // close implicitly happens after save resolves unless error.
                 }} disabled={!canSave || statsSaving}
                   className="w-full py-3.5 rounded-xl font-black text-xs tracking-wider uppercase disabled:bg-neutral-800 disabled:text-neutral-500 bg-[#00ff41] text-black shadow-[0_0_16px_rgba(0,255,65,0.2)] hover:bg-[#00dd38] active:scale-95 transition-all">
                   {statsSaving ? <Loader2 size={16} className="animate-spin mx-auto text-black" /> : 'Save Match Stats'}
                 </button>
              </div>

              {/* 3. Contextual Input Overlay (Bottom Sheet) */}
              {selectedStatCell && (() => {
                 const isStatA = selectedStatCell.statType === 'statA';
                 const isStatB = selectedStatCell.statType === 'statB';
                 const isStatC = selectedStatCell.statType === 'statC';
                 const fieldName = isStatA ? (isFutsal ? 'goals' : 'runs') : isStatB ? (isFutsal ? 'assists' : 'wickets') : 'overs';
                 const pid = selectedStatCell.playerId;
                 const currentVal = statsData[pid]?.[fieldName] ?? 0;
                 const playerName = players.find((p: any) => p.playerId === pid)?.player?.fullName || 'Unknown';
                 
                 const applyVal = (newVal: number) => {
                   upd(pid, fieldName, isStatC ? parseFloat(newVal.toString()) : newVal);
                 };

                 return (
                  <div className="absolute bottom-0 left-0 right-0 bg-[#0f0f0f] rounded-t-3xl border-t border-white/10 z-50 p-6 shadow-[0_-15px_60px_rgba(0,0,0,0.8)] pb-10" style={{ animation: 'slideUp 0.15s ease-out forwards' }}>
                    {/* Header */}
                    <div className="flex items-start justify-between mb-8">
                       <div>
                         <p className="text-[10px] font-black text-neutral-500 uppercase tracking-widest leading-none mb-1.5 inline-flex items-center gap-1.5"><ChevronUp size={11}/> Editing Stat</p>
                         <p className="text-xl font-black text-white leading-none">{playerName} • {isStatA ? (isFutsal ? 'Goals' : 'Runs') : isStatB ? (isFutsal ? 'Assists' : 'Wickets') : 'Overs'}</p>
                       </div>
                       <button onClick={() => setSelectedStatCell(null)} className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white shrink-0 transition-colors">
                         <X size={16} />
                       </button>
                    </div>

                    {isFutsal ? (
                      /* State A: Low-Score Sports (Stepper) */
                      <div className="flex items-center justify-center gap-8 py-4">
                        <button onClick={() => applyVal(Math.max(0, currentVal - 1))} className="w-20 h-20 rounded-3xl bg-neutral-900 border border-white/10 flex items-center justify-center text-4xl font-black text-neutral-400 active:scale-95 transition-all outline-none">—</button>
                        <span className="text-7xl font-black text-[#00ff41] w-24 text-center tabular-nums drop-shadow-[0_0_16px_rgba(0,255,65,0.4)]">{currentVal}</span>
                        <button onClick={() => applyVal(currentVal + 1)} className="w-20 h-20 rounded-3xl bg-[#00ff41]/10 border border-[#00ff41]/30 flex items-center justify-center text-4xl font-black text-[#00ff41] active:scale-95 transition-all outline-none shadow-[0_4px_24px_rgba(0,255,65,0.15)]">+</button>
                      </div>
                    ) : (
                      /* State B: High-Score Sports (Numpad) */
                      <div className="flex flex-col gap-5 max-w-sm mx-auto">
                        <div className="flex gap-2">
                          {[1, 2, 4, 6].map(v => (
                             <button key={v} onClick={() => applyVal(currentVal + v)} className="flex-1 py-3.5 rounded-xl bg-purple-600/10 border border-purple-500/20 text-purple-400 font-black text-lg active:scale-95 transition-all outline-none shadow-sm">
                               +{v}
                             </button>
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[1,2,3,4,5,6,7,8,9].map(v => (
                             <button key={v} onClick={() => applyVal(parseInt(currentVal.toString() + v.toString()))} className="py-4 rounded-xl bg-neutral-900 border border-white/5 font-black text-2xl text-white active:scale-95 outline-none transition-transform hover:bg-white/5">
                               {v}
                             </button>
                          ))}
                          <button onClick={() => applyVal(0)} className="py-4 rounded-xl font-black text-xl text-red-500 bg-red-500/10 border border-red-500/20 active:scale-95 outline-none">C</button>
                          <button onClick={() => applyVal(parseInt(currentVal.toString() + '0'))} className="py-4 rounded-xl bg-neutral-900 border border-white/5 font-black text-2xl text-white active:scale-95 outline-none">0</button>
                          <button onClick={() => setSelectedStatCell(null)} className="py-4 rounded-xl font-black text-xl text-black bg-[#00ff41] active:scale-95 outline-none shadow-[0_0_16px_rgba(0,255,65,0.3)]">OK</button>
                        </div>
                      </div>
                    )}
                  </div>
                 );
              })()}
            </div>
          </div>
        );
      })()}

      {/* ═══ SCORE ENTRY MODAL ═══ */}
      {scoreModalId && scoreModalMatch && (() => {
        const amA         = myTeams.some((t: any) => t.id === scoreModalMatch.teamA_Id);
        const isCricket   = scoreModalMatch.teamA.sportType === 'CRICKET_7';
        const myTeamH     = amA ? scoreModalMatch.teamA : scoreModalMatch.teamB;
        const oppH        = amA ? scoreModalMatch.teamB : scoreModalMatch.teamA;
        const mySubmitted = amA ? scoreModalMatch.scoreSubmittedByA : scoreModalMatch.scoreSubmittedByB;
        const oppSubmitted= amA ? scoreModalMatch.scoreSubmittedByB : scoreModalMatch.scoreSubmittedByA;
        const bothSubm    = mySubmitted && oppSubmitted;
        return (
          <div className="fixed inset-0 z-50 flex items-end" onClick={() => !scoreSubmitting && setScoreModalId(null)}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div className="relative bg-[#0f0f0f] border border-white/10 rounded-t-3xl w-full max-h-[85dvh] overflow-y-auto"
              style={{ paddingBottom: '80px' }} onClick={e => e.stopPropagation()}>
              <div className="flex justify-center pt-2.5 pb-1"><div className="w-8 h-0.5 bg-white/20 rounded-full" /></div>
              <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2">
                <p className="font-black text-sm flex-1">{bothSubm ? '⚖️ Review' : '📝 Enter Score'}</p>
                <p className="text-[10px] text-neutral-500">{myTeamH?.name} vs {oppH?.name}</p>
              </div>
              <div className="px-5 py-5">
                {!mySubmitted && (
                  <>
                    <div className="mb-5">
                      <label className="block text-[10px] text-[#00ff41] font-black mb-2 uppercase tracking-wide">
                        {isCricket ? `${myTeamH?.name} — Runs Scored` : `${myTeamH?.name} — Goals Scored`}
                      </label>
                      <input type="number" min="0"
                        value={isCricket ? myRunInput : myGoalInput}
                        onChange={e => isCricket ? setMyRunInput(e.target.value) : setMyGoalInput(e.target.value)}
                        className="w-full bg-neutral-800 border border-[#00ff41]/20 rounded-2xl px-4 py-4 text-white font-black text-4xl text-center focus:border-[#00ff41]/60 focus:outline-none"
                        placeholder="0" />
                    </div>
                    {isCricket && (
                      <div className="flex gap-3 mb-5">
                        <div className="flex-1">
                          <label className="block text-[10px] text-neutral-500 font-black mb-1.5">WICKETS</label>
                          <input type="number" min="0" max="10" value={wicketInput} onChange={e => setWicketInput(e.target.value)}
                            className="w-full bg-neutral-800 border border-white/10 rounded-xl px-3 py-2.5 text-white font-bold text-center focus:outline-none" placeholder="0" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] text-neutral-500 font-black mb-1.5">OVERS</label>
                          <input type="number" min="0" step="0.1" value={overInput} onChange={e => setOverInput(e.target.value)}
                            className="w-full bg-neutral-800 border border-white/10 rounded-xl px-3 py-2.5 text-white font-bold text-center focus:outline-none" placeholder="7.0" />
                        </div>
                      </div>
                    )}
                    <button onClick={submitScore} disabled={scoreSubmitting}
                      className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-all">
                      {scoreSubmitting ? <Loader2 size={16} className="animate-spin" /> : '✅ Submit Score'}
                    </button>
                  </>
                )}
                {mySubmitted && !oppSubmitted && (
                  <div className="py-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                      <Loader2 size={28} className="animate-spin text-purple-400" />
                    </div>
                    <p className="font-black text-sm">Score submitted!</p>
                    <p className="text-xs text-neutral-500 mt-1">Waiting for {oppH?.name} to submit their score…</p>
                  </div>
                )}
                {bothSubm && !(amA ? scoreModalMatch.agreedByA : scoreModalMatch.agreedByB) && (
                  <>
                    <p className="text-[10px] text-neutral-500 font-black mb-3 uppercase tracking-wide">Each team's reported score</p>
                    <div className="flex items-stretch gap-3 mb-4">
                      <div className="flex-1 px-4 py-4 bg-[#00ff41]/5 border border-[#00ff41]/15 rounded-2xl text-center">
                        <p className="text-[9px] text-[#00ff41] font-black mb-1 truncate">{scoreModalMatch.teamA?.name}</p>
                        <p className="text-4xl font-black">{scoreModalMatch.submittedScoreA ?? '?'}</p>
                      </div>
                      <div className="flex items-center"><span className="text-neutral-600 font-black text-lg">–</span></div>
                      <div className="flex-1 px-4 py-4 bg-fuchsia-500/5 border border-fuchsia-500/15 rounded-2xl text-center">
                        <p className="text-[9px] text-fuchsia-400 font-black mb-1 truncate">{scoreModalMatch.teamB?.name}</p>
                        <p className="text-4xl font-black">{scoreModalMatch.submittedScoreB2 ?? '?'}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => resolveMatch('dispute')} disabled={scoreSubmitting}
                        className="flex-1 py-3 bg-red-500/10 border border-red-500/20 text-red-400 font-black text-sm rounded-xl hover:bg-red-500/20 disabled:opacity-50 transition-all">
                        ⚠️ Dispute
                      </button>
                      <button onClick={() => resolveMatch('agree')} disabled={scoreSubmitting}
                        className="flex-[2] py-3 bg-[#00ff41]/10 border border-[#00ff41]/20 text-[#00ff41] font-black text-sm rounded-xl hover:bg-[#00ff41]/20 flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                        {scoreSubmitting ? <Loader2 size={14} className="animate-spin" /> : '✅ Agree'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ RESULT MODAL (MMR) ═══ */}
      {resultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" onClick={() => setResultModal(null)}>
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div className="relative bg-[#0f0f0f] border border-white/10 rounded-3xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className={`px-6 py-4 text-center ${resultModal.won ? 'bg-[#00ff41]/10' : resultModal.draw ? 'bg-neutral-800' : 'bg-red-500/10'}`}>
              <p className="text-4xl mb-1">{resultModal.won ? '🏆' : resultModal.draw ? '🤝' : '😞'}</p>
              <p className={`text-2xl font-black ${resultModal.won ? 'text-[#00ff41]' : resultModal.draw ? 'text-white' : 'text-red-400'}`}>
                {resultModal.won ? 'Victory!' : resultModal.draw ? 'Draw' : 'Defeat'}
              </p>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="text-center">
                  <p className="text-[10px] text-neutral-500 font-black">{resultModal.myTeam?.name}</p>
                  <p className="text-4xl font-black mt-1">{resultModal.myScore}</p>
                </div>
                <span className="text-neutral-600 font-black text-xl">–</span>
                <div className="text-center">
                  <p className="text-[10px] text-neutral-500 font-black">{resultModal.oppTeam?.name}</p>
                  <p className="text-4xl font-black mt-1">{resultModal.oppScore}</p>
                </div>
              </div>
              <div className="mb-5 bg-neutral-900/50 border border-white/5 rounded-2xl p-4">
                {(() => {
                  const dynRank = getRankData(animMMR);
                  return (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <img src={dynRank.icon} className="h-10 w-auto object-contain" />
                          <div>
                            <p className="text-[10px] font-black text-neutral-500 uppercase">{dynRank.label}</p>
                            <p className="text-xl font-black leading-none">{Math.floor(animMMR)} <span className="text-[10px] text-neutral-500 font-bold">MMR</span></p>
                          </div>
                        </div>
                        <p className={`text-xl font-black ${resultModal.mmrDelta > 0 ? 'text-[#00ff41]' : resultModal.mmrDelta < 0 ? 'text-red-400' : 'text-neutral-500'}`}>
                          {resultModal.mmrDelta > 0 ? `+${resultModal.mmrDelta}` : resultModal.mmrDelta}
                        </p>
                      </div>
                      <div className="h-3 bg-neutral-800 rounded-full overflow-hidden border border-white/5">
                        <div className={`h-full rounded-full ${resultModal.mmrDelta > 0 ? 'bg-[#00ff41] shadow-[0_0_12px_rgba(0,255,65,0.5)]' : resultModal.mmrDelta < 0 ? 'bg-red-500' : 'bg-neutral-500'}`}
                          style={{ width: `${animWidth}%`, transition: 'width 40ms linear' }} />
                      </div>
                    </>
                  );
                })()}
              </div>
              <button onClick={() => {
                fetch(`/api/interact/match/${resultModal.match.id}`, {
                  method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'mark_result_seen' })
                });
                setResultModal(null); setMasterTab('history');
              }} className="w-full py-3 bg-neutral-800 hover:bg-neutral-700 font-black text-sm rounded-xl transition-all">
                View in History →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small team avatar component ───────────────────────────────────────────────
function TeamAvatar({ team, accent, flip }: { team: any; accent: 'green' | 'purple'; flip?: boolean }) {
  const borderColor = accent === 'green' ? 'border-[#00ff41]/30' : 'border-purple-500/30';
  return (
    <div className={`flex items-center gap-2 flex-1 ${flip ? 'flex-row-reverse' : ''}`}>
      <div className={`w-10 h-10 rounded-xl bg-neutral-800 border ${borderColor} flex items-center justify-center overflow-hidden shrink-0`}>
        {team?.logoUrl ? <img src={team.logoUrl} className="w-full h-full object-cover" /> : <Shield size={15} className={accent === 'green' ? 'text-[#00ff41]' : 'text-purple-400'} />}
      </div>
      <div className={`min-w-0 flex-1 ${flip ? 'text-right' : ''}`}>
        <p className="font-black text-sm truncate leading-tight">{team?.name ?? 'Unknown'}</p>
        <p className="text-[10px] text-neutral-500">{team?.teamMmr ?? '—'} MMR</p>
      </div>
    </div>
  );
}
