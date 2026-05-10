'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Trophy, Users, Gavel, Wifi, WifiOff, Timer,
  ChevronUp, Star, Crown, AlertCircle, CheckCircle2, Loader2,
  Zap
} from 'lucide-react';

interface AuctionState {
  id: string;
  status: 'WAITING' | 'LIVE' | 'PAUSED' | 'COMPLETED';
  currentPlayerId: string | null;
  currentBasePrice: number | null;
  currentHighestBid: number | null;
  currentHighestBidderId: string | null;
  bidTimerSeconds: number;
  bids: Array<{ captainId: string; amount: number; timestamp: string }>;
}

interface PlayerInfo {
  id: string;
  name: string;
  avatar?: string;
  rating?: number;
}

export default function AuctionRoomPage() {
  const { id: tournamentId } = useParams();
  const pathname = usePathname();
  const locale = pathname.split('/')[1] || 'en';

  const [room, setRoom] = useState<AuctionState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerInfo | null>(null);
  const [teamBudget, setTeamBudget] = useState(1000); // TODO: Fetch from captain's team
  const [myBid, setMyBid] = useState('');
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [bidLoading, setBidLoading] = useState(false);
  const [lastEvent, setLastEvent] = useState<string>('');
  const [timer, setTimer] = useState<number>(0);
  const [soldFlash, setSoldFlash] = useState<{ type: 'SOLD' | 'UNSOLD'; player?: string } | null>(null);
  const channelRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch initial room state
  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/auction`);
      const data = await res.json();
      if (data.success) {
        setRoom(data.data);
        if (data.data.bidTimerSeconds) setTimer(data.data.bidTimerSeconds);
      }
    } catch (e) {
      console.error('Failed to fetch auction room', e);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  // Set up Supabase Realtime subscription
  useEffect(() => {
    if (!tournamentId) return;

    const channel = supabase
      .channel(`auction:${tournamentId}`)
      .on('broadcast', { event: 'auction:next_player' }, ({ payload }) => {
        setLastEvent(`🏏 New player up: ${payload.playerId}`);
        setTimer(payload.timer || 30);
        setRoom(prev => prev ? {
          ...prev,
          status: 'LIVE',
          currentPlayerId: payload.playerId,
          currentBasePrice: payload.basePrice,
          currentHighestBid: payload.basePrice,
          currentHighestBidderId: null
        } : prev);
        setSoldFlash(null);
        startTimer(payload.timer || 30);
      })
      .on('broadcast', { event: 'auction:new_bid' }, ({ payload }) => {
        setLastEvent(`💰 Bid: ${payload.amount} coins by ${payload.captainId.slice(0, 6)}...`);
        setRoom(prev => prev ? {
          ...prev,
          currentHighestBid: payload.newHighestBid,
          currentHighestBidderId: payload.newHighestBidderId
        } : prev);
        // Reset timer on new bid
        startTimer(30);
      })
      .on('broadcast', { event: 'auction:sold' }, ({ payload }) => {
        setLastEvent(`🔨 SOLD! ${payload.playerId} → ${payload.soldTo} for ${payload.amount} coins`);
        setSoldFlash({ type: 'SOLD', player: payload.playerId });
        stopTimer();
        setTimeout(() => setSoldFlash(null), 3000);
      })
      .on('broadcast', { event: 'auction:unsold' }, ({ payload }) => {
        setLastEvent(`⛔ UNSOLD: ${payload.playerId}`);
        setSoldFlash({ type: 'UNSOLD', player: payload.playerId });
        stopTimer();
        setTimeout(() => setSoldFlash(null), 3000);
      })
      .on('broadcast', { event: 'auction:control' }, ({ payload }) => {
        setLastEvent(`📢 Auction ${payload.action}`);
        setRoom(prev => prev ? { ...prev, status: payload.newStatus } : prev);
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const startTimer = useCallback((seconds: number) => {
    stopTimer();
    setTimer(seconds);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const placeBid = async () => {
    if (!room?.id || !myBid) return;
    const amount = parseInt(myBid, 10);
    if (isNaN(amount) || amount <= 0) return;

    setBidLoading(true);
    try {
      const res = await fetch(`/api/auction/${room.id}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ captainId: 'me', amount }) // TODO: use real captain ID
      });
      const data = await res.json();
      if (data.success) {
        setMyBid('');
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBidLoading(false);
    }
  };

  const quickBid = (increment: number) => {
    const current = room?.currentHighestBid ?? room?.currentBasePrice ?? 0;
    setMyBid(String(current + increment));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="animate-spin text-yellow-400 w-12 h-12" />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
        <Gavel size={56} className="text-neutral-700 mb-4" />
        <h2 className="text-2xl font-black mb-2">Auction Not Found</h2>
        <p className="text-neutral-500 font-bold">The auction room for this tournament doesn't exist yet.</p>
      </div>
    );
  }

  const minNextBid = (room.currentHighestBid ?? room.currentBasePrice ?? 0) + 10;
  const timerPercent = room.bidTimerSeconds > 0 ? (timer / room.bidTimerSeconds) * 100 : 0;
  const timerColor = timer > 10 ? '#00ff41' : timer > 5 ? '#f59e0b' : '#ef4444';

  return (
    <div className="min-h-screen bg-[#060606] text-white flex flex-col overflow-hidden">

      {/* ── SOLD / UNSOLD Flash Overlay ── */}
      {soldFlash && (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center pointer-events-none transition-opacity ${soldFlash ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`px-16 py-10 rounded-3xl font-black text-6xl uppercase tracking-widest shadow-2xl animate-bounce ${
            soldFlash.type === 'SOLD'
              ? 'bg-[#00ff41] text-black'
              : 'bg-red-600 text-white'
          }`}>
            {soldFlash.type === 'SOLD' ? '🔨 SOLD!' : '⛔ UNSOLD'}
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="bg-black/80 backdrop-blur-md border-b border-white/5 px-5 py-4 flex items-center justify-between shrink-0 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
            <Gavel size={18} className="text-yellow-400" />
          </div>
          <div>
            <h1 className="font-black text-base uppercase tracking-wider">Auction Room</h1>
            <span className={`text-[10px] font-black uppercase tracking-widest ${
              room.status === 'LIVE' ? 'text-[#00ff41]' :
              room.status === 'COMPLETED' ? 'text-neutral-500' :
              'text-yellow-400'
            }`}>
              {room.status === 'LIVE' ? '🔴 LIVE' : room.status === 'WAITING' ? '⏳ Waiting' : room.status === 'COMPLETED' ? '✅ Ended' : '⏸ Paused'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs font-bold ${connected ? 'text-[#00ff41]' : 'text-red-400'}`}>
            {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span>{connected ? 'Live' : 'Offline'}</span>
          </div>
          <div className="bg-neutral-900 border border-white/10 rounded-full px-3 py-1.5 text-xs font-black text-yellow-400">
            ৳ {teamBudget.toLocaleString()}
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Timer Bar ── */}
        {room.status === 'LIVE' && (
          <div className="relative h-2 bg-neutral-900 shrink-0">
            <div
              className="absolute left-0 top-0 h-full transition-all duration-1000 ease-linear"
              style={{ width: `${timerPercent}%`, backgroundColor: timerColor }}
            />
          </div>
        )}

        {/* ── Current Player Spotlight ── */}
        <div className="relative bg-gradient-to-br from-yellow-950/40 via-[#060606] to-[#060606] px-6 pt-8 pb-6 border-b border-white/5 shrink-0">
          {/* Background glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 rounded-full bg-yellow-500/5 blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center">
            {room.status === 'WAITING' && (
              <>
                <Trophy size={56} className="text-yellow-400/30 mb-4" />
                <h2 className="text-2xl font-black text-white/40 uppercase tracking-widest">Waiting to Start</h2>
                <p className="text-sm text-neutral-500 mt-2">The organizer will begin the auction shortly</p>
              </>
            )}

            {room.status === 'PAUSED' && !room.currentPlayerId && (
              <>
                <Gavel size={56} className="text-yellow-400/30 mb-4" />
                <h2 className="text-2xl font-black text-white/40 uppercase tracking-widest">Next Player Soon</h2>
                <p className="text-sm text-neutral-500 mt-2">Organizer is selecting the next player</p>
              </>
            )}

            {room.status === 'COMPLETED' && (
              <>
                <CheckCircle2 size={56} className="text-[#00ff41] mb-4" />
                <h2 className="text-2xl font-black text-white uppercase tracking-widest">Auction Complete</h2>
                <p className="text-sm text-neutral-400 mt-2">All players have been assigned to their teams</p>
              </>
            )}

            {(room.status === 'LIVE' || (room.status === 'PAUSED' && room.currentPlayerId)) && (
              <>
                {/* Player Avatar */}
                <div className={`relative mb-6 ${room.status === 'LIVE' ? 'animate-pulse-slow' : ''}`}>
                  <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center text-5xl bg-neutral-800 shadow-2xl ${
                    room.status === 'LIVE'
                      ? 'border-yellow-400 shadow-[0_0_40px_rgba(234,179,8,0.4)]'
                      : 'border-neutral-700'
                  }`}>
                    {currentPlayer?.avatar ? (
                      <img src={currentPlayer.avatar} className="w-full h-full rounded-full object-cover" alt="" />
                    ) : (
                      <span>👤</span>
                    )}
                  </div>
                  {room.status === 'LIVE' && (
                    <div className="absolute -top-2 -right-2 bg-red-500 rounded-full w-7 h-7 flex items-center justify-center">
                      <Zap size={14} className="text-white" fill="currentColor" />
                    </div>
                  )}
                </div>

                <h2 className="text-3xl font-black text-white mb-1 uppercase tracking-wide">
                  {currentPlayer?.name || room.currentPlayerId?.slice(0, 12)}
                </h2>

                {/* Timer */}
                {room.status === 'LIVE' && timer > 0 && (
                  <div className={`flex items-center gap-2 mt-2 mb-4 font-black text-2xl`} style={{ color: timerColor }}>
                    <Timer size={22} />
                    <span>{timer}s</span>
                  </div>
                )}

                {/* Base & Current Bid */}
                <div className="flex gap-8 mt-4">
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-1">Base Price</p>
                    <p className="text-xl font-black text-neutral-300">৳ {(room.currentBasePrice || 0).toLocaleString()}</p>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400/60 mb-1">Current Bid</p>
                    <p className="text-3xl font-black text-yellow-400">৳ {(room.currentHighestBid || room.currentBasePrice || 0).toLocaleString()}</p>
                  </div>
                </div>

                {room.currentHighestBidderId && (
                  <div className="mt-3 flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-4 py-2">
                    <Crown size={14} className="text-yellow-400" />
                    <span className="text-xs font-black text-yellow-300">
                      Highest: {room.currentHighestBidderId.slice(0, 12)}...
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── Bidding Interface ── */}
        {room.status === 'LIVE' && (
          <div className="px-4 py-5 border-b border-white/5 shrink-0 bg-black/40">
            {/* Quick bid buttons */}
            <div className="flex gap-3 mb-4">
              {[10, 25, 50, 100].map(inc => (
                <button
                  key={inc}
                  onClick={() => quickBid(inc)}
                  className="flex-1 py-3 bg-neutral-900 border border-white/10 hover:border-yellow-500/50 rounded-xl font-black text-sm transition-all hover:text-yellow-400 active:scale-95"
                >
                  +{inc}
                </button>
              ))}
            </div>

            {/* Manual bid input */}
            <div className="flex gap-3">
              <div className="flex-1 bg-neutral-900 border border-white/10 rounded-2xl flex items-center overflow-hidden focus-within:border-yellow-500/50 transition-colors">
                <span className="px-4 text-yellow-400 font-black text-lg">৳</span>
                <input
                  type="number"
                  value={myBid}
                  onChange={e => setMyBid(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && placeBid()}
                  placeholder={`Min ${minNextBid}`}
                  className="flex-1 bg-transparent text-white font-black text-lg py-4 outline-none pr-4"
                  min={minNextBid}
                />
              </div>
              <button
                onClick={placeBid}
                disabled={bidLoading || !myBid || parseInt(myBid) < minNextBid}
                className="bg-yellow-500 text-black font-black uppercase tracking-wider px-6 rounded-2xl hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2"
              >
                {bidLoading ? <Loader2 size={18} className="animate-spin" /> : <><Gavel size={18} /> BID</>}
              </button>
            </div>

            {parseInt(myBid || '0') > teamBudget && (
              <p className="text-xs text-red-400 font-bold mt-2 flex items-center gap-1">
                <AlertCircle size={14} /> Insufficient budget
              </p>
            )}
          </div>
        )}

        {/* ── Live Feed / Bid History ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-3">Live Feed</h3>

          {lastEvent && (
            <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-3 mb-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />
              <p className="text-sm font-bold text-yellow-200">{lastEvent}</p>
            </div>
          )}

          {room.bids.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center">
              <Gavel size={36} className="text-neutral-800 mb-3" />
              <p className="text-neutral-600 font-bold text-sm">No bids yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {room.bids.slice(0, 15).map((bid, i) => (
                <div key={i} className="flex items-center justify-between bg-neutral-900/60 border border-white/5 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-black text-neutral-400">
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{bid.captainId.slice(0, 12)}...</p>
                      <p className="text-[10px] text-neutral-500 font-bold">
                        {new Date(bid.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-yellow-400 font-black">
                    <ChevronUp size={14} />
                    <span>৳ {bid.amount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
