import { describe, expect, it } from "vitest"

import {
  formatTypecheckSliceCommand,
  resolveTypecheckSlicesForPaths,
} from "../../scripts/lib/gate-typecheck-slices.shared.mjs"

describe("resolveTypecheckSlicesForPaths", () => {
  it("returns solution root when no paths", () => {
    expect(resolveTypecheckSlicesForPaths([]).map((s) => s.id)).toEqual([
      "solution",
    ])
    expect(resolveTypecheckSlicesForPaths([])[0]?.args).toEqual([
      "tsconfig.build.json",
    ])
  })

  it("returns platform only for feature paths", () => {
    expect(
      resolveTypecheckSlicesForPaths(["lib/features/hrm/"]).map((s) => s.id)
    ).toEqual(["platform"])
  })

  it("returns test graph for tests paths", () => {
    expect(
      resolveTypecheckSlicesForPaths(["tests/unit/gate-args.shared.test.ts"]).map(
        (s) => s.id
      )
    ).toEqual(["test"])
    expect(
      resolveTypecheckSlicesForPaths(["tests/unit/gate-args.shared.test.ts"])[0]
        ?.mode
    ).toBe("noEmit")
  })

  it("returns scripts graph for scripts paths", () => {
    expect(
      resolveTypecheckSlicesForPaths(["scripts/gate.mjs"]).map((s) => s.id)
    ).toEqual(["scripts"])
  })

  it("returns test and scripts graphs when both trees are touched", () => {
    expect(
      resolveTypecheckSlicesForPaths([
        "tests/unit/foo.test.ts",
        "scripts/bar.mjs",
      ]).map((s) => s.id)
    ).toEqual(["test", "scripts"])
  })

  it("returns lib-db only for schema paths", () => {
    expect(
      resolveTypecheckSlicesForPaths(["lib/db/schema.ts"]).map((s) => s.id)
    ).toEqual(["lib-db"])
  })

  it("returns solution root when paths span db and features", () => {
    expect(
      resolveTypecheckSlicesForPaths([
        "lib/db/schema.ts",
        "lib/features/hrm/",
      ]).map((s) => s.id)
    ).toEqual(["solution"])
  })
})

describe("formatTypecheckSliceCommand", () => {
  it("delegates to typecheck-build for path-scoped slices", () => {
    expect(formatTypecheckSliceCommand(["lib/features/hrm/"])).toBe(
      "node scripts/typecheck-build.mjs lib/features/hrm/"
    )
  })

  it("uses full solution when no paths", () => {
    expect(formatTypecheckSliceCommand([])).toBe("pnpm typecheck")
  })
})
