'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// ─── Payload shape ─────────────────────────────────────────────────────────────

export interface MatchResultPayload {
  outcome       : 'win' | 'loss' | 'draw';
  sportType     : string;        // 'CRICKET_7' | 'FUTSAL_5' | 'FOOTBALL_FULL' | ...
  victoryString : string;        // e.g. "Ura Dhura won by 3 Wickets"
  myTeamName    : string;
  oppTeamName   : string;
  myScore       : number;
  oppScore      : number;
  myWickets     ?: number | null;  // Cricket only
  oppWickets    ?: number | null;
  myOvers       ?: number | null;
  oppOvers      ?: number | null;
  mmrDelta      : number;          // signed: +40, -40, +80
  currentMmr    : number;          // MMR *after* the change applied
  matchId       : string;
  onDismissPath?: string;          // custom redirect path on dismiss
}

// ─── Context type ──────────────────────────────────────────────────────────────

interface MatchResultContextType {
  result         : MatchResultPayload | null;
  showMatchResult: (payload: MatchResultPayload) => void;
  clearResult    : () => void;
}

// ─── Context + hook ────────────────────────────────────────────────────────────

const MatchResultContext = createContext<MatchResultContextType>({
  result         : null,
  showMatchResult: () => {},
  clearResult    : () => {},
});

export function useMatchResult() {
  return useContext(MatchResultContext);
}

// ─── Provider ──────────────────────────────────────────────────────────────────

export function MatchResultProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<MatchResultPayload | null>(null);

  const showMatchResult = useCallback((payload: MatchResultPayload) => {
    setResult(payload);
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  return (
    <MatchResultContext.Provider value={{ result, showMatchResult, clearResult }}>
      {children}
    </MatchResultContext.Provider>
  );
}
