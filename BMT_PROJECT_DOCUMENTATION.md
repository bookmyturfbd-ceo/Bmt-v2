# Book My Turf BD (BMT Live) - Complete Project Documentation

## 1. Project Overview

**Book My Turf BD** (BMT) is a comprehensive, full-stack Next.js web application designed for booking sports turfs, scheduling matches, and managing sports tournaments in Bangladesh. It serves three main audiences:
1. **Players/Teams**: For booking turfs, finding opponents, participating in tournaments, viewing leaderboards, and tracking stats/MMR.
2. **Turf Owners**: For listing venues, managing slots, overseeing finances/ledger, and viewing bookings.
3. **Organizers / Super Admin**: For setting up tournaments, overseeing operations, global settings, and dispute resolution.

### Technology Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS 4 (via PostCSS)
- **State Management**: Zustand (for client-side stores like `bmtStore` and `useCartStore`)
- **Database ORM**: Prisma (v7.7.0)
- **Database**: PostgreSQL (hosted on Supabase or Railway)
- **Authentication**: Custom authentication system using `bcryptjs` and HTTP-only cookies/JWTs (No third-party auth provider like Auth0 or NextAuth is used).
- **Internationalization**: `next-intl`
- **Video/Media**: `@mux/mux-node` and `@mux/mux-player-react` for highlights/reels
- **Mapping**: `leaflet` & `react-leaflet` for turf locations
- **Exports**: `jspdf` and `html2canvas` for PDF generation (e.g., invoices/reports)

## 2. Authentication & Roles

The system does NOT use standard NextAuth or Supabase Auth. It relies on a custom implementation checking hashed passwords stored in the database.

**Login Endpoint**: `src/app/api/auth/login/route.ts`
**Cookies Set**: `bmt_auth`, `bmt_role`, `bmt_name`, `bmt_player_id` / `bmt_owner_id`, `org_token` (JWT for organizers).

### Roles:
1. **Super Admin**: Hardcoded backdoor (`admin@bmt.com` / `Pass11408812#$`). Redirects to `/en/admin`.
2. **Turf Owner**: Authenticates against the `Owner` table. Redirects to `/en/dashboard/owner`.
3. **Organizer**: Authenticates against the `Organizer` table. Uses a secure JWT (`org_token`). Redirects to `/en/organizer/dashboard`.
4. **Player**: Authenticates against the `Player` table. Supports soft/perma bans. Redirects to `/en`.

## 3. Database Schema (Prisma)

The schema (`prisma/schema.prisma`) is highly relational and defines the entire business logic.

### Core Entities:
- **Player**: Contains auth info, wallets, MMR (Matchmaking Rating) for both football and cricket, tournament MMR, badges, and ban status.
- **Owner**: Turf business accounts with wallet balances, payout tracking, and a separate `FinanceLock` (4-digit PIN for sensitive finance sections).
- **Turf**: The venue. Linked to `City` and `Division`. Contains revenue models (percentage vs monthly), house rules, and CDN URLs for logos/images.
- **Ground**: Sub-venues within a turf (e.g., "Pitch A").
- **Slot**: Time slots for grounds with distinct statuses (`available`, `walkin`, `maintenance`, `booked`).
- **Booking**: Links a Player to a Slot. Handles splits (for group bookings) and payment proofs.

### Gamification & Matchmaking:
- **Team**: Player-created teams with roles (owner, manager, captain, etc.).
- **Match**: Represents challenges. Has complex state machines (`PENDING`, `INTERACTION`, `SCHEDULED`, `LIVE`, `SCORE_ENTRY`, `COMPLETED`, `DISPUTED`).
- **PlayerBadge**: Achievements earned (e.g., `MVP`, `THE_SNIPER`, `POWER_HITTER`).

### Cricket Specifics:
Detailed tracking for cricket including `DeliveryType` (Wide, No Ball, Legal), `DismissalType` (Bowled, Caught, LBW), and `InningsStatus`.

### Finance:
- **LedgerEntry** / **LedgerConclusion**: Monthly close-outs for owners.
- **Payout**: Disbursements from BMT to Turf Owners.
- **WalletRequest**: Top-ups initiated by players (eKash, Nagad, Bank) with manual admin review.

