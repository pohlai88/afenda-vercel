/**
 * One-shot migration: lib/features/hrm/data → domain data folders.
 * Run: node scripts/migrate-hrm-data.mjs [--execute]
 */
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  rmdirSync,
  renameSync,
  mkdirSync,
  existsSync,
  statSync,
} from "node:fs"
import { join, relative, basename, dirname } from "node:path"

const ROOT = process.cwd()
const HRM = join(ROOT, "lib/features/hrm")
const LEGACY = join(HRM, "data")
const EXECUTE = process.argv.includes("--execute")

function walk(dir, acc = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

function findCanonical(name) {
  return walk(HRM).filter(
    (p) => basename(p) === name && !p.replace(/\\/g, "/").includes("/hrm/data/")
  )
}

/** @returns { target: string } | { delete: true } | null */
function classify(relFromData) {
  const norm = relFromData.replace(/\\/g, "/")
  const base = basename(norm)

  if (norm.startsWith("rule-packs/")) return { delete: true }
  if (
    base.startsWith("signature-") ||
    base === "hrm-signature-seal.workflow.ts"
  )
    return { delete: true }
  if (
    base === "recruitment.queries.server.ts" ||
    base === "recruitment-workflow.shared.ts"
  )
    return { delete: true }

  const canonical = findCanonical(base)
  if (canonical.length > 0) {
    const body = readFileSync(join(LEGACY, norm), "utf8")
    const isShim =
      !body.includes("server-only") &&
      body.includes(" from ") &&
      !/^import\s/m.test(body.trim())
    if (isShim) return { delete: true }
    for (const c of canonical) {
      if (readFileSync(c, "utf8") === body) return { delete: true }
    }
    return { delete: true, note: "canonical exists (divergent)" }
  }

  const rules = [
    [
      /^(attendance|time-report)/,
      "time-attendance/leave-attendance-management/data",
    ],
    [/^leave/, "time-attendance/leave-attendance-management/data"],
    [
      /^boarding|^onboarding|^probation-watch/,
      "employee-management/employee-lifecycle-management/data",
    ],
    [/^offboarding/, "employee-management/offboarding-exit-management/data"],
    [
      /^compliance|^statutory|^bureau-reliability/,
      "employee-management/compliance-regulatory-tracking/data",
    ],
    [/^document-expiry/, "employee-management/documents-management/data"],
    [
      /^employee-portal|^portal-mutation/,
      "employee-management/employee-selfservice-portal/data",
    ],
    [/^hrm-import/, "employee-management/employee-records-management/data"],
    [
      /^payroll|^salary-advance/,
      "payroll-compensation/payroll-processing/data",
    ],
    [/^training/, "talent-management/training-development/data"],
    [/^performance/, "talent-management/performance-appraisals/data"],
    [
      /^kpi|^skill\.queries/,
      "talent-management/competency-skills-framework/data",
    ],
    [/^skill\./, "talent-management/competency-skills-framework/data"],
  ]

  for (const [re, target] of rules) {
    if (
      re.test(base) ||
      (norm.includes("leave-rules/") && re.source.includes("leave"))
    )
      return { target }
  }
  if (norm.startsWith("leave-rules/"))
    return {
      target: "time-attendance/leave-attendance-management/data/leave-rules",
    }

  return null
}

const legacyFiles = walk(LEGACY).map((p) => relative(LEGACY, p))
const moves = []
const deletes = []
const unmapped = []

for (const rel of legacyFiles) {
  const decision = classify(rel)
  if (!decision) {
    unmapped.push(rel)
    continue
  }
  if (decision.delete) deletes.push(rel)
  else moves.push({ rel, target: decision.target })
}

/** @type {Map<string, string>} old import suffix -> new path from hrm root */
const importMap = new Map()

for (const rel of deletes) {
  const base = rel.replace(/\\/g, "/")
  const canonical = findCanonical(basename(rel))
  if (canonical.length > 0) {
    const canonRel = relative(HRM, canonical[0]).replace(/\\/g, "/")
    importMap.set(`data/${base}`, canonRel)
    importMap.set(base, canonRel)
  } else if (base.startsWith("signature-")) {
    const toolsRel = `../tools/electronic-signatures/data/${basename(rel)}`
    importMap.set(`data/${base}`, toolsRel)
  }
}

for (const { rel, target } of moves) {
  const norm = rel.replace(/\\/g, "/")
  const fixed = `${target}/${norm}`.replace(/\/+/g, "/")
  importMap.set(`data/${norm}`, fixed)
}

console.log("Moves:", moves.length)
console.log("Deletes:", deletes.length)
console.log("Unmapped:", unmapped.length)
if (unmapped.length) {
  console.log(unmapped.join("\n"))
  process.exit(1)
}

if (!EXECUTE) {
  console.log("\nDry run — pass --execute to apply")
  moves.slice(0, 10).forEach((m) => console.log("MOVE", m.rel, "->", m.target))
  process.exit(0)
}

for (const rel of deletes) {
  unlinkSync(join(LEGACY, rel))
}

for (const { rel, target } of moves) {
  const src = join(LEGACY, rel)
  const norm = rel.replace(/\\/g, "/")
  const dest = join(HRM, target, norm)
  mkdirSync(dirname(dest), { recursive: true })
  renameSync(src, dest)
}

function pruneEmptyDirs(dir) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) pruneEmptyDirs(p)
  }
  if (dir !== LEGACY && existsSync(dir) && readdirSync(dir).length === 0) {
    rmdirSync(dir)
  }
}
pruneEmptyDirs(LEGACY)
if (existsSync(LEGACY) && readdirSync(LEGACY).length === 0) rmdirSync(LEGACY)

