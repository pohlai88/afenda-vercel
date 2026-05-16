#!/usr/bin/env node
/**
 * Enforces 1:1 parity between AFENDA_GOVERNED_COMPONENT_REGISTRY renderer ids
 * and files under components2/metadata/renderers/*.renderer.tsx
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const registryPath = path.join(root, "components2/metadata/registry.ts")
const renderersDir = path.join(root, "components2/metadata/renderers")

const source = fs.readFileSync(registryPath, "utf8")
const idMatches = [...source.matchAll(/"governed:[^"]+":\s*"([^"]+)"/g)]
const rendererIds = idMatches.map((m) => m[1])

if (rendererIds.length === 0) {
  console.error(
    "check-components2-renderers: no renderer ids found in registry.ts"
  )
  process.exit(1)
}

const files = fs
  .readdirSync(renderersDir)
  .filter((f) => f.endsWith(".renderer.tsx"))

const fileIds = files.map((f) => f.replace(/\.renderer\.tsx$/, ""))

const missingFiles = rendererIds.filter((id) => !fileIds.includes(id))
const orphanFiles = fileIds.filter((id) => !rendererIds.includes(id))

if (missingFiles.length > 0 || orphanFiles.length > 0) {
  if (missingFiles.length > 0) {
    console.error(
      "Missing renderer files for registry ids:",
      missingFiles.join(", ")
    )
  }
  if (orphanFiles.length > 0) {
    console.error(
      "Orphan renderer files (not in registry):",
      orphanFiles.join(", ")
    )
  }
  process.exit(1)
}

console.log(
  `check-components2-renderers: OK (${rendererIds.length} renderer(s) in parity)`
)
