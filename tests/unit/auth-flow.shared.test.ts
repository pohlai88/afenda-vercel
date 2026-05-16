import { describe, expect, it } from "vitest"

import {
  authResponseHasSessionToken,
  buildCheckEmailHref,
  buildVerifyEmailHref,
  parsePrefillEmail,
  resolvePostSignUpPath,
} from "../../app/(main)/[locale]/(auth)/auth-flow.shared"

describe("auth-flow.shared", () => {
  it("normalizes valid email prefills and rejects invalid ones", () => {
    expect(parsePrefillEmail("  user@example.com  ")).toBe("user@example.com")
    expect(parsePrefillEmail("not-an-email")).toBeUndefined()
    expect(parsePrefillEmail(undefined)).toBeUndefined()
  })

  it("builds check-email and verify-email hrefs with preserved callback state", () => {
    expect(
      buildCheckEmailHref({
        email: "user@example.com",
        callbackUrl: "/en/o/demo-org/dashboard",
      })
    ).toBe(
      "/check-email?email=user%40example.com&callbackUrl=%2Fen%2Fo%2Fdemo-org%2Fdashboard"
    )

    expect(
      buildVerifyEmailHref({
        email: "user@example.com",
        callbackUrl: "/en/o/demo-org/dashboard",
      })
    ).toBe(
      "/verify-email?email=user%40example.com&callbackUrl=%2Fen%2Fo%2Fdemo-org%2Fdashboard"
    )
  })

  it("detects session tokens from direct and nested auth responses", () => {
    expect(authResponseHasSessionToken({ token: "session-token" })).toBe(true)
    expect(
      authResponseHasSessionToken({ data: { token: "session-token" } })
    ).toBe(true)
    expect(authResponseHasSessionToken({ data: { token: null } })).toBe(false)
  })

  it("routes unverified sign-ups through check-email and verified sign-ups to the callback", () => {
    expect(
      resolvePostSignUpPath(
        {
          data: {
            token: null,
            user: { emailVerified: false },
          },
        },
        {
          email: "user@example.com",
          postAuthPath: "/en/o/demo-org/dashboard",
        }
      )
    ).toBe(
      "/check-email?email=user%40example.com&callbackUrl=%2Fen%2Fo%2Fdemo-org%2Fdashboard"
    )

    expect(
      resolvePostSignUpPath(
        {
          data: {
            token: "session-token",
            user: { emailVerified: true },
          },
        },
        {
          email: "user@example.com",
          postAuthPath: "/en/o/demo-org/dashboard",
        }
      )
    ).toBe("/en/o/demo-org/dashboard")
  })
})
