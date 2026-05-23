'use client';

import React, { useState } from 'react';

export default function CricketScorer({ match }: { match: any }) {
  const [loading, setLoading] = useState(false);
  const [runsA, setRunsA] = useState(match.resultSummary?.runsA || 0);
  const [wicketsA, setWicketsA] = useState(match.resultSummary?.wicketsA || 0);
  const [runsB, setRunsB] = useState(match.resultSummary?.runsB || 0);
  const [wicketsB, setWicketsB] = useState(match.resultSummary?.wicketsB || 0);
  const [battingTeamId, setBattingTeamId] = useState(match.resultSummary?.battingTeamId || match.teamAId);

  const logEvent = async (eventData: any) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/t-matches/${match.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...eventData, teamId: battingTeamId })
      });
      const data = await res.json();
      if (data.success && data.data?.resultSummary) {
        const rs = data.data.resultSummary;
        setRunsA(rs.runsA || 0);
        setWicketsA(rs.wicketsA || 0);
        setRunsB(rs.runsB || 0);
        setWicketsB(rs.wicketsB || 0);
        setBattingTeamId(rs.battingTeamId || match.teamAId);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const completeMatch = async () => {
    if (!confirm('Are you sure you want to complete this match?')) return;
    
    setLoading(true);
    try {
      const winnerId = runsA > runsB ? match.teamAId : runsB > runsA ? match.teamBId : null;
      await fetch(`/api/t-matches/${match.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          winnerId, 
          resultSummary: { runsA, wicketsA, runsB, wicketsB, battingTeamId } 
        })
      });
      window.location.reload();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto flex flex-col gap-6">
      {/* Premium Digital Scoreboard */}
      <div className="bg-neutral-900 border border-white/5 rounded-2xl p-6 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-red-500 via-yellow-400 to-[#00ff41]" />
        <h2 className="text-xs font-black uppercase tracking-widest text-neutral-500 mb-6">Live Cricket Scoreboard</h2>
        <div className="flex items-center justify-between gap-4">
          <div className={`flex-1 min-w-0 ${battingTeamId === match.teamAId ? 'border-b-2 border-yellow-500 pb-2' : ''}`}>
            <span className={`text-sm font-black truncate block ${battingTeamId === match.teamAId ? 'text-yellow-400' : 'text-neutral-400'}`}>
              {match.teamAId}
            </span>
            <p className="text-4xl font-black text-white mt-3 font-mono tracking-tighter">
              {runsA} <span className="text-xl text-neutral-500">/ {wicketsA}</span>
            </p>
          </div>
          <div className="px-4 py-2 bg-neutral-800 rounded-xl border border-white/5 text-[10px] font-black text-neutral-400 uppercase tracking-widest shrink-0">
            VS
          </div>
          <div className={`flex-1 min-w-0 ${battingTeamId === match.teamBId ? 'border-b-2 border-yellow-500 pb-2' : ''}`}>
            <span className={`text-sm font-black truncate block ${battingTeamId === match.teamBId ? 'text-yellow-400' : 'text-neutral-400'}`}>
              {match.teamBId}
            </span>
            <p className="text-4xl font-black text-white mt-3 font-mono tracking-tighter">
              {runsB} <span className="text-xl text-neutral-500">/ {wicketsB}</span>
            </p>
          </div>
        </div>

        <p className="text-[10px] text-yellow-400/80 font-black uppercase tracking-widest mt-6">
          Currently Batting: {battingTeamId === match.teamAId ? 'Team A' : 'Team B'}
        </p>

        <button 
          onClick={() => setBattingTeamId(battingTeamId === match.teamAId ? match.teamBId : match.teamAId)}
          className="mt-3 text-[10px] uppercase tracking-widest font-black bg-white/5 border border-white/10 px-3 py-2 rounded-xl hover:bg-white/10 text-neutral-300 transition-colors"
        >
          🔄 Switch Batting Team
        </button>
      </div>

      {/* Scoring Action Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button 
          disabled={loading}
          onClick={() => logEvent({ type: 'run', runs: 1 })}
          className="bg-neutral-900 border border-white/10 hover:border-yellow-500/50 p-6 rounded-2xl font-black text-sm uppercase tracking-wider text-white hover:bg-yellow-500/[0.02] active:scale-95 transition-all shadow-lg flex flex-col items-center gap-2"
        >
          <span className="text-2xl">🏏</span>
          <span>+1 Run</span>
        </button>
        <button 
          disabled={loading}
          onClick={() => logEvent({ type: 'wicket' })}
          className="bg-neutral-900 border border-white/10 hover:border-red-500/50 p-6 rounded-2xl font-black text-sm uppercase tracking-wider text-red-400 hover:bg-red-500/[0.02] active:scale-95 transition-all shadow-lg flex flex-col items-center gap-2"
        >
          <span className="text-2xl">🔴</span>
          <span>Wicket</span>
        </button>
      </div>

      {/* Completion Button */}
      <button 
        disabled={loading}
        onClick={completeMatch}
        className="w-full bg-[#00ff41] text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-[#00cc33] active:scale-[0.98] transition-all shadow-xl shadow-[#00ff41]/5 text-sm"
      >
        Complete &amp; Finalize Match
      </button>
    </div>
  );
}
