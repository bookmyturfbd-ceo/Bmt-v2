'use client';
import { useEffect, useState } from 'react';
import { useMatchResult } from '@/context/MatchResultContext';

export default function SplashScreen() {
  const [show, setShow] = useState(true);
  const [fade, setFade] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { showMatchResult } = useMatchResult();

  // After splash completes (or is skipped), check for any unseen match results
  const checkPendingResult = async () => {
    try {
      const res = await fetch('/api/interact/pending-result');
      const data = await res.json();
      if (data.result) {
        showMatchResult(data.result);
      }
    } catch {
      // silent fail — not critical
    }
  };

  useEffect(() => {
    setMounted(true);
    const hasPlayed = sessionStorage.getItem('bmt_splash_played');
    if (hasPlayed) {
      setShow(false);
      // Still check for pending result even if splash was skipped
      checkPendingResult();
      return;
    }

    // Start fade out at 800ms
    const fadeTimer = setTimeout(() => {
      setFade(true);
    }, 800);

    // Remove from DOM at 1200ms, then check for pending result
    const removeTimer = setTimeout(() => {
      setShow(false);
      sessionStorage.setItem('bmt_splash_played', 'true');
      checkPendingResult();
    }, 1200);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent hydration mismatch (don't render on server)
  if (!mounted || !show) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center transition-opacity duration-300 ease-in-out ${fade ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <div className={`relative flex flex-col items-center justify-center transition-all duration-700 ease-out ${fade ? 'scale-110 blur-sm' : 'scale-100'}`}>
        <img 
          src="/bmt-logo.png" 
          alt="Book My Turf" 
          className="h-20 object-contain drop-shadow-[0_0_30px_rgba(0,255,65,0.4)]" 
        />
        <div className="absolute inset-0 bg-accent/20 blur-[50px] rounded-full scale-150 animate-pulse" />
      </div>
    </div>
  );
}
