'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Play, User, RefreshCw, Loader2, Smartphone, Cpu, CheckCircle2, Circle, AlertCircle, HelpCircle } from 'lucide-react';

export default function TestSimulationPage() {
  const router = useRouter();
  const { locale } = useParams() as { locale: string };

  const [loading, setLoading] = useState(false);
  const [consoleMsg, setConsoleMsg] = useState('');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  
  // Simulation match state
  const [activeMatch, setActiveMatch] = useState<any>(null);
  const [autoResponse, setAutoResponse] = useState(true);
  const [iframeKey, setIframeKey] = useState(0);

  // Load active simulated user and any pending match
  const fetchState = async () => {
    try {
      // 1. Get current match state from db (search for any matches between team A and team B)
      const res = await fetch('/api/interact/challenge');
      const data = await res.json();
      
      // Look for a match between dummy_team_a and dummy_team_b
      const allMatches = [...(data.sent || []), ...(data.received || []), ...(data.upcoming || [])];
      const match = allMatches.find(m => 
        (m.teamA_Id === 'dummy_team_a' && m.teamB_Id === 'dummy_team_b') ||
        (m.teamA_Id === 'dummy_team_b' && m.teamB_Id === 'dummy_team_a')
      );
      
      if (match) {
        // Fetch detailed state
        const stateRes = await fetch(`/api/matches/${match.id}/state`);
        if (stateRes.ok) {
          const stateData = await stateRes.json();
          setActiveMatch(stateData);
        } else {
          setActiveMatch(null);
        }
      } else {
        setActiveMatch(null);
      }
    } catch (err) {
      console.error('Failed to fetch simulation state', err);
    }
  };

  // Determine current active user cookie
  useEffect(() => {
    const checkUser = () => {
      const cookies = document.cookie.split(';');
      const playerCookie = cookies.find(c => c.trim().startsWith('bmt_player_id='));
      if (playerCookie) {
        const val = playerCookie.split('=')[1];
        if (val === 'dummy_player_a') setCurrentUser('Challenger A');
        else if (val === 'dummy_player_b') setCurrentUser('Opponent B');
        else setCurrentUser(`External (${val})`);
      } else {
        setCurrentUser(null);
      }
    };
    checkUser();
    const interval = setInterval(checkUser, 1000);
    return () => clearInterval(interval);
  }, []);

  // Poll match state for the dashboard and auto-responder
  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 3000);
    return () => clearInterval(interval);
  }, []);

  // Run auto-responder
  useEffect(() => {
    if (!autoResponse || !activeMatch?.match) return;

    const match = activeMatch.match;
    const status = match.status;

    const runOpponentAction = async (action: string) => {
      console.log(`🤖 Auto-Responder: Triggering opponent action [${action}]`);
      try {
        const r = await fetch('/api/dev/simulate-opponent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId: match.id, action }),
        });
        if (r.ok) {
          setConsoleMsg(`🤖 Auto-responded: Opponent did [${action}]`);
          fetchState();
          // Reload iframe
          setIframeKey(k => k + 1);
        }
      } catch (err) {
        console.error('Auto responder failed', err);
      }
    };

    // Auto-Response Rules:
    // 1. Accept Challenge
    if (status === 'PENDING') {
      runOpponentAction('accept_challenge');
    }
    // 2. Lock Roster
    else if (status === 'INTERACTION' && match.rosterLockedA && !match.rosterLockedB) {
      runOpponentAction('lock_roster');
    }
    // 3. Confirm Venue Slot (if selected by A but not booked yet)
    else if (status === 'INTERACTION' && match.rosterLockedA && match.rosterLockedB && match.selectedSlotId && !match.venueBookedAt) {
      runOpponentAction('confirm_venue');
    }
    // 4. Start Match
    else if (status === 'SCHEDULED' && match.matchStartedByA && !match.matchStartedByB) {
      runOpponentAction('start_match');
    }
    // 5. Agree to proposed scoring mode
    else if (status === 'LIVE' && activeMatch.scoreModeRequestedBy === 'dummy_team_a') {
      runOpponentAction('accept_mode');
    }
    // 6. Submit matching score
    else if (status === 'SCORE_ENTRY' && activeMatch.scoreSubmittedByA && !activeMatch.scoreSubmittedByB) {
      runOpponentAction('submit_score');
    }
    // 7. Accept match score
    else if (status === 'SCORE_ENTRY' && activeMatch.scoreSubmittedByA && activeMatch.scoreSubmittedByB && activeMatch.agreedByA && !activeMatch.agreedByB) {
      runOpponentAction('accept_score');
    }
    // 8. Sign-off match
    else if (status === 'SCORE_ENTRY' && activeMatch.agreedByA && !activeMatch.agreedByB) { // for LIVE mode signoffs
      runOpponentAction('signoff');
    }

  }, [activeMatch, autoResponse]);

  const runSetup = async (action: 'setup' | 'reset_all') => {
    setLoading(true);
    setConsoleMsg('');
    try {
      const res = await fetch('/api/dev/setup-test-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        setConsoleMsg(action === 'setup' ? `✅ Test Match Initialized (INTERACTION)!` : `✅ Playground reset! Match deleted, teams ready.`);
        await fetchState();
        setIframeKey(k => k + 1);
      } else {
        setConsoleMsg(`❌ Error: ${data.error}`);
      }
    } catch {
      setConsoleMsg('❌ Network error during setup');
    }
    setLoading(false);
  };

  const loginAs = async (player: 'a' | 'b') => {
    setLoading(true);
    try {
      const res = await fetch('/api/dev/setup-test-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: player === 'a' ? 'login_a' : 'login_b' }),
      });
      if (res.ok) {
        setConsoleMsg(`✅ Authenticated as ${player === 'a' ? 'Challenger A' : 'Opponent B'}`);
        setIframeKey(k => k + 1);
      } else {
        setConsoleMsg('❌ Authentication failed');
      }
    } catch {
      setConsoleMsg('❌ Network error');
    }
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await fetch('/api/dev/setup-test-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      setConsoleMsg('✅ Logged out successfully');
      setIframeKey(k => k + 1);
    } catch {
      setConsoleMsg('❌ Network error');
    }
    setLoading(false);
  };

  const triggerOpponentAction = async (action: string) => {
    if (!activeMatch?.match?.id) {
      setConsoleMsg('⚠️ Create a match first!');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/dev/simulate-opponent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: activeMatch.match.id, action }),
      });
      const d = await res.json();
      if (res.ok) {
        setConsoleMsg(`✅ Simulated: ${action}`);
        await fetchState();
        setIframeKey(k => k + 1);
      } else {
        setConsoleMsg(`❌ Error: ${d.error}`);
      }
    } catch {
      setConsoleMsg('❌ Network error');
    }
    setLoading(false);
  };

  // Helper to determine active step in checklist
  const getStepStatus = (step: number) => {
    if (!activeMatch?.match) return 'pending';
    const match = activeMatch.match;
    const status = match.status;

    switch (step) {
      case 1: // Reset
        return 'done';
      case 2: // Challenge sent
        return status !== 'PENDING' ? 'done' : 'active';
      case 3: // Accepted / Interaction Board
        if (status === 'PENDING') return 'pending';
        return (match.rosterLockedA && match.rosterLockedB && match.venueBookedAt) ? 'done' : 'active';
      case 4: // Booked / Scheduled
        if (status === 'PENDING' || status === 'INTERACTION') return 'pending';
        return (match.matchStartedByA && match.matchStartedByB) ? 'done' : 'active';
      case 5: // Live / Scoring Mode
        if (status !== 'LIVE') return status === 'SCORE_ENTRY' || status === 'COMPLETED' ? 'done' : 'pending';
        return activeMatch.scoreModeAgreed ? 'done' : 'active';
      case 6: // Final Score / Completed
        return status === 'COMPLETED' ? 'done' : (status === 'SCORE_ENTRY' ? 'active' : 'pending');
      default:
        return 'pending';
    }
  };

  // Derive iframe URL dynamically based on match status
  const getIframeSrc = () => {
    if (!activeMatch?.match) {
      return `/${locale}/interact`; // fallback to challenges list
    }
    const match = activeMatch.match;
    if (match.status === 'PENDING' || match.status === 'INTERACTION') {
      return `/${locale}/interact/match/${match.id}`;
    }
    if (match.status === 'SCHEDULED' || match.status === 'LIVE' || match.status === 'SCORE_ENTRY' || match.status === 'COMPLETED') {
      return `/${locale}/matches/${match.id}/live`;
    }
    return `/${locale}/interact`;
  };

  return (
    <div className="min-h-screen bg-[#08090f] text-white flex flex-col font-sans">
      {/* Header */}
      <header className="px-6 py-4 bg-[#0d0e14] border-b border-[#1e2028] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Cpu size={20} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              Match Simulator Dashboard
              <span className="text-[10px] bg-red-500/10 border border-red-500/30 text-red-500 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">DEV ONLY</span>
            </h1>
            <p className="text-xs text-neutral-500">Fully test the Challenge Market & Scoring flow between two teams.</p>
          </div>
        </div>

        {/* Current Simulated Session */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">Current Identity</p>
            <p className="text-xs font-black text-amber-400 flex items-center justify-end gap-1.5 mt-0.5">
              <User size={12} />
              {currentUser || 'Not Logged In (Guest)'}
            </p>
          </div>
          
          <button 
            onClick={fetchState}
            className="p-2 rounded-xl bg-neutral-800 border border-white/5 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all active:scale-95"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Main split-screen panel */}
      <main className="flex-grow flex min-h-0 overflow-hidden">
        
        {/* Left Side: Mock Mobile Phone Frame */}
        <div className="flex-1 bg-[#050508] border-r border-[#1e2028] flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-[400px] h-[780px] bg-[#000] border-[8px] border-[#1e2028] rounded-[48px] shadow-2xl relative flex flex-col overflow-hidden">
            {/* Phone Speaker Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-6 bg-[#1e2028] rounded-b-2xl z-[500] flex items-center justify-center">
              <div className="w-12 h-1 bg-black/40 rounded-full" />
            </div>

            {/* Mobile View iframe */}
            <div className="flex-grow pt-4 relative">
              <iframe 
                key={`${iframeKey}-${currentUser}`}
                src={getIframeSrc()} 
                className="w-full h-full border-none"
                style={{ background: '#08090f' }}
              />
            </div>

            {/* Home indicator */}
            <div className="h-6 bg-black flex items-center justify-center shrink-0">
              <div className="w-32 h-1 bg-neutral-700 rounded-full" />
            </div>
          </div>
        </div>

        {/* Right Side: Simulation Controls */}
        <div className="w-[450px] bg-[#0b0c10] flex flex-col overflow-y-auto shrink-0 p-6">
          
          {/* Quick Login simulation */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Quick Identity Switch</p>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={() => loginAs('a')}
                className="py-2 bg-purple-600/15 border border-purple-500/20 hover:border-purple-500/40 text-purple-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <User size={12} /> Login Challenger A
              </button>
              <button
                onClick={() => loginAs('b')}
                className="py-2 bg-blue-600/15 border border-blue-500/20 hover:border-blue-500/40 text-blue-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <User size={12} /> Login Opponent B
              </button>
            </div>
            {currentUser && (
              <button
                onClick={logout}
                className="w-full py-1.5 bg-red-950/20 border border-red-500/15 hover:bg-red-900/10 text-red-400 text-xs font-bold rounded-xl transition-all"
              >
                Clear Simulated Identity
              </button>
            )}
          </div>

          {/* Console / Status Logs */}
          <div className="p-4 bg-black/50 border border-[#1e2028] rounded-2xl mb-6 font-mono text-[11px]">
            <p className="text-neutral-500 font-sans font-black uppercase tracking-widest mb-2 text-[10px]">Playground Console</p>
            <div className="min-h-[50px] flex items-center text-neutral-400">
              {consoleMsg ? (
                <span className="w-full break-all whitespace-pre-wrap">{consoleMsg}</span>
              ) : (
                <span className="text-neutral-600 italic">No output logged yet. Use controls below.</span>
              )}
            </div>
          </div>

          {/* Auto Responder & Match Details */}
          <div className="p-5 bg-[#12131a] border border-[#1e2028] rounded-2xl mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">Opponent Simulation Mode</p>
                <p className="text-xs font-black text-white mt-0.5">Auto-Responder is {autoResponse ? 'ACTIVE 🤖' : 'INACTIVE 👤'}</p>
              </div>
              
              {/* Toggle switch */}
              <button
                onClick={() => setAutoResponse(!autoResponse)}
                className={`w-12 h-6 rounded-full p-1 transition-all ${autoResponse ? 'bg-[#00ff41]' : 'bg-neutral-800'}`}
              >
                <div className={`w-4 h-4 rounded-full bg-black transition-all ${autoResponse ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Match State Summary */}
            <div className="pt-4 border-t border-[#1e2028] flex flex-col gap-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500 font-bold">Match ID:</span>
                <span className="font-mono text-neutral-300">{activeMatch?.match?.id ? activeMatch.match.id.substring(0, 12) + '...' : 'None'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500 font-bold">Match Status:</span>
                <span className={`font-black uppercase ${
                  activeMatch?.match?.status === 'LIVE' ? 'text-red-500 animate-pulse' :
                  activeMatch?.match?.status === 'COMPLETED' ? 'text-[#00ff41]' :
                  activeMatch?.match?.status === 'SCHEDULED' ? 'text-blue-400' : 'text-amber-500'
                }`}>{activeMatch?.match?.status || 'No Match Created'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500 font-bold">Scoring Mode:</span>
                <span className="text-neutral-300 font-bold">{activeMatch?.scoringMode || 'None'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500 font-bold">Roster Locks:</span>
                <span className="text-neutral-300">
                  A: {activeMatch?.match?.rosterLockedA ? '🔒' : '🔓'} | B: {activeMatch?.match?.rosterLockedB ? '🔒' : '🔓'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500 font-bold">Venue Status:</span>
                <span className="text-neutral-300">
                  {activeMatch?.match?.venueBookedAt ? '✅ Booked' : '❌ Pending'}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500 font-bold">Match Scoreline:</span>
                <span className="font-black text-white">
                  {activeMatch?.scoreA ?? 0} : {activeMatch?.scoreB ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Checklist of Flow Steps */}
          <div className="mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3 ml-1">Futsal Match Checklist</p>
            <div className="flex flex-col gap-2">
              {/* Step 1 */}
              <div className="flex items-center gap-3 p-2 bg-neutral-900/60 rounded-xl">
                {getStepStatus(1) === 'done' ? <CheckCircle2 className="text-[#00ff41]" size={16} /> : <Circle className="text-neutral-600" size={16} />}
                <span className="text-xs font-bold text-neutral-300 flex-1">1. Reset database to clean state</span>
                <button 
                  onClick={() => runSetup('reset_all')}
                  className="px-2.5 py-1 bg-red-600/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-black text-[10px] rounded-lg transition-all"
                >
                  Reset
                </button>
              </div>

              {/* Step 2 */}
              <div className="flex items-center gap-3 p-2 bg-neutral-900/60 rounded-xl">
                {getStepStatus(2) === 'done' ? <CheckCircle2 className="text-[#00ff41]" size={16} /> : <Circle className="text-neutral-600" size={16} />}
                <span className="text-xs font-bold text-neutral-300 flex-1">2. Send challenge (Team A to B)</span>
                {getStepStatus(2) === 'active' && (
                  <span className="text-[9px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-black uppercase">Active</span>
                )}
              </div>

              {/* Step 3 */}
              <div className="flex items-center gap-3 p-2 bg-neutral-900/60 rounded-xl">
                {getStepStatus(3) === 'done' ? <CheckCircle2 className="text-[#00ff41]" size={16} /> : <Circle className="text-neutral-600" size={16} />}
                <span className="text-xs font-bold text-neutral-300 flex-1">3. Opponent accepts (INTERACTION Board)</span>
                {getStepStatus(3) === 'active' && (
                  <button 
                    onClick={() => triggerOpponentAction('accept_challenge')}
                    className="px-2.5 py-1 bg-[#00ff41]/10 border border-[#00ff41]/20 hover:bg-[#00ff41]/20 text-[#00ff41] font-black text-[10px] rounded-lg transition-all animate-pulse"
                  >
                    Accept
                  </button>
                )}
              </div>

              {/* Step 4 */}
              <div className="flex items-center gap-3 p-2 bg-neutral-900/60 rounded-xl">
                {getStepStatus(4) === 'done' ? <CheckCircle2 className="text-[#00ff41]" size={16} /> : <Circle className="text-neutral-600" size={16} />}
                <span className="text-xs font-bold text-neutral-300 flex-1">4. Lineups lock & Venue booked (SCHEDULED)</span>
                {getStepStatus(4) === 'active' && (
                  <div className="flex gap-1">
                    {!activeMatch?.match?.rosterLockedB && (
                      <button 
                        onClick={() => triggerOpponentAction('lock_roster')}
                        className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 font-black text-[9px] rounded-lg transition-all"
                      >
                        Lock Roster B
                      </button>
                    )}
                    {activeMatch?.match?.rosterLockedB && !activeMatch?.match?.venueBookedAt && (
                      <button 
                        onClick={() => triggerOpponentAction('confirm_venue')}
                        className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-400 font-black text-[9px] rounded-lg transition-all"
                      >
                        Book Turf B
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Step 5 */}
              <div className="flex items-center gap-3 p-2 bg-neutral-900/60 rounded-xl">
                {getStepStatus(5) === 'done' ? <CheckCircle2 className="text-[#00ff41]" size={16} /> : <Circle className="text-neutral-600" size={16} />}
                <span className="text-xs font-bold text-neutral-300 flex-1">5. Start Match & Scoring Mode Selection</span>
                {getStepStatus(5) === 'active' && (
                  <div className="flex gap-1">
                    {!activeMatch?.match?.matchStartedByB && (
                      <button 
                        onClick={() => triggerOpponentAction('start_match')}
                        className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 font-black text-[9px] rounded-lg transition-all"
                      >
                        Start Match B
                      </button>
                    )}
                    {activeMatch?.match?.matchStartedByB && activeMatch?.scoreModeRequestedBy === 'dummy_team_a' && (
                      <button 
                        onClick={() => triggerOpponentAction('accept_mode')}
                        className="px-2 py-1 bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 text-green-400 font-black text-[9px] rounded-lg transition-all animate-pulse"
                      >
                        Accept Mode B
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Step 6 */}
              <div className="flex items-center gap-3 p-2 bg-neutral-900/60 rounded-xl">
                {getStepStatus(6) === 'done' ? <CheckCircle2 className="text-[#00ff41]" size={16} /> : <Circle className="text-neutral-600" size={16} />}
                <span className="text-xs font-bold text-neutral-300 flex-1">6. Full Time called & Result signed off</span>
                {getStepStatus(6) === 'active' && (
                  <div className="flex gap-1">
                    {activeMatch?.scoringMode === 'SCORE_AFTER' && activeMatch?.scoreSubmittedByA && !activeMatch?.scoreSubmittedByB && (
                      <button 
                        onClick={() => triggerOpponentAction('submit_score')}
                        className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 text-amber-400 font-black text-[9px] rounded-lg transition-all"
                      >
                        Submit Score B
                      </button>
                    )}
                    {activeMatch?.scoringMode === 'SCORE_AFTER' && activeMatch?.scoreSubmittedByA && activeMatch?.scoreSubmittedByB && activeMatch?.agreedByA && !activeMatch?.agreedByB && (
                      <button 
                        onClick={() => triggerOpponentAction('accept_score')}
                        className="px-2 py-1 bg-[#00ff41]/10 border border-[#00ff41]/20 hover:bg-[#00ff41]/20 text-[#00ff41] font-black text-[9px] rounded-lg transition-all animate-pulse"
                      >
                        Accept Score B
                      </button>
                    )}
                    {activeMatch?.scoringMode !== 'SCORE_AFTER' && activeMatch?.match?.status === 'SCORE_ENTRY' && (
                      <button 
                        onClick={() => triggerOpponentAction('signoff')}
                        className="px-2 py-1 bg-[#00ff41]/10 border border-[#00ff41]/20 hover:bg-[#00ff41]/20 text-[#00ff41] font-black text-[9px] rounded-lg transition-all animate-pulse"
                      >
                        Sign Off B
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick-start bypass */}
          <div className="p-4 bg-neutral-900 border border-white/5 rounded-2xl flex flex-col gap-2 mt-auto">
            <p className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">Fast-Forward Buttons</p>
            <button 
              disabled={loading}
              onClick={() => runSetup('setup')}
              className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              🚀 Initialize & Skip directly to INTERACTION
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}
