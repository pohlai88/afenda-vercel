/**
 * Run `next typegen` with the workflow plugin skipped.
 *
 * The Workflow DevKit Next plugin's "Discovering workflow directives" pass takes
 * 12-23s on this codebase (33 steps / 8 workflows / 0 classes) and produces route
 * handlers at `/.well-known/workflow/v1/*`. No application code references those
 * routes via typed imports — they're HTTP endpoints for the workflow runtime —
 * so skipping the plugin during typegen produces identical typed-route output
 * for everything user code actually consumes, with ~15s saved on every
 * `pnpm gate` / `pnpm typecheck` invocation.
 *
 * The skip is gated on `NODE_ENV !== "production"` in `next.config.ts`, so this
 * cannot affect Vercel production builds.
 */
import { spawnSync } from "node:child_process"

const result = spawnSync("pnpm", ["exec", "next", "typegen"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, AFENDA_SKIP_WORKFLOW_PLUGIN: "1" },
})

process.exit(result.status === null ? 1 : (result.status ?? 1))
