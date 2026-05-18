/**
 * L0 gate dry-run — print planned commands without executing.
 *
 * Usage:
 *   pnpm gate:dry-run
 *   pnpm gate:dry-run -- lib/features/hrm/
 */
import { parseGateArgs, planGateCommands } from "./gate-args.shared.mjs"

const { paths } = parseGateArgs(process.argv.slice(2))
const steps = planGateCommands(paths)

console.log("[gate:dry-run] Tier L0 — would run:\n")
for (const step of steps) {
  console.log(`  ${step}`)
}

if (paths.length === 0) {
  console.log(
    "\n[gate:dry-run] No paths — ESLint skipped. Pass paths to include lint:path:\n" +
      "  pnpm gate:dry-run -- lib/features/hrm/\n"
  )
}

console.log("\n[gate:dry-run] Escalation (not run in dry-run):")
console.log("  L2 push:  pnpm gate:push")
console.log("  L3 merge: pnpm gate:merge")
console.log("\nRun pnpm gate:help for the full ladder.")
