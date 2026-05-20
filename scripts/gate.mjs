/**
 * Edit-loop gate (Tier L0) — default command for IDE agents and local iteration.
 *
 * Usage:
 *   pnpm gate                          → app typecheck only (warm ~10–30s; cold often minutes)
 *   pnpm gate -- lib/features/hrm/     → lint:path only (ESLint; add --typecheck for slices)
 *   pnpm gate -- lib/features/hrm/ --typecheck → lint:path + slice-aware typecheck-build
 *   pnpm gate:lint -- <paths>          → lint:path only (alias)
 *   pnpm gate:typecheck                → app typecheck only
 *   pnpm gate:help                     → print ladder
 *   pnpm gate:dry-run -- <paths>       → print planned commands only
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  parseGateArgs,
  planGateCommands,
  shouldRunGateTypecheck,
} from "./gate-args.shared.mjs"
import { resolveTypecheckSlicesForPaths } from "./lib/gate-typecheck-slices.shared.mjs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const isWindows = process.platform === "win32"
const lintOnlyEntry = process.env.npm_lifecycle_event === "gate:lint"

const rawArgs = process.argv.slice(2)

if (rawArgs.includes("--help") || rawArgs.includes("-h")) {
  const help = spawnSync("node", ["scripts/gate-help.mjs"], {
    cwd: root,
    stdio: "inherit",
    shell: isWindows,
  })
  process.exit(help.status ?? 0)
}

const { dryRun, paths, typecheck } = parseGateArgs(rawArgs)
const runTypecheck = shouldRunGateTypecheck(paths, { typecheck, lintOnlyEntry })

if (dryRun) {
  const steps = planGateCommands(paths, { typecheck: runTypecheck })
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
} else if (lintOnlyEntry) {
  console.error(
    "[gate:lint] Pass touched paths:\n  pnpm gate:lint -- lib/features/hrm/\n"
  )
  process.exit(1)
}

if (runTypecheck) {
  if (paths.length > 0) {
    const slices = resolveTypecheckSlicesForPaths(paths)
    console.log(
      `[gate] typecheck slices: ${slices.map((s) => s.label).join(" → ")}\n`
    )
    run("node", ["scripts/typecheck-build.mjs", ...paths])
  } else {
    run("pnpm", ["typecheck"])
  }
} else if (paths.length > 0) {
  console.log(
    "\n[gate] ESLint only — app typecheck was skipped (not path-scoped).\n" +
      "  pnpm gate:typecheck\n" +
      "  pnpm gate -- <paths> --typecheck\n" +
      "  pnpm gate:help\n"
  )
} else {
  console.log(
    "\n[gate] Tip: pass touched paths for targeted ESLint:\n" +
      "  pnpm gate -- lib/features/hrm/\n\n" +
      "  pnpm gate:help      full ladder\n" +
      "  pnpm gate:dry-run   print L0 plan without running\n"
  )
}
