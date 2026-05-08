/**
 * DESTRUCTIVE — drops all app-owned tables in the public schema and
 * removes the drizzle migrations tracking table so the next
 * `pnpm db:generate && pnpm db:migrate:local` starts from a clean slate.
 *
 * Safe: does NOT touch `neon_auth.*` (that schema is Neon-managed).
 *
 * Run once manually:
 *   node scripts/with-env.mjs node scripts/nuke-db-public.mjs
 *
 * AFTER this script, re-enable extensions before migrating:
 *   pnpm db:extensions:local   (re-installs pgvector)
 *   pnpm db:migrate:local
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

// 1. Drop everything in public (CASCADE resolves FK order automatically).
//    Re-create the schema so future migrations can write into it.
console.log("☠️  Dropping public schema …")
await sql`DROP SCHEMA public CASCADE`
await sql`CREATE SCHEMA public`
await sql`GRANT ALL ON SCHEMA public TO public`

console.log("✅  public schema is empty")

// 2. Confirm — list any remaining tables (should be zero)
const rows = await sql`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name
`
if (rows.length === 0) {
  console.log("✅  No tables remain in public schema — clean slate confirmed.")
} else {
  console.warn("⚠️  Leftover tables:", rows.map((r) => r.table_name).join(", "))
}
