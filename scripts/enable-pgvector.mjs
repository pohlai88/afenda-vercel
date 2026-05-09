/**
 * Ensures the pgvector extension exists in the database.
 * Run before `pnpm db:migrate:local` on a fresh / nuked Neon branch.
 *
 *   node scripts/with-env.mjs node scripts/enable-pgvector.mjs
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL)

const before =
  await sql`SELECT extname FROM pg_extension WHERE extname = 'vector'`
if (before.length > 0) {
  console.log("✅  pgvector already installed — nothing to do.")
} else {
  console.log("⚙️   Installing pgvector extension …")
  await sql`CREATE EXTENSION IF NOT EXISTS vector`
  const after =
    await sql`SELECT extname FROM pg_extension WHERE extname = 'vector'`
  if (after.length > 0) {
    console.log("✅  pgvector installed successfully.")
  } else {
    console.error(
      "❌  pgvector install failed — check Neon project settings (pgvector must be enabled on the Neon project)."
    )
    process.exit(1)
  }
}
