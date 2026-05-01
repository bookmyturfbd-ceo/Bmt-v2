-- ============================================================
-- Tournament Engine Migration — Safe, Idempotent
-- All statements use IF NOT EXISTS / DO NOTHING patterns
-- Run via: node patch_tournament_schema.js
-- ============================================================

-- ── ENUMS ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "TournamentStatus" AS ENUM (
    'DRAFT', 'REGISTRATION_OPEN', 'DRAFTING', 'AUCTION_LIVE',
    'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TournamentFormat" AS ENUM (
    'LEAGUE', 'KNOCKOUT', 'GROUP_KNOCKOUT', 'DOUBLE_ELIMINATION'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TournamentRegistrationType" AS ENUM ('TEAM', 'PLAYER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TRegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TMatchStatus" AS ENUM (
    'SCHEDULED', 'SCORER_ASSIGNED', 'LIVE', 'COMPLETED', 'WALKOVER', 'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TMatchStage" AS ENUM (
    'GROUP', 'ROUND_OF_16', 'QUARTER', 'SEMI', 'FINAL', 'THIRD_PLACE', 'LEAGUE_ROUND'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TDisputeStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TOrganizerStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TAuctionRoomStatus" AS ENUM ('WAITING', 'LIVE', 'PAUSED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── ORGANIZER ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "organizers" (
  "id"          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"        TEXT        NOT NULL,
  "email"       TEXT        NOT NULL UNIQUE,
  "phone"       TEXT,
  "password"    TEXT        NOT NULL,
  "status"      "TOrganizerStatus" NOT NULL DEFAULT 'INVITED',
  "inviteToken" TEXT,
  "createdAt"   TIMESTAMP   NOT NULL DEFAULT NOW(),
  "updatedAt"   TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "organizer_wallets" (
  "id"           TEXT      PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "organizerId"  TEXT      NOT NULL UNIQUE REFERENCES "organizers"("id") ON DELETE CASCADE,
  "balance"      INTEGER   NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt"    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── TOURNAMENT ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "tournaments" (
  "id"                   TEXT                      PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name"                 TEXT                      NOT NULL,
  "description"          TEXT,
  "sport"                TEXT                      NOT NULL DEFAULT 'FOOTBALL',
  "formatType"           "TournamentFormat"        NOT NULL DEFAULT 'KNOCKOUT',
  "status"               "TournamentStatus"        NOT NULL DEFAULT 'DRAFT',
  "registrationType"     "TournamentRegistrationType" NOT NULL DEFAULT 'TEAM',
  "maxParticipants"      INTEGER                   NOT NULL DEFAULT 16,
  "entryFee"             INTEGER                   NOT NULL DEFAULT 0,
  "prizePoolTotal"       INTEGER                   NOT NULL DEFAULT 0,
  "prizeDistribution"    JSONB                     NOT NULL DEFAULT '{}',
  "mmrEnabled"           BOOLEAN                   NOT NULL DEFAULT TRUE,
  "mmrMultiplier"        FLOAT                     NOT NULL DEFAULT 1.0,
  "isPlatformOwned"      BOOLEAN                   NOT NULL DEFAULT TRUE,
  "organizerId"          TEXT                      REFERENCES "organizers"("id") ON DELETE SET NULL,
  "auctionEnabled"       BOOLEAN                   NOT NULL DEFAULT FALSE,
  "qualifyPerGroup"      INTEGER,
  "registrationDeadline" TIMESTAMP,
  "startsAt"             TIMESTAMP,
  "endsAt"               TIMESTAMP,
  "createdAt"            TIMESTAMP                 NOT NULL DEFAULT NOW(),
  "updatedAt"            TIMESTAMP                 NOT NULL DEFAULT NOW()
);

-- Safely add missing columns to existing table
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "organizerId" TEXT REFERENCES "organizers"("id") ON DELETE SET NULL;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "isPlatformOwned" BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "qualifyPerGroup" INTEGER;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "startsAt" TIMESTAMP;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "endsAt" TIMESTAMP;

-- ── TOURNAMENT REGISTRATIONS ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "tournament_registrations" (
  "id"              TEXT                    PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tournamentId"    TEXT                    NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "entityId"        TEXT                    NOT NULL,
  "entityType"      TEXT                    NOT NULL DEFAULT 'TEAM',
  "status"          "TRegistrationStatus"   NOT NULL DEFAULT 'PENDING',
  "entryFeePaid"    BOOLEAN                 NOT NULL DEFAULT FALSE,
  "registeredAt"    TIMESTAMP               NOT NULL DEFAULT NOW(),
  UNIQUE("tournamentId", "entityId")
);

-- ── TOURNAMENT GROUPS ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "tournament_groups" (
  "id"           TEXT      PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tournamentId" TEXT      NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "name"         TEXT      NOT NULL,
  "teamIds"      TEXT[]    NOT NULL DEFAULT '{}',
  "createdAt"    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── TOURNAMENT MATCHES ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "tournament_matches" (
  "id"            TEXT          PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tournamentId"  TEXT          NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "groupId"       TEXT          REFERENCES "tournament_groups"("id") ON DELETE SET NULL,
  "stage"         "TMatchStage" NOT NULL DEFAULT 'KNOCKOUT',
  "matchNumber"   INTEGER       NOT NULL DEFAULT 1,
  "teamAId"       TEXT          NOT NULL DEFAULT 'TBD',
  "teamBId"       TEXT          NOT NULL DEFAULT 'TBD',
  "winnerId"      TEXT,
  "status"        "TMatchStatus" NOT NULL DEFAULT 'SCHEDULED',
  "scorerToken"   TEXT,
  "scorerTokenExpiry" TIMESTAMP,
  "resultSummary" JSONB         NOT NULL DEFAULT '{}',
  "hasDispute"    BOOLEAN       NOT NULL DEFAULT FALSE,
  "scheduledAt"   TIMESTAMP,
  "completedAt"   TIMESTAMP,
  "createdAt"     TIMESTAMP     NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMP     NOT NULL DEFAULT NOW()
);

-- ── TOURNAMENT STANDINGS ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "tournament_standings" (
  "id"            TEXT      PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tournamentId"  TEXT      NOT NULL REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "groupId"       TEXT      REFERENCES "tournament_groups"("id") ON DELETE SET NULL,
  "teamId"        TEXT      NOT NULL,
  "played"        INTEGER   NOT NULL DEFAULT 0,
  "won"           INTEGER   NOT NULL DEFAULT 0,
  "lost"          INTEGER   NOT NULL DEFAULT 0,
  "drawn"         INTEGER   NOT NULL DEFAULT 0,
  "noResult"      INTEGER   NOT NULL DEFAULT 0,
  "points"        INTEGER   NOT NULL DEFAULT 0,
  "nrr"           FLOAT     NOT NULL DEFAULT 0,
  "goalDifference" INTEGER  NOT NULL DEFAULT 0,
  "goalsScored"   INTEGER   NOT NULL DEFAULT 0,
  "goalsConceded" INTEGER   NOT NULL DEFAULT 0,
  "headToHead"    JSONB     NOT NULL DEFAULT '{}',
  "position"      INTEGER   NOT NULL DEFAULT 0,
  "qualified"     BOOLEAN   NOT NULL DEFAULT FALSE,
  "updatedAt"     TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE("tournamentId", "groupId", "teamId")
);

-- ── TOURNAMENT DISPUTES ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "tournament_disputes" (
  "id"              TEXT              PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "matchId"         TEXT              NOT NULL REFERENCES "tournament_matches"("id") ON DELETE CASCADE,
  "raisedByTeamId"  TEXT              NOT NULL,
  "eventRef"        TEXT,
  "reason"          TEXT              NOT NULL,
  "status"          "TDisputeStatus"  NOT NULL DEFAULT 'PENDING',
  "resolvedBy"      TEXT,
  "resolutionNote"  TEXT,
  "raisedAt"        TIMESTAMP         NOT NULL DEFAULT NOW(),
  "resolvedAt"      TIMESTAMP
);

-- ── AUCTION ROOM ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "auction_rooms" (
  "id"                      TEXT                  PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "tournamentId"            TEXT                  NOT NULL UNIQUE REFERENCES "tournaments"("id") ON DELETE CASCADE,
  "status"                  "TAuctionRoomStatus"  NOT NULL DEFAULT 'WAITING',
  "currentPlayerId"         TEXT,
  "currentBasePrice"        INTEGER,
  "currentHighestBid"       INTEGER,
  "currentHighestBidderId"  TEXT,
  "bidTimerSeconds"         INTEGER               NOT NULL DEFAULT 30,
  "createdAt"               TIMESTAMP             NOT NULL DEFAULT NOW(),
  "updatedAt"               TIMESTAMP             NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "auction_bids" (
  "id"            TEXT      PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "auctionRoomId" TEXT      NOT NULL REFERENCES "auction_rooms"("id") ON DELETE CASCADE,
  "playerId"      TEXT      NOT NULL,
  "captainId"     TEXT      NOT NULL,
  "amount"        INTEGER   NOT NULL,
  "timestamp"     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── INDEXES (for performance) ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "idx_tournaments_status"      ON "tournaments"("status");
CREATE INDEX IF NOT EXISTS "idx_tournaments_organizer"   ON "tournaments"("organizerId");
CREATE INDEX IF NOT EXISTS "idx_t_registrations_tour"    ON "tournament_registrations"("tournamentId");
CREATE INDEX IF NOT EXISTS "idx_t_matches_tournament"    ON "tournament_matches"("tournamentId");
CREATE INDEX IF NOT EXISTS "idx_t_matches_status"        ON "tournament_matches"("status");
CREATE INDEX IF NOT EXISTS "idx_t_standings_tournament"  ON "tournament_standings"("tournamentId");
CREATE INDEX IF NOT EXISTS "idx_auction_bids_room"       ON "auction_bids"("auctionRoomId");

-- ── DONE ──────────────────────────────────────────────────────────────────────
