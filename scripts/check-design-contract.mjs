/**
 * Design system enforcement (mechanical, CI-safe).
 *
 * Scans app/, components/, hooks/ for drift patterns.
 * See lib/design-system.ts for allowed radius tokens.
 */
import fs from "node:fs"
import path from "node:path"

const root = path.join(import.meta.dirname, "..")

const SCAN_DIRS = ["app", "components", "hooks"]

/** Disallowed “pill” radii — use #lib/design-system uiRadius instead */
const FORBIDDEN_RADIUS = /\brounded-(3xl|4xl|5xl|6xl)\b/g

/** Heavy shadow — prefer shadow-md / shadow-lg / shadow-xl per luxury ERP direction */
const FORBIDDEN_SHADOW = /\bshadow-2xl\b/g

/**
 * Arbitrary rounded-[…] is opt-in only (Tailwind still needs literals in allowlisted files).
 * Add a file here if you truly need a non-token radius.
 */
const ARBITRARY_ROUNDED_ALLOWLIST = new Set([
  "components/ui/calendar.tsx",
  "components/ui/chart.tsx",
  "components/ui/checkbox.tsx",
  "components/ui/scroll-area.tsx",
  "components/ui/tooltip.tsx",
])

const ARBITRARY_ROUNDED = /\brounded-\[/g

function walk(dir) {
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name)
    if (name.isDirectory()) out.push(...walk(p))
    else if (name.isFile() && /\.(tsx|ts|jsx|js)$/.test(name.name)) out.push(p)
  }
  return out
}

function posixRel(file) {
  return path.relative(root, file).split(path.sep).join("/")
}

const files = SCAN_DIRS.flatMap((d) => walk(path.join(root, d)))
let failed = false

for (const file of files) {
  const rel = posixRel(file)
  const text = fs.readFileSync(file, "utf8")
  const lines = text.split("\n")

  const report = (rule, lineNo, row) => {
    failed = true
    console.error(`[design-contract] ${rule} in ${rel}:${lineNo}`)
    console.error(`  ${row.trim().slice(0, 140)}${row.length > 140 ? "…" : ""}`)
  }

  lines.forEach((row, i) => {
    const lineNo = i + 1
    FORBIDDEN_RADIUS.lastIndex = 0
    if (FORBIDDEN_RADIUS.test(row)) {
      report("forbidden radius (use uiRadius from #lib/design-system)", lineNo, row)
    }
    FORBIDDEN_SHADOW.lastIndex = 0
    if (FORBIDDEN_SHADOW.test(row)) {
      report("forbidden shadow-2xl", lineNo, row)
    }
    ARBITRARY_ROUNDED.lastIndex = 0
    if (ARBITRARY_ROUNDED.test(row) && !ARBITRARY_ROUNDED_ALLOWLIST.has(rel)) {
      report(
        "arbitrary rounded-[…] (allowlist in scripts/check-design-contract.mjs or use uiRadius)",
        lineNo,
        row
      )
    }
  })
}

if (failed) {
  console.error(`
Fix: import uiRadius / uiTitle / uiTracking from #lib/design-system, or extend the allowlist with a short comment in PR.
`)
  process.exit(1)
}
