/**
 * lint-staged ESLint wrapper — batches file args; no shell (Windows bracket paths).
 */
import { spawnSync } from "node:child_process"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const eslintBin = join(root, "node_modules", "eslint", "bin", "eslint.js")

const files = process.argv.slice(2).filter(Boolean)
if (files.length === 0) {
  process.exit(0)
}

const batchSize = 15
const eslintArgs = [
  "--cache",
  "--cache-location",
  ".artifacts/.eslintcache",
  "--cache-strategy",
  "content",
  "--max-warnings",
  "0",
  "--no-warn-ignored",
  "--fix",
]

for (let index = 0; index < files.length; index += batchSize) {
  const batch = files.slice(index, index + batchSize)
  const result = spawnSync(process.execPath, [eslintBin, ...eslintArgs, ...batch], {
    stdio: "inherit",
    cwd: root,
  })
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1)
  }
}
