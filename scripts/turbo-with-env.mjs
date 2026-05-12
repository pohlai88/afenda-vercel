/**
 * Spawn `pnpm exec turbo …` after optionally loading `.env.local` into `process.env`.
 *
 * Turbo does not load Next.js env files; this repo keeps optional Remote Cache and
 * telemetry overrides (`TURBO_*`) in `.env.local` (gitignored). CI injects the same
 * variables via GitHub Actions secrets — never overridden here (`override: false`).
 *
 * Usage (from package.json): node scripts/turbo-with-env.mjs run lint …
 */
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { config } from "dotenv"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const envLocal = path.join(root, ".env.local")

if (existsSync(envLocal)) {
  config({ path: envLocal, override: false })
}

const forwarded = process.argv.slice(2)
if (forwarded.length === 0) {
  console.error(
    "[turbo-with-env] Missing turbo CLI arguments after script name."
  )
  process.exit(1)
}

/**
 * Windows resolves `pnpm` as `pnpm.cmd` / `pnpm.bat`. Node's `child_process.spawn`
 * refuses to invoke those shims without `shell: true` and returns `ENOENT`
 * silently (status `null`, no log line). Toggle the shell flag per-platform
 * so the wrapper behaves identically on POSIX and Windows CI runners.
 */
const isWindows = process.platform === "win32"
const result = spawnSync("pnpm", ["exec", "turbo", ...forwarded], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
  shell: isWindows,
})

process.exit(result.status ?? 1)
