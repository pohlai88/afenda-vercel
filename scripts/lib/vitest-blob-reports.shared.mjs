/**
 * Vitest blob reporter writes to `.vitest-reports/` (hardcoded in Vitest 4.x).
 * Junction/symlink that path → `.artifacts/vitest-reports` keeps the repo root clean.
 */
import fs from "node:fs"
import path from "node:path"

/** Canonical blob merge/upload directory (CI + local shards). */
export const VITEST_BLOB_REPORTS_DIR = ".artifacts/vitest-reports"

/** Path Vitest uses when emitting blob shards (must exist as link or directory). */
export const VITEST_BLOB_REPORTS_LINK = ".vitest-reports"

/**
 * @param {string} root Repo root (absolute).
 */
export function ensureVitestBlobReportsLink(root) {
  const artifactsDir = path.join(root, VITEST_BLOB_REPORTS_DIR)
  const linkPath = path.join(root, VITEST_BLOB_REPORTS_LINK)

  fs.mkdirSync(artifactsDir, { recursive: true })

  if (fs.existsSync(linkPath)) {
    const stat = fs.lstatSync(linkPath)
    if (stat.isDirectory() && !stat.isSymbolicLink()) {
      for (const entry of fs.readdirSync(linkPath)) {
        const from = path.join(linkPath, entry)
        const to = path.join(artifactsDir, entry)
        if (fs.existsSync(to)) {
          fs.rmSync(to, { recursive: true, force: true })
        }
        fs.renameSync(from, to)
      }
      fs.rmdirSync(linkPath)
    } else {
      fs.rmSync(linkPath, { recursive: true, force: true })
    }
  }

  const relativeTarget = path.relative(path.dirname(linkPath), artifactsDir)
  const linkType = process.platform === "win32" ? "junction" : "dir"
  fs.symlinkSync(relativeTarget, linkPath, linkType)
}