function fixRelativeImports(filePath) {
  let content = readFileSync(filePath, "utf8")
  const fileDir = dirname(filePath)
  const depthFromHrm = relative(HRM, fileDir)
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean).length
  const extra = depthFromHrm - 1
  if (extra > 0) {
    const add = "../".repeat(extra)
    content = content.replace(
      /from "(\.\.\/)+/g,
      (m) => `from "${add}${m.slice(6)}`
    )
    content = content.replace(
      /from '(\.\.\/)+/g,
      (m) => `from '${add}${m.slice(6)}`
    )
  }

  content = content.replace(
    /from "\.\/payroll-rule-pack\.server"/g,
    'from "../../multi-country-payroll/data/payroll-rule-pack.server"'
  )
  content = content.replace(
    /from '\.\/payroll-rule-pack\.server'/g,
    "from '../../multi-country-payroll/data/payroll-rule-pack.server'"
  )
  content = content.replace(
    /from "\.\/benefit-payroll-projection\.shared"/g,
    'from "../../benefits-administration/data/benefit-payroll-projection.shared"'
  )

  writeFileSync(filePath, content)
}

for (const { rel, target } of moves) {
  const dest = join(HRM, target, rel.replace(/\\/g, "/"))
  if (existsSync(dest)) fixRelativeImports(dest)
}

const scanRoots = [
  join(ROOT, "lib/features/hrm"),
  join(ROOT, "app"),
  join(ROOT, "tests"),
]

function rewriteImports(content, filePath) {
  let next = content
  const sorted = [...importMap.entries()].sort(
    (a, b) => b[0].length - a[0].length
  )

  for (const [oldSuffix, newFromHrm] of sorted) {
    const patterns = [
      `./data/${oldSuffix.replace(/^data\//, "")}`,
      `../data/${basename(oldSuffix)}`,
      `../../data/${basename(oldSuffix)}`,
      `../../../data/${basename(oldSuffix)}`,
      `../../../../data/${basename(oldSuffix)}`,
      `./data/${basename(oldSuffix)}`,
    ]
    for (const pat of patterns) {
      if (!next.includes(pat)) continue
      const fileDir = dirname(filePath)
      let replacement
      if (newFromHrm.startsWith("../tools/")) {
        replacement = newFromHrm
      } else {
        const absNew = join(HRM, newFromHrm)
        let rel = relative(fileDir, absNew).replace(/\\/g, "/")
        if (!rel.startsWith(".")) rel = `./${rel}`
        replacement = rel
      }
      next = next.split(pat).join(replacement.replace(/\\/g, "/"))
    }
  }

  next = next.replace(/from "\.\/data\//g, (m) => m)
  return next
}

for (const scanRoot of scanRoots) {
  if (!existsSync(scanRoot)) continue
  for (const file of walk(scanRoot)) {
    if (!/\.(ts|tsx)$/.test(file)) continue
    const before = readFileSync(file, "utf8")
    const after = rewriteImports(before, file)
    if (after !== before) writeFileSync(file, after)
  }
}

console.log("Migration applied.")
