import { readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

function walk(dir, acc = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name)
    if (ent.isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx)$/.test(ent.name)) acc.push(p)
  }
  return acc
}

let count = 0
for (const root of ["lib/features/hrm", "tests/unit", "tests/e2e", "app"]) {
  for (const file of walk(join(process.cwd(), root))) {
    let content = readFileSync(file, "utf8")
    const before = content
    content = content.replace(/from (["'])([^"']+)\.ts\1/g, "from $1$2$1")
    content = content.replace(/import\((["'])([^"']+)\.ts\1\)/g, "import($1$2$1)")
    if (content !== before) {
      writeFileSync(file, content)
      count++
    }
  }
}
console.log("Updated", count, "files")
