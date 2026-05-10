/**
 * BMT Prisma Seed Script
 * Migrates bmt-data/ JSON files into PostgreSQL via Prisma.
 * Idempotent – safe to re-run.
 *
 * Execution order:
 *   Divisions → Cities → Sports → Amenities
 *   → Owners (bcrypt) → Players (bcrypt)
 *   → FinanceLocks → Turfs (TurfSport/TurfAmenity junction)
 *   → Grounds → Slots → Bookings
 *   → Discounts → LedgerEntries → PaymentMethods
 *   → Payouts → WalletRequests
 */

// Load .env FIRST — Prisma 7 seed runs in a child process; DATABASE_URL must
// be available before PrismaClient is constructed.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

/** Simple cuid-style ID using crypto.randomUUID() — no extra package needed */
const createId = () => "c" + crypto.randomUUID().replace(/-/g, "").slice(0, 23);

// Prisma 7 requires a driver adapter — the Rust engine has been removed.
const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────

const DATA_DIR = path.join(__dirname, "..", "bmt-data");

function load<T>(file: string): T[] {
  const full = path.join(DATA_DIR, file);
  if (!fs.existsSync(full)) {
    console.warn(`  ⚠️  ${file} not found — skipping`);
    return [];
  }
  return JSON.parse(fs.readFileSync(full, "utf8")) as T[];
}

const PLACEHOLDER = "https://placehold.co/400";

function cleanImg(s: unknown): string {
  if (!s || typeof s !== "string") return PLACEHOLDER;
  return s.startsWith("data:") ? PLACEHOLDER : s;
}

const SALT_ROUNDS = 10;

async function hash(plain: unknown): Promise<string> {
  const pw = plain && typeof plain === "string" && plain.trim() ? plain : "changeme";
  return bcrypt.hash(pw, SALT_ROUNDS);
}

