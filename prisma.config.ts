// Prisma 7 config
// For Supabase: migrations require a direct connection (not PgBouncer pooler).
// We pass DIRECT_URL here so the CLI can run DDL. PrismaClient at runtime
// should be initialised with DATABASE_URL (pooler) — handled in src/lib/prisma.ts.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts",
  },
  datasource: {
    // Use the direct (non-pooled) URL so prisma migrate can run DDL statements.
    // Supabase PgBouncer (port 6543) blocks DDL; direct connection (port 5432) does not.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"] ?? "",
  },
});
