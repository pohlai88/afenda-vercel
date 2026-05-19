/**
 * Runs a command with a dotenv file merged into the child environment.
 *
 * Default merge: file first, then process.env wins (shell / CI overrides).
 * `--file-overrides`: process.env first, then file wins — use for `.env.workflow.local`
 * port overrides under `vercel env run` (see ADR-0039).
 *
 * Default file: `.env.local` (repo root). Override:
 *   `node scripts/with-env.mjs --env-file=.env.vercel node scripts/foo.mjs`
 *
 * Intended for Vitest, Playwright, and local Drizzle migrations — keep `pnpm dev`
 * unwrapped unless env drift is proven (see AGENTS.md §2).
 *
 * Usage: node scripts/with-env.mjs vitest run --coverage
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { mergeChildEnv } from "./lib/merge-env.shared.mjs"

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

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
      `[with-env] No env file at ${relOrAbsPath} — run \`pnpm env:sync\` or \`vercel env pull\` if needed.`
    )
    return {}
  }
  return parseDotenv(fs.readFileSync(envPath, "utf8"))
}

const rawArgs = process.argv.slice(2)
let envFileRel = ".env.local"
let fileOverrides = false
/** @type {string[]} */
const args = []
for (let i = 0; i < rawArgs.length; i += 1) {
  const a = rawArgs[i]
  if (a.startsWith("--env-file=")) {
    envFileRel = a.slice("--env-file=".length)
    continue
  }
  if (a === "--file-overrides") {
    fileOverrides = true
    continue
  }
  args.push(a)
}

if (args.length === 0) {
  console.error(
    "Usage: node scripts/with-env.mjs [--env-file=path] [--file-overrides] <command> [...args]"
  )
  process.exit(1)
}

const fromFile = loadEnvFromFile(envFileRel)
const childEnv = mergeChildEnv(fromFile, process.env, { fileOverrides })
const [command, ...commandArgs] = args

// Vitest v8 writes merge shards under `coverage.reportsDirectory/.tmp`. Do not delete
// that tree here — Vitest owns lifecycle via `coverage.clean` and removing `.tmp`
// mid-run causes ENOENT / "Something removed the coverage directory" (Vitest docs:
// createCoverageProvider + coverage.clean). Only ensure parent dirs exist.
if (command === "vitest" && commandArgs.includes("--coverage")) {
  fs.mkdirSync(path.join(root, ".artifacts", "coverage", ".tmp"), {
    recursive: true,
  })
}

const result = spawnSync(command, commandArgs, {
  env: childEnv,
  shell: process.platform === "win32",
  stdio: "inherit",
  cwd: root,
})

process.exit(result.status === null ? 1 : (result.status ?? 1))
