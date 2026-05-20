import { describe, expect, it } from "vitest"

import {
  parseGateArgs,
  planGateCommands,
  shouldRunGateTypecheck,
} from "../../scripts/gate-args.shared.mjs"

describe("parseGateArgs", () => {
  it("parses paths after --", () => {
    expect(parseGateArgs(["--", "lib/features/hrm/"])).toEqual({
      dryRun: false,
      paths: ["lib/features/hrm/"],
      typecheck: false,
    })
  })

  it("detects --typecheck and --dry-run", () => {
    expect(
      parseGateArgs(["--dry-run", "--", "lib/features/hrm/", "--typecheck"])
    ).toEqual({
      dryRun: true,
      paths: ["lib/features/hrm/"],
      typecheck: true,
    })
  })
})

describe("planGateCommands", () => {
  it("lint only when paths without typecheck flag", () => {
    expect(planGateCommands(["lib/features/hrm/"])).toEqual([
      "pnpm lint:path -- lib/features/hrm/",
    ])
  })

  it("lint and typecheck when --typecheck", () => {
    expect(planGateCommands(["lib/features/hrm/"], { typecheck: true })).toEqual(
      [
        "pnpm lint:path -- lib/features/hrm/",
        "pnpm typecheck",
      ]
    )
  })

  it("typecheck only when no paths", () => {
    expect(planGateCommands([])).toEqual(["pnpm typecheck"])
  })
})

describe("shouldRunGateTypecheck", () => {
  it("skips typecheck for lint-only entry with paths", () => {
    expect(
      shouldRunGateTypecheck(["lib/features/hrm/"], { lintOnlyEntry: true })
    ).toBe(false)
  })

  it("runs typecheck for bare gate or --typecheck", () => {
    expect(shouldRunGateTypecheck([])).toBe(true)
    expect(shouldRunGateTypecheck(["lib/"], { typecheck: true })).toBe(true)
  })
})
