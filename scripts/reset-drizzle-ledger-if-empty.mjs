/**
 * When `public` has no tables but `drizzle.__drizzle_migrations` has rows, migrate is a no-op.
 * Clears the ledger only in that state so `pnpm db:migrate:local` can replay SQL.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"

import nextEnv from "@next/env"
import pg from "pg"

const { loadEnvConfig } = nextEnv
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
loadEnvConfig(root)

const url = process.env.DATABASE_URL_UNPOOLED?.trim() || process.env.DATABASE_URL?.trim()
if (!url) {
  console.error("DATABASE_URL missing")
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: url })
try {
  const publicRes = await pool.query(
    `SELECT count(*)::int AS count FROM pg_tables WHERE schemaname = 'public'`
  )
  const publicTables = publicRes.rows[0]?.count ?? 0
  const mig = await pool.query(
    `SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`
  )
  const migrationRows = mig.rows[0]?.count ?? 0
  if (publicTables > 0) {
    console.log(
      `[reset-drizzle-ledger] public has ${publicTables} tables — ledger not cleared.`
    )
    process.exit(0)
  }
  if (migrationRows === 0) {
    console.log("[reset-drizzle-ledger] ledger already empty.")
    process.exit(0)
  }
  await pool.query(`DELETE FROM drizzle.__drizzle_migrations`)
  console.log(
    `[reset-drizzle-ledger] cleared ${migrationRows} ledger row(s); run pnpm db:migrate:local`
  )
} finally {
  await pool.end()
}
