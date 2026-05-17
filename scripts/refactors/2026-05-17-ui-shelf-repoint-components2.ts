#!/usr/bin/env tsx
/**
 * Repoint UI shelf imports from deprecated `#components/ui/*` to `#components2/ui/*`.
 *
 * Scope: module specifiers that start with `#components/ui` only — does not touch
 * `#components/workbench`, `#components/auth`, or other `#components/*` paths.
 *
 * Usage:
 *   pnpm exec tsx scripts/refactors/2026-05-17-ui-shelf-repoint-components2.ts
 *   pnpm exec tsx scripts/refactors/2026-05-17-ui-shelf-repoint-components2.ts --apply
 */
import path from "node:path"
import { fileURLToPath } from "node:url"

import { Project } from "ts-morph"

const APPLY = process.argv.includes("--apply")
const FROM = "#components/ui"
const TO = "#components2/ui"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

const SCAN_GLOBS = [
  "app/**/*.{ts,tsx}",
  "lib/**/*.{ts,tsx}",
  "components2/**/*.{ts,tsx}",
  "tests/**/*.{ts,tsx}",
  "i18n/**/*.{ts,tsx}",
] as const

const project = new Project({
  tsConfigFilePath: path.join(root, "tsconfig.json"),
})

project.addSourceFilesAtPaths(SCAN_GLOBS.map((g) => path.join(root, g)))

let changed = 0
const touched = new Set<string>()

function repointSpecifier(spec: string): string | null {
  if (spec === FROM || spec.startsWith(`${FROM}/`)) {
    return spec.replace(FROM, TO)
  }
  return null
}

for (const source of project.getSourceFiles()) {
  let fileChanged = false

  for (const decl of source.getImportDeclarations()) {
    const next = repointSpecifier(decl.getModuleSpecifierValue())
    if (!next) continue
    if (APPLY) decl.setModuleSpecifier(next)
    console.log(`${source.getFilePath()}: ${decl.getModuleSpecifierValue()} -> ${next}`)
    changed++
    fileChanged = true
  }

  for (const decl of source.getExportDeclarations()) {
    const spec = decl.getModuleSpecifierValue()
    if (!spec) continue
    const next = repointSpecifier(spec)
    if (!next) continue
    if (APPLY) decl.setModuleSpecifier(next)
    console.log(`${source.getFilePath()}: ${spec} -> ${next}`)
    changed++
    fileChanged = true
  }

  if (fileChanged) {
    touched.add(path.relative(root, source.getFilePath()))
  }
}

if (!APPLY) {
  console.log(
    `\nDry run — ${changed} specifier(s) across ${touched.size} file(s). Pass --apply to write.`
  )
  if (changed > 0) process.exit(1)
} else {
  project.saveSync()
  console.log(`\nApplied ${changed} specifier change(s) across ${touched.size} file(s).`)
}
