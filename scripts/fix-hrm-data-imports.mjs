/**
 * Fix imports after hrm/data migration.
 * node scripts/fix-hrm-data-imports.mjs [--execute]
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { join, relative, dirname, basename } from "node:path"

const ROOT = process.cwd()
const HRM = join(ROOT, "lib/features/hrm")
const EXECUTE = process.argv.includes("--execute")

function walk(dir, acc = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

/** basename -> path relative to hrm */
const fileIndex = new Map()
/** tail after `data/` (may include subdirs) -> path relative to hrm */
const dataTailIndex = new Map()
for (const p of walk(HRM)) {
  if (p.replace(/\\/g, "/").includes("/hrm/data/")) continue
  const name = basename(p)
  const rel = relative(HRM, p).replace(/\\/g, "/")
  if (!fileIndex.has(name)) fileIndex.set(name, rel)
  const dataIdx = rel.indexOf("/data/")
  if (dataIdx !== -1) {
    const tail = rel.slice(dataIdx + "/data/".length)
    dataTailIndex.set(tail, rel)
    dataTailIndex.set(tail.replace(/\.ts$/, ""), rel)
  }
}

const TOOLS_SIGNATURE = new Map(
  walk(join(ROOT, "lib/features/tools/electronic-signatures/data")).map((p) => [
    basename(p),
    relative(ROOT, p).replace(/\\/g, "/"),
  ])
)

function resolveDataImport(specifier, fromFile) {
  const m = specifier.match(/(?:\.\.\/|\.\/)+data\/(.+?)(?:\.js)?$/)
  if (!m) return null
  const tail = m[1]
  const name = basename(tail.endsWith(".ts") ? tail : `${tail}.ts`)
  if (
    name.startsWith("signature-") ||
    name === "hrm-signature-seal.workflow.ts"
  ) {
    const toolsRel = TOOLS_SIGNATURE.get(name)
    if (!toolsRel) return null
    const fromDir = dirname(fromFile)
    let relImport = relative(fromDir, join(ROOT, toolsRel)).replace(/\\/g, "/")
    if (!relImport.startsWith(".")) relImport = `./${relImport}`
    if (relImport.endsWith(".ts")) relImport = relImport.slice(0, -3)
    return relImport
  }
  const rel = fileIndex.get(name)
  if (!rel) return null
  const fromDir = dirname(fromFile)
  const abs = join(HRM, rel)
  let relImport = relative(fromDir, abs).replace(/\\/g, "/")
  if (!relImport.startsWith(".")) relImport = `./${relImport}`
  if (relImport.endsWith(".ts")) relImport = relImport.slice(0, -3)
  if (relImport.endsWith(".tsx")) relImport = relImport.slice(0, -4)
  return relImport
}

function fixFile(filePath) {
  let content = readFileSync(filePath, "utf8")
  let changed = false

  content = content.replace(
    /from (["'])((?:\.\.\/|\.\/)+data\/[^"']+)\1/g,
    (full, q, spec) => {
      const next = resolveDataImport(spec, filePath)
      if (!next) return full
      changed = true
      return `from ${q}${next}${q}`
    }
  )

  content = content.replace(
    /import\((["'])((?:\.\.\/|\.\/)+data\/[^"']+)\1\)/g,
    (full, q, spec) => {
      const next = resolveDataImport(spec, filePath)
      if (!next) return full
      changed = true
      return `import(${q}${next}${q})`
    }
  )

  // Absolute test paths: lib/features/hrm/data/foo -> resolved path
  content = content.replace(
    /lib\/features\/hrm\/data\/([a-zA-Z0-9_./-]+)/g,
    (full, tail) => {
      const withTs = tail.endsWith(".ts") ? tail : `${tail}.ts`
      const name = basename(withTs)
      if (name.startsWith("signature-")) {
        const toolsRel = TOOLS_SIGNATURE.get(name)
        if (toolsRel) {
          changed = true
          return toolsRel
        }
      }
      const rel =
        dataTailIndex.get(tail) ??
        dataTailIndex.get(withTs) ??
        fileIndex.get(name) ??
        null
      if (!rel) return full
      changed = true
      return `lib/features/hrm/${rel}`
    }
  )

  if (changed && EXECUTE) writeFileSync(filePath, content)
  return changed
}

const scanRoots = [
  join(ROOT, "lib"),
  join(ROOT, "app"),
  join(ROOT, "tests"),
  join(ROOT, ".config"),
]

let count = 0
const unresolved = new Set()
for (const scanRoot of scanRoots) {
  if (!existsSync(scanRoot)) continue
  for (const file of walk(scanRoot)) {
    const before = readFileSync(file, "utf8")
    const specs = [
      ...before.matchAll(/(?:\.\.\/|\.\/)+data\/[a-zA-Z0-9_./-]+/g),
    ].map((x) => x[0])
    if (fixFile(file)) count++
    else {
      for (const spec of specs) {
        if (!resolveDataImport(spec, file))
          unresolved.add(`${relative(ROOT, file)}: ${spec}`)
      }
    }
  }
}

console.log(EXECUTE ? "Fixed files:" : "Would fix (dry run):", count)
if (unresolved.size) {
  console.log("\nUnresolved (first 40):")
  ;[...unresolved].slice(0, 40).forEach((u) => console.log(u))
  console.log("Total unresolved:", unresolved.size)
}

if (!EXECUTE) console.log("\nPass --execute to write changes")
