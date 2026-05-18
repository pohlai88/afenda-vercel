/**
 * Edit-loop gate (Tier L0) — default command for IDE agents and local iteration.
 *
 * Usage:
 *   pnpm gate                          → app typecheck only (~15s warm)
 *   pnpm gate -- lib/features/hrm/     → lint:path + typecheck
 *   pnpm gate:help                     → print ladder
 *   pnpm gate:dry-run -- <paths>       → print planned commands only
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { parseGateArgs, planGateCommands } from "./gate-args.shared.mjs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const isWindows = process.platform === "win32"

const rawArgs = process.argv.slice(2)

if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
  const help = spawnSync("node", ["scripts/gate-help.mjs"], {
    cwd: root,
    stdio: "inherit",
    shell: isWindows,
  })
  process.exit(help.status ?? 0)
}

const { dryRun, paths } = parseGateArgs(rawArgs)

if (dryRun) {
  const steps = planGateCommands(paths)
  console.log("[gate:dry-run] Tier L0 — would run:\n")
  for (const step of steps) {
    console.log(`  ${step}`)
  }
  process.exit(0)
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: isWindows,
  })
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (paths.length > 0) {
  run("node", ["scripts/lint-path.mjs", ...paths])
}

run("pnpm", ["typecheck"])

if (paths.length === 0) {
  console.log(
    "\n[gate] Tip: pass touched paths for ESLint in the same run:\n" +
      "  pnpm gate -- lib/features/hrm/\n\n" +
      "  pnpm gate:help      full ladder\n" +
      "  pnpm gate:dry-run   print L0 plan without running\n"
  )
}
