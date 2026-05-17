#!/usr/bin/env node
/**
 * Ensures the metadata renderer gallery catalog exists (runtime parse is
 * covered by tests/unit/components2/metadata/gallery-scenarios.test.ts).
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const required = [
  "components2/dev/metadata-renderer-gallery/gallery-scenarios.ts",
  "components2/dev/metadata-renderer-gallery/gallery-fixtures.ts",
]

const missing = required.filter((rel) => !fs.existsSync(path.join(ROOT, rel)))

if (missing.length > 0) {
  console.error("check-renderer-fixtures: FAIL — missing:", missing.join(", "))
  process.exit(1)
}

console.log("check-renderer-fixtures: OK (gallery catalog present)")
