'use client';

import React, { useState } from 'react';

export default function FootballScorer({ match }: { match: any }) {
  const [loading, setLoading] = useState(false);

  const logEvent = async (eventData: any) => {
    setLoading(true);
    try {
      await fetch(`/api/t-matches/\${match.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData)
      });
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
      await fetch(`/api/t-matches/\${match.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winnerId: match.teamAId, resultSummary: {} }) // Placeholder winner
      });
      window.location.reload();
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="bg-neutral-900 border border-white/5 rounded-2xl p-6 mb-6 text-center">
        <h2 className="text-xl font-black uppercase mb-2">Football Match</h2>
        <div className="flex items-center justify-center gap-4 text-sm font-bold text-neutral-400">
          <span>{match.teamAId}</span>
          <span className="text-[#00ff41]">VS</span>
          <span>{match.teamBId}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <button 
          disabled={loading}
          onClick={() => logEvent({ type: 'goal', teamId: match.teamAId })}
          className="bg-neutral-800 hover:bg-neutral-700 p-4 rounded-xl font-black"
        >
          Team A Goal
        </button>
        <button 
          disabled={loading}
          onClick={() => logEvent({ type: 'goal', teamId: match.teamBId })}
          className="bg-neutral-800 hover:bg-neutral-700 p-4 rounded-xl font-black"
        >
          Team B Goal
        </button>
      </div>

      <button 
        disabled={loading}
        onClick={completeMatch}
        className="w-full bg-[#00ff41] text-black font-black uppercase tracking-wider p-4 rounded-xl hover:bg-[#00cc33] transition-colors"
      >
        Complete Match
      </button>
    </div>
  );
}
