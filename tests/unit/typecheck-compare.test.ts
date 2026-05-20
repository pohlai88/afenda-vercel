import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"

describe("typecheck-compare parity tooling", () => {
  it("ships paired solution configs for tsc and tsgo", () => {
    const root = process.cwd()
    expect(fs.existsSync(path.join(root, "tsconfig.build.json"))).toBe(true)
    expect(fs.existsSync(path.join(root, "tsconfig.tsgo.build.json"))).toBe(
      true
    )
    expect(
      fs.existsSync(path.join(root, "scripts/typecheck-compare.mjs"))
    ).toBe(true)
    expect(
      fs.existsSync(path.join(root, ".config/tsconfig.lib-i18n.json"))
    ).toBe(true)
    expect(
      fs.existsSync(path.join(root, ".config/tsconfig.tsgo.lib-i18n.json"))
    ).toBe(true)
  })
})
