/**
 * Repoint governed-surface renderer-path files from #components/ui to #components2/ui.
 *
 * Usage:
 *   pnpm exec tsx scripts/refactors/2026-05-16-governed-surface-ui-repoint.ts
 *   pnpm exec tsx scripts/refactors/2026-05-16-governed-surface-ui-repoint.ts --apply
 */
import path from "node:path"
import { fileURLToPath } from "node:url"

import { Project } from "ts-morph"

const APPLY = process.argv.includes("--apply")

const ALLOWLIST = [
  "lib/features/governed-surface/components/governed-empty.tsx",
  "lib/features/governed-surface/components/action-form-errors.tsx",
  "lib/features/governed-surface/components/governed-data-table.client.tsx",
] as const

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const project = new Project({
  tsConfigFilePath: path.join(root, "tsconfig.json"),
})

let changed = 0

for (const rel of ALLOWLIST) {
  const filePath = path.join(root, rel)
  const source = project.getSourceFile(filePath)
  if (!source) {
    console.error(`Allowlisted file not found: ${rel}`)
    process.exit(1)
  }

  for (const decl of source.getImportDeclarations()) {
    const spec = decl.getModuleSpecifierValue()
    if (!spec.startsWith("#components/ui")) continue
    const next = spec.replace("#components/ui", "#components2/ui")
    if (APPLY) {
      decl.setModuleSpecifier(next)
    }
    console.log(`${rel}: ${spec} -> ${next}`)
    changed++
  }
}

if (!APPLY) {
  console.log(
    `\nDry run — ${changed} import(s) would change. Pass --apply to write.`
  )
} else {
  project.saveSync()
  console.log(`\nApplied ${changed} import change(s).`)
}
