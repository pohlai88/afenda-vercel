/**
 * Compare `tsc -b` (authority) vs `tsgo -b` (pilot) on the same typegen baseline.
 * ADR-0042 Phase 6 — parity evidence before AFENDA_TSGO_ENFORCE=1.
 *
 * Usage:
 *   pnpm typecheck:compare
 *   AFENDA_TSGO_ENFORCE=1 pnpm typecheck:compare   # fail when compilers disagree
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const isWindows = process.platform === "win32"
const enforce = process.env.AFENDA_TSGO_ENFORCE === "1"
const reportPath = path.join(root, ".artifacts", "typecheck-parity-report.txt")

const TSC_SOLUTION = "tsconfig.build.json"
const TSGO_SOLUTION = "tsconfig.tsgo.build.json"

function run(command, args) {
  const start = performance.now()
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "pipe",
    shell: isWindows,
    encoding: "utf8",
    env: process.env,
  })
  return {
    status: result.status ?? 1,
    elapsedMs: Math.round(performance.now() - start),
    stdout: typeof result.stdout === "string" ? result.stdout : "",
    stderr: typeof result.stderr === "string" ? result.stderr : "",
  }
}

function writeReport(lines) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8")
}

console.log("[typecheck:compare] tsc vs tsgo parity (same route types)\n")

const typegen = run("node", ["scripts/next-typegen-fast.mjs"])
if (typegen.status !== 0) {
  process.exit(typegen.status)
}

const tsc = run("node", [
  "--max-old-space-size=8192",
  "node_modules/typescript/bin/tsc",
  "-b",
  TSC_SOLUTION,
])

const tsgo = run("pnpm", ["exec", "tsgo", "-b", TSGO_SOLUTION])

const parityMatch = tsc.status === tsgo.status
const lines = [
  `typecheck parity ${new Date().toISOString()}`,
  `enforce=${enforce}`,
  `tscSolution=${TSC_SOLUTION}`,
  `tsgoSolution=${TSGO_SOLUTION}`,
  `typegenMs=${typegen.elapsedMs}`,
  `tscMs=${tsc.elapsedMs}`,
  `tscExit=${tsc.status}`,
  `tsgoMs=${tsgo.elapsedMs}`,
  `tsgoExit=${tsgo.status}`,
  `exitParity=${parityMatch ? "match" : "MISMATCH"}`,
]

if (tsc.stderr.trim()) {
  lines.push("", "--- tsc stderr ---", tsc.stderr.trimEnd())
}
if (tsgo.stderr.trim()) {
  lines.push("", "--- tsgo stderr ---", tsgo.stderr.trimEnd())
}

writeReport(lines)

console.log(`\n[typecheck:compare] tsc  ${tsc.elapsedMs}ms (exit ${tsc.status})`)
console.log(`[typecheck:compare] tsgo ${tsgo.elapsedMs}ms (exit ${tsgo.status})`)
console.log(
  `[typecheck:compare] exit parity: ${parityMatch ? "match" : "MISMATCH"}`
)
console.log(`[typecheck:compare] report → ${path.relative(root, reportPath)}\n`)

if (!parityMatch) {
  const message = enforce
    ? "[typecheck:compare] tsc/tsgo exit codes differ — blocking (AFENDA_TSGO_ENFORCE=1)"
    : "[typecheck:compare] tsc/tsgo exit codes differ — advisory (tsc remains authority)"
  console.error(`${message}\n`)
  process.exit(enforce ? 1 : 0)
}

if (tsc.status !== 0 || tsgo.status !== 0) {
  process.exit(enforce ? (tsc.status ?? 1) : 0)
}

console.log("[typecheck:compare] both compilers passed with matching exits\n")
