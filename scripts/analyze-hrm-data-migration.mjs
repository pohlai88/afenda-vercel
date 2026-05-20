import { readdirSync, readFileSync } from "node:fs"
import { join, relative, basename } from "node:path"

const root = join(process.cwd(), "lib/features/hrm")
const legacyDir = join(root, "data")

function walk(dir, acc = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (ent.isFile() && /\.(ts|tsx)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

const legacyFiles = walk(legacyDir)
const allHrm = walk(root).filter(
  (p) =>
    !p.includes(`${join("hrm", "data")}${""}`) ||
    !p.replace(/\\/g, "/").includes("/hrm/data/")
)

function findCanonical(name) {
  const matches = allHrm.filter(
    (p) => basename(p) === name && !p.replace(/\\/g, "/").includes("/hrm/data/")
  )
  return matches
}

const identical = []
const divergent = []
const orphan = []

for (const legacy of legacyFiles) {
  const name = basename(legacy)
  const canonical = findCanonical(name)
  if (canonical.length === 0) {
    orphan.push(relative(process.cwd(), legacy).replace(/\\/g, "/"))
    continue
  }
  const legacyBody = readFileSync(legacy, "utf8")
  let same = false
  for (const c of canonical) {
    if (readFileSync(c, "utf8") === legacyBody) {
      same = true
      identical.push({
        file: name,
        legacy: relative(process.cwd(), legacy).replace(/\\/g, "/"),
        canonical: relative(process.cwd(), c).replace(/\\/g, "/"),
      })
      break
    }
  }
  if (!same) {
    divergent.push({
      file: name,
      legacy: relative(process.cwd(), legacy).replace(/\\/g, "/"),
      canonical: canonical.map((c) =>
        relative(process.cwd(), c).replace(/\\/g, "/")
      ),
    })
  }
}

console.log("LEGACY COUNT", legacyFiles.length)
console.log("IDENTICAL (safe delete legacy)", identical.length)
console.log("DIVERGENT", divergent.length)
console.log("ORPHAN (no domain copy)", orphan.length)
console.log("\n--- ORPHAN ---")
orphan.sort().forEach((f) => console.log(f))
console.log("\n--- DIVERGENT (first 30) ---")
divergent.slice(0, 30).forEach((d) => {
  console.log(d.file)
  console.log("  legacy:", d.legacy)
  d.canonical.forEach((c) => console.log("  canon:", c))
})
