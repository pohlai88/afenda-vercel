/**
 * Lean Vitest audit — full failure set, minimum artifact size, same speed as test:fast.
 *
 * Default (lean): parallel run, dot console, JSON → failure digest only on disk.
 * Full mode (--full): tee console log + JUnit (use before CI debug only).
 *
 * Usage:
 *   pnpm test:audit                         fast + all failures → .artifacts/vitest-failures.txt
 *   pnpm test:audit -- --full               tee + JUnit (larger artifacts)
 *   pnpm test:audit -- --coverage --full    CI parity (slow on Windows — explicit only)
 *   pnpm test:audit -- tests/unit/hrm-*.test.ts
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { mergeChildEnv } from "./lib/merge-env.shared.mjs"
import { buildFailureDigest } from "./lib/vitest-failure-digest.shared.mjs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const artifactsDir = path.join(root, ".artifacts")
const logPath = path.join(artifactsDir, "vitest-audit.log")
const jsonPath = path.join(artifactsDir, "vitest-report.json")
const junitPath = path.join(artifactsDir, "vitest-junit.xml")
const failuresPath = path.join(artifactsDir, "vitest-failures.txt")

/** @returns {Record<string, string>} */
function parseDotenv(content) {
  /** @type {Record<string, string>} */
  const out = {}
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let val = line.slice(eq + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

/** @param {string} relOrAbsPath */
function loadEnvFromFile(relOrAbsPath) {
  const envPath = path.isAbsolute(relOrAbsPath)
    ? relOrAbsPath
    : path.join(root, relOrAbsPath)
  if (!fs.existsSync(envPath)) {
    console.warn(
      `[test:audit] No env file at ${relOrAbsPath} — run \`pnpm env:sync\` if needed.`
    )
    return {}
  }
  return parseDotenv(fs.readFileSync(envPath, "utf8"))
}

/** @param {string[]} argv */
function parseAuditArgs(argv) {
  /** @type {string[]} */
  const vitestFilters = []
  let coverage = false
  let serial = false
  let full = false
  let changed = false
  let passthrough = false

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === "--config") {
      i += 1
      continue
    }
    if (arg === "--") {
      passthrough = true
      continue
    }
    if (passthrough) {
      vitestFilters.push(arg)
      continue
    }
    if (arg === "--coverage") {
      coverage = true
      continue
    }
    if (arg === "--serial") {
      serial = true
      continue
    }
    if (arg === "--full") {
      full = true
      continue
    }
    if (arg === "--changed") {
      changed = true
      continue
    }
    if (arg === "--help" || arg === "-h") {
      console.log(`Usage: pnpm test:audit [-- --full] [-- --coverage] [-- --serial] [-- <filters>]

LEAN (default) — same speed as test:fast, minimal disk:
  .artifacts/vitest-failures.txt   all failures (or "All tests passed")
  .artifacts/vitest-report.json    only when failures exist

FULL (--full) — larger artifacts for deep debug:
  + .artifacts/vitest-audit.log    full console tee
  + .artifacts/vitest-junit.xml    JUnit XML

Avoid --coverage unless you need threshold parity (slow on Windows).
`)
      process.exit(0)
    }
    vitestFilters.push(arg)
  }

  return { coverage, serial, full, changed, vitestFilters }
}

/** @param {{ lean: boolean; failureCount: number; exitCode: number }} summary */
function printArtifactSummary({ lean, failureCount, exitCode }) {
  console.log("\n[test:audit] Artifacts:")
  console.log(
    `  ${path.relative(root, failuresPath)}  — failure digest (${failureCount} failed assertion(s) or pass)`
  )
  if (!lean || failureCount > 0) {
    console.log(
      `  ${path.relative(root, jsonPath)}     — JSON report (failures only kept in lean mode)`
    )
  }
  if (!lean) {
    console.log(`  ${path.relative(root, junitPath)}     — JUnit XML`)
  }
  console.log(`\n[test:audit] Exit ${exitCode}`)
}

function buildVitestArgs({ coverage, serial, full, changed, vitestFilters }) {
  /** @type {string[]} */
  const args = [
    "run",
    "--config",
    ".config/vitest.config.ts",
    "--bail=0",
    "--reporter=dot",
    "--reporter=json",
    `--outputFile.json=${jsonPath}`,
  ]

  if (changed) {
    args.push("--changed")
  }

  if (full) {
    args.push(
      "--reporter=default",
      "--reporter=junit",
      `--outputFile.junit=${junitPath}`
    )
  }
  if (serial) {
    args.push("--maxWorkers=1", "--no-file-parallelism")
  }
  if (coverage) {
    args.push("--coverage")
    fs.mkdirSync(path.join(artifactsDir, "coverage", ".tmp"), {
      recursive: true,
    })
  }

  args.push(...vitestFilters)
  return args
}

function main() {
  const { coverage, serial, full, changed, vitestFilters } = parseAuditArgs(
    process.argv.slice(2)
  )
  const lean = !full

  fs.mkdirSync(artifactsDir, { recursive: true })
  if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath)
  if (lean && fs.existsSync(logPath)) fs.unlinkSync(logPath)
  if (lean && fs.existsSync(junitPath)) fs.unlinkSync(junitPath)

  const fromFile = loadEnvFromFile(".env.local")
  const childEnv = mergeChildEnv(fromFile, process.env, {})
  childEnv.VITEST_AUDIT = "1"

  const vitestArgs = buildVitestArgs({
    coverage,
    serial,
    full,
    changed,
    vitestFilters,
  })

  const vitestEntry = path.join(root, "node_modules", "vitest", "vitest.mjs")
  if (!fs.existsSync(vitestEntry)) {
    console.error(
      "[test:audit] vitest not installed — run `pnpm install` first."
    )
    process.exit(1)
  }

  console.log(
    `[test:audit] ${lean ? "lean" : "full"}${changed ? " + changed" : ""}${coverage ? " + coverage" : ""}${serial ? " + serial" : ""}`
  )

  const result = spawnSync(process.execPath, [vitestEntry, ...vitestArgs], {
    cwd: root,
    env: childEnv,
    stdio: "inherit",
  })
  const exitCode = result.status ?? 1

  let failureCount = 0
  if (fs.existsSync(jsonPath)) {
    try {
      const report = JSON.parse(fs.readFileSync(jsonPath, "utf8"))
      const { failures, lines } = buildFailureDigest(report)
      failureCount = failures.length
      fs.writeFileSync(failuresPath, `${lines.join("\n")}\n`, "utf8")

      if (lean && failureCount === 0) {
        fs.unlinkSync(jsonPath)
      }

      if (failureCount > 0) {
        console.log("\n[test:audit] Failure digest:\n")
        console.log(lines.join("\n"))
      }
    } catch (err) {
      const message = `[test:audit] Could not write failure digest: ${err instanceof Error ? err.message : String(err)}\n`
      process.stderr.write(message)
    }
  } else if (exitCode !== 0) {
    fs.writeFileSync(
      failuresPath,
      "(vitest exited non-zero but no JSON report was written — run with --full)\n",
      "utf8"
    )
  }

  printArtifactSummary({ lean, failureCount, exitCode })
  process.exit(exitCode)
}

main()
