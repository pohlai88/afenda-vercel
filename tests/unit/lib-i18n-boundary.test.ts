import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const LIB_I18N_DIR = join(process.cwd(), "lib/i18n")

function listTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...listTsFiles(full))
      continue
    }
    if (entry.name.endsWith(".ts")) {
      files.push(full)
    }
  }
  return files
}

describe("lib/i18n import boundary", () => {
  it("does not import #features (acyclic routing SSOT)", () => {
    const offenders: string[] = []
    for (const file of listTsFiles(LIB_I18N_DIR)) {
      const text = readFileSync(file, "utf8")
      if (
        /from\s+["']#features\//.test(text) ||
        /import\s*\(\s*["']#features\//.test(text)
      ) {
        offenders.push(
          file.replace(process.cwd() + "\\", "").replaceAll("\\", "/")
        )
      }
    }
    expect(offenders).toEqual([])
  })
})
