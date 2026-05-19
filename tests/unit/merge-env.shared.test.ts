import { describe, expect, it } from "vitest"

import { mergeChildEnv } from "../../scripts/lib/merge-env.shared.mjs"

describe("mergeChildEnv", () => {
  it("lets process.env override file by default", () => {
    const merged = mergeChildEnv(
      { BETTER_AUTH_URL: "http://localhost:3002" },
      { BETTER_AUTH_URL: "http://localhost:3000" },
      {}
    )
    expect(merged.BETTER_AUTH_URL).toBe("http://localhost:3000")
  })

  it("lets file override process.env when fileOverrides is true", () => {
    const merged = mergeChildEnv(
      { BETTER_AUTH_URL: "http://localhost:3002" },
      { BETTER_AUTH_URL: "http://localhost:3000" },
      { fileOverrides: true }
    )
    expect(merged.BETTER_AUTH_URL).toBe("http://localhost:3002")
  })
})
