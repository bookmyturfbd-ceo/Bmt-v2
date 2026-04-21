/**
 * BMT MMR Calculator v2
 *
 * TEAM  : Win +80 / Loss -40 / Draw 0
 * PLAYER: Win +70 / Loss -40 / Draw 0 (base, applied at signoff)
 * BADGE : MVP +20 / any other badge +10 (applied after OMC distributes badges)
 */

import { getSportMmrField, badgeBonus as getBadgeBonus } from './rankUtils';

export type SportType = 'FUTSAL_5' | 'FUTSAL_6' | 'FUTSAL_7' | 'CRICKET_7' | 'FOOTBALL_FULL' | 'CRICKET_FULL';

// ─── Constants ────────────────────────────────────────────────────────────────

export const TEAM_WIN_MMR   =  80;
export const TEAM_LOSS_MMR  = -40;
export const TEAM_DRAW_MMR  =   0;

export const PLAYER_WIN_BASE  =  70;
export const PLAYER_LOSS_BASE = -40;
export const PLAYER_DRAW_BASE =   0;

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
): TeamMMRResult {
  let mmrChangeA: number, mmrChangeB: number;
  if (winnerId === teamAId)      { mmrChangeA =  TEAM_WIN_MMR; mmrChangeB = TEAM_LOSS_MMR; }
  else if (winnerId === teamBId) { mmrChangeA = TEAM_LOSS_MMR; mmrChangeB =  TEAM_WIN_MMR; }
  else                           { mmrChangeA = TEAM_DRAW_MMR; mmrChangeB = TEAM_DRAW_MMR; }

  return { mmrChangeA, mmrChangeB, mmrField: getSportMmrField(sportType) };
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
): PlayerBaseMMRResult[] {
  const mmrField = getSportMmrField(sportType);
  return input.map(p => {
    let mmrChange: number;
    if (winnerId === null) mmrChange = PLAYER_DRAW_BASE;
    else mmrChange = p.teamId === winnerId ? PLAYER_WIN_BASE : PLAYER_LOSS_BASE;
    return { playerId: p.playerId, mmrChange, mmrField };
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
