/**
 * Targeted ESLint — edit-loop gate only. Never scans the whole repo.
 *
 * Usage: pnpm lint:path -- lib/features/hrm/ app/[locale]/o/
 *
 * Non-ESLint paths (e.g. messages/en.json) are skipped — use pnpm lint:fixtures-parity
 * for message catalog parity. Matches lint-staged (--no-warn-ignored).
 */
import { spawnSync } from "node:child_process"
import path from "node:path"

const ESLINT_FILE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".mjs",
  ".cjs",
])

const paths = process.argv
  .slice(2)
  .filter((arg) => arg !== "--" && !arg.startsWith("-"))

if (paths.length === 0) {
  console.error(
    "[lint:path] Pass one or more paths after `--`:\n" +
      "  pnpm lint:path -- lib/features/hrm/\n" +
      "  pnpm lint:path -- lib/features/hrm/ components2/app-shell/"
  )
  process.exit(1)
}

const lintPaths = []
const skippedPaths = []

for (const entry of paths) {
  const ext = path.extname(entry)
  if (ext && !ESLINT_FILE_EXTENSIONS.has(ext)) {
    skippedPaths.push(entry)
    continue
  }
  lintPaths.push(entry)
}

if (skippedPaths.length > 0) {
  console.log(
    `[lint:path] Skipping non-ESLint paths: ${skippedPaths.join(", ")}\n` +
      "  Message catalogs → pnpm lint:fixtures-parity\n"
  )
}

if (lintPaths.length === 0) {
  process.exit(0)
}

const isWindows = process.platform === "win32"
const result = spawnSync(
  "pnpm",
  [
    "exec",
    "eslint",
    "--max-warnings=0",
    "--report-unused-disable-directives",
    "--no-warn-ignored",
    ...lintPaths,
  ],
  { stdio: "inherit", shell: isWindows }
)

process.exit(result.status ?? 1)
