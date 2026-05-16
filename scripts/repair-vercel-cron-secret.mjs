/**
 * Re-push only CRON_SECRET from `.env.config` to Vercel (production + preview).
 * Use after `pnpm env:sync` normalizes whitespace — fixes Vercel build:
 *   "CRON_SECRET environment variable contains leading or trailing whitespace"
 *
 * Usage: pnpm env:repair-vercel-cron
 *        pnpm env:repair-vercel-cron -- --dry-run
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const vercelCli = path.join(root, "node_modules", "vercel", "dist", "vc.js")
const configPath = path.join(root, ".env.config")
const vercelDir = path.join(root, ".vercel")
const dryRun = process.argv.includes("--dry-run")
const TARGETS = ["production", "preview"]

function parseDotenv(content) {
  const out = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val.trim()
  }
  return out
}

function normalizeCronSecret(raw) {
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/\s/g, "")
}

if (!fs.existsSync(vercelDir)) {
  console.error(
    "[env:repair-vercel-cron] No .vercel/ — run: vercel link --yes --scope jacks-projects-7b3cfe94 --project afenda-vercel"
  )
  process.exit(1)
}

if (!fs.existsSync(configPath)) {
  console.error("[env:repair-vercel-cron] Missing .env.config")
  process.exit(1)
}

const raw = parseDotenv(fs.readFileSync(configPath, "utf8")).CRON_SECRET
if (!raw) {
  console.error(
    "[env:repair-vercel-cron] CRON_SECRET is empty in .env.config — set it, run pnpm env:sync, then retry."
  )
  process.exit(1)
}

const value = normalizeCronSecret(raw)
if (value !== raw) {
  console.log(
    "[env:repair-vercel-cron] Normalized local CRON_SECRET (removed whitespace)."
  )
}

for (const target of TARGETS) {
  const args = [
    vercelCli,
    "env",
    "add",
    "CRON_SECRET",
    target,
    "--force",
    "--sensitive",
  ]
  if (dryRun) {
    console.log(`[dry-run] vercel env add CRON_SECRET ${target}`)
    continue
  }
  const r = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf-8",
    input: value,
    stdio: ["pipe", "pipe", "pipe"],
    shell: false,
  })
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout)
    process.exit(r.status ?? 1)
  }
  console.log(`[env:repair-vercel-cron] Updated CRON_SECRET for ${target}.`)
}

console.log(
  "[env:repair-vercel-cron] Done. Redeploy on Vercel (or push to main) to verify the build."
)
