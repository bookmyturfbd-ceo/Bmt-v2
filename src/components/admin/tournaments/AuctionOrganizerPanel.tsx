'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  Gavel, SkipForward, Pause, Play, Square,
  ChevronRight, Users, Loader2, Crown, Timer, Zap,
  AlertTriangle, CheckCircle2
} from 'lucide-react';

interface AuctionRoom {
  id: string;
  status: 'WAITING' | 'LIVE' | 'PAUSED' | 'COMPLETED';
  currentPlayerId: string | null;
  currentBasePrice: number | null;
  currentHighestBid: number | null;
  currentHighestBidderId: string | null;
  bidTimerSeconds: number;
}

interface Registration {
  id: string;
  entityId: string; // player ID
  status: 'PENDING' | 'APPROVED';
  entryFeePaid: boolean;
}

export default function AuctionOrganizerPanel({ tournamentId }: { tournamentId: string }) {
  const [room, setRoom] = useState<AuctionRoom | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [nextPlayerId, setNextPlayerId] = useState('');
  const [basePrice, setBasePrice] = useState(100);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<any>(null);

  const fetchData = useCallback(async () => {
    try {
      const [roomRes, regRes] = await Promise.all([
        fetch(`/api/tournaments/${tournamentId}/auction`),
        fetch(`/api/tournaments/${tournamentId}/registrations`)
      ]);
      const roomData = await roomRes.json();
      const regData = await regRes.json();
      if (roomData.success) setRoom(roomData.data);
      if (regData.success) setRegistrations(regData.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen to own broadcast to sync state
  useEffect(() => {
    const channel = supabase
      .channel(`auction:${tournamentId}:organizer`)
      .on('broadcast', { event: 'auction:new_bid' }, ({ payload }) => {
        setRoom(prev => prev ? {
          ...prev,
          currentHighestBid: payload.newHighestBid,
          currentHighestBidderId: payload.newHighestBidderId
        } : prev);
        // Reset timer on new bid
        if (room) startTimer(room.bidTimerSeconds);
      })
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [tournamentId]);

  const startTimer = (seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(seconds);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const callNextPlayer = async () => {
    if (!room || !nextPlayerId) return;
    setActionLoading(true);
    try {
      await fetch(`/api/auction/${room.id}/next-player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: nextPlayerId, basePrice })
      });
      startTimer(room.bidTimerSeconds);
      setRoom(prev => prev ? {
        ...prev,
        status: 'LIVE',
        currentPlayerId: nextPlayerId,
        currentBasePrice: basePrice,
        currentHighestBid: basePrice,
        currentHighestBidderId: null
      } : prev);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const hammerSold = async () => {
    if (!room) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/auction/${room.id}/sold`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        // Mark player as sold in registrations list
        setRegistrations(prev => prev.map(r =>
          r.entityId === room.currentPlayerId ? { ...r, status: 'APPROVED' } : r
        ));
        setRoom(prev => prev ? { ...prev, status: 'PAUSED' } : prev);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const controlAuction = async (action: string) => {
    if (!room) return;
    setActionLoading(true);
    try {
      await fetch(`/api/auction/${room.id}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const initAuction = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/auction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidTimerSeconds: 30 })
      });
      const data = await res.json();
      if (data.success) setRoom(data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const unsoldPlayers = registrations.filter(r => r.status === 'PENDING');
  const soldPlayers = registrations.filter(r => r.status === 'APPROVED');

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-yellow-400" /></div>;
  }

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black uppercase tracking-wider">Auction Control</h2>
          <p className="text-sm text-neutral-400 font-bold mt-0.5">
            {soldPlayers.length} sold · {unsoldPlayers.length} remaining
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!room && (
            <button
              onClick={initAuction}
              disabled={actionLoading}
              className="bg-yellow-500 text-black font-black uppercase tracking-wider px-5 py-2.5 rounded-xl text-sm hover:bg-yellow-400 transition-colors flex items-center gap-2"
            >
              <Gavel size={16} /> Open Auction Room
            </button>
          )}
          {room && room.status !== 'COMPLETED' && (
            <button
              onClick={() => controlAuction('end')}
              disabled={actionLoading}
              className="bg-red-500/20 text-red-400 border border-red-500/30 font-black uppercase tracking-wider px-4 py-2 rounded-xl text-sm hover:bg-red-500/30 transition-colors flex items-center gap-2"
            >
              <Square size={14} fill="currentColor" /> End Auction
            </button>
          )}
        </div>
      </div>

      {room && (
        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">

          {/* Left: Current Player + Control */}
          <div className="flex flex-col gap-4 lg:w-80 shrink-0">

            {/* Current Lot */}
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-6 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400/60 mb-4">Current Lot</p>

              {room.status === 'LIVE' ? (
                <>
                  <div className="w-20 h-20 rounded-full bg-neutral-800 border-2 border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.4)] flex items-center justify-center text-3xl mx-auto mb-4">
                    👤
                  </div>
                  <p className="font-black text-lg text-white">{room.currentPlayerId?.slice(0, 16)}</p>
                  <div className="flex justify-center gap-6 mt-4 text-sm font-bold">
                    <div className="text-center">
                      <p className="text-neutral-500 text-xs uppercase tracking-widest">Base</p>
                      <p className="text-white text-xl font-black">৳{room.currentBasePrice}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-yellow-400/60 text-xs uppercase tracking-widest">Top Bid</p>
                      <p className="text-yellow-400 text-2xl font-black">৳{room.currentHighestBid}</p>
                    </div>
                  </div>
                  {room.currentHighestBidderId && (
                    <div className="mt-3 flex items-center justify-center gap-2 text-xs text-yellow-300 font-black">
                      <Crown size={14} className="text-yellow-400" />
                      {room.currentHighestBidderId.slice(0, 12)}...
                    </div>
                  )}

                  <div className={`mt-4 text-4xl font-black ${timer <= 5 ? 'text-red-400 animate-pulse' : timer <= 10 ? 'text-yellow-400' : 'text-[#00ff41]'}`}>
                    {timer}s
                  </div>
                </>
              ) : (
                <div className="py-6 flex flex-col items-center">
                  <Gavel size={40} className="text-yellow-400/20 mb-3" />
                  <p className="text-sm text-neutral-500 font-bold">
                    {room.status === 'COMPLETED' ? 'Auction Ended' : 'Select next player →'}
                  </p>
                </div>
              )}
            </div>

            {/* Hammer Controls */}
            {room.status === 'LIVE' && (
              <button
                onClick={hammerSold}
                disabled={actionLoading}
                className="w-full bg-[#00ff41] text-black font-black uppercase tracking-widest text-xl py-5 rounded-2xl hover:bg-white transition-colors flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(0,255,65,0.3)] active:scale-[0.98]"
              >
                <Gavel size={24} /> SOLD
              </button>
            )}
          </div>

          {/* Right: Player Pool */}
          <div className="flex-1 flex flex-col min-h-0 bg-neutral-900 border border-white/5 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-white/5 shrink-0 flex items-center justify-between">
              <h3 className="font-black uppercase tracking-widest text-sm">Player Pool</h3>
              <span className="text-xs font-bold text-neutral-400">{unsoldPlayers.length} remaining</span>
            </div>

            {/* Next Player Selector */}
            {room.status !== 'LIVE' && room.status !== 'COMPLETED' && (
              <div className="p-4 border-b border-white/5 shrink-0 bg-black/20">
                <div className="flex gap-3">
                  <select
                    value={nextPlayerId}
                    onChange={e => setNextPlayerId(e.target.value)}
                    className="flex-1 bg-neutral-800 border border-white/10 rounded-xl px-3 py-2.5 font-bold text-sm"
                  >
                    <option value="">Select player to call up...</option>
                    {unsoldPlayers.map(r => (
                      <option key={r.id} value={r.entityId}>{r.entityId.slice(0, 20)}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={basePrice}
                    onChange={e => setBasePrice(parseInt(e.target.value))}
                    className="w-28 bg-neutral-800 border border-white/10 rounded-xl px-3 py-2.5 font-bold text-sm"
                    placeholder="Base ৳"
                    min={10}
                  />
                  <button
                    onClick={callNextPlayer}
                    disabled={actionLoading || !nextPlayerId}
                    className="bg-yellow-500 text-black font-black px-5 rounded-xl hover:bg-yellow-400 disabled:opacity-40 transition-colors flex items-center gap-2 shrink-0"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <><Gavel size={16} /> Call Up</>}
                  </button>
                </div>
              </div>
            )}

            {/* Players Grid */}
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 content-start">
              {registrations.map(reg => {
                const isCurrent = reg.entityId === room.currentPlayerId;
                const isSold = reg.status === 'APPROVED';
                return (
                  <div
                    key={reg.id}
                    className={`relative rounded-xl p-4 flex flex-col transition-all border ${
                      isCurrent ? 'border-yellow-400 bg-yellow-500/10 shadow-[0_0_20px_rgba(234,179,8,0.2)]' :
                      isSold ? 'border-[#00ff41]/20 bg-[#00ff41]/5 opacity-60' :
                      'border-white/5 bg-neutral-800/50'
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute top-2 right-2 bg-yellow-400 text-black text-[9px] font-black uppercase rounded-full px-2 py-0.5">
                        On Stage
                      </div>
                    )}
                    {isSold && (
                      <CheckCircle2 size={16} className="absolute top-2 right-2 text-[#00ff41]" />
                    )}
                    <div className="w-10 h-10 rounded-full bg-neutral-700 flex items-center justify-center text-lg mb-3">
                      👤
                    </div>
                    <p className="text-sm font-black text-white truncate">{reg.entityId.slice(0, 16)}</p>
                    <p className={`text-[10px] font-black uppercase mt-0.5 ${
                      isSold ? 'text-[#00ff41]' : 'text-neutral-500'
                    }`}>
                      {isSold ? 'SOLD' : 'Unsold'}
                    </p>
                  </div>
                );
              })}

              {registrations.length === 0 && (
                <div className="col-span-full py-16 text-center flex flex-col items-center">
                  <Users size={40} className="text-neutral-700 mb-3" />
                  <p className="text-neutral-500 font-bold text-sm">No registered players yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
