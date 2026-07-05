'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Play, User, LogOut, CheckCircle, RefreshCw, Loader2 } from 'lucide-react';

export default function TestInteractPage() {
  const router = useRouter();
  const { locale } = useParams() as { locale: string };
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [currentSimUser, setCurrentSimUser] = useState<string | null>(null);

  const runSetup = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/dev/setup-test-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup' }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ Test Match set up successfully! Match ID: ${data.matchId}`);
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch {
      setMessage('❌ Network error');
    }
    setLoading(false);
  };

  const loginAs = async (player: 'a' | 'b') => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/dev/setup-test-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: player === 'a' ? 'login_a' : 'login_b' }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentSimUser(player === 'a' ? 'Challenger Player A' : 'Opponent Player B');
        setMessage(`✅ Logged in as ${player === 'a' ? 'Player A' : 'Player B'}`);
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch {
      setMessage('❌ Network error');
    }
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/dev/setup-test-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      if (res.ok) {
        setCurrentSimUser(null);
        setMessage('✅ Logged out successfully');
      } else {
        setMessage('❌ Logout failed');
      }
    } catch {
      setMessage('❌ Network error');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] text-white font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-white/5 rounded-3xl p-6 shadow-2xl shadow-purple-950/20 backdrop-blur-md">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-400 mb-3">
            <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
          </div>
          <h1 className="text-xl font-black tracking-tight">Interaction Board Test Suite</h1>
          <p className="text-xs text-neutral-500 mt-1">Easily seed test data and simulate match interactions.</p>
        </div>

        {/* Console Message */}
        {message && (
          <div className={`p-3.5 rounded-2xl mb-5 text-xs font-bold border transition-all ${
            message.startsWith('✅') 
              ? 'bg-[#00ff41]/5 border-[#00ff41]/20 text-[#00ff41]' 
              : 'bg-red-500/5 border-red-500/20 text-red-400'
          }`}>
            {message}
          </div>
        )}

        {/* Steps */}
        <div className="flex flex-col gap-4">
          {/* Step 1: Create Match */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Step 1: Database Setup</p>
            <button
              onClick={runSetup}
              disabled={loading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Initialize / Reset Test Match
            </button>
          </div>

          {/* Step 2: Choose Player Identity */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Step 2: Simulate Login</p>
            {currentSimUser && (
              <p className="text-xs font-semibold text-amber-400 mb-3 flex items-center gap-1.5">
                <User size={12} /> Active Identity: <span className="underline">{currentSimUser}</span>
              </p>
            )}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <button
                onClick={() => loginAs('a')}
                disabled={loading}
                className="py-2.5 bg-neutral-800 border border-white/10 hover:border-amber-500/30 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
              >
                <User size={13} />
                As Challenger A
              </button>
              <button
                onClick={() => loginAs('b')}
                disabled={loading}
                className="py-2.5 bg-neutral-800 border border-white/10 hover:border-amber-500/30 text-white font-black text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
              >
                <User size={13} />
                As Opponent B
              </button>
            </div>
            {currentSimUser && (
              <button
                onClick={logout}
                disabled={loading}
                className="w-full py-2 bg-red-950/40 border border-red-500/20 hover:bg-red-900/30 text-red-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
              >
                <LogOut size={12} />
                Clear Active Identity
              </button>
            )}
          </div>

          {/* Step 3: Launch Interaction Board */}
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
            <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Step 3: Go to Board</p>
            <button
              onClick={() => router.push(`/${locale}/interact/match/dummy_match_id`)}
              className="w-full py-3.5 bg-white text-black hover:bg-neutral-200 text-sm font-black rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-white/5"
            >
              <Play size={16} fill="black" />
              Open Match Interaction Board
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
