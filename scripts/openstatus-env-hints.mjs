/**
 * Prints suggested OpenStatus env lines from the authenticated CLI (`openstatus login`
 * or `OPENSTATUS_API_TOKEN`). Requires the CLI binary from https://openstatus.dev
 *
 *   node scripts/with-env.mjs node scripts/openstatus-env-hints.mjs
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

function resolveOpenstatusExecutable() {
  const fromEnv = process.env.OPENSTATUS_CLI?.trim()
  if (fromEnv) return fromEnv
  const base = path.join(os.homedir(), ".openstatus", "bin")
  const win = path.join(base, "openstatus.exe")
  const unix = path.join(base, "openstatus")
  if (process.platform === "win32" && fs.existsSync(win)) return win
  if (fs.existsSync(unix)) return unix
  return "openstatus"
}

function runJson(args) {
  const exe = resolveOpenstatusExecutable()
  const result = spawnSync(exe, ["--json", ...args], {
    encoding: "utf8",
    cwd: root,
    env: process.env,
    shell: process.platform === "win32",
  })
  if (result.error) {
    console.error("[openstatus-env-hints]", result.error.message)
    process.exit(1)
  }
  if (result.status !== 0) {
    console.error(
      "[openstatus-env-hints] CLI failed:",
      result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status}`
    )
    process.exit(1)
  }
  return JSON.parse(result.stdout.trim())
}

const token = process.env.OPENSTATUS_API_TOKEN?.trim()
if (!token) {
  console.error(
    "[openstatus-env-hints] Set OPENSTATUS_API_TOKEN (or run `openstatus login`), then:\n" +
      "  node scripts/with-env.mjs node scripts/openstatus-env-hints.mjs"
  )
  process.exit(1)
}

const whoami = runJson(["whoami"])
const pages = runJson(["status-page", "list"])

const page = pages[0]
if (!page) {
  console.error("[openstatus-env-hints] No status pages returned.")
  process.exit(1)
}

console.log(
  "# Paste into `.env.config` (merge with your existing OPENSTATUS_API_TOKEN)."
)
console.log(`OPENSTATUS_PUBLIC_STATUS_URL=${page.url}`)
console.log(`OPENSTATUS_STATUS_PAGE_ID=${page.id}`)
console.log(`OPENSTATUS_STATUS_PAGE_SLUG=${page.title}`)
console.log(`OPENSTATUS_WORKSPACE_SLUG=${whoami.slug}`)
console.log("")
console.log("# Then: pnpm env:sync")
