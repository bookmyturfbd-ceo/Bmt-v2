"use strict";
/**
 * BMT rankUtils — shared rank/MMR utilities (v2)
 *
 * 225-point gaps across 5 tiers + 3 divisions each.
 * Default start: 1000 → Silver II
 * Legend: 2700+ (uncapped)
 *
 * PROVISIONAL: rank hidden for first 3 completed matches in the sport.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TIER_KEYS = exports.TIER_RANGES = exports.BADGES_BY_SPORT = void 0;
exports.getRankData = getRankData;
exports.sportCategory = sportCategory;
exports.getSportMmrField = getSportMmrField;
exports.getSportTeamMmrField = getSportTeamMmrField;
exports.getPlayerSportMmr = getPlayerSportMmr;
exports.getTeamSportMmr = getTeamSportMmr;
exports.isProvisional = isProvisional;
exports.maxBadges = maxBadges;
exports.badgeBonus = badgeBonus;
// ─────────────────────────────────────────────────────────────────────────────
// Rank brackets
// ─────────────────────────────────────────────────────────────────────────────
const BRACKETS = [
    { label: 'Bronze III', tier: 'Bronze', division: 'III', min: 0, max: 224, color: '#cd7f32', glow: '165,80,0', icon: '/ranks/Bronze.svg' },
    { label: 'Bronze II', tier: 'Bronze', division: 'II', min: 225, max: 449, color: '#cd7f32', glow: '165,80,0', icon: '/ranks/Bronze.svg' },
    { label: 'Bronze I', tier: 'Bronze', division: 'I', min: 450, max: 674, color: '#cd7f32', glow: '165,80,0', icon: '/ranks/Bronze.svg' },
    { label: 'Silver III', tier: 'Silver', division: 'III', min: 675, max: 899, color: '#c0c0c0', glow: '180,180,180', icon: '/ranks/Silver.svg' },
    { label: 'Silver II', tier: 'Silver', division: 'II', min: 900, max: 1124, color: '#c0c0c0', glow: '180,180,180', icon: '/ranks/Silver.svg' },
    { label: 'Silver I', tier: 'Silver', division: 'I', min: 1125, max: 1349, color: '#c0c0c0', glow: '180,180,180', icon: '/ranks/Silver.svg' },
    { label: 'Gold III', tier: 'Gold', division: 'III', min: 1350, max: 1574, color: '#ffd700', glow: '200,160,0', icon: '/ranks/Gold.svg' },
    { label: 'Gold II', tier: 'Gold', division: 'II', min: 1575, max: 1799, color: '#ffd700', glow: '200,160,0', icon: '/ranks/Gold.svg' },
    { label: 'Gold I', tier: 'Gold', division: 'I', min: 1800, max: 2024, color: '#ffd700', glow: '200,160,0', icon: '/ranks/Gold.svg' },
    { label: 'Platinum III', tier: 'Platinum', division: 'III', min: 2025, max: 2249, color: '#00e5ff', glow: '0,200,220', icon: '/ranks/Platinum.svg' },
    { label: 'Platinum II', tier: 'Platinum', division: 'II', min: 2250, max: 2474, color: '#00e5ff', glow: '0,200,220', icon: '/ranks/Platinum.svg' },
    { label: 'Platinum I', tier: 'Platinum', division: 'I', min: 2475, max: 2699, color: '#00e5ff', glow: '0,200,220', icon: '/ranks/Platinum.svg' },
    { label: 'Legend', tier: 'Legend', division: '', min: 2700, max: 9999, color: '#ff00ff', glow: '200,0,200', icon: '/ranks/Legend.svg' },
];
function getRankData(mmr) {
    const bracket = BRACKETS.find(b => mmr <= b.max) ?? BRACKETS[BRACKETS.length - 1];
    const range = bracket.max === 9999 ? 300 : (bracket.max - bracket.min + 1);
    const progress = bracket.max === 9999
        ? Math.min(100, ((mmr - bracket.min) / 300) * 100)
        : Math.min(100, Math.max(0, ((mmr - bracket.min) / range) * 100));
    return {
        label: bracket.label,
        tier: bracket.tier,
        division: bracket.division,
        color: bracket.color,
        text: `text-[${bracket.color}]`,
        glow: bracket.glow,
        icon: bracket.icon,
        min: bracket.min,
        next: bracket.max + 1,
        progress,
    };
}
// ─────────────────────────────────────────────────────────────────────────────
// Sport helpers
// ─────────────────────────────────────────────────────────────────────────────
function sportCategory(sportType) {
    return sportType.includes('CRICKET') ? 'cricket' : 'football';
}
function getSportMmrField(sportType) {
    return sportType.includes('CRICKET') ? 'cricketMmr' : 'footballMmr';
}
function getSportTeamMmrField(sportType) {
    return sportType.includes('CRICKET') ? 'cricketMmr' : 'footballMmr';
}
/** Returns the relevant MMR value for a player given their sport */
function getPlayerSportMmr(player, sportType, isTournament = false) {
    if (isTournament) {
        if (sportType.includes('CRICKET'))
            return player.tournamentCricketMmr ?? player.mmr ?? 1000;
        return player.tournamentFootballMmr ?? player.mmr ?? 1000;
    }
    if (sportType.includes('CRICKET'))
        return player.cricketMmr ?? player.mmr ?? 1000;
    return player.footballMmr ?? player.mmr ?? 1000;
}
/** Returns the relevant MMR value for a team given their sport */
function getTeamSportMmr(team) {
    // teamMmr is now sport-specific (set at signoff), but dual fields are canonical
    return team.footballMmr ?? team.teamMmr ?? 1000;
}
// ─────────────────────────────────────────────────────────────────────────────
// Provisional detection
// ─────────────────────────────────────────────────────────────────────────────
/** Rank is hidden (provisional) until 3+ completed matches in the sport */
function isProvisional(matchCount) {
    return matchCount < 3;
}
const MVP_BADGE = { key: 'MVP', label: 'MVP', emoji: '👑', bonus: 20 };
exports.BADGES_BY_SPORT = {
    FUTSAL_5: [
        MVP_BADGE,
        { key: 'THE_SNIPER', label: 'The Sniper', emoji: '🎯', bonus: 10 },
        { key: 'THE_MAESTRO', label: 'The Maestro', emoji: '🎩', bonus: 10 },
        { key: 'THE_WALL', label: 'The Wall', emoji: '🧱', bonus: 10 },
    ],
    FUTSAL_6: [
        MVP_BADGE,
        { key: 'THE_SNIPER', label: 'The Sniper', emoji: '🎯', bonus: 10 },
        { key: 'THE_MAESTRO', label: 'The Maestro', emoji: '🎩', bonus: 10 },
        { key: 'THE_WALL', label: 'The Wall', emoji: '🧱', bonus: 10 },
    ],
    FUTSAL_7: [
        MVP_BADGE,
        { key: 'THE_SNIPER', label: 'The Sniper', emoji: '🎯', bonus: 10 },
        { key: 'THE_MAESTRO', label: 'The Maestro', emoji: '🎩', bonus: 10 },
        { key: 'THE_WALL', label: 'The Wall', emoji: '🧱', bonus: 10 },
    ],
    FOOTBALL_FULL: [
        MVP_BADGE,
        { key: 'GOLDEN_BOOT', label: 'Golden Boot', emoji: '👟', bonus: 10 },
        { key: 'MIDFIELD_GENERAL', label: 'Midfield General', emoji: '🎖️', bonus: 10 },
        { key: 'DEFENSIVE_ANCHOR', label: 'Defensive Anchor', emoji: '⚓', bonus: 10 },
        { key: 'SAFE_HANDS', label: 'Safe Hands', emoji: '🧤', bonus: 10 },
    ],
    CRICKET_7: [
        MVP_BADGE,
        { key: 'POWER_HITTER', label: 'Power Hitter', emoji: '💥', bonus: 10 },
        { key: 'IMPACT_BOWLER', label: 'Impact Bowler', emoji: '🎳', bonus: 10 },
        { key: 'GAME_CHANGER', label: 'Game Changer', emoji: '⚡', bonus: 10 },
    ],
    CRICKET_FULL: [
        MVP_BADGE,
        { key: 'THE_ANCHOR', label: 'The Anchor', emoji: '⚓', bonus: 10 },
        { key: 'STRIKE_BOWLER', label: 'Strike Bowler', emoji: '🎳', bonus: 10 },
        { key: 'ECONOMY_MASTER', label: 'Economy Master', emoji: '🧮', bonus: 10 },
        { key: 'GOLDEN_GLOVE', label: 'Golden Glove', emoji: '🧤', bonus: 10 },
    ],
};
/** Max badges a team OMC can hand out (including MVP) */
function maxBadges(sportType) {
    return ['FOOTBALL_FULL', 'CRICKET_FULL'].includes(sportType) ? 5 : 3;
}
/** MMR bonus for a given badge key */
function badgeBonus(badgeKey) {
    if (badgeKey === 'MVP')
        return 20;
    if (badgeKey && badgeKey !== 'NONE')
        return 10;
    return 0;
}
// ─────────────────────────────────────────────────────────────────────────────
// Tier filter buckets (for CM discover filter)
// ─────────────────────────────────────────────────────────────────────────────
exports.TIER_RANGES = {
    ALL: [0, 9999],
    Bronze: [0, 674],
    Silver: [675, 1349],
    Gold: [1350, 2024],
    Platinum: [2025, 2699],
    Legend: [2700, 9999],
};
exports.TIER_KEYS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Legend'];
