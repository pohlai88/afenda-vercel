/**
 * One-shot: move lib/features/hrm/components/* into submodule components/ dirs.
 * Run: node scripts/migrate-hrm-components.mjs
 */
import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"
import crypto from "node:crypto"

const ROOT = path.resolve(import.meta.dirname, "..")
const HRM = path.join(ROOT, "lib/features/hrm")
const FLAT = path.join(HRM, "components")

function hashFile(p) {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex")
}

function preferGoverned(aPath, bPath) {
  const a = fs.readFileSync(aPath, "utf8")
  const b = fs.readFileSync(bPath, "utf8")
  const score = (s) =>
    (/\bgoverned\b/i.test(s) ? 4 : 0) +
    (/\blist-surface\b/i.test(s) ? 2 : 0) +
    (/\brenderGoverned\b/i.test(s) ? 2 : 0) +
    s.length / 10000
  return score(a) >= score(b) ? aPath : bPath
}

/** @param {string} name */
function resolveTarget(name) {
  const n = name.toLowerCase()
  if (
    n.startsWith("claim-") ||
    n.startsWith("employee-portal-claim") ||
    n === "claims-page.tsx"
  ) {
    return "payroll-compensation/expenses-reimbursement/components"
  }
  if (
    n.startsWith("benefit-") ||
    n.startsWith("benefits-") ||
    n.startsWith("employee-portal-benefit")
  ) {
    return "payroll-compensation/benefits-administration/components"
  }
  if (
    n.includes("payroll-console") ||
    n.includes("payroll-profile") ||
    n.startsWith("hrm-advances") ||
    n.startsWith("employee-portal-payslip") ||
    n.startsWith("employee-portal-advance")
  ) {
    return "payroll-compensation/payroll-processing/components"
  }
  if (
    n.startsWith("leave-") ||
    n.startsWith("attendance-") ||
    n.startsWith("time-report-") ||
    n.startsWith("policies-") ||
    n === "leave-page.tsx" ||
    n.startsWith("employee-portal-leave") ||
    n.startsWith("employee-portal-attendance")
  ) {
    return "time-attendance/leave-attendance-management/components"
  }
  if (
    n.startsWith("training-") ||
    n.startsWith("hrm-training") ||
    n.includes("employee-portal-training")
  ) {
    return "talent-management/training-development/components"
  }
  if (n.startsWith("hrm-performance") || n.startsWith("employee-portal-performance")) {
    return "talent-management/performance-management/components"
  }
  if (
    n.startsWith("skill-") ||
    n.startsWith("hrm-skills") ||
    n.startsWith("hrm-kpi") ||
    n.startsWith("kpi-goal")
  ) {
    return "talent-management/competency-skills-framework/components"
  }
  if (n.startsWith("compliance-") || n.startsWith("bureau-reliability-")) {
    return "employee-management/compliance-regulatory-tracking/components"
  }
  if (n.includes("offboarding-panel") || n.startsWith("employee-portal-offboarding")) {
    return "employee-management/offboarding-exit-management/components"
  }
  if (n.startsWith("documents-") || n.startsWith("hrm-document-")) {
    return "employee-management/documents-management/components"
  }
  if (
    n.startsWith("signature") ||
    n.startsWith("signatures-") ||
    n.includes("employee-portal-signature")
  ) {
    return "employee-management/documents-management/components"
  }
  if (n.startsWith("hrm-onboarding") || n.startsWith("hrm-import")) {
    return "employee-management/employee-lifecycle-management/components"
  }
  if (n.startsWith("employee-portal-")) {
    return "employee-management/employee-selfservice-portal/components"
  }
  if (
    n.startsWith("employee-detail-") ||
    n.startsWith("employee-create") ||
    n.startsWith("employee-edit") ||
    n.startsWith("employee-archive") ||
    n.startsWith("employee-master") ||
    n.startsWith("employee-timeline") ||
    n.startsWith("employment-contract") ||
    n === "workforce-page.tsx" ||
    n === "add-employee-dialog.tsx" ||
    n === "employee-portal-access-card.tsx"
  ) {
    return "employee-management/employee-records-management/components"
  }
  if (n.startsWith("organization-structure")) {
    return "employee-management/organizational-chart-hierarchy/components"
  }
  if (n === "hrm-pages.tsx" || n === "hrm-snapshot-page.tsx") {
    return null // handled separately — snapshot lives at hrm root
  }
  return null
}

