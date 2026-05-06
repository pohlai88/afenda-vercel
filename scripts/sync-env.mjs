/**
 * Copies the maintainer-managed `.env.config` → `.env.local` for Next.js local dev.
 *
 * Next.js load order (see Next.js docs): `.env` → `.env.local` → `.env.[mode]` → `.env.[mode].local`
 * Use `.env.local` for machine-specific secrets; never commit it.
 *
 * Usage: pnpm env:sync
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const src = path.join(root, ".env.config")
const dest = path.join(root, ".env.local")

if (!fs.existsSync(src)) {
  console.error(
    "[env:sync] Missing .env.config.\n" +
      "  Copy .env.config.example → .env.config and fill in values, then run again.",
  )
  process.exit(1)
}

fs.copyFileSync(src, dest)
console.log("[env:sync] Wrote .env.local from .env.config (restart `pnpm dev` if running).")
