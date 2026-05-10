'use client';
import { useEffect, useState, useRef } from 'react';
import MuxPlayer from '@mux/mux-player-react';
import { Heart, MessageCircle, Share2, Plus, ArrowLeft, Video, Trash2, Eye, Play } from 'lucide-react';
import { Link } from '@/i18n/routing';

type Tab = 'feed' | 'my_reels';

export default function ReelsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [globalReels, setGlobalReels] = useState<any[]>([]);
  const [myReels, setMyReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/reels').then(r => r.json()),
      fetch('/api/reels/me').then(r => r.json())
    ]).then(([global, mine]) => {
      setGlobalReels(Array.isArray(global) ? global : []);
      setMyReels(Array.isArray(mine) ? mine : []);
      setLoading(false);
    });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reel?')) return;
    try {
      await fetch(`/api/reels/${id}`, { method: 'DELETE' });
      setMyReels(prev => prev.filter(r => r.id !== id));
      setGlobalReels(prev => prev.filter(r => r.id !== id));
    } catch (e) {}
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-black text-white overflow-hidden pb-[72px]">
      {/* Header & Tab Switcher */}
      <div className="absolute top-0 left-0 w-full z-50 p-4 pt-6 flex flex-col gap-4 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none">
        
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <Link href="/arena" className="p-2 -ml-2 rounded-full hover:bg-white/10 pointer-events-auto">
            <ArrowLeft size={24} />
          </Link>
          
          {/* Tab Switcher */}
          <div className="flex bg-white/10 backdrop-blur-md rounded-full p-1 pointer-events-auto shadow-lg border border-white/5">
            <button 
              onClick={() => setActiveTab('feed')}
              className={`px-6 py-1.5 rounded-full text-sm font-black transition-all ${activeTab === 'feed' ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
            >
              Feed
            </button>
            <button 
              onClick={() => setActiveTab('my_reels')}
              className={`px-6 py-1.5 rounded-full text-sm font-black transition-all ${activeTab === 'my_reels' ? 'bg-[#00ff41] text-black shadow-[0_0_15px_rgba(0,255,65,0.4)]' : 'text-white/60 hover:text-white'}`}
            >
              My Reels
            </button>
          </div>

          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          TAB: FEED (Global Swiping)
      ═══════════════════════════════════════════════════ */}
      {activeTab === 'feed' && (
        <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory hide-scrollbar">
          {globalReels.map((reel) => (
            <ReelItem key={reel.id} reel={reel} />
          ))}
          {globalReels.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-50 bg-neutral-900 pb-20">
              <p>No reels yet.</p>
              <button onClick={() => setActiveTab('my_reels')} className="mt-4 text-accent font-bold px-6 py-2 border border-accent rounded-full hover:bg-accent hover:text-black transition-colors">Be the first to upload!</button>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB: MY REELS (Profile & Upload)
      ═══════════════════════════════════════════════════ */}
      {activeTab === 'my_reels' && (
        <div className="h-full w-full overflow-y-auto bg-[#0a0a0a] pt-28 px-4 pb-20">
          
          {/* Big Upload Button */}
          <Link href="/interact/reels/upload" className="w-full bg-[#00ff41]/10 border border-[#00ff41]/30 rounded-3xl p-6 flex items-center gap-5 hover:bg-[#00ff41]/20 transition-all shadow-[0_0_20px_rgba(0,255,65,0.05)] mb-8 group active:scale-[0.98]">
            <div className="w-16 h-16 rounded-full bg-[#00ff41] flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(0,255,65,0.4)] shrink-0">
              <Plus size={32} className="text-black" strokeWidth={3} />
            </div>
            <div>
              <h2 className="font-black text-xl text-[#00ff41] uppercase tracking-wide">Upload Highlight</h2>
              <p className="text-xs text-[#00ff41]/70 font-bold mt-1">You have {5 - myReels.length} uploads left this month.</p>
            </div>
          </Link>

          {/* My Uploads Grid */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-white">Your Feed</h3>
              <span className="bg-white/10 text-xs px-2.5 py-1 rounded-full font-bold">{myReels.length}/5 Used</span>
            </div>
            
            {myReels.length === 0 ? (
              <div className="py-16 flex flex-col items-center text-center border border-dashed border-white/10 rounded-3xl bg-white/5">
                <Video size={32} className="text-neutral-600 mb-3" />
                <p className="text-neutral-400 font-bold">No uploads yet</p>
                <p className="text-neutral-600 text-xs mt-1 px-8">Tap the button above to upload your first highlight!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {myReels.map(reel => (
                  <div key={reel.id} className="aspect-[3/4] bg-neutral-900 rounded-2xl overflow-hidden relative group border border-white/5">
                    {reel.status === 'ready' && reel.muxPlaybackId ? (
                      <>
                        <MuxPlayer
                          playbackId={reel.muxPlaybackId}
                          streamType="on-demand"
                          autoPlay={playingId === reel.id}
                          loop
                          muted={false}
                          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                          style={{ '--controls': 'none', '--media-object-fit': 'cover' } as any}
                          nohotkeys
                        />
                        {/* Custom Click Overlay for Play/Pause */}
                        <div 
                          className="absolute inset-0 z-10 cursor-pointer"
                          onClick={() => setPlayingId(playingId === reel.id ? null : reel.id)}
                        />
                        {/* Play Overlay if not playing */}
                        {playingId !== reel.id && (
                          <div 
                            className="absolute inset-0 z-20 bg-black/40 flex items-center justify-center pointer-events-none"
                          >
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xl">
                              <Play size={20} className="text-white ml-1" fill="currentColor" />
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-[#00ff41] p-4 text-center bg-black/80">
                        <div className="w-8 h-8 border-b-2 border-[#00ff41] rounded-full animate-spin mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-wider animate-pulse">Processing</p>
                      </div>
                    )}
                    
                    {/* Actions Overlay */}
                    <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
                      <button onClick={() => handleDelete(reel.id)} className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-red-500 hover:border-red-500 text-white shadow-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t from-black/90 to-transparent pointer-events-none z-10">
                      <p className="text-xs font-bold text-white mb-2 line-clamp-1">{reel.caption}</p>
                      <div className="flex items-center gap-3 text-xs font-black text-white/70">
                        <span className="flex items-center gap-1"><Eye size={12} /> {reel.views}</span>
                        <span className="flex items-center gap-1"><Heart size={12} /> {reel.likes}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ReelItem({ reel }: { reel: any }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPausedByUser, setIsPausedByUser] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsPlaying(entry.isIntersecting);
      },
      { threshold: 0.6 } // Needs to be 60% visible to play
    );

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Sync play/pause with intersection
  useEffect(() => {
    if (!playerRef.current) return;
    
    if (isPlaying && !isPausedByUser) {
      playerRef.current.play()?.catch(() => {});
    } else {
      playerRef.current.pause();
    }
  }, [isPlaying, isPausedByUser]);

  const togglePlay = () => {
    if (isPausedByUser) {
      setIsPausedByUser(false);
      playerRef.current?.play()?.catch(() => {});
    } else {
      setIsPausedByUser(true);
      playerRef.current?.pause();
    }
  };

  return (
    <div ref={containerRef} className="h-full w-full snap-start relative bg-neutral-900 flex items-center justify-center">
      {/* Mux Player */}
      {reel.muxPlaybackId ? (
        <>
          <MuxPlayer
            ref={playerRef}
            playbackId={reel.muxPlaybackId}
            streamType="on-demand"
            loop
            muted={false}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ '--controls': 'none', '--media-object-fit': 'cover' } as any}
            nohotkeys
            onTimeUpdate={(e) => {
              const el = e.target as HTMLVideoElement;
              if (el.duration) {
                setProgress((el.currentTime / el.duration) * 100);
              }
            }}
          />
          {/* Click layer to toggle play/pause without native controls */}
          <div 
            className="absolute inset-0 z-10 cursor-pointer" 
            onClick={togglePlay}
          />
          {/* Big Play Button if paused by user */}
          {isPausedByUser && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none bg-black/20">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xl scale-in">
                <Play size={32} className="text-white ml-2" fill="currentColor" />
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col gap-4 items-center justify-center text-neutral-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-500"></div>
          Processing Video...
        </div>
      )}

      {/* Overlay UI */}
      <div className="absolute bottom-0 left-0 w-full p-4 pt-32 bg-gradient-to-t from-black via-black/50 to-transparent flex items-end justify-between z-10 pointer-events-none">
        
        {/* Info (Left) */}
        <div className="flex-1 mr-10 pointer-events-auto">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-accent/20 overflow-hidden flex items-center justify-center border border-accent">
              {reel.player?.avatarUrl ? (
                <img src={reel.player.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-accent font-black text-xs">{(reel.player?.fullName || 'U').slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <span className="font-black text-sm drop-shadow-md">@{reel.player?.fullName || 'Unknown'}</span>
          </div>
          <p className="text-sm text-white/90 drop-shadow-md">{reel.caption}</p>
        </div>

        {/* Actions (Right) */}
        <div className="flex flex-col gap-6 items-center pointer-events-auto">
          <button className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <Heart size={24} className="text-white group-hover:text-red-500 transition-colors" />
            </div>
            <span className="text-xs font-bold drop-shadow-md">{reel.likes}</span>
          </button>
          
          <button className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <MessageCircle size={24} className="text-white" />
            </div>
            <span className="text-xs font-bold drop-shadow-md">0</span>
          </button>

          <button className="flex flex-col items-center gap-1 group">
            <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <Share2 size={24} className="text-white" />
            </div>
            <span className="text-xs font-bold drop-shadow-md">Share</span>
          </button>
        </div>
      </div>

      {/* TikTok Style Progress Bar */}
      {reel.muxPlaybackId && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20 z-20">
          <div 
            className="h-full bg-accent transition-all duration-100 ease-linear" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      )}

    </div>
  );
}
