#!/usr/bin/env node
/**
 * ADQS corpus audit — heuristic tier report (A/B/C) for content/ask-docs.
 * Run: node scripts/audit-ask-docs-quality.mjs
 * Output: .artifacts/ask-docs-quality-audit.txt
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))
const docsRoot = path.join(root, "content", "ask-docs")
const outPath = path.join(root, ".artifacts", "ask-docs-quality-audit.txt")

function listMdxFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) listMdxFiles(full, acc)
    else if (entry.name.endsWith(".mdx")) acc.push(full)
  }
  return acc
}

function scoreFile(raw, rel) {
  let score = 0
  const notes = []

  const hasFm = /^---\r?\n[\s\S]*?\r?\n---/.test(raw)
  if (hasFm) score += 8
  else notes.push("no frontmatter")

  if (/^## Overview/m.test(raw)) score += 6
  if (/^## Before you start/m.test(raw) || /^## Prerequisites/m.test(raw))
    score += 4
  if (/<Steps>/.test(raw)) score += 8
  if (/<Callout\b/.test(raw)) score += 6
  if (/<Cards>/.test(raw)) score += 6
  if (/<Accordions/.test(raw) || /<Tabs/.test(raw)) score += 4
  if (/^## Troubleshooting/m.test(raw)) score += 4
  if (/^## Related/m.test(raw) && /\/ask-docs\//.test(raw)) score += 8

  if (/Replace with concrete|Document the workflow/i.test(raw)) {
    score = Math.min(score, 20)
    notes.push("generator stub")
  }

  const isLocaleIndex = /index\.[a-z]{2}(-[A-Z]{2})?\.mdx$/.test(
    path.basename(rel)
  )
  if (isLocaleIndex) {
    score = Math.max(score, 40)
    notes.push("locale index — partial ADQS exempt")
  }

  let tier = "B"
  if (score >= 47.5) tier = "A"
  else if (score < 40) tier = "C"

  return { rel, score, tier, notes }
}

const lines = [
  "# Ask-docs ADQS audit",
  `Generated: ${new Date().toISOString()}`,
  "",
]
const byTier = { A: [], B: [], C: [] }

for (const file of listMdxFiles(docsRoot)) {
  const rel = path.relative(root, file).replace(/\\/g, "/")
  const raw = fs.readFileSync(file, "utf8")
  const result = scoreFile(raw, rel)
  byTier[result.tier].push(result)
}

for (const tier of ["C", "B", "A"]) {
  lines.push(`## Tier ${tier} (${byTier[tier].length} files)`, "")
  for (const row of byTier[tier].sort((a, b) => a.score - b.score)) {
    const note = row.notes.length ? ` — ${row.notes.join(", ")}` : ""
    lines.push(`- ${row.rel} (${row.score}/50)${note}`)
  }
  lines.push("")
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, lines.join("\n"))
console.log(`Wrote ${outPath}`)
console.log(
  `A=${byTier.A.length} B=${byTier.B.length} C=${byTier.C.length} (target: uplift C and B below 47.5)`
)
