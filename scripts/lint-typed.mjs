/**
 * L2 typed ESLint — projectService-backed rules (ADR-0042 Phase 3).
 *
 * Usage:
 *   pnpm lint:typed
 *   pnpm lint:typed -- lib/features/hrm/
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const isWindows = process.platform === "win32"

const rawArgs = process.argv.slice(2)
const dashDash = rawArgs.indexOf("--")
const paths =
  dashDash === -1
    ? []
    : rawArgs.slice(dashDash + 1).filter((arg) => arg !== "--" && Boolean(arg))

const eslintArgs = [
  "--max-warnings=0",
  "--config",
  ".config/eslint.typed.config.mjs",
  ...(paths.length > 0 ? paths : ["."]),
]

const result = spawnSync("pnpm", ["exec", "eslint", ...eslintArgs], {
  cwd: root,
  stdio: "inherit",
  shell: isWindows,
})

process.exit(result.status ?? 1)
