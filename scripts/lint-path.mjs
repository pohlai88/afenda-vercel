/**
 * Targeted ESLint — edit-loop gate only. Never scans the whole repo.
 *
 * Usage: pnpm lint:path -- lib/features/hrm/ app/[locale]/o/
 */
import { spawnSync } from "node:child_process"

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

const isWindows = process.platform === "win32"
const result = spawnSync(
  "pnpm",
  [
    "exec",
    "eslint",
    "--max-warnings=0",
    "--report-unused-disable-directives",
    ...paths,
  ],
  { stdio: "inherit", shell: isWindows }
)

process.exit(result.status ?? 1)
