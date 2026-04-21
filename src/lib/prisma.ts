/**
 * Prisma 7 singleton client — uses @prisma/adapter-pg (Rust engine removed in v7).
 * Cached on globalThis to survive Next.js hot-reloads in development.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __prismaPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const pool =
    globalThis.__prismaPool ??
    (globalThis.__prismaPool = new Pool({
      connectionString: process.env["DATABASE_URL"],
    }));

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const prisma: PrismaClient =
  globalThis.__prismaClient ?? (globalThis.__prismaClient = createClient());

export default prisma;
