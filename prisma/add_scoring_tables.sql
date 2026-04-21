-- Add scoring system enums
DO $$ BEGIN
  CREATE TYPE "MatchEventType" AS ENUM (
    'GOAL', 'OWN_GOAL', 'PENALTY_SCORED', 'PENALTY_MISSED',
    'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION', 'HALF_TIME', 'FULL_TIME'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "EventStatus" AS ENUM (
    'PENDING', 'CONFIRMED', 'DISPUTED', 'REMOVED'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- MatchScorer
CREATE TABLE IF NOT EXISTS "match_scorers" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "matchId"    TEXT NOT NULL,
  "teamId"     TEXT NOT NULL,
  "playerId"   TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "match_scorers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "match_scorers_matchId_teamId_key" UNIQUE ("matchId", "teamId"),
  CONSTRAINT "match_scorers_matchId_fkey" FOREIGN KEY ("matchId")
    REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- MatchEvent
CREATE TABLE IF NOT EXISTS "match_events" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "matchId"          TEXT NOT NULL,
  "type"             "MatchEventType" NOT NULL,
  "teamId"           TEXT NOT NULL,
  "playerId"         TEXT,
  "assistPlayerId"   TEXT,
  "playerOnId"       TEXT,
  "minute"           INTEGER NOT NULL,
  "status"           "EventStatus" NOT NULL DEFAULT 'PENDING',
  "disputedByTeamId" TEXT,
  "resolvedAt"       TIMESTAMP(3),
  "resolution"       TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "match_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "match_events_matchId_fkey" FOREIGN KEY ("matchId")
    REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- MatchSignOff
CREATE TABLE IF NOT EXISTS "match_sign_offs" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "matchId"     TEXT NOT NULL,
  "teamId"      TEXT NOT NULL,
  "signedOffAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "match_sign_offs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "match_sign_offs_matchId_teamId_key" UNIQUE ("matchId", "teamId"),
  CONSTRAINT "match_sign_offs_matchId_fkey" FOREIGN KEY ("matchId")
    REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- MatchHalfTime
CREATE TABLE IF NOT EXISTS "match_halftimes" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "matchId"     TEXT NOT NULL,
  "calledByA"   BOOLEAN NOT NULL DEFAULT false,
  "calledByB"   BOOLEAN NOT NULL DEFAULT false,
  "confirmedAt" TIMESTAMP(3),
  CONSTRAINT "match_halftimes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "match_halftimes_matchId_key" UNIQUE ("matchId"),
  CONSTRAINT "match_halftimes_matchId_fkey" FOREIGN KEY ("matchId")
    REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
