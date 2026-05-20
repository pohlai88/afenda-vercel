/**
 * Rank slow Vitest module imports and write a review artifact.
 *
 * Usage:
 *   pnpm test:analyze:imports              # top 30, console
 *   pnpm test:analyze:imports:report       # top 50 → .artifacts/reports/vitest-import-durations.txt
 *   pnpm test:analyze:imports -- tests/unit/hrm
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { artifactsReportPath } from "./lib/artifacts-paths.shared.mjs"
import { mergeChildEnv } from "./lib/merge-env.shared.mjs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const reportPath = artifactsReportPath(root, "vitest-import-durations.txt")

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

/** @param {string[]} argv */
function parseCli(argv) {
  const writeReport = argv.includes("--report")
  const passthroughIndex = argv.indexOf("--")
  const afterDash =
    passthroughIndex >= 0 ? argv.slice(passthroughIndex + 1) : []
  // `pnpm test:analyze:imports:report -- path` → argv is [--report, path] (no `--`)
  const pathLike =
    passthroughIndex < 0
      ? argv.filter(
          (arg) =>
            arg !== "--report" &&
            !arg.startsWith("-") &&
            (arg.includes("/") || arg.includes("\\") || arg.endsWith(".ts"))
        )
      : []
  const filters = [...afterDash, ...pathLike]

  return { writeReport, filters }
}

function main() {
  const { writeReport, filters } = parseCli(process.argv.slice(2))

  const limit = writeReport ? "50" : "30"
  fs.mkdirSync(artifactsDir, { recursive: true })

  const fromFile = loadEnvFromFile(".env.local")
  const childEnv = mergeChildEnv(fromFile, process.env, {})

  const vitestEntry = path.join(root, "node_modules", "vitest", "vitest.mjs")
  const args = [
    "run",
    "--config",
    ".config/vitest.config.ts",
    `--experimental.importDurations.print=true`,
    `--experimental.importDurations.limit=${limit}`,
    ...filters,
  ]

  if (filters.length > 0) {
    console.log(`[test:analyze:imports] Filters: ${filters.join(" ")}`)
  } else {
    console.warn(
      "[test:analyze:imports] No path filters — running full suite (slow). Pass paths after `--`."
    )
  }

  const result = spawnSync(process.execPath, [vitestEntry, ...args], {
    cwd: root,
    env: childEnv,
    encoding: "utf8",
    stdio: writeReport ? ["inherit", "pipe", "pipe"] : "inherit",
    maxBuffer: 64 * 1024 * 1024,
  })

  if (writeReport) {
    const stdout = typeof result.stdout === "string" ? result.stdout : ""
    const stderr = typeof result.stderr === "string" ? result.stderr : ""
    const body = [stdout, stderr].filter(Boolean).join("\n")
    const header = `# Vitest import durations (top ${limit})\n# Generated: ${new Date().toISOString()}\n# Filters: ${filters.length > 0 ? filters.join(" ") : "(full suite)"}\n# Re-run: pnpm test:analyze:imports:report -- <paths>\n\n`
    fs.writeFileSync(reportPath, header + body, "utf8")
    if (body.length > 0) {
      process.stdout.write(`${body}\n`)
    }
    console.log(
      `\n[test:analyze:imports] Wrote ${path.relative(root, reportPath)}`
    )
  }

  process.exit(result.status ?? 1)
}

main()
