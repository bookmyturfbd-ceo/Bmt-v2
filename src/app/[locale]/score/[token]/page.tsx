'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import CricketScorer from './components/CricketScorer';
import FootballScorer from './components/FootballScorer';

export default function ScorerTokenPage() {
  const { token } = useParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [match, setMatch] = useState<any>(null);

  useEffect(() => {
    if (!token) return;

    async function fetchMatch() {
      try {
        const res = await fetch(`/api/score/\${token}`);
        const data = await res.json();

        if (!data.success) {
          setError(data.error || 'Invalid or expired token');
          return;
        }

        setMatch(data.data);
      } catch (err: any) {
        setError(err.message || 'Failed to validate token');
      } finally {
        setLoading(false);
      }
    }

    fetchMatch();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#00ff41]" />
        <span className="ml-3 font-black tracking-widest uppercase">Validating Token...</span>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
        <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-2xl max-w-md w-full text-center">
          <h1 className="text-2xl font-black text-red-500 mb-4 uppercase tracking-wider">Access Denied</h1>
          <p className="text-neutral-400 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 rounded-xl transition-all"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header bar */}
      <div className="bg-neutral-900 border-b border-white/5 p-4 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="font-black uppercase tracking-wider text-sm text-[#00ff41]">
            {match.tournament.name}
          </h1>
          <p className="text-xs text-neutral-400 font-bold">
            Match #{match.matchNumber} • {match.stage}
          </p>
        </div>
        <div className="text-right">
          <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
            Official Scorer
          </span>
        </div>
      </div>

      {/* Render appropriate scorer interface */}
      {match.tournament.sport === 'CRICKET' ? (
        <CricketScorer match={match} />
      ) : (
        <FootballScorer match={match} />
      )}
    </div>
  );
}
