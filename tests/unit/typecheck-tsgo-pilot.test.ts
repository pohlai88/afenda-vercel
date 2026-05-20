import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

describe("typecheck-tsgo pilot config", () => {
  it("ships tsgo solution configs without baseUrl", () => {
    const root = process.cwd()
    const baseTsgo = path.join(root, "tsconfig.base.tsgo.json")
    const solution = path.join(root, "tsconfig.tsgo.build.json")
    expect(fs.existsSync(baseTsgo)).toBe(true)
    expect(fs.existsSync(solution)).toBe(true)
    const parsed = JSON.parse(fs.readFileSync(baseTsgo, "utf8")) as {
      compilerOptions?: { baseUrl?: string }
    }
    expect(parsed.compilerOptions?.baseUrl).toBeUndefined()
  })
})
