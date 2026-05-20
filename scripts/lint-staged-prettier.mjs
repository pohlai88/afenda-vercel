/**
 * lint-staged Prettier wrapper — batches file args to avoid Windows command-line limits.
 */
import { spawnSync } from "node:child_process"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const prettierBin = join(root, "node_modules", "prettier", "bin", "prettier.cjs")

const files = process.argv.slice(2).filter(Boolean)
if (files.length === 0) {
  process.exit(0)
}

const batchSize = 20
const prettierArgs = ["--write", "--cache", "--cache-location", ".artifacts/.prettiercache"]

for (let index = 0; index < files.length; index += batchSize) {
  const batch = files.slice(index, index + batchSize)
  const result = spawnSync(process.execPath, [prettierBin, ...prettierArgs, ...batch], {
    stdio: "inherit",
    cwd: root,
  })
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1)
  }
}
