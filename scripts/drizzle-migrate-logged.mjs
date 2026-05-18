/**
 * Runs Drizzle SQL migrations with full Postgres error output.
 * `drizzle-kit migrate` can exit 1 without printing the failure (CLI spinner bug).
 *
 * Env resolution matches `.config/drizzle.config.ts`: `@next/env` then
 * `DATABASE_URL_UNPOOLED` over `DATABASE_URL`.
 *
 * Usage:
 *   `node scripts/with-env.mjs node scripts/drizzle-migrate-logged.mjs`
 *   `pnpm db:migrate:local` (see package.json)
 */
import path from "node:path"
import { fileURLToPath } from "node:url"

/** @next/env ships CJS — default import only from ESM `.mjs` (Node 20+). */
import nextEnv from "@next/env"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import pg from "pg"

const { loadEnvConfig } = nextEnv

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const migrationsFolder = path.join(root, "drizzle")

loadEnvConfig(root)

const unpooled = process.env.DATABASE_URL_UNPOOLED?.trim()
const pooled = process.env.DATABASE_URL?.trim()
const url = unpooled || pooled
if (!url) {
  console.error(
    "[drizzle-migrate-logged] DATABASE_URL is not set (optional DATABASE_URL_UNPOOLED)."
  )
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: url })
const db = drizzle(pool)

try {
  await migrate(db, { migrationsFolder })
  console.log("[drizzle-migrate-logged] OK — migrations applied.")
} catch (err) {
  console.error("[drizzle-migrate-logged] Migration failed:")
  console.error(err)
  const code = err?.cause?.code ?? err?.code
  if (code === "42P07") {
    console.error(
      "\n[hint] relation already exists — the database likely has tables from `db:push` or a partial migrate while `__drizzle_migrations` is out of sync.\n" +
        "        On a throwaway branch: `pnpm db:extensions:local` then `node scripts/with-env.mjs node scripts/nuke-db-public.mjs` then re-run `pnpm db:migrate:local`.\n" +
        "        `pnpm db:push` is disabled (ADR-0032) — use db:generate → lint:drizzle-journal → db:migrate:local."
    )
  }
  process.exit(1)
} finally {
  await pool.end()
}
