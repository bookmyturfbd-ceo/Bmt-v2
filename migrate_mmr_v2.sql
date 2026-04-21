-- =====================================================================
-- BMT MMR v2 Migration — Run this in Supabase SQL Editor
-- =====================================================================

-- 1. Reset all Player MMR to 1000
UPDATE players SET "footballMmr" = 1000, "cricketMmr" = 1000, mmr = 1000;

-- 2. Reset all Team MMR to 1000
UPDATE teams SET "footballMmr" = 1000, "cricketMmr" = 1000, "teamMmr" = 1000;

-- 3. Reset all match MMR changes
UPDATE matches SET "mmrChangeA" = 0, "mmrChangeB" = 0, "badgeBonusApplied" = false;

-- 4. Reset all player match stats MMR fields
UPDATE player_match_stats SET "mmrChange" = 0, "badgeBonus" = 0;

-- =====================================================================
-- Done. All MMR values are now reset to 1000.
-- =====================================================================
