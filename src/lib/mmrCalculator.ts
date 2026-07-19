/**
 * BMT MMR Calculator v2
 *
 * TEAM  : Win +80 / Loss -40 / Draw +40 (50/50 split: 80÷2)
 * PLAYER: Win +70 / Loss -40 / Draw +35 (50/50 split: 70÷2)
 * BADGE : MVP +20 / any other badge +10 (applied after OMC distributes badges)
 */

import { getSportMmrField, badgeBonus as getBadgeBonus } from './rankUtils';

export type SportType = 'FUTSAL_5' | 'FUTSAL_6' | 'FUTSAL_7' | 'CRICKET_7' | 'FOOTBALL_FULL' | 'CRICKET_FULL';

// ─── Constants ────────────────────────────────────────────────────────────────

export const TEAM_WIN_MMR   =  80;
export const TEAM_LOSS_MMR  = -40;
export const TEAM_DRAW_MMR  =  40;  // 50/50 split of Win: 80÷2

export const PLAYER_WIN_BASE  =  70;
export const PLAYER_LOSS_BASE = -40;
export const PLAYER_DRAW_BASE =  35;  // 50/50 split of Win: 70÷2

// ─── Team MMR ─────────────────────────────────────────────────────────────────

export interface TeamMMRResult {
  mmrChangeA : number;
  mmrChangeB : number;
  /** Which DB field to increment based on sport */
  mmrField   : 'footballMmr' | 'cricketMmr';
}

export function calcTeamMMR(
  teamAId  : string,
  teamBId  : string,
  winnerId : string | null,
  sportType: SportType,
  teamAMmr : number = 1000,
  teamBMmr : number = 1000,
  isProvisional: boolean = false,
): TeamMMRResult & { multA: number; multB: number } {
  let baseChangeA = 0;
  let baseChangeB = 0;

  if (winnerId === teamAId)      { baseChangeA =  TEAM_WIN_MMR; baseChangeB = TEAM_LOSS_MMR; }
  else if (winnerId === teamBId) { baseChangeA = TEAM_LOSS_MMR; baseChangeB =  TEAM_WIN_MMR; }
  else                           { baseChangeA = TEAM_DRAW_MMR; baseChangeB = TEAM_DRAW_MMR; }

  let multA = 1.0;
  let multB = 1.0;

  // Draws are flat (no scaling), as are placement matches
  if (winnerId !== null && !isProvisional) {
    const diffA = teamBMmr - teamAMmr;
    const diffB = teamAMmr - teamBMmr;

    if (winnerId === teamAId) {
      multA = diffA >= 200 ? 1.5 : diffA <= -200 ? 0.5 : 1.0;
      multB = diffB >= 200 ? 0.5 : diffB <= -200 ? 1.5 : 1.0;
    } else if (winnerId === teamBId) {
      multA = diffA >= 200 ? 0.5 : diffA <= -200 ? 1.5 : 1.0;
      multB = diffB >= 200 ? 1.5 : diffB <= -200 ? 0.5 : 1.0;
    }
  }

  return {
    mmrChangeA: Math.round(baseChangeA * multA),
    mmrChangeB: Math.round(baseChangeB * multB),
    mmrField: getSportMmrField(sportType),
    multA,
    multB,
  };
}

// ─── Player base MMR (applied at signoff for every roster player) ─────────────

export interface PlayerBaseMMRInput {
  playerId : string;
  teamId   : string;
}

export interface PlayerBaseMMRResult {
  playerId   : string;
  mmrChange  : number;
  mmrField   : 'footballMmr' | 'cricketMmr';
}

export function calcPlayerBaseMMR(
  input    : PlayerBaseMMRInput[],
  winnerId : string | null,
  sportType: SportType,
  teamAId  : string,
  multA    : number = 1.0,
  multB    : number = 1.0,
  playedPlayerIds?: string[], // Gating!
): PlayerBaseMMRResult[] {
  const mmrField = getSportMmrField(sportType);
  return input.map(p => {
    // Participation check: unplayed bench players get 0 MMR change
    if (playedPlayerIds && !playedPlayerIds.includes(p.playerId)) {
      return { playerId: p.playerId, mmrChange: 0, mmrField };
    }

    let baseChange = 0;
    if (winnerId === null) {
      baseChange = PLAYER_DRAW_BASE;
    } else {
      baseChange = p.teamId === winnerId ? PLAYER_WIN_BASE : PLAYER_LOSS_BASE;
    }

    const mult = p.teamId === teamAId ? multA : multB;
    return {
      playerId: p.playerId,
      mmrChange: Math.round(baseChange * mult),
      mmrField,
    };
  });
}

// ─── Badge bonus MMR (applied after OMC distributes badges) ───────────────────

export interface PlayerBadgeInput {
  playerId  : string;
  badgeKey  : string;  // 'MVP' | 'THE_SNIPER' | ... | 'NONE'
}

export interface PlayerBadgeResult {
  playerId   : string;
  badgeBonus : number;
  mmrField   : 'footballMmr' | 'cricketMmr';
}

export function calcPlayerBadgeBonus(
  inputs    : PlayerBadgeInput[],
  sportType : SportType,
): PlayerBadgeResult[] {
  const mmrField = getSportMmrField(sportType);
  return inputs.map(p => ({
    playerId  : p.playerId,
    badgeBonus: getBadgeBonus(p.badgeKey),
    mmrField,
  }));
}

// ─── Sport field helper re-export ─────────────────────────────────────────────

export { getSportMmrField } from './rankUtils';
