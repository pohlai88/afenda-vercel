/**
 * Cross-platform Next dev with isolated distDir (UI vs workflow role).
 * Honors AFENDA_USE_VERCEL_ENV=1 or --vercel-env for `vercel env run` wrapper.
 *
 * Usage: node scripts/run-next-dev.mjs --role=ui|workflow [--vercel-env]
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { buildNextDevCommand } from "./lib/dev-stack-spawn-next.shared.mjs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const roleArg = process.argv.find((a) => a.startsWith("--role="))
const role = roleArg?.slice("--role=".length)
const useVercelEnvRun =
  process.argv.includes("--vercel-env") ||
  process.env.AFENDA_USE_VERCEL_ENV === "1"

if (role !== "ui" && role !== "workflow") {
  console.error(
    "Usage: node scripts/run-next-dev.mjs --role=ui|workflow [--vercel-env]"
  )
  process.exit(1)
}

const built = buildNextDevCommand({ role, useVercelEnvRun })
if (built.warnedNoVercel) {
  console.warn(
    "[run-next-dev] vercel CLI not found — starting without vercel env run."
  )
}

const result = spawnSync(built.command, built.args, {
  cwd: root,
  shell: process.platform === "win32",
  stdio: "inherit",
  env: {
    ...process.env,
    AFENDA_NEXT_DIST_DIR: built.distDir,
  },
})

process.exit(result.status === null ? 1 : (result.status ?? 1))
