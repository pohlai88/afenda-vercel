#!/usr/bin/env node
/**
 * ADQS mechanical gate for content/ask-docs MDX files
 * See .cursor/rules/ask-docs-directory.mdc § ADQS
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))
const docsRoot = path.join(root, "content", "ask-docs")

const STUB_PATTERNS = [
  /Replace with concrete steps/i,
  /Document the workflow here/i,
  /\[Docs home\]\(\/ask-docs\)/,
]

const EMPLOYEE_BAD_PREREQ = /relevant workspace/i

function isIndexExempt(relativePath) {
  const base = path.basename(relativePath)
  if (base === "index.mdx") return true
  if (/^index\.[a-z]{2}(-[A-Z]{2})?\.mdx$/.test(base)) return true
  return false
}

function isPortalsSection(relativePath) {
  return relativePath.startsWith("content/ask-docs/portals/")
}

function hasRelatedGraph(raw) {
  const tail = raw.split(/^## (?:Related|Next steps)/m)[1] ?? ""
  const askDocsLinks =
    (tail.match(/\/ask-docs\//g) ?? []).length +
    (tail.match(/href="\.\//g) ?? []).length
  return /<Cards>/.test(tail) || askDocsLinks >= 2
}

function listMdxFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) listMdxFiles(full, acc)
    else if (entry.name.endsWith(".mdx")) acc.push(full)
  }
  return acc
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return {}
  const fm = {}
  for (const line of match[1].split("\n")) {
    const m = line.match(/^([a-zA-Z0-9_]+):\s*(.*)$/)
    if (m) fm[m[1]] = m[2].trim().replace(/^["']|["']$/g, "")
  }
  return fm
}

function lintFile(filePath) {
  const rel = path.relative(root, filePath).replace(/\\/g, "/")
  const raw = fs.readFileSync(filePath, "utf8")
  const fm = parseFrontmatter(raw)
  const errors = []

  for (const pattern of STUB_PATTERNS) {
    if (pattern.test(raw)) {
      errors.push(`stub content matched ${pattern}`)
    }
  }

  if (fm.audience === "employee" && EMPLOYEE_BAD_PREREQ.test(raw)) {
    errors.push(
      "employee audience must not use generic workspace prerequisite copy"
    )
  }

  if (fm.status === "stable" && !fm.lastReviewedAt) {
    errors.push("status: stable requires lastReviewedAt (ISO date)")
  }

  if (isPortalsSection(rel) && !isIndexExempt(rel)) {
    if (!/^## (?:Related|Next steps)/m.test(raw)) {
      errors.push("portals pages require ## Related or ## Next steps")
    } else if (!hasRelatedGraph(raw)) {
      errors.push(
        "portals Related/Next steps needs <Cards> or ≥2 internal links"
      )
    }
    if (!/<Callout\b/.test(raw) && !/<Steps>/.test(raw)) {
      errors.push("portals pages require <Steps> or <Callout>")
    }
  }

  return errors.map((msg) => `${rel}: ${msg}`)
}

const files = listMdxFiles(docsRoot)
const allErrors = files.flatMap(lintFile)

if (allErrors.length > 0) {
  console.error("ask-docs quality lint failed:\n")
  for (const line of allErrors) console.error(`  • ${line}`)
  process.exit(1)
}

console.log(`ask-docs quality lint passed (${files.length} MDX files).`)
