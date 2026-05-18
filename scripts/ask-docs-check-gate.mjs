#!/usr/bin/env node
/**
 * User entry for `pnpm ask-docs:check`.
 * Invokes Turbo task `ask-docs:check` (lint deps + noop leaf). When Turbo runs this
 * script as the leaf, `TURBO_HASH` is set — exit 0 without re-invoking Turbo.
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

if (process.env.TURBO_HASH) {
  process.exit(0)
}

const result = spawnSync(
  "node",
  [
    "scripts/turbo-with-env.mjs",
    "run",
    "ask-docs:check",
    "--output-logs=new-only",
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  }
)

process.exit(result.status ?? 1)
