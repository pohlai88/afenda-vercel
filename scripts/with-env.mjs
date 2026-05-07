/**
 * Runs a command with `.env.local` merged into the child environment.
 * Values already set in `process.env` win (CI and shell exports override file).
 *
 * Intended for Vitest and Playwright only — keep `pnpm dev` unwrapped unless
 * env drift is proven (see AGENTS.md §2).
 *
 * Usage: node scripts/with-env.mjs vitest run --coverage
 */
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

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

/** @returns {Record<string, string>} */
function loadEnvLocal() {
  const envPath = path.join(root, ".env.local")
  if (!fs.existsSync(envPath)) {
    console.warn(
      "[with-env] No .env.local — run `pnpm env:sync` if tests need vars from `.env.config`."
    )
    return {}
  }
  return parseDotenv(fs.readFileSync(envPath, "utf8"))
}

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error("Usage: node scripts/with-env.mjs <command> [...args]")
  process.exit(1)
}

const fromFile = loadEnvLocal()
const childEnv = { ...fromFile, ...process.env }
const [command, ...commandArgs] = args

// Vitest v8 coverage on Windows can race on `.tmp/*.json` under reportsDirectory;
// pre-create the folder so merge/read does not ENOENT (see vitest.config coverage path).
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
