/**
 * Shared dev-stack prep — env files + workflow generated cleanup.
 * Used by dev-stack.mjs and run-next-dev (workflow role). Avoid duplicate spawns.
 */
import { rm } from "node:fs/promises"
import fs from "node:fs"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

import { ensureWorkflowEnvFile } from "../sync-env-workflow.mjs"

const defaultRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
)

const workflowOutputDirName = path.join("app", ".well-known", "workflow")

/**
 * @param {{ root?: string }} [opts]
 */
export async function cleanWorkflowGenerated(opts = {}) {
  const root = opts.root ?? defaultRoot
  const workflowOutputDir = path.join(root, workflowOutputDirName)
  await rm(workflowOutputDir, {
    force: true,
    recursive: true,
    maxRetries: 5,
    retryDelay: 200,
  })
}

/**
 * Ensures `.env.local` exists (runs `pnpm env:sync` only when missing) and
 * `.env.workflow.local` is present (generates only when missing unless `refreshWorkflowEnv`).
 *
 * @param {{ root?: string; refreshWorkflowEnv?: boolean; log?: (msg: string) => void }} [opts]
 * @returns {{ workflowEnv: import("../sync-env-workflow.mjs").EnsureWorkflowEnvResult }}
 */
export function prepareDevStackEnv(opts = {}) {
  const root = opts.root ?? defaultRoot
  const log = opts.log ?? (() => {})
  const envLocalPath = path.join(root, ".env.local")

  if (!fs.existsSync(envLocalPath)) {
    log("[dev:stack] running pnpm env:sync …")
    const sync = spawnSync("pnpm", ["env:sync"], {
      cwd: root,
      shell: process.platform === "win32",
      stdio: "inherit",
      env: process.env,
    })
    if (sync.status !== 0) {
      process.exit(sync.status ?? 1)
    }
  }

  const workflowEnv = ensureWorkflowEnvFile({
    root,
    force: opts.refreshWorkflowEnv === true,
    log,
  })

  if (workflowEnv.status === "error") {
    console.error(`[dev:stack] ${workflowEnv.message}`)
    process.exit(1)
  }

  return { workflowEnv }
}