// ──────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  BMT seed started…\n");

  // ── 1. Divisions ──────────────────────────────────────────────
  const divisions = load<{ id: string; name: string }>("divisions.json");
  for (const d of divisions) {
    await prisma.division.upsert({
      where: { id: d.id },
      update: { name: d.name },
      create: { id: d.id, name: d.name },
    });
  }
  console.log(`✅  Divisions   (${divisions.length})`);

  // ── 2. Cities ─────────────────────────────────────────────────
  const cities = load<{ id: string; name: string; divisionId: string }>("cities.json");
  for (const c of cities) {
    await prisma.city.upsert({
      where: { id: c.id },
      update: { name: c.name, divisionId: c.divisionId },
      create: { id: c.id, name: c.name, divisionId: c.divisionId },
    });
  }
  console.log(`✅  Cities      (${cities.length})`);

  // ── 3. Sports ─────────────────────────────────────────────────
  const sports = load<{ id: string; name: string }>("sports.json");
  for (const s of sports) {
    await prisma.sport.upsert({
      where: { id: s.id },
      update: { name: s.name },
      create: { id: s.id, name: s.name },
    });
  }
  console.log(`✅  Sports      (${sports.length})`);

  // ── 4. Amenities ──────────────────────────────────────────────
  const amenities = load<{ id: string; name: string }>("amenities.json");
  for (const a of amenities) {
    await prisma.amenity.upsert({
      where: { id: a.id },
      update: { name: a.name },
      create: { id: a.id, name: a.name },
    });
  }
  console.log(`✅  Amenities   (${amenities.length})`);

  // ── 5. Owners ─────────────────────────────────────────────────
  const owners = load<{
    id: string;
    name: string;
    email: string;
    phone?: string;
    role?: string;
    joinedAt?: string;
    password?: string;
    walletBalance?: number;
    pendingBmtCut?: number;
  }>("owners.json");

  for (const o of owners) {
    const hashed = await hash(o.password);
    await prisma.owner.upsert({
      where: { id: o.id },
      update: {
        name: o.name,
        email: o.email,
        phone: o.phone ?? "",
        password: hashed,
        walletBalance: o.walletBalance ?? 0,
        pendingBmtCut: o.pendingBmtCut ?? 0,
      },
      create: {
        id: o.id,
        name: o.name,
        email: o.email,
        phone: o.phone ?? "",
        password: hashed,
        walletBalance: o.walletBalance ?? 0,
        pendingBmtCut: o.pendingBmtCut ?? 0,
      },
    });
  }
  console.log(`✅  Owners      (${owners.length})`);

  // ── 6. Players ────────────────────────────────────────────────
  const players = load<{
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    password?: string;
    joinedAt?: string;
    walletBalance?: number;
    avatarBase64?: string;
    avatarUrl?: string;
  }>("players.json");

  let pCount = 0;
  for (const p of players) {
    const hashed = await hash(p.password);
    const avatarUrl = p.avatarUrl ? cleanImg(p.avatarUrl) : cleanImg(p.avatarBase64);

    await prisma.player.upsert({
      where: { id: p.id },
      update: {
        fullName: p.fullName,
        email: p.email,
        phone: p.phone ?? "",
        password: hashed,
        walletBalance: p.walletBalance ?? 0,
        avatarUrl,
      },
      create: {
        id: p.id,
        fullName: p.fullName,
        email: p.email,
        phone: p.phone ?? "",
        password: hashed,
        walletBalance: p.walletBalance ?? 0,
        avatarUrl,
      },
    });
    pCount++;
    if (pCount % 50 === 0) process.stdout.write(`\r   Players: ${pCount}`);
  }
  console.log(`\n✅  Players     (${pCount})`);

  // ── 7. FinanceLocks ───────────────────────────────────────────
  const locks = load<{ ownerId: string; password?: string }>("finance_locks.json");
  for (const l of locks) {
    const hashed = await hash(l.password);
    await prisma.financeLock.upsert({
      where: { ownerId: l.ownerId },
      update: { password: hashed },
      create: { ownerId: l.ownerId, password: hashed },
    });
  }
  console.log(`✅  FinanceLocks (${locks.length})`);

  // ── 8. Turfs ──────────────────────────────────────────────────
  const fallbackOwnerId = owners[0]?.id ?? "";
  const fallbackDivisionId = divisions[0]?.id ?? "";
  const fallbackCityId = cities[0]?.id ?? "";

  const turfs = load<{
    id: string;
    name: string;
    ownerId?: string;
    divisionId?: string;
    cityId?: string;
    area?: string;
    logoUrl?: string;
    imageUrls?: unknown[];
    sportIds?: string[];
    amenityIds?: string[];
    rating?: number;
    totalRatings?: number;
    isActive?: boolean;
    description?: string;
  }>("turfs.json");

  for (const t of turfs) {
    const ownerId = t.ownerId ?? fallbackOwnerId;
    const divisionId = t.divisionId ?? fallbackDivisionId;
    const cityId = t.cityId ?? fallbackCityId;
    const logoUrl = cleanImg(t.logoUrl);
    const imageUrls = Array.isArray(t.imageUrls) ? t.imageUrls.map(cleanImg) : [];

    await prisma.turf.upsert({
      where: { id: t.id },
      update: { name: t.name, ownerId, divisionId, cityId, area: t.area ?? "", logoUrl, imageUrls },
      create: {
        id: t.id,
        name: t.name,
        ownerId,
        divisionId,
        cityId,
        area: t.area ?? "",
        logoUrl,
        imageUrls,
        status: "published",
      },
    });

    // TurfSport junction
    if (t.sportIds?.length) {
      await prisma.turfSport.deleteMany({ where: { turfId: t.id } });
      await prisma.turfSport.createMany({
        data: t.sportIds.map((sportId) => ({ turfId: t.id, sportId })),
        skipDuplicates: true,
      });
    }

    // TurfAmenity junction
    if (t.amenityIds?.length) {
      await prisma.turfAmenity.deleteMany({ where: { turfId: t.id } });
      await prisma.turfAmenity.createMany({
        data: t.amenityIds.map((amenityId) => ({ turfId: t.id, amenityId })),
        skipDuplicates: true,
      });
    }
  }
  console.log(`✅  Turfs       (${turfs.length})`);

  // ── 9. Grounds ────────────────────────────────────────────────
  const grounds = load<{ id: string; turfId: string; name: string }>("grounds.json");
  for (const g of grounds) {
    await prisma.ground.upsert({
      where: { id: g.id },
      update: { name: g.name, turfId: g.turfId },
      create: { id: g.id, name: g.name, turfId: g.turfId },
    });
  }
  console.log(`✅  Grounds     (${grounds.length})`);

  // ──10. Slots ──────────────────────────────────────────────────
  const VALID_SLOT_STATUSES = ["available", "walkin", "maintenance", "booked"] as const;
  const VALID_TIME_CATS = ["Morning", "Afternoon", "Evening", "Night"] as const;
  type SlotStatusType = typeof VALID_SLOT_STATUSES[number];
  type TimeCatType = typeof VALID_TIME_CATS[number];

  const slotStatus = (s: unknown): SlotStatusType =>
    VALID_SLOT_STATUSES.includes(s as SlotStatusType) ? (s as SlotStatusType) : "available";

  const timeCat = (s: unknown): TimeCatType =>
    VALID_TIME_CATS.includes(s as TimeCatType) ? (s as TimeCatType) : "Morning";

  const slots = load<{
    id: string;
    turfId: string;
    groundId: string;
    days?: string[];
    sports?: string[];
    startTime?: string;
    endTime?: string;
    price?: number;
    createdAt?: string;
    timeCategory?: string;
    status?: string;
  }>("slots.json");

  for (const s of slots) {
    await prisma.slot.upsert({
      where: { id: s.id },
      update: {
        turfId: s.turfId,
        groundId: s.groundId,
        days: s.days ?? [],
        startTime: s.startTime ?? "00:00",
        endTime: s.endTime ?? "01:00",
        price: s.price ?? 0,
        timeCategory: timeCat(s.timeCategory),
        status: slotStatus(s.status),
      },
      create: {
        id: s.id,
        turfId: s.turfId,
        groundId: s.groundId,
        days: s.days ?? [],
        startTime: s.startTime ?? "00:00",
        endTime: s.endTime ?? "01:00",
        price: s.price ?? 0,
        timeCategory: timeCat(s.timeCategory),
        status: slotStatus(s.status),
      },
    });
  }
  console.log(`✅  Slots       (${slots.length})`);

  // ──11. Bookings ───────────────────────────────────────────────
  const VALID_BOOKING_STATUS = ["confirmed", "cancelled", "completed"] as const;
  type BookingStatusType = typeof VALID_BOOKING_STATUS[number];
  const bookingStatus = (s: unknown): BookingStatusType =>
    VALID_BOOKING_STATUS.includes(s as BookingStatusType) ? (s as BookingStatusType) : "confirmed";

  const bookings = load<{
    id: string;
    turfId: string;
    slotId: string;
    date: string;
    playerId?: string;
    playerName?: string;
    price?: number;
    bmtCut?: number;
    ownerShare?: number;
    paidViaWallet?: boolean;
    createdAt?: string;
    status?: string;
    paymentProofUrl?: string;
  }>("bookings.json");

  let bCount = 0;
  for (const b of bookings) {
    if (!b.playerId) continue; // FK required

    await prisma.booking.upsert({
      where: { id: b.id },
      update: {
        turfId: b.turfId,
        slotId: b.slotId,
        date: b.date,
        playerId: b.playerId,
        price: b.price ?? 0,
        ownerShare: b.ownerShare ?? 0,
        bmtCut: b.bmtCut ?? 0,
        status: bookingStatus(b.status),
        paymentProofUrl: b.paymentProofUrl ? cleanImg(b.paymentProofUrl) : null,
      },
      create: {
        id: b.id,
        turfId: b.turfId,
        slotId: b.slotId,
        date: b.date,
        playerId: b.playerId,
        price: b.price ?? 0,
        ownerShare: b.ownerShare ?? 0,
        bmtCut: b.bmtCut ?? 0,
        status: bookingStatus(b.status),
        createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
        paymentProofUrl: b.paymentProofUrl ? cleanImg(b.paymentProofUrl) : null,
      },
    });
    bCount++;
  }
  console.log(`✅  Bookings    (${bCount})`);

  // ──12. Discounts ──────────────────────────────────────────────
  // JSON schema: { id, turfId, groundId, reason, discountPct, validFrom, validTo,
  //               sport, timeOfDay, days, active, createdAt }
  // Prisma schema: { id, turfId, code, type (DiscountType), value, minBookings,
  //                  maxUses, usedCount, active, expiresAt }
  // Mapping: reason → code, discountPct → value, type = "percentage",
  //          validTo → expiresAt (if parseable date)

  const discounts = load<{
    id: string;
    turfId: string;
    groundId?: string;
    reason?: string;
    discountPct?: number;
    validFrom?: string;
    validTo?: string;
    sport?: string;
    timeOfDay?: string[];
    days?: string[];
    active?: boolean;
    createdAt?: string;
  }>("discounts.json");

  for (const d of discounts) {
    const code = d.reason ?? `DISC-${d.id}`;
    const value = d.discountPct ?? 0;
    const expiresAt = d.validTo ? new Date(d.validTo) : null;

    await prisma.discount.upsert({
      where: { id: d.id },
      update: {
        turfId: d.turfId,
        code,
        type: "percentage",
        value,
        active: d.active ?? true,
        expiresAt,
      },
      create: {
        id: d.id,
        turfId: d.turfId,
        code,
        type: "percentage",
        value,
        active: d.active ?? true,
        expiresAt,
        createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
      },
    });
  }
  console.log(`✅  Discounts   (${discounts.length})`);

  // ──13. LedgerEntries ──────────────────────────────────────────
  // LedgerEntry requires turfId – map from ownerId via first turf owned.
  const VALID_LEDGER_TYPE = ["cost", "income"] as const;
  const VALID_LEDGER_CAT = ["staff", "facility", "walkin", "other"] as const;
  type LedgerTypeType = typeof VALID_LEDGER_TYPE[number];
  type LedgerCatType = typeof VALID_LEDGER_CAT[number];
  const ledgerType = (s: unknown): LedgerTypeType =>
    VALID_LEDGER_TYPE.includes(s as LedgerTypeType) ? (s as LedgerTypeType) : "cost";
  const ledgerCat = (s: unknown): LedgerCatType =>
    VALID_LEDGER_CAT.includes(s as LedgerCatType) ? (s as LedgerCatType) : "other";

  // Build ownerId → first turfId map
  const ownerToTurf: Record<string, string> = {};
  for (const t of turfs) {
    const oid = t.ownerId ?? fallbackOwnerId;
    if (!ownerToTurf[oid]) ownerToTurf[oid] = t.id;
  }

  const ledger = load<{
    id: string;
    ownerId: string;
    turfId?: string;
    month?: string;
    type?: string;
    category?: string;
    description?: string;
    amount?: number;
    createdAt?: string;
  }>("ledger.json");

  let lCount = 0;
  for (const l of ledger) {
    const turfId = l.turfId ?? ownerToTurf[l.ownerId];
    if (!turfId) continue;

    await prisma.ledgerEntry.upsert({
      where: { id: l.id },
      update: {
        turfId,
        ownerId: l.ownerId,
        month: l.month ?? "",
        type: ledgerType(l.type),
        category: ledgerCat(l.category),
        description: l.description ?? "",
        amount: l.amount ?? 0,
      },
      create: {
        id: l.id,
        turfId,
        ownerId: l.ownerId,
        month: l.month ?? "",
        type: ledgerType(l.type),
        category: ledgerCat(l.category),
        description: l.description ?? "",
        amount: l.amount ?? 0,
        createdAt: l.createdAt ? new Date(l.createdAt) : new Date(),
      },
    });
    lCount++;
  }
  console.log(`✅  LedgerEntries (${lCount})`);

  // ──14. PaymentMethods ─────────────────────────────────────────
  // Prisma schema: { id, type (WalletRechargeMethod unique), number, accountType }
  // JSON:          { id, type, number, accountType, updatedAt }
  const VALID_WALLET_METHOD = ["bkash", "nagad", "bank"] as const;
  type WalletMethodType = typeof VALID_WALLET_METHOD[number];
  const walletMethod = (m: unknown): WalletMethodType =>
    VALID_WALLET_METHOD.includes(m as WalletMethodType) ? (m as WalletMethodType) : "bkash";

  const methods = load<{
    id: string;
    type?: string;
    number?: string;
    accountType?: string;
    updatedAt?: string;
  }>("payment-methods.json");

  for (const m of methods) {
    const type = walletMethod(m.type);
    await prisma.paymentMethod.upsert({
      where: { type },
      update: { number: m.number ?? "", accountType: m.accountType ?? "" },
      create: { type, number: m.number ?? "", accountType: m.accountType ?? "" },
    });
  }
  console.log(`✅  PaymentMethods (${methods.length})`);

  // ──15. Payouts ────────────────────────────────────────────────
  // JSON schema: { ownerId, ownerName, turfName, amount, bmtCut, date, method,
  //               txId, proofUrl (often base64), id (sometimes missing) }
  // Prisma schema: { id, ownerId, ownerName, turfName, amount, bmtCut, date,
  //                  method (PayoutMethod), txId, proofUrl }
  const VALID_PAYOUT_METHOD = ["bank", "bkash", "cash"] as const;
  type PayoutMethodType = typeof VALID_PAYOUT_METHOD[number];
  const payoutMethod = (m: unknown): PayoutMethodType =>
    VALID_PAYOUT_METHOD.includes(m as PayoutMethodType) ? (m as PayoutMethodType) : "bank";

  const ownerNameMap: Record<string, string> = {};
  for (const o of owners) ownerNameMap[o.id] = o.name;

  const turfNameMap: Record<string, string> = {};
  for (const t of turfs) turfNameMap[t.id] = t.name;

  const payouts = load<{
    id?: string;
    ownerId: string;
    ownerName?: string;
    turfName?: string;
    turfId?: string;
    amount?: number;
    bmtCut?: number;
    date?: string;
    method?: string;
    txId?: string;
    transactionId?: string;
    proofUrl?: string;
    createdAt?: string;
  }>("payouts.json");

  let poCount = 0;
  for (const p of payouts) {
    const id = p.id ?? createId();
    const ownerName = p.ownerName ?? ownerNameMap[p.ownerId] ?? "Owner";
    const turfId = p.turfId ?? ownerToTurf[p.ownerId] ?? "";
    const turfName = p.turfName ?? turfNameMap[turfId] ?? "Turf";
    const date =
      p.date ??
      (p.createdAt ? p.createdAt.split("T")[0] : new Date().toISOString().split("T")[0]);
    const txId = p.txId ?? p.transactionId ?? undefined;

    await prisma.payout.upsert({
      where: { id },
      update: {
        ownerId: p.ownerId,
        ownerName,
        turfName,
        amount: p.amount ?? 0,
        bmtCut: p.bmtCut ?? 0,
        date,
        method: payoutMethod(p.method),
        txId,
        proofUrl: p.proofUrl ? cleanImg(p.proofUrl) : null,
      },
      create: {
        id,
        ownerId: p.ownerId,
        ownerName,
        turfName,
        amount: p.amount ?? 0,
        bmtCut: p.bmtCut ?? 0,
        date,
        method: payoutMethod(p.method),
        txId,
        proofUrl: p.proofUrl ? cleanImg(p.proofUrl) : null,
        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
      },
    });
    poCount++;
    if (poCount % 100 === 0) process.stdout.write(`\r   Payouts: ${poCount}`);
  }
  console.log(`\n✅  Payouts     (${poCount})`);

  // ──16. WalletRequests ─────────────────────────────────────────
  // JSON schema: { id, playerId, playerName, amount, method, screenshotBase64,
  //               status, createdAt, reviewedAt, note, type }
  // Prisma schema: { id, playerId, playerName, amount, method (WalletRechargeMethod),
  //                  screenshotUrl, status, createdAt, reviewedAt, note }

  const VALID_WR_STATUS = ["pending", "approved", "rejected"] as const;
  type WRStatusType = typeof VALID_WR_STATUS[number];
  const wrStatus = (s: unknown): WRStatusType =>
    VALID_WR_STATUS.includes(s as WRStatusType) ? (s as WRStatusType) : "pending";

  const playerNameMap: Record<string, string> = {};
  for (const p of players) playerNameMap[p.id] = p.fullName;

  const walletReqs = load<{
    id: string;
    playerId?: string;
    playerName?: string;
    amount?: number;
    method?: string;
    screenshotBase64?: string;
    screenshotUrl?: string;
    proofUrl?: string;
    status?: string;
    createdAt?: string;
    reviewedAt?: string;
    note?: string;
    type?: string;
  }>("wallet-requests.json");

  let wrCount = 0;
  for (const w of walletReqs) {
    if (!w.playerId) continue;

    const playerName = w.playerName ?? playerNameMap[w.playerId] ?? "Player";
    // screenshotBase64 is a base64 → replace with placeholder
    const rawScreenshot = w.screenshotUrl ?? w.proofUrl ?? w.screenshotBase64;
    const screenshotUrl = cleanImg(rawScreenshot);

    await prisma.walletRequest.upsert({
      where: { id: w.id },
      update: {
        playerId: w.playerId,
        playerName,
        amount: w.amount ?? 0,
        method: walletMethod(w.method),
        screenshotUrl,
        status: wrStatus(w.status),
        note: w.note ?? "",
        reviewedAt: w.reviewedAt ? new Date(w.reviewedAt) : null,
      },
      create: {
        id: w.id,
        playerId: w.playerId,
        playerName,
        amount: w.amount ?? 0,
        method: walletMethod(w.method),
        screenshotUrl,
        status: wrStatus(w.status),
        note: w.note ?? "",
        createdAt: w.createdAt ? new Date(w.createdAt) : new Date(),
        reviewedAt: w.reviewedAt ? new Date(w.reviewedAt) : null,
      },
    });
    wrCount++;
    if (wrCount % 200 === 0) process.stdout.write(`\r   WalletRequests: ${wrCount}`);
  }
  console.log(`\n✅  WalletRequests (${wrCount})`);

  console.log("\n🎉  Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