## 4. Architecture & Directory Structure

- `src/app/[locale]/`: The core frontend, grouped by feature and wrapped in `next-intl` localization logic.
  - `/admin`: Super admin dashboard.
  - `/arena`: Possibly matchmaking or live match lobbies.
  - `/auction`: For tournament player auctions.
  - `/book`: Turf booking flow.
  - `/dashboard`: Owner dashboard.
  - `/interact`: Match negotiation / Challenge Market phase.
  - `/leaderboard`: Global MMR rankings.
  - `/matches`: User match history.
  - `/organizer`: Tournament organizer panel.
  - `/play`: Group play requests.
  - `/score`: Live scoring interface for matches.
  - `/tournaments`: Tournament listings and details.
  - `/turf`: Individual turf public profiles.
- `src/app/api/`: Custom REST endpoints grouped by feature (e.g., `/api/auth`, `/api/admin`, `/api/bmt`, `/api/matches`).
- `src/components/`: Reusable UI components organized by domain (`admin`, `auth`, `book`, `home`, `match`, `owner`, `ui`).
- `src/lib/`: Core utilities and business logic.
  - `mmrCalculator.ts`: Contains the MMR algorithms (Win +70, Loss -40, Draw +35 for players).
  - `bmtStore.ts`: Global lookup cache using Zustand/localStorage for Cities, Sports, Divisions, etc.
  - `prisma.ts` / `supabase.ts`: Database clients.
  - `rankUtils.ts`: Badge and ranking helpers.
- `src/store/`: Zustand stores (e.g., `useCartStore.ts` for shop/booking carts).

## 5. Key Business Processes

### 1. Booking Flow
- Players browse turfs -> select an available `Slot` -> create a `Booking`.
- Can be split among multiple players (`BookingSplit`).
- If via "Challenge Market", a specific `bookingCode` is generated.

### 2. Challenge Market & Matches (The "Interact" Phase)
- Teams issue challenges (`MatchStatus.PENDING`).
- Opponent accepts, entering the `INTERACTION` phase to negotiate roster, venue, and chat.
- Once agreed and booked, status becomes `SCHEDULED`.
- At match time, it becomes `LIVE` with live scoring events.
- Post-match, it moves to `SCORE_ENTRY` where both captains/managers sign off. If signed off, MMR is distributed and status becomes `COMPLETED`. If they disagree, it moves to `DISPUTED`.

### 3. MMR (Matchmaking Rating) System
- Dual MMR system: Football and Cricket (tracked separately).
- **Teams**: Win (+80), Loss (-40), Draw (+40).
- **Players**: Win (+70), Loss (-40), Draw (+35).
- **Badges**: MVP gives +20 MMR bonus; other badges give +10 MMR bonus. (Calculated in `mmrCalculator.ts`).

### 4. Finances & Owner Payouts
- Owners have a dashboard to see their `Turfs`.
- BMT takes a cut based on the `RevenueModel` (either a percentage per booking or a fixed monthly fee).
- `LedgerConclusion` runs monthly to aggregate total app income vs total walk-ins.
- Access to the financial section requires a secondary `FinanceLock` PIN.

## 6. Developer Guidelines & Gotchas

1. **Authentication State**: Because BMT uses a completely custom cookie-based authentication, always rely on reading the `bmt_role` and `bmt_player_id` cookies rather than standard `getServerSession` calls.
2. **Server Actions vs API Routes**: Most mutations appear to be handled via `/api/*` REST routes rather than Next 14/15 Server Actions, though modern Next.js 16 is in use.
3. **Database Migrations**: Always use `npx prisma db push` or `npx prisma migrate dev` when altering `schema.prisma`.
4. **State Caching**: The platform heavily relies on localStorage caching via `bmtStore.ts` for static entities (Divisions, Cities). If making updates to these, cache invalidation might be required.
5. **Types**: Rely on Prisma-generated types from `@prisma/client`.
6. **Timezones**: Ensure bookings and slots respect the local BD timezone properly as `startTime` and `endTime` are often stored as string "HH:MM".
