#!/usr/bin/env node
/**
 * Cursor `afterFileEdit` hook — accumulates edited paths into the L0 lint queue.
 *
 * Cursor invokes this after every file write. Hook reads a JSON payload from stdin
 * containing `{ filePath: string, ... }` and appends the path to:
 *
 *   .artifacts/cursor-lint-queue.txt
 *
 * The agent (or a CI step / git hook) then drains the queue with:
 *
 *   node scripts/cursor-hooks/drain-l0-queue.mjs
 *
 * Why queue instead of running ESLint per-edit:
 *   - Running `pnpm lint:path` per file blocks the agent for ~5–15 s each.
 *   - With multiple edits per turn, that compounds to minutes of wasted wall-time.
 *   - The L0 close condition is "pass paths from the turn into a single lint run",
 *     which is exactly what draining the queue produces.
 *
 * Reference: .cursor/rules/targeted-verification.mdc (L0 close condition)
 */
import fs from "node:fs"
import path from "node:path"
import process from "node:process"

const REPO_ROOT = process.cwd()
const QUEUE_FILE = path.join(REPO_ROOT, ".artifacts", "cursor-lint-queue.txt")

// Only queue paths under these roots — ESLint is meaningless for content/, docs/, .config/.
const QUEUE_ROOTS = [
  "app/",
  "lib/",
  "components2/",
  "i18n/",
  "tests/",
  "scripts/",
  "proxy.ts",
  "next.config.ts",
  "eslint.config.mjs",
]

// File extensions that ESLint actually parses in this repo.
const LINTABLE_EXT = new Set([".ts", ".tsx", ".mjs", ".cjs", ".js", ".jsx"])

function respond() {
  // afterFileEdit is informational — Cursor doesn't need a permission response.
  process.stdout.write("{}")
  process.exit(0)
}

async function readStdin() {
  return new Promise((resolve, reject) => {
    let raw = ""
    process.stdin.setEncoding("utf8")
    process.stdin.on("data", (chunk) => {
      raw += chunk
    })
    process.stdin.on("end", () => resolve(raw))
    process.stdin.on("error", reject)
  })
}

function normalize(filePath) {
  if (!filePath) return null
  const abs = path.resolve(filePath)
  const rel = path.relative(REPO_ROOT, abs).replace(/\\/g, "/")
  if (!rel || rel.startsWith("..")) return null
  return rel
}

function isQueueable(rel) {
  if (!QUEUE_ROOTS.some((root) => rel === root || rel.startsWith(root))) {
    return false
  }
  const ext = path.extname(rel).toLowerCase()
  return LINTABLE_EXT.has(ext)
}

try {
  const raw = await readStdin()
  if (!raw.trim()) respond()

  let payload
  try {
    payload = JSON.parse(raw)
  } catch {
    respond()
  }

  // Cursor sends `filePath` for afterFileEdit; tolerate variants defensively.
  const candidates = [
    payload?.filePath,
    payload?.file_path,
    payload?.path,
    ...(Array.isArray(payload?.filePaths) ? payload.filePaths : []),
  ].filter(Boolean)

  const queueable = candidates
    .map(normalize)
    .filter((rel) => rel && isQueueable(rel))

  if (queueable.length === 0) respond()

  fs.mkdirSync(path.dirname(QUEUE_FILE), { recursive: true })
  const line = queueable.join("\n") + "\n"
  fs.appendFileSync(QUEUE_FILE, line, "utf8")

  respond()
} catch (error) {
  process.stderr.write(
    `[queue-l0-lint] hook error: ${error instanceof Error ? error.message : String(error)}\n`
  )
  respond()
}
