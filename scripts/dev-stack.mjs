/**
 * Local dev stack: workflow Next (3002) → health → UI Next (3000) + `workflow web`.
 *
 * Default: fast path (local dotenv, no Vercel SDK preflight). Use --full for linked Vercel env.
 *
 * Usage: pnpm dev:stack [--help] [--full] [--no-vercel-env-run] [--no-web] [--strict] [--refresh-env]
 *        [--workflow-only] [--ui-only]
 */
import { spawn, spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  cleanWorkflowGenerated,
  prepareDevStackEnv,
} from "./lib/dev-stack-bootstrap.shared.mjs"
import {
  AFENDA_DEV_UI_ORIGIN,
  AFENDA_DEV_UI_PORT,
  AFENDA_DEV_WORKFLOW_ORIGIN,
  AFENDA_DEV_WORKFLOW_PORT,
  AFENDA_VERCEL_PROJECT_NAME,
  AFENDA_VERCEL_TEAM_SLUG,
} from "./lib/dev-stack-constants.shared.mjs"
import { killProcessTree } from "./lib/dev-stack-kill-tree.shared.mjs"
import { listPortsInUse } from "./lib/dev-stack-port-check.shared.mjs"
import { spawnNextDevServer } from "./lib/dev-stack-spawn-next.shared.mjs"
import { runDevStackVercelPreflight } from "./lib/dev-stack-vercel-preflight.mjs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

const WORKFLOW_WAIT_MS = 120_000
const WORKFLOW_WAIT_MS_FULL = 300_000

const args = new Set(process.argv.slice(2))
const showHelp = args.has("--help") || args.has("-h")
const full = args.has("--full")
const legacyFast = args.has("--fast")
const noVercelEnvRun =
  args.has("--no-vercel-env-run") || !full
const noWeb = args.has("--no-web")
const strict = args.has("--strict")
const refreshEnv = args.has("--refresh-env")
const workflowOnly = args.has("--workflow-only")
const uiOnly = args.has("--ui-only")

if (showHelp) {
  printHelp()
  process.exit(0)
}

if (workflowOnly && uiOnly) {
  console.error(
    "[dev:stack] --workflow-only and --ui-only are mutually exclusive."
  )
  process.exit(1)
}

/** @type {import('node:child_process').ChildProcess[]} */
const children = []

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)

async function main() {
  if (legacyFast) {
    console.log(
      "[dev:stack] --fast is the default; use --full for Vercel SDK preflight + workflow health."
    )
  }

  if (full) {
    const preflight = await runDevStackVercelPreflight({
      strict,
      skipVercelEnvDryRun: noVercelEnvRun,
    })
    for (const w of preflight.warnings) {
      console.warn(`[dev:stack] ${w}`)
    }
    if (!preflight.ok) {
      for (const e of preflight.errors) {
        console.error(`[dev:stack] ${e}`)
      }
      process.exit(1)
    }
  }

  const portsToCheck = []
  if (!uiOnly) portsToCheck.push(AFENDA_DEV_WORKFLOW_PORT)
  if (!workflowOnly) portsToCheck.push(AFENDA_DEV_UI_PORT)
  const busy = await listPortsInUse(portsToCheck)
  if (busy.length > 0) {
    console.error(
      `[dev:stack] port(s) already in use: ${busy.join(", ")} — stop other dev servers or use --workflow-only / --ui-only.`
    )
    process.exit(1)
  }

  prepareDevStackEnv({
    root,
    refreshWorkflowEnv: refreshEnv,
    log: (msg) => console.log(msg),
  })

  const needsWorkflowArtifacts = !uiOnly
  if (needsWorkflowArtifacts) {
    await cleanWorkflowGenerated({ root })
  }

  const useVercelEnvRun = !noVercelEnvRun
  const workflowWaitMs = full ? WORKFLOW_WAIT_MS_FULL : WORKFLOW_WAIT_MS

  if (!uiOnly) {
    console.log(
      `[dev:stack] starting workflow server on ${AFENDA_DEV_WORKFLOW_ORIGIN} …`
    )
    spawnTracked(
      spawnNextDevServer({
        role: "workflow",
        useVercelEnvRun,
        label: "workflow",
      })
    )

    runSync(
      "node",
      [
        "scripts/wait-for-http.mjs",
        `${AFENDA_DEV_WORKFLOW_ORIGIN}/.well-known/workflow/v1/flow`,
        `--timeout-ms=${workflowWaitMs}`,
        "--accept=404,405",
      ],
      { inherit: true }
    )

    if (full) {
      const health = spawnSync(
        "pnpm",
        [
          "exec",
          "workflow",
          "health",
          "--port",
          String(AFENDA_DEV_WORKFLOW_PORT),
        ],
        {
          cwd: root,
          shell: process.platform === "win32",
          stdio: "inherit",
          env: process.env,
        }
      )
      if (health.status !== 0) {
        console.warn(
          `[dev:stack] workflow health exited ${health.status ?? "?"} — WDK route probe already passed; continuing (run a workflow on ${AFENDA_DEV_WORKFLOW_ORIGIN} to populate local data).`
        )
      }
    }
  }

  if (!workflowOnly) {
    console.log(`[dev:stack] starting UI server on ${AFENDA_DEV_UI_ORIGIN} …`)
    spawnTracked(
      spawnNextDevServer({
        role: "ui",
        useVercelEnvRun,
        label: "ui",
      })
    )
  }

  if (!noWeb && !uiOnly) {
    spawnTracked(
      spawn("pnpm", ["exec", "workflow", "web"], {
        cwd: root,
        shell: process.platform === "win32",
        stdio: "inherit",
        env: process.env,
      }),
      { optional: true }
    )
  }

  printBanner()
  await new Promise(() => {})
}

