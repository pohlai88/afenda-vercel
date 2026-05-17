/**
 * Repoint `#components/*` imports to components2 / #app-shell / governed-surface.
 * Does not recreate repo-root `components/`.
 *
 * Usage: node scripts/repoint-deleted-components-imports.mjs [--apply]
 */
import path from "node:path"
import { Node, Project } from "ts-morph"

const APPLY = process.argv.includes("--apply")
const root = path.resolve(import.meta.dirname, "..")

const SCAN = [
  "app/**/*.{ts,tsx}",
  "lib/**/*.{ts,tsx}",
  "components2/**/*.{ts,tsx}",
  "tests/**/*.{ts,tsx}",
  "i18n/**/*.{ts,tsx}",
  "scripts/**/*.{ts,tsx,mjs}",
  "turbo/**/*.{ts,tsx,hbs}",
].map((g) => path.join(root, g))

const project = new Project({ tsConfigFilePath: path.join(root, "tsconfig.json") })
project.addSourceFilesAtPaths(SCAN)

/** Flat `#components2/<file>` → nested folders after port script layout. */
function repointComponents2Flat(spec) {
  const flatToNested = {
    "#components2/segment-route-spinner":
      "#components2/route-loading/segment-route-spinner",
    "#components2/nexus-route-loading":
      "#components2/route-loading/nexus-route-loading",
    "#components2/employee-portal-route-loading":
      "#components2/route-loading/employee-portal-route-loading",
    "#components2/employee-portal-route-loading-detail":
      "#components2/route-loading/employee-portal-route-loading-detail",
    "#components2/employee-portal-route-loading-form":
      "#components2/route-loading/employee-portal-route-loading-form",
    "#components2/route-error-primitives":
      "#components2/route-error/route-error-primitives",
    "#components2/route-error-retry-button":
      "#components2/route-error/route-error-retry-button",
    "#components2/use-report-route-error":
      "#components2/route-error/use-report-route-error",
    "#components2/mode-toggle": "#components2/providers/mode-toggle.client",
  }
  return flatToNested[spec] ?? null
}

function repoint(spec) {
  const flat = repointComponents2Flat(spec)
  if (flat) return flat

  if (spec === "#components/module-page-header") {
    return "#features/governed-surface"
  }
  if (
    spec === "#components/route-envelope-context" ||
    spec === "#components/route-envelope-context.client"
  ) {
    return "#components2/route-envelope-context.client"
  }
  if (spec === "#components/workbench") {
    return "#app-shell"
  }
  if (spec.startsWith("#components/workbench/")) {
    return spec.replace("#components/workbench", "#app-shell")
  }
  if (spec === "#components/ui" || spec.startsWith("#components/ui/")) {
    return spec.replace("#components/ui", "#components2/ui")
  }
  if (spec.startsWith("#components/")) {
    return spec.replace("#components/", "#components2/")
  }
  return null
}

let changed = 0
for (const source of project.getSourceFiles()) {
  let fileChanged = false
  for (const decl of source.getImportDeclarations()) {
    try {
      const specNode = decl.getModuleSpecifier()
      if (!Node.isStringLiteral(specNode)) continue
      const next = repoint(specNode.getLiteralValue())
      if (!next) continue
      if (APPLY) specNode.replaceWithText(JSON.stringify(next))
      console.log(
        `${path.relative(root, source.getFilePath())}: ${specNode.getLiteralValue()} -> ${next}`
      )
      changed++
      fileChanged = true
    } catch {
      continue
    }
  }
  for (const decl of source.getExportDeclarations()) {
    try {
      if (!decl.hasModuleSpecifier()) continue
      const specNode = decl.getModuleSpecifier()
      if (!Node.isStringLiteral(specNode)) continue
      const next = repoint(specNode.getLiteralValue())
      if (!next) continue
      if (APPLY) specNode.replaceWithText(JSON.stringify(next))
      console.log(
        `${path.relative(root, source.getFilePath())}: export ${specNode.getLiteralValue()} -> ${next}`
      )
      changed++
      fileChanged = true
    } catch {
      continue
    }
  }
  if (fileChanged && APPLY) {
    // named import cleanup for ModulePageHeader from governed-surface barrel
  }
}

if (!APPLY) {
  console.log(`\nDry run: ${changed} specifier(s). Pass --apply to write.`)
  if (changed > 0) process.exit(1)
} else {
  project.saveSync()
  console.log(`\nApplied ${changed} specifier change(s).`)
}