function listSubmoduleComponentDirs() {
  const map = new Map()
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name)
      if (ent.isDirectory()) {
        if (ent.name === "components" && dir !== HRM) {
          for (const f of fs.readdirSync(p)) {
            const fp = path.join(p, f)
            if (fs.statSync(fp).isFile()) map.set(f, p)
          }
        } else if (!(dir === HRM && ent.name === "components")) {
          walk(p)
        }
      }
    }
  }
  for (const ent of fs.readdirSync(HRM, { withFileTypes: true })) {
    if (ent.isDirectory() && ent.name !== "components") walk(path.join(HRM, ent.name))
  }
  return map
}

/** Fix relative imports when moving from hrm/components to hrm/<sub>/components */
function fixImports(content, subPath) {
  const depth = subPath.split("/").length // e.g. time-attendance/leave-attendance-management = 1
  const extra = "../".repeat(depth) // ../../ for one segment submodule

  let out = content
  // Sibling component imports stay
  // Bump imports that pointed at hrm root (one level up from old flat components)
  out = out.replace(
    /from\s+["'](\.\.\/)(?!\.)([^"']+)["']/g,
    (match, dot, rest) => {
      if (rest.startsWith("components/")) return match
      return `from "${extra}${dot}${rest}"`
    },
  )
  return out
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true })
}

function moveFile(from, to) {
  ensureDir(path.dirname(to))
  if (fs.existsSync(to)) fs.unlinkSync(to)
  try {
    execSync(`git mv "${from}" "${to}"`, { cwd: ROOT, stdio: "pipe" })
  } catch {
    fs.renameSync(from, to)
  }
}

const moves = []
const deletedDupes = []
const unclassified = []

if (!fs.existsSync(FLAT)) {
  console.log("No flat components dir — already migrated?")
  process.exit(0)
}

const existing = listSubmoduleComponentDirs()
const flatFiles = fs.readdirSync(FLAT).filter((f) => fs.statSync(path.join(FLAT, f)).isFile())

for (const file of flatFiles.sort()) {
  const targetRel = resolveTarget(file)
  if (!targetRel) {
    if (file === "hrm-snapshot-page.tsx") {
      const flatPath = path.join(FLAT, file)
      const rootPath = path.join(HRM, file)
      if (fs.existsSync(rootPath)) {
        const winner = preferGoverned(rootPath, flatPath)
        if (winner === rootPath) {
          fs.unlinkSync(flatPath)
          deletedDupes.push({ file, reason: "duplicate of hrm root hrm-snapshot-page.tsx" })
        } else {
          fs.unlinkSync(rootPath)
          fs.renameSync(flatPath, rootPath)
          moves.push({ file, to: "lib/features/hrm/hrm-snapshot-page.tsx (replaced root)" })
        }
      } else {
        gitMv(flatPath, rootPath)
        moves.push({ file, to: "lib/features/hrm/hrm-snapshot-page.tsx" })
      }
      continue
    }
    if (file === "hrm-pages.tsx") {
      unclassified.push(file)
      continue
    }
    unclassified.push(file)
    continue
  }

  const from = path.join(FLAT, file)
  const toDir = path.join(HRM, targetRel)
  const to = path.join(toDir, file)

  if (existing.has(file)) {
    const subPath = existing.get(file)
    const winner = preferGoverned(path.join(subPath, file), from)
    if (winner === from) {
      fs.unlinkSync(path.join(subPath, file))
        moveFile(from, to)
      moves.push({ file, to: path.relative(ROOT, to).replace(/\\/g, "/"), note: "replaced submodule copy" })
    } else {
      fs.unlinkSync(from)
      deletedDupes.push({ file, kept: path.relative(ROOT, path.join(subPath, file)).replace(/\\/g, "/") })
    }
    continue
  }

        moveFile(from, to)
  const content = fixImports(fs.readFileSync(to, "utf8"), targetRel.replace(/\/components$/, ""))
  fs.writeFileSync(to, content)
  moves.push({ file, to: path.relative(ROOT, to).replace(/\\/g, "/") })
}