function printHelp() {
  console.log(`Afenda dev stack — UI :${AFENDA_DEV_UI_PORT} + workflow :${AFENDA_DEV_WORKFLOW_PORT}

Usage: pnpm dev:stack [options]

Default (fast): local .env files, no Vercel SDK preflight, ${WORKFLOW_WAIT_MS / 1000}s workflow wait.

Options:
  --help, -h              Show this help
  --full                  Vercel SDK preflight + vercel env run + workflow health + ${WORKFLOW_WAIT_MS_FULL / 1000}s wait
  --fast                  Deprecated alias (fast is already the default)
  --no-vercel-env-run     Use .env.local / .env.workflow.local only (default unless --full)
  --no-web                Skip workflow web
  --strict                Fail preflight without VERCEL_TOKEN / link (--full only)
  --refresh-env           Regenerate .env.workflow.local
  --workflow-only         Port ${AFENDA_DEV_WORKFLOW_PORT} only
  --ui-only               Port ${AFENDA_DEV_UI_PORT} only (skips workflow clean + WDK)

Related:
  pnpm dev:stack:full      Same as --full
  pnpm dev:stack:preflight SDK + link checks (no servers)
  pnpm dev:stack:inspect   Remote WDK runs on Vercel
  pnpm env:sync:workflow   env:sync + force-regenerate workflow env file

Test durable workflows on ${AFENDA_DEV_WORKFLOW_ORIGIN} (not :${AFENDA_DEV_UI_PORT}).
`)
}

function printBanner() {
  console.log("")
  console.log("── Afenda dev stack ─────────────────────────────────────")
  if (!uiOnly) {
    console.log(`  Workflow (WDK):  ${AFENDA_DEV_WORKFLOW_ORIGIN}`)
    console.log(
      `  Health:          pnpm exec workflow health --port ${AFENDA_DEV_WORKFLOW_PORT}`
    )
  }
  if (!workflowOnly) {
    console.log(`  UI (edit):       ${AFENDA_DEV_UI_ORIGIN}`)
  }
  if (!noWeb && !uiOnly) {
    console.log("  WDK web:         (see workflow web output above)")
  }
  console.log(
    `  Mode:            ${full ? "full (Vercel preflight)" : "fast (local env)"}`
  )
  console.log(
    `  WDK Vercel:      pnpm dev:stack:inspect  (${AFENDA_VERCEL_PROJECT_NAME} / ${AFENDA_VERCEL_TEAM_SLUG})`
  )
  console.log("  Stop:            Ctrl+C")
  console.log("────────────────────────────────────────────────────────")
  console.log("")
}

/**
 * @param {string} cmd
 * @param {string[]} cmdArgs
 * @param {{ inherit?: boolean }} [opts]
 */
function runSync(cmd, cmdArgs, opts = {}) {
  const result = spawnSync(cmd, cmdArgs, {
    cwd: root,
    shell: process.platform === "win32",
    stdio: opts.inherit ? "inherit" : "pipe",
    env: process.env,
  })
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
  return result
}

/**
 * @param {import('node:child_process').ChildProcess} child
 * @param {{ optional?: boolean }} [opts]
 */
function spawnTracked(child, opts = {}) {
  child.on("exit", (code, signal) => {
    if (signal) {
      console.log(`[dev:stack] child exited (${signal})`)
    } else if (code && code !== 0) {
      if (opts.optional) {
        console.warn(
          `[dev:stack] optional child exited with code ${code} (stack continues).`
        )
        return
      }
      console.error(`[dev:stack] child exited with code ${code}`)
      shutdown()
      process.exit(code)
    }
  })
  children.push(child)
}

function shutdown() {
  for (const child of children) {
    killProcessTree(child)
  }
}

main().catch((err) => {
  console.error(err)
  shutdown()
  process.exit(1)
})
