/**
 * App typecheck via project references (`tsc -b`). ADR-0042 Phase 1–2.
 *
 * Usage:
 *   node scripts/typecheck-build.mjs              → `tsc -b tsconfig.build.json` (solution root)
 *   node scripts/typecheck-build.mjs <paths...>   → slice plan from gate paths
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  resolveTypecheckSlicesForPaths,
  TYPECHECK_SLICES,
  slicePlanNeedsRouteTypegen,
} from "./lib/gate-typecheck-slices.shared.mjs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const isWindows = process.platform === "win32"
const paths = process.argv.slice(2).filter(Boolean)

const slices =
  paths.length > 0 ? resolveTypecheckSlicesForPaths(paths) : TYPECHECK_SLICES

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: isWindows,
    env: process.env,
  })
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1)
  }
}

if (slicePlanNeedsRouteTypegen(slices)) {
  run("node", ["scripts/next-typegen-fast.mjs"])
}

const tscArgs = [
  "--max-old-space-size=8192",
  "node_modules/typescript/bin/tsc",
  "-b",
  ...slices.flatMap((slice) => slice.args),
]

run("node", tscArgs)
