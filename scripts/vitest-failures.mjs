/**
 * Reprint the last Vitest failure digest without re-running tests.
 *
 * Usage:
 *   pnpm test:failures              read .artifacts/vitest-failures.txt
 *   pnpm test:failures -- --rebuild   rebuild digest from vitest-report.json if present
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import {
  buildFailureDigest,
  digestIndicatesFailures,
  digestIndicatesPass,
} from "./lib/vitest-failure-digest.shared.mjs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")
const artifactsDir = path.join(root, ".artifacts")
const failuresPath = path.join(artifactsDir, "vitest-failures.txt")
const jsonPath = path.join(artifactsDir, "vitest-report.json")

const rebuild = process.argv.includes("--rebuild")

function rebuildFromJson() {
  if (!fs.existsSync(jsonPath)) {
    return null
  }
  try {
    const report = JSON.parse(fs.readFileSync(jsonPath, "utf8"))
    const { lines } = buildFailureDigest(report)
    const text = `${lines.join("\n")}\n`
    fs.writeFileSync(failuresPath, text, "utf8")
    return text
  } catch {
    return null
  }
}

function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(`Usage: pnpm test:failures [-- --rebuild]

Reads .artifacts/vitest-failures.txt from the last pnpm test:audit run.
Exit 0 when all passed; exit 1 when failures are listed; exit 2 when no digest exists.

  --rebuild   regenerate digest from .artifacts/vitest-report.json (if kept)
`)
    process.exit(0)
  }

  /** @type {string | null} */
  let text = fs.existsSync(failuresPath)
    ? fs.readFileSync(failuresPath, "utf8")
    : null

  if (rebuild || !text) {
    const rebuilt = rebuildFromJson()
    if (rebuilt) {
      text = rebuilt
    }
  }

  if (!text) {
    console.error(
      "[test:failures] No digest found. Run `pnpm test:audit` or `pnpm test:audit -- --changed` first."
    )
    process.exit(2)
  }

  process.stdout.write(text.endsWith("\n") ? text : `${text}\n`)

  if (digestIndicatesPass(text)) {
    process.exit(0)
  }
  if (digestIndicatesFailures(text)) {
    process.exit(1)
  }

  process.exit(1)
}

main()
