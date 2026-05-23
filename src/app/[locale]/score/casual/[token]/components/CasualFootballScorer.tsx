'use client';

import React, { useState } from 'react';
import { 
  Loader2, Plus, Trash2, Clock, 
  CreditCard, Target, X, Check, ChevronRight 
} from 'lucide-react';

export default function CasualFootballScorer({ match, token }: { match: any; token: string }) {
  const [loading, setLoading] = useState(false);
  const [goalsA, setGoalsA] = useState(match.goalsA || 0);
  const [goalsB, setGoalsB] = useState(match.goalsB || 0);
  const [events, setEvents] = useState<any[]>(match.events || []);

  // Event sheet state
  const [sheetType, setSheetType] = useState<'GOAL' | 'CARD' | null>(null);
  const [step, setStep] = useState(0);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(match.teamA_Id);
  const [scorerPlayerId, setScorerPlayerId] = useState<string | null>(null);
  const [assistPlayerId, setAssistPlayerId] = useState<string | null>(null);
  const [cardType, setCardType] = useState<'YELLOW' | 'RED'>('YELLOW');
  const [minute, setMinute] = useState(1);
  const [errorMsg, setErrorMsg] = useState('');

  // Helpers to resolve team details
  const getTeamName = (teamId: string) => {
    if (teamId === match.teamA_Id) return match.teamA.name;
    if (teamId === match.teamB_Id) return match.teamB.name;
    return teamId;
  };

  const getTeamLogo = (teamId: string) => {
    if (teamId === match.teamA_Id) return match.teamA.logoUrl;
    if (teamId === match.teamB_Id) return match.teamB.logoUrl;
    return null;
  };

  const getRoster = (teamId: string) => {
    const team = teamId === match.teamA_Id ? match.teamA : match.teamB;
    if (!team || !team.members) return [];
    return team.members.map((m: any) => ({
      id: m.player.id,
      fullName: m.player.fullName,
      avatarUrl: m.player.avatarUrl,
      role: m.sportRole || m.role
    }));
  };

  const getPlayerName = (teamId: string, playerId: string) => {
    const roster = getRoster(teamId);
    const p = roster.find((r: any) => r.id === playerId);
    return p?.fullName || 'Unknown Player';
  };

  // Open bottom sheet
  const openSheet = (type: 'GOAL' | 'CARD', teamId: string) => {
    setSheetType(type);
    setSelectedTeamId(teamId);
    setStep(0);
    setScorerPlayerId(null);
    setAssistPlayerId(null);
    setCardType('YELLOW');
    setMinute(1);
    setErrorMsg('');
  };

  // Log a new match event
  const handleLogEvent = async () => {
    if (!scorerPlayerId) {
      setErrorMsg('Please select a player');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const eventData: any = {
      type: sheetType === 'GOAL' ? 'GOAL' : (cardType === 'YELLOW' ? 'YELLOW_CARD' : 'RED_CARD'),
      teamId: selectedTeamId,
      scorerPlayerId,
      minute,
      token // Pass token for signed authentication
    };

    if (sheetType === 'GOAL' && assistPlayerId) {
      eventData.assistPlayerId = assistPlayerId;
    }

    try {
      const res = await fetch(`/api/matches/${match.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
      const data = await res.json();
      if (res.ok && data.event) {
        // Re-fetch match state to guarantee score/timeline synchronization
        const freshRes = await fetch(`/api/score/casual/${token}`);
        const freshData = await freshRes.json();
        if (freshData.success) {
          setGoalsA(freshData.data.goalsA || 0);
          setGoalsB(freshData.data.goalsB || 0);
          setEvents(freshData.data.events || []);
        }
        setSheetType(null);
      } else {
        setErrorMsg(data.error || 'Failed to log event');
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Network error logging event');
    } finally {
      setLoading(false);
    }
  };

  // Delete/Resolve a match event
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    setLoading(true);
    try {
      // For casual matches, we PATCH to action: 'resolve', resolution: 'remove'
      const res = await fetch(`/api/matches/${match.id}/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', resolution: 'remove' })
      });
      if (res.ok) {
        // Re-fetch match state to guarantee score/timeline synchronization
        const freshRes = await fetch(`/api/score/casual/${token}`);
        const freshData = await freshRes.json();
        if (freshData.success) {
          setGoalsA(freshData.data.goalsA || 0);
          setGoalsB(freshData.data.goalsB || 0);
          setEvents(freshData.data.events || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const completeMatch = async () => {
    if (!confirm('Are you sure you want to complete and finalize this match?')) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/score/casual/${token}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      } else {
        alert(data.error || 'Failed to finalize match');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const roster = getRoster(selectedTeamId);
  const otherPlayers = roster.filter((p: any) => p.id !== scorerPlayerId);

  return (
    <div className="p-6 max-w-lg mx-auto flex flex-col gap-6">
      
      {/* Premium Digital Scoreboard */}
      <div className="bg-neutral-900 border border-white/5 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-red-500 via-yellow-400 to-[#00ff41]" />
        
        <h2 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-6 flex items-center justify-center gap-1.5">
          <Clock size={11} className="text-[#00ff41] animate-pulse" /> Casual Scoreboard
        </h2>

        <div className="flex items-center justify-between gap-4">
          {/* Team A Info */}
          <div className="flex-1 min-w-0 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-neutral-800 border border-white/5 flex items-center justify-center overflow-hidden mb-3">
              {getTeamLogo(match.teamA_Id) ? (
                <img src={getTeamLogo(match.teamA_Id)!} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="text-lg font-black text-white/40">{getTeamName(match.teamA_Id)[0]}</span>
              )}
            </div>
            <span className="text-xs font-black text-white truncate max-w-full block">
              {getTeamName(match.teamA_Id)}
            </span>
            <p className="text-5xl font-black text-[#00ff41] mt-3 font-mono tracking-tighter filter drop-shadow-[0_0_10px_rgba(0,255,65,0.2)]">
              {goalsA}
            </p>
          </div>

          <div className="px-4 py-2 bg-neutral-800 rounded-xl border border-white/5 text-[10px] font-black text-neutral-400 uppercase tracking-widest shrink-0">
            VS
          </div>

          {/* Team B Info */}
          <div className="flex-1 min-w-0 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-neutral-800 border border-white/5 flex items-center justify-center overflow-hidden mb-3">
              {getTeamLogo(match.teamB_Id) ? (
                <img src={getTeamLogo(match.teamB_Id)!} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="text-lg font-black text-white/40">{getTeamName(match.teamB_Id)[0]}</span>
              )}
            </div>
            <span className="text-xs font-black text-white truncate max-w-full block">
              {getTeamName(match.teamB_Id)}
            </span>
            <p className="text-5xl font-black text-[#00ff41] mt-3 font-mono tracking-tighter filter drop-shadow-[0_0_10px_rgba(0,255,65,0.2)]">
              {goalsB}
            </p>
          </div>
        </div>
      </div>

      {/* Grid Controllers: Team A Scorer Actions */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
          Score controls: {getTeamName(match.teamA_Id)}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button 
            disabled={loading}
            onClick={() => openSheet('GOAL', match.teamA_Id)}
            className="bg-neutral-900 border border-white/10 hover:border-emerald-500/50 p-4 rounded-2xl font-black text-xs uppercase tracking-wider text-white hover:bg-emerald-500/[0.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Target size={14} className="text-emerald-500" />
            ⚽ Log Goal
          </button>
          <button 
            disabled={loading}
            onClick={() => openSheet('CARD', match.teamA_Id)}
            className="bg-neutral-900 border border-white/10 hover:border-yellow-500/50 p-4 rounded-2xl font-black text-xs uppercase tracking-wider text-white hover:bg-yellow-500/[0.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <CreditCard size={14} className="text-yellow-500" />
            🟨 Log Card
          </button>
        </div>
      </div>

      {/* Grid Controllers: Team B Scorer Actions */}
      <div className="flex flex-col gap-3">
        <h3 className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
          Score controls: {getTeamName(match.teamB_Id)}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button 
            disabled={loading}
            onClick={() => openSheet('GOAL', match.teamB_Id)}
            className="bg-neutral-900 border border-white/10 hover:border-emerald-500/50 p-4 rounded-2xl font-black text-xs uppercase tracking-wider text-white hover:bg-emerald-500/[0.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Target size={14} className="text-emerald-500" />
            ⚽ Log Goal
          </button>
          <button 
            disabled={loading}
            onClick={() => openSheet('CARD', match.teamB_Id)}
            className="bg-neutral-900 border border-white/10 hover:border-yellow-500/50 p-4 rounded-2xl font-black text-xs uppercase tracking-wider text-white hover:bg-yellow-500/[0.02] active:scale-95 transition-all shadow-md flex items-center justify-center gap-2"
          >
            <CreditCard size={14} className="text-yellow-500" />
            🟨 Log Card
          </button>
        </div>
      </div>

      {/* Live Timeline list of events */}
      <div className="bg-neutral-900/50 border border-white/5 rounded-3xl p-5 flex flex-col gap-4">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
          Match Event Timeline
        </h3>
        
        {events.length === 0 ? (
          <p className="text-xs text-neutral-500 italic py-6 text-center">
            No events logged yet. Use controls above to record goals and cards.
          </p>
        ) : (
          <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
            {events.filter((e: any) => e.status !== 'REMOVED').map((e: any) => {
              const isGoal = e.type === 'GOAL';
              return (
                <div key={e.id} className="bg-neutral-950/80 border border-white/5 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="text-base shrink-0">
                      {isGoal ? '⚽' : e.type === 'YELLOW_CARD' ? '🟨' : '🟥'}
                    </span>
                    <div>
                      <p className="font-black text-white">
                        {isGoal ? 'Goal' : `${e.type === 'YELLOW_CARD' ? 'Yellow' : 'Red'} Card`} • {e.minute}&apos;
                      </p>
                      <p className="text-[10px] text-neutral-400 font-medium">
                        {getPlayerName(e.teamId, e.playerId)} ({getTeamName(e.teamId)})
                        {isGoal && e.assistPlayerId && ` • Assist: ${getPlayerName(e.teamId, e.assistPlayerId)}`}
                      </p>
                    </div>
                  </div>
                  <button 
                    disabled={loading}
                    onClick={() => handleDeleteEvent(e.id)}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completion Button */}
      <button 
        disabled={loading}
        onClick={completeMatch}
        className="w-full bg-[#00ff41] text-black font-black uppercase tracking-widest py-4 rounded-2xl hover:bg-[#00cc33] active:scale-[0.98] transition-all shadow-xl shadow-[#00ff41]/5 text-sm flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Complete &amp; Finalize Match'}
      </button>

      {/* Premium Drawer/Modal bottom sheet */}
      {sheetType && (
        <div className="fixed inset-0 z-[999] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSheetType(null)} />
          <div className="relative bg-[#111318] rounded-t-3xl border-t border-[#1e2028] overflow-hidden flex flex-col max-h-[85vh] animate-[slideUp_0.25s_ease-out_forwards]">
            
            {/* Drawer Header */}
            <div className="flex flex-col px-5 pt-5 pb-4 border-b border-[#1e2028] shrink-0 gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest mb-1">
                    Step {step + 1} of {sheetType === 'GOAL' ? 3 : 2}
                  </p>
                  <h2 className="text-lg font-black text-white">
                    {sheetType === 'GOAL' 
                      ? ['Select Scorer', 'Select Assist', 'Event Minute'][step]
                      : ['Select Booked Player', 'Card Details &amp; Minute'][step]
                    }
                  </h2>
                </div>
                <button 
                  onClick={() => setSheetType(null)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              
              {/* Step 0: Choose main player */}
              {step === 0 && (
                <div className="flex flex-col gap-2">
                  {roster.length === 0 ? (
                    <p className="text-xs text-neutral-500 italic py-6 text-center">
                      No players registered in {getTeamName(selectedTeamId)}.
                    </p>
                  ) : (
                    roster.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setScorerPlayerId(p.id);
                          setStep(1);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                          scorerPlayerId === p.id 
                            ? 'bg-[#00ff41]/10 border-[#00ff41]/40 text-[#00ff41]' 
                            : 'bg-neutral-900 border-white/5 text-white hover:bg-neutral-850'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
                          {p.avatarUrl ? (
                            <img src={p.avatarUrl} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <span className="text-xs font-black text-white/40">{p.fullName[0]}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black truncate">{p.fullName}</p>
                          <p className="text-[9px] text-neutral-500 capitalize">{p.role}</p>
                        </div>
                        <ChevronRight size={14} className="text-neutral-500" />
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Step 1 for Goal: Choose Assist */}
              {sheetType === 'GOAL' && step === 1 && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setAssistPlayerId(null);
                      setStep(2);
                    }}
                    className={`p-3 rounded-xl border transition-all text-left font-black text-xs uppercase tracking-wider ${
                      assistPlayerId === null 
                        ? 'bg-[#00ff41]/10 border-[#00ff41]/40 text-[#00ff41]' 
                        : 'bg-neutral-900 border-white/5 text-white hover:bg-neutral-850'
                    }`}
                  >
                    ⚽ No Assist
                  </button>

                  {otherPlayers.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setAssistPlayerId(p.id);
                        setStep(2);
                      }}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        assistPlayerId === p.id 
                          ? 'bg-[#00ff41]/10 border-[#00ff41]/40 text-[#00ff41]' 
                          : 'bg-neutral-900 border-white/5 text-white hover:bg-neutral-850'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
                        {p.avatarUrl ? (
                          <img src={p.avatarUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <span className="text-xs font-black text-white/40">{p.fullName[0]}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black truncate">{p.fullName}</p>
                        <p className="text-[9px] text-neutral-500 capitalize">{p.role}</p>
                      </div>
                      <ChevronRight size={14} className="text-neutral-500" />
                    </button>
                  ))}
                </div>
              )}

              {/* Step 1 for Card: Card Type and Minute */}
              {sheetType === 'CARD' && step === 1 && (
                <div className="flex flex-col gap-5">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCardType('YELLOW')}
                      className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider border transition-all text-center ${
                        cardType === 'YELLOW' 
                          ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400' 
                          : 'bg-neutral-900 border-white/5 text-neutral-400 hover:text-white'
                      }`}
                    >
                      🟨 Yellow Card
                    </button>
                    <button
                      onClick={() => setCardType('RED')}
                      className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider border transition-all text-center ${
                        cardType === 'RED' 
                          ? 'bg-red-500/15 border-red-500/40 text-red-400' 
                          : 'bg-neutral-900 border-white/5 text-neutral-400 hover:text-white'
                      }`}
                    >
                      🟥 Red Card
                    </button>
                  </div>

                  {/* Minute selectors */}
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Minute of Bookings</p>
                    <div className="flex items-center justify-center gap-3 bg-neutral-950 p-4 rounded-2xl border border-white/5">
                      <button
                        onClick={() => setMinute(m => Math.max(1, m - 1))}
                        className="w-10 h-10 rounded-xl bg-neutral-900 border border-white/10 text-lg font-black text-white flex items-center justify-center active:scale-90"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        value={minute}
                        onChange={e => setMinute(Math.max(1, Number(e.target.value)))}
                        className="w-16 text-center text-2xl font-mono font-black text-white bg-transparent outline-none"
                      />
                      <button
                        onClick={() => setMinute(m => m + 1)}
                        className="w-10 h-10 rounded-xl bg-[#00ff41]/20 border border-[#00ff41]/40 text-lg font-black text-[#00ff41] flex items-center justify-center active:scale-90"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2 for Goal: Minute Selection */}
              {sheetType === 'GOAL' && step === 2 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-neutral-500">Minute of Goal</p>
                  <div className="flex items-center justify-center gap-3 bg-neutral-950 p-4 rounded-2xl border border-white/5">
                    <button
                      onClick={() => setMinute(m => Math.max(1, m - 1))}
                      className="w-10 h-10 rounded-xl bg-neutral-900 border border-white/10 text-lg font-black text-white flex items-center justify-center active:scale-90"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={minute}
                      onChange={e => setMinute(Math.max(1, Number(e.target.value)))}
                      className="w-16 text-center text-2xl font-mono font-black text-white bg-transparent outline-none"
                    />
                    <button
                      onClick={() => setMinute(m => m + 1)}
                      className="w-10 h-10 rounded-xl bg-[#00ff41]/20 border border-[#00ff41]/40 text-lg font-black text-[#00ff41] flex items-center justify-center active:scale-90"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {errorMsg && <p className="text-red-400 text-xs font-bold text-center mt-2">{errorMsg}</p>}
            </div>

            {/* Drawer Footer controls */}
            <div className="px-5 pb-8 pt-3 border-t border-[#1e2028] shrink-0 flex gap-3">
              {step > 0 && (
                <button
                  onClick={() => setStep(s => s - 1)}
                  className="flex-1 py-3.5 rounded-xl border border-white/10 bg-neutral-900 hover:bg-neutral-850 text-white font-black text-xs uppercase tracking-wider transition-all"
                >
                  ← Back
                </button>
              )}
              {((sheetType === 'GOAL' && step === 2) || (sheetType === 'CARD' && step === 1)) ? (
                <button
                  disabled={loading}
                  onClick={handleLogEvent}
                  className="flex-[2] py-3.5 rounded-xl bg-[#00ff41] text-black font-black text-xs uppercase tracking-wider disabled:opacity-40 flex items-center justify-center gap-1.5 transition-all"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Confirm &amp; Save
                </button>
              ) : (
                <div className="flex-1" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Animation helpers */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
