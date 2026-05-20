/**
 * Run Vitest against git-changed tests only — fastest behavior gate during edits.
 * Writes the same lean failure digest as test:audit.
 *
 * Usage:
 *   pnpm test:changed
 *   pnpm test:changed -- origin/main
 *   pnpm test:changed -- --project unit-node
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { buildFailureDigest } from "./lib/vitest-failure-digest.shared.mjs"
import { mergeChildEnv } from "./lib/merge-env.shared.mjs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const artifactsDir = path.join(root, ".artifacts")
const jsonPath = path.join(artifactsDir, "vitest-report.json")
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

function loadEnvFromFile(relOrAbsPath) {
  const envPath = path.isAbsolute(relOrAbsPath)
    ? relOrAbsPath
    : path.join(root, relOrAbsPath)
  if (!fs.existsSync(envPath)) return {}
  return parseDotenv(fs.readFileSync(envPath, "utf8"))
}

function main() {
  const raw = process.argv.slice(2)
  /** @type {string[]} */
  const extraArgs = []
  /** @type {string | undefined} */
  let changedRef

  for (let i = 0; i < raw.length; i += 1) {
    const arg = raw[i]
    if (arg === "--help" || arg === "-h") {
      console.log(`Usage: pnpm test:changed [-- <git-ref>] [-- vitest flags]

Runs \`vitest run --changed\` against tests affected by uncommitted + ref diff.
Default ref: HEAD (Vitest default). Pass e.g. \`origin/main\` to compare to main.

Writes .artifacts/vitest-failures.txt (same as test:audit).
`)
      process.exit(0)
    }
    if (arg === "--") continue
    if (
      !arg.startsWith("-") &&
      !changedRef &&
      !arg.includes("/") &&
      !arg.startsWith(".")
    ) {
      changedRef = arg
      continue
    }
    if (
      !arg.startsWith("-") &&
      !changedRef &&
      (arg.includes("/") || arg === "HEAD")
    ) {
      changedRef = arg
      continue
    }
    extraArgs.push(arg)
  }

  fs.mkdirSync(artifactsDir, { recursive: true })
  if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath)

  const fromFile = loadEnvFromFile(".env.local")
  const childEnv = mergeChildEnv(fromFile, process.env, {})
  childEnv.VITEST_AUDIT = "1"

  /** @type {string[]} */
  const vitestArgs = [
    "run",
    "--config",
    ".config/vitest.config.ts",
    "--bail=0",
    "--changed",
    ...(changedRef ? [changedRef] : []),
    "--reporter=dot",
    "--reporter=json",
    `--outputFile.json=${jsonPath}`,
    ...extraArgs,
  ]

  const vitestEntry = path.join(root, "node_modules", "vitest", "vitest.mjs")
  if (!fs.existsSync(vitestEntry)) {
    console.error("[test:changed] vitest not installed.")
    process.exit(1)
  }

  console.log(
    `[test:changed] vitest --changed${changedRef ? ` ${changedRef}` : ""}`
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
      if (failureCount === 0) {
        fs.unlinkSync(jsonPath)
      } else {
        console.log("\n[test:changed] Failure digest:\n")
        console.log(lines.join("\n"))
      }
    } catch (err) {
      process.stderr.write(
        `[test:changed] digest error: ${err instanceof Error ? err.message : String(err)}\n`
      )
    }
  }

  console.log(
    `\n[test:changed] ${path.relative(root, failuresPath)}${failureCount ? ` (${failureCount} failed)` : ""} · exit ${exitCode}`
  )
  process.exit(exitCode)
}

main()
