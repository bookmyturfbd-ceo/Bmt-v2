-- CreateEnum
CREATE TYPE "TurfStatus" AS ENUM ('pending', 'published', 'rejected');

-- CreateEnum
CREATE TYPE "RevenueModelType" AS ENUM ('percentage', 'monthly');

-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('available', 'walkin', 'maintenance', 'booked');

-- CreateEnum
CREATE TYPE "TimeCategory" AS ENUM ('Morning', 'Afternoon', 'Evening', 'Night');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('confirmed', 'cancelled', 'completed');

-- CreateEnum
CREATE TYPE "BanStatus" AS ENUM ('none', 'soft', 'perma');

-- CreateEnum
CREATE TYPE "WalletRequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('bank', 'bkash', 'cash');

-- CreateEnum
CREATE TYPE "WalletRechargeMethod" AS ENUM ('bkash', 'nagad', 'bank');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('cost', 'income');

-- CreateEnum
CREATE TYPE "LedgerCategory" AS ENUM ('staff', 'facility', 'walkin', 'other');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('percentage', 'flat');

-- CreateEnum
CREATE TYPE "InviteRole" AS ENUM ('TurfOwner', 'Coach');

-- CreateTable
CREATE TABLE "divisions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "divisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "password" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "levelProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avatarUrl" TEXT,
    "banStatus" "BanStatus" NOT NULL DEFAULT 'none',
    "banUntil" TIMESTAMP(3),
    "banReason" TEXT,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "contactPerson" TEXT,
    "password" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pendingBmtCut" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_locks" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "finance_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turfs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "divisionId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "area" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "mapLink" TEXT,
    "logoUrl" TEXT,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "TurfStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revenueModelType" "RevenueModelType",
    "revenueModelValue" DOUBLE PRECISION,

    CONSTRAINT "turfs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turf_sports" (
    "turfId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,

    CONSTRAINT "turf_sports_pkey" PRIMARY KEY ("turfId","sportId")
);

-- CreateTable
CREATE TABLE "turf_amenities" (
    "turfId" TEXT NOT NULL,
    "amenityId" TEXT NOT NULL,

    CONSTRAINT "turf_amenities_pkey" PRIMARY KEY ("turfId","amenityId")
);

-- CreateTable
CREATE TABLE "grounds" (
    "id" TEXT NOT NULL,
    "turfId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "grounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slots" (
    "id" TEXT NOT NULL,
    "turfId" TEXT NOT NULL,
    "groundId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timeCategory" "TimeCategory" NOT NULL,
    "days" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price" DOUBLE PRECISION NOT NULL,
    "status" "SlotStatus" NOT NULL DEFAULT 'available',

    CONSTRAINT "slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "turfId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "ownerShare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bmtCut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "BookingStatus" NOT NULL DEFAULT 'confirmed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentProofUrl" TEXT,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts" (
    "id" TEXT NOT NULL,
    "turfId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "DiscountType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "minBookings" INTEGER,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "turfId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "category" "LedgerCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_conclusions" (
    "id" TEXT NOT NULL,
    "turfId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "totalAppIncome" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWalkIn" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "concludedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_conclusions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "turfName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "bmtCut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "date" TEXT NOT NULL,
    "method" "PayoutMethod" NOT NULL,
    "txId" TEXT,
    "proofUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_requests" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "WalletRechargeMethod" NOT NULL,
    "screenshotUrl" TEXT,
    "status" "WalletRequestStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "wallet_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "type" "WalletRechargeMethod" NOT NULL,
    "number" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "contact" TEXT NOT NULL,
    "role" "InviteRole" NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "usedBy" TEXT,

    CONSTRAINT "invite_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "divisions_name_key" ON "divisions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "cities_name_divisionId_key" ON "cities"("name", "divisionId");

-- CreateIndex
CREATE UNIQUE INDEX "sports_name_key" ON "sports"("name");

-- CreateIndex
CREATE UNIQUE INDEX "amenities_name_key" ON "amenities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "players_email_key" ON "players"("email");

-- CreateIndex
CREATE UNIQUE INDEX "owners_email_key" ON "owners"("email");

-- CreateIndex
CREATE UNIQUE INDEX "finance_locks_ownerId_key" ON "finance_locks"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "discounts_turfId_code_key" ON "discounts"("turfId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_conclusions_ownerId_month_key" ON "ledger_conclusions"("ownerId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "payment_methods_type_key" ON "payment_methods"("type");

-- CreateIndex
CREATE UNIQUE INDEX "invite_tokens_token_key" ON "invite_tokens"("token");

-- AddForeignKey
ALTER TABLE "cities" ADD CONSTRAINT "cities_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "divisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_locks" ADD CONSTRAINT "finance_locks_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turfs" ADD CONSTRAINT "turfs_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turfs" ADD CONSTRAINT "turfs_divisionId_fkey" FOREIGN KEY ("divisionId") REFERENCES "divisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turfs" ADD CONSTRAINT "turfs_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turf_sports" ADD CONSTRAINT "turf_sports_turfId_fkey" FOREIGN KEY ("turfId") REFERENCES "turfs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turf_sports" ADD CONSTRAINT "turf_sports_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "sports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turf_amenities" ADD CONSTRAINT "turf_amenities_turfId_fkey" FOREIGN KEY ("turfId") REFERENCES "turfs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turf_amenities" ADD CONSTRAINT "turf_amenities_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grounds" ADD CONSTRAINT "grounds_turfId_fkey" FOREIGN KEY ("turfId") REFERENCES "turfs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slots" ADD CONSTRAINT "slots_groundId_fkey" FOREIGN KEY ("groundId") REFERENCES "grounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "slots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_turfId_fkey" FOREIGN KEY ("turfId") REFERENCES "turfs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_turfId_fkey" FOREIGN KEY ("turfId") REFERENCES "turfs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_conclusions" ADD CONSTRAINT "ledger_conclusions_turfId_fkey" FOREIGN KEY ("turfId") REFERENCES "turfs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_conclusions" ADD CONSTRAINT "ledger_conclusions_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "owners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_requests" ADD CONSTRAINT "wallet_requests_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
