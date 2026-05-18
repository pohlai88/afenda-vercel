/**
 * ADR-0030 — list client files importing #features/<module> (server index barrel).
 * Usage: node scripts/scan-client-barrel-imports.mjs
 */
import fs from "node:fs"
import path from "node:path"

const root = path.join(import.meta.dirname, "..")
const IMPORT_RE = /from\s+["']#features\/([^/"']+)["']/g
const USE_CLIENT_RE = /^\s*["']use client["']/

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git", ".artifacts"].includes(entry.name)) continue
    const abs = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(abs, out)
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(abs)
  }
  return out
}

function isClientFile(rel, content) {
  if (/\.client\.(ts|tsx)$/.test(rel)) return true
  return USE_CLIENT_RE.test(content.slice(0, 400))
}

function featureIndexLooksServerOnly(moduleName) {
  const indexPath = path.join(root, "lib/features", moduleName, "index.ts")
  if (!fs.existsSync(indexPath)) return false
  const content = fs.readFileSync(indexPath, "utf8")
  if (/import\s+["']server-only["']/.test(content)) return true
  if (/from\s+["']\.\/data\//.test(content)) return true
  if (/from\s+["'][^"']*\.server["']/.test(content)) return true
  const componentExportRe = /from\s+["']\.\/components\/([^"']+)["']/g
  let match
  while ((match = componentExportRe.exec(content)) !== null) {
    const comp = match[1]
    if (comp.includes(".client")) continue
    const compPath = path.join(
      root,
      "lib/features",
      moduleName,
      "components",
      comp.endsWith(".tsx") || comp.endsWith(".ts") ? comp : `${comp}.tsx`
    )
    if (!fs.existsSync(compPath)) continue
    if (/import\s+["']server-only["']/.test(fs.readFileSync(compPath, "utf8"))) return true
  }
  return false
}

const hits = []
for (const abs of walk(root)) {
  const rel = path.relative(root, abs).split(path.sep).join("/")
  if (
    !rel.startsWith("lib/features/") &&
    !rel.startsWith("components2/") &&
    !rel.startsWith("hooks/") &&
    !rel.startsWith("app/")
  ) {
    continue
  }
  const content = fs.readFileSync(abs, "utf8")
  if (!isClientFile(rel, content)) continue
  IMPORT_RE.lastIndex = 0
  let match
  while ((match = IMPORT_RE.exec(content)) !== null) {
    const moduleName = match[1]
    if (!featureIndexLooksServerOnly(moduleName)) continue
    const line = content.slice(0, match.index).split("\n").length
    hits.push({ rel, line, moduleName })
  }
}

if (hits.length === 0) {
  console.log("OK: no server-barrel imports in client files")
  process.exit(0)
}

for (const h of hits) {
  console.log(
    `${h.rel}:${h.line} -> #features/${h.moduleName} (use #features/${h.moduleName}/client or relative types)`
  )
}
process.exit(1)
