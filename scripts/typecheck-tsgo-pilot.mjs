/**
 * TypeScript native preview (`tsgo`) CI pilot — parallel to `tsc`, non-blocking by default.
 * ADR-0042 Phase 4.
 *
 * Usage:
 *   pnpm typecheck:tsgo
 *   AFENDA_TSGO_ENFORCE=1 pnpm typecheck:tsgo   # fail CI when tsgo errors
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const isWindows = process.platform === "win32"
const enforce = process.env.AFENDA_TSGO_ENFORCE === "1"
const reportPath = path.join(root, ".artifacts", "tsgo-pilot-report.txt")

const TSGO_SOLUTION = "tsconfig.tsgo.build.json"

function run(command, args, options = {}) {
  const start = performance.now()
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: options.inheritStdio === false ? "pipe" : "inherit",
    shell: isWindows,
    encoding: options.inheritStdio === false ? "utf8" : undefined,
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

console.log("[typecheck:tsgo] TypeScript native preview pilot (tsgo)\n")

const typegen = run("node", ["scripts/next-typegen-fast.mjs"])
if (typegen.status !== 0) {
  process.exit(typegen.status)
}

const tsgo = run("pnpm", ["exec", "tsgo", "-b", TSGO_SOLUTION], {
  inheritStdio: false,
})

const lines = [
  `tsgo pilot ${new Date().toISOString()}`,
  `enforce=${enforce}`,
  `solution=${TSGO_SOLUTION}`,
  `typegenMs=${typegen.elapsedMs}`,
  `tsgoMs=${tsgo.elapsedMs}`,
  `tsgoExit=${tsgo.status}`,
]

if (tsgo.stdout.trim()) {
  lines.push("", "--- stdout ---", tsgo.stdout.trimEnd())
}
if (tsgo.stderr.trim()) {
  lines.push("", "--- stderr ---", tsgo.stderr.trimEnd())
}

writeReport(lines)

console.log(
  `\n[typecheck:tsgo] tsgo finished in ${tsgo.elapsedMs}ms (exit ${tsgo.status})`
)
console.log(`[typecheck:tsgo] report → ${path.relative(root, reportPath)}`)

if (tsgo.status !== 0) {
  const message = enforce
    ? "[typecheck:tsgo] tsgo failed — blocking because AFENDA_TSGO_ENFORCE=1"
    : "[typecheck:tsgo] tsgo failed — non-blocking pilot (tsc remains authority)"
  console.error(`\n${message}\n`)
  process.exit(enforce ? (tsgo.status ?? 1) : 0)
}

console.log(
  "\n[typecheck:tsgo] tsgo OK — compare timings with pnpm typecheck:profile\n"
)
