import { describe, expect, it } from "vitest"

import {
  formatTypecheckSliceCommand,
  resolveTypecheckSlicesForPaths,
} from "../../scripts/lib/gate-typecheck-slices.shared.mjs"

describe("resolveTypecheckSlicesForPaths", () => {
  it("returns full solution when no paths", () => {
    expect(resolveTypecheckSlicesForPaths([]).map((s) => s.id)).toEqual([
      "lib-db",
      "platform",
    ])
  })

  it("returns platform only for feature paths", () => {
    expect(
      resolveTypecheckSlicesForPaths(["lib/features/hrm/"]).map((s) => s.id)
    ).toEqual(["platform"])
  })

  it("returns lib-db only for schema paths", () => {
    expect(
      resolveTypecheckSlicesForPaths(["lib/db/schema.ts"]).map((s) => s.id)
    ).toEqual(["lib-db"])
  })

  it("returns both when paths span db and features", () => {
    expect(
      resolveTypecheckSlicesForPaths([
        "lib/db/schema.ts",
        "lib/features/hrm/",
      ]).map((s) => s.id)
    ).toEqual(["lib-db", "platform"])
  })
})

describe("formatTypecheckSliceCommand", () => {
  it("joins slice args for tsc -b", () => {
    expect(formatTypecheckSliceCommand(["lib/features/hrm/"])).toBe(
      "pnpm exec tsc -b tsconfig.json"
    )
  })
})
