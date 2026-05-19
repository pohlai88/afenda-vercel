import { describe, expect, it } from "vitest"

import { neonAuthErrorMessage } from "#lib/auth/neon-auth-error.shared"

describe("neon-auth-error.shared", () => {
  it("prefers message over statusText", () => {
    expect(
      neonAuthErrorMessage({
        message: "Invalid token",
        statusText: "Bad Request",
      })
    ).toBe("Invalid token")
  })

  it("falls back to statusText then default copy", () => {
    expect(neonAuthErrorMessage({ statusText: "Forbidden" })).toBe("Forbidden")
    expect(neonAuthErrorMessage(null)).toBe("Something went wrong.")
  })
})
