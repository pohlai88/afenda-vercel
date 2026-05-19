/**
 * Inspect remote Workflow DevKit runs on Vercel (uses dev-stack constants).
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  AFENDA_VERCEL_PROJECT_NAME,
  AFENDA_VERCEL_TEAM_SLUG,
} from "./lib/dev-stack-constants.shared.mjs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

const result = spawnSync(
  "pnpm",
  [
    "exec",
    "workflow",
    "inspect",
    "runs",
    "--backend",
    "vercel",
    "--project",
    AFENDA_VERCEL_PROJECT_NAME,
    "--team",
    AFENDA_VERCEL_TEAM_SLUG,
    ...process.argv.slice(2),
  ],
  {
    cwd: root,
    shell: process.platform === "win32",
    stdio: "inherit",
    env: process.env,
  }
)

process.exit(result.status === null ? 1 : (result.status ?? 1))
