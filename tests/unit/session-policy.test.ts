import { describe, expect, it } from "vitest"

import {
  AUTH_SESSION_FRESH_AGE_SECONDS,
  isSessionFresh,
} from "#lib/auth/session-policy.server"

describe("isSessionFresh", () => {
  it("is true when age is within fresh window", () => {
    const now = Date.now()
    expect(
      isSessionFresh(
        { createdAt: new Date(now - 30_000) },
        AUTH_SESSION_FRESH_AGE_SECONDS
      )
    ).toBe(true)
  })

  it("is false when older than fresh window", () => {
    const now = Date.now()
    expect(
      isSessionFresh(
        {
          createdAt: new Date(
            now - (AUTH_SESSION_FRESH_AGE_SECONDS + 1) * 1000
          ),
        },
        AUTH_SESSION_FRESH_AGE_SECONDS
      )
    ).toBe(false)
  })

  it("treats non-positive fresh age as always fresh", () => {
    expect(isSessionFresh({ createdAt: new Date(0) }, 0)).toBe(true)
  })
})
