#!/usr/bin/env node
/**
 * Ensures every AfendaGovernedRendererId has a matching switch case in
 * governed-component-skeleton.tsx (ADR-0025 loading parity).
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const registryPath = path.join(ROOT, "components2/metadata/registry.ts")
const skeletonPath = path.join(
  ROOT,
  "components2/metadata/governed-component-skeleton.tsx"
)

const registrySource = fs.readFileSync(registryPath, "utf8")
const rendererIdBlock = registrySource.match(
  /export type AfendaGovernedRendererId\s*=\s*([\s\S]*?)(?:\n\n|\n\/\*\*)/
)
if (!rendererIdBlock) {
  console.error(
    "check-renderer-skeleton-parity: could not parse renderer id union"
  )
  process.exit(1)
}

const rendererIds = [
  ...rendererIdBlock[1].matchAll(/\|\s*"([^"]+)"/g),
  ...rendererIdBlock[1].matchAll(/^ {2}\|\s*"([^"]+)"/gm),
].map((m) => m[1])

const uniqueIds = [...new Set(rendererIds)]
if (uniqueIds.length === 0) {
  console.error("check-renderer-skeleton-parity: no renderer ids found")
  process.exit(1)
}

const skeletonSource = fs.readFileSync(skeletonPath, "utf8")
const caseIds = [...skeletonSource.matchAll(/case\s+"([^"]+)":/g)].map(
  (m) => m[1]
)

const missingCases = uniqueIds.filter((id) => !caseIds.includes(id))
const orphanCases = caseIds.filter((id) => !uniqueIds.includes(id))

if (missingCases.length > 0 || orphanCases.length > 0) {
  console.error("check-renderer-skeleton-parity: FAIL")
  if (missingCases.length > 0) {
    console.error("  missing skeleton case(s):", missingCases.join(", "))
  }
  if (orphanCases.length > 0) {
    console.error("  orphan skeleton case(s):", orphanCases.join(", "))
  }
  process.exit(1)
}

console.log(
  `check-renderer-skeleton-parity: OK (${uniqueIds.length} renderer id(s))`
)
