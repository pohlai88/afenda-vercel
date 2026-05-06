/**
 * Push selected keys from `.env.config` to the linked Vercel project
 * (production + preview) using the Vercel CLI. Requires `vercel link` first.
 *
 * Usage: pnpm env:push-vercel
 * Optional: pnpm env:push-vercel -- --dry-run
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

/** Keys to sync when non-empty in `.env.config` (order does not matter). */
const KEYS = [
  { key: "DATABASE_URL", sensitive: true },
  { key: "BETTER_AUTH_SECRET", sensitive: true },
  { key: "BETTER_AUTH_URL", sensitive: true },
  { key: "BETTER_AUTH_TRUSTED_ORIGINS", sensitive: false },
  { key: "BETTER_AUTH_API_KEY", sensitive: true },
  { key: "BLOB_READ_WRITE_TOKEN", sensitive: true },
  { key: "CRON_SECRET", sensitive: true },
  { key: "NEXT_PUBLIC_APP_NAME", sensitive: false },
  { key: "NEXT_PUBLIC_APP_URL", sensitive: false },
  { key: "NEXT_PUBLIC_STAGE", sensitive: false },
  { key: "NEXT_PUBLIC_SITE_URL", sensitive: false },
  { key: "NEXT_PUBLIC_BETTER_AUTH_INFRA", sensitive: false },
  { key: "NEXT_PUBLIC_TENANT_ROOT_DOMAIN", sensitive: false },
  { key: "OTEL_SERVICE_NAME", sensitive: false },
  { key: "BETTER_AUTH_GITHUB_CLIENT_ID", sensitive: false },
  { key: "BETTER_AUTH_GITHUB_CLIENT_SECRET", sensitive: true },
  { key: "BETTER_AUTH_GOOGLE_CLIENT_ID", sensitive: false },
  { key: "BETTER_AUTH_GOOGLE_CLIENT_SECRET", sensitive: true },
  { key: "BETTER_AUTH_LINKEDIN_CLIENT_ID", sensitive: false },
  { key: "BETTER_AUTH_LINKEDIN_CLIENT_SECRET", sensitive: true },
]

const TARGETS = ["production", "preview"]

function parseDotenv(content) {
  /** @type {Record<string, string>} */
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
    out[key] = val
  }
  return out
}

function vercelEnvAdd({ key, value, target, sensitive }) {
  const args = [vercelCli, "env", "add", key, target, "--force"]
  if (sensitive) args.push("--sensitive")

  if (dryRun) {
    console.log(
      `[dry-run] node ${path.basename(vercelCli)} env add ${key} ${target} … (${sensitive ? "sensitive" : "plain"})`,
    )
    return { status: 0 }
  }

  if (!fs.existsSync(vercelCli)) {
    console.error("[env:push-vercel] Missing node_modules/vercel — run pnpm install")
    return { status: 1, stderr: "" }
  }

  // stdin for value avoids Windows cmd `&` in DATABASE_URL breaking shell parsing.
  return spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf-8",
    input: value.endsWith("\n") ? value : `${value}\n`,
    stdio: ["pipe", "pipe", "pipe"],
    shell: false,
  })
}

if (!fs.existsSync(vercelDir)) {
  console.error(
    "[env:push-vercel] No .vercel/ — run: vercel link --yes --scope <team-slug> --project <name>",
  )
  process.exit(1)
}

if (!fs.existsSync(configPath)) {
  console.error("[env:push-vercel] Missing .env.config")
  process.exit(1)
}

const parsed = parseDotenv(fs.readFileSync(configPath, "utf8"))
let pushed = 0
let skipped = 0

for (const { key, sensitive } of KEYS) {
  const value = parsed[key]
  if (value === undefined || value === "") {
    skipped++
    continue
  }

  for (const target of TARGETS) {
    const r = vercelEnvAdd({ key, value, target, sensitive })
    if (r.status !== 0) {
      console.error(
        `[env:push-vercel] Failed ${key} (${target}):\n${r.stderr || r.stdout || r.error}`,
      )
      process.exit(1)
    }
    pushed++
    if (!dryRun) console.log(`[env:push-vercel] ${key} → ${target}`)
  }
}

console.log(
  dryRun
    ? `[env:push-vercel] Dry run complete (${KEYS.length} keys known; ${skipped} empty in .env.config).`
    : `[env:push-vercel] Done. ${pushed} variable target(s) written; ${skipped} empty key slots skipped.`,
)