// hrm-pages → employee-lifecycle or keep at module root? Colocate with constants consumer
const hrmPages = path.join(FLAT, "hrm-pages.tsx")
if (fs.existsSync(hrmPages)) {
  const to = path.join(HRM, "employee-management/employee-lifecycle-management/components/hrm-pages.tsx")
  ensureDir(path.dirname(to))
  gitMv(hrmPages, to)
  fs.writeFileSync(to, fixImports(fs.readFileSync(to, "utf8"), "employee-management/employee-lifecycle-management"))
  moves.push({ file: "hrm-pages.tsx", to: path.relative(ROOT, to).replace(/\\/g, "/") })
}

// Remove empty flat dir
try {
  fs.rmdirSync(FLAT)
} catch {
  const left = fs.readdirSync(FLAT)
  console.warn("Flat dir not empty:", left)
}

// Rewrite barrel import paths in key files
const barrelFiles = [
  path.join(HRM, "index.ts"),
  path.join(HRM, "client.ts"),
  path.join(HRM, "hrm-snapshot-page.tsx"),
  path.join(HRM, "employee-management/employee-selfservice-portal/index.ts"),
  path.join(HRM, "employee-management/employee-lifecycle-management/index.ts"),
  path.join(HRM, "employee-management/compliance-regulatory-tracking/client.ts"),
]

const exportMap = new Map(moves.map((m) => [m.file.replace(/\.tsx?$/, "").replace(/\.client\.tsx$/, ""), m.to]))

function rewriteBarrels(filePath) {
  if (!fs.existsSync(filePath)) return
  let src = fs.readFileSync(filePath, "utf8")
  const original = src
  src = src.replace(/from\s+["']\.\/components\/([^"']+)["']/g, (match, spec) => {
    const base = path.basename(spec, path.extname(spec))
    const moved = moves.find((m) => m.file === `${base}${path.extname(spec)}` || m.file.startsWith(base))
    if (!moved) return match
    const rel = path.relative(path.dirname(filePath), path.join(ROOT, moved.to)).replace(/\\/g, "/")
    return `from "${rel.startsWith(".") ? rel : "./" + rel}"`
  })
  src = src.replace(/from\s+["']\.\.\/\.\.\/components\/([^"']+)["']/g, (match, spec) => {
    const fileName = path.basename(spec)
    const moved = moves.find((m) => m.file === fileName)
    if (!moved) return match
    const rel = path.relative(path.dirname(filePath), path.join(ROOT, moved.to)).replace(/\\/g, "/")
    return `from "${rel.startsWith(".") ? rel : "./" + rel}"`
  })
  src = src.replace(/from\s+["']\.\.\/components\/([^"']+)["']/g, (match, spec) => {
    const fileName = path.basename(spec)
    const moved = moves.find((m) => m.file === fileName)
    if (!moved) return match
    const rel = path.relative(path.dirname(filePath), path.join(ROOT, moved.to)).replace(/\\/g, "/")
    return `from "${rel.startsWith(".") ? rel : "./" + rel}"`
  })
  if (src !== original) fs.writeFileSync(filePath, src)
}

for (const bf of barrelFiles) rewriteBarrels(bf)

// Fix cross-imports in submodule components that still point at flat components
function walkTs(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walkTs(p)
    else if (/\.tsx?$/.test(ent.name)) {
      let src = fs.readFileSync(p, "utf8")
      const orig = src
      src = src.replace(/from\s+["'](\.\.\/)+components\/([^"']+)["']/g, (match, dots, spec) => {
        const fileName = path.basename(spec)
        const moved = moves.find((m) => m.file === fileName)
        if (!moved) return match
        const rel = path.relative(path.dirname(p), path.join(ROOT, moved.to)).replace(/\\/g, "/")
        return `from "${rel.startsWith(".") ? rel : "./" + rel}"`
      })
      if (src !== orig) fs.writeFileSync(p, src)
    }
  }
}
walkTs(HRM)

// vitest config
const vitest = path.join(ROOT, ".config/vitest.config.ts")
if (fs.existsSync(vitest)) {
  let v = fs.readFileSync(vitest, "utf8")
  v = v.replace(
    `"lib/features/hrm/components/**/*.tsx"`,
    `"lib/features/hrm/**/components/**/*.tsx"`,
  )
  fs.writeFileSync(vitest, v)
}

console.log(JSON.stringify({ moves: moves.length, deletedDupes, unclassified, sample: moves.slice(0, 5) }, null, 2))
