/**
 * App typecheck via project references (`tsc -b`) and scoped graphs (`tsc --noEmit -p`).
 * ADR-0042 Phase 1–2 + Phase 6 (tests/scripts gate slices).
 *
 * Usage:
 *   node scripts/typecheck-build.mjs              → `tsc -b tsconfig.build.json`
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

const buildProjects = [
  ...new Set(
    slices
      .filter((slice) => slice.mode === "build")
      .flatMap((slice) => slice.args)
  ),
]

if (buildProjects.length > 0) {
  run("node", [
    "--max-old-space-size=8192",
    "node_modules/typescript/bin/tsc",
    "-b",
    ...buildProjects,
  ])
}

for (const slice of slices.filter((entry) => entry.mode === "noEmit")) {
  const project = slice.args[0]
  if (!project) {
    console.error(
      `[typecheck-build] missing project path for slice ${slice.id}`
    )
    process.exit(1)
  }
  run("node", [
    "--max-old-space-size=8192",
    "node_modules/typescript/bin/tsc",
    "--noEmit",
    "-p",
    project,
  ])
}
