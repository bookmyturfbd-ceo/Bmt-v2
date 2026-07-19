"use strict";
/**
 * BMT MMR Calculator v2
 *
 * TEAM  : Win +80 / Loss -40 / Draw +40 (50/50 split: 80÷2)
 * PLAYER: Win +70 / Loss -40 / Draw +35 (50/50 split: 70÷2)
 * BADGE : MVP +20 / any other badge +10 (applied after OMC distributes badges)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSportMmrField = exports.PLAYER_DRAW_BASE = exports.PLAYER_LOSS_BASE = exports.PLAYER_WIN_BASE = exports.TEAM_DRAW_MMR = exports.TEAM_LOSS_MMR = exports.TEAM_WIN_MMR = void 0;
exports.calcTeamMMR = calcTeamMMR;
exports.calcPlayerBaseMMR = calcPlayerBaseMMR;
exports.calcPlayerBadgeBonus = calcPlayerBadgeBonus;
const rankUtils_1 = require("./rankUtils");
// ─── Constants ────────────────────────────────────────────────────────────────
exports.TEAM_WIN_MMR = 80;
exports.TEAM_LOSS_MMR = -40;
exports.TEAM_DRAW_MMR = 40; // 50/50 split of Win: 80÷2
exports.PLAYER_WIN_BASE = 70;
exports.PLAYER_LOSS_BASE = -40;
exports.PLAYER_DRAW_BASE = 35; // 50/50 split of Win: 70÷2
function calcTeamMMR(teamAId, teamBId, winnerId, sportType, teamAMmr = 1000, teamBMmr = 1000, isProvisional = false) {
    let baseChangeA = 0;
    let baseChangeB = 0;
    if (winnerId === teamAId) {
        baseChangeA = exports.TEAM_WIN_MMR;
        baseChangeB = exports.TEAM_LOSS_MMR;
    }
    else if (winnerId === teamBId) {
        baseChangeA = exports.TEAM_LOSS_MMR;
        baseChangeB = exports.TEAM_WIN_MMR;
    }
    else {
        baseChangeA = exports.TEAM_DRAW_MMR;
        baseChangeB = exports.TEAM_DRAW_MMR;
    }
    let multA = 1.0;
    let multB = 1.0;
    // Draws are flat (no scaling), as are placement matches
    if (winnerId !== null && !isProvisional) {
        const diffA = teamBMmr - teamAMmr;
        const diffB = teamAMmr - teamBMmr;
        if (winnerId === teamAId) {
            multA = diffA >= 200 ? 1.5 : diffA <= -200 ? 0.5 : 1.0;
            multB = diffB >= 200 ? 0.5 : diffB <= -200 ? 1.5 : 1.0;
        }
        else if (winnerId === teamBId) {
            multA = diffA >= 200 ? 0.5 : diffA <= -200 ? 1.5 : 1.0;
            multB = diffB >= 200 ? 1.5 : diffB <= -200 ? 0.5 : 1.0;
        }
    }
    return {
        mmrChangeA: Math.round(baseChangeA * multA),
        mmrChangeB: Math.round(baseChangeB * multB),
        mmrField: (0, rankUtils_1.getSportMmrField)(sportType),
        multA,
        multB,
    };
}
function calcPlayerBaseMMR(input, winnerId, sportType, teamAId, multA = 1.0, multB = 1.0, playedPlayerIds) {
    const mmrField = (0, rankUtils_1.getSportMmrField)(sportType);
    return input.map(p => {
        // Participation check: unplayed bench players get 0 MMR change
        if (playedPlayerIds && !playedPlayerIds.includes(p.playerId)) {
            return { playerId: p.playerId, mmrChange: 0, mmrField };
        }
        let baseChange = 0;
        if (winnerId === null) {
            baseChange = exports.PLAYER_DRAW_BASE;
        }
        else {
            baseChange = p.teamId === winnerId ? exports.PLAYER_WIN_BASE : exports.PLAYER_LOSS_BASE;
        }
        const mult = p.teamId === teamAId ? multA : multB;
        return {
            playerId: p.playerId,
            mmrChange: Math.round(baseChange * mult),
            mmrField,
        };
    });
}
function calcPlayerBadgeBonus(inputs, sportType) {
    const mmrField = (0, rankUtils_1.getSportMmrField)(sportType);
    return inputs.map(p => ({
        playerId: p.playerId,
        badgeBonus: (0, rankUtils_1.badgeBonus)(p.badgeKey),
        mmrField,
    }));
}
// ─── Sport field helper re-export ─────────────────────────────────────────────
var rankUtils_2 = require("./rankUtils");
Object.defineProperty(exports, "getSportMmrField", { enumerable: true, get: function () { return rankUtils_2.getSportMmrField; } });
