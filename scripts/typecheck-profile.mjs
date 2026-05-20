/**
 * Split typegen vs tsc timing for baseline profiling (ADR-0042 Phase 0).
 * Writes a short report to stdout; optional trace via typecheck:diagnostics.
 */
import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const isWindows = process.platform === "win32"

function msSince(start) {
  return Math.round(performance.now() - start)
}

function runStep(label, command, args) {
  const start = performance.now()
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: isWindows,
    env: process.env,
  })
  const elapsedMs = msSince(start)
  if ((result.status ?? 1) !== 0) {
    console.error(`\n[typecheck:profile] ${label} failed (${elapsedMs}ms)`)
    process.exit(result.status ?? 1)
  }
  return elapsedMs
}

console.log("[typecheck:profile] Afenda app graph — timing split\n")

const typegenMs = runStep("next typegen (fast)", "node", [
  "scripts/next-typegen-fast.mjs",
])
const tscMs = runStep("tsc -b (solution)", "node", [
  "scripts/typecheck-build.mjs",
])

const totalMs = typegenMs + tscMs
console.log("\n[typecheck:profile] Summary")
console.log(`  next typegen:  ${typegenMs}ms`)
console.log(`  tsc -b:        ${tscMs}ms`)
console.log(`  total:         ${totalMs}ms`)
console.log(
  "\n  Deep dive: pnpm typecheck:diagnostics (add --generateTrace for .artifacts/ts-trace/)\n"
)
