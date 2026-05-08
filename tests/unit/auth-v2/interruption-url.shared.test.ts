import { describe, expect, it } from "vitest"

import { AUTH_STATUS } from "#lib/auth/auth-status.shared"
import { authInterruptionHrefV2 } from "#lib/auth-v2/interruption-url.shared"

describe("authInterruptionHrefV2", () => {
  it("builds locale-prefixed session-expired URL with authStatus and callbackUrl", () => {
    const href = authInterruptionHrefV2(AUTH_STATUS.SESSION_EXPIRED, {
      locale: "en",
    })
    const u = new URL(`http://localhost${href}`)
    expect(u.pathname).toBe("/en/session-expired")
    expect(u.searchParams.get("authStatus")).toBe(AUTH_STATUS.SESSION_EXPIRED)
    expect(u.searchParams.get("callbackUrl")).toBe("/en")
  })

  it("sanitizes optional context onto query", () => {
    const href = authInterruptionHrefV2(AUTH_STATUS.EMAIL_UNVERIFIED, {
      locale: "en",
      context: "verify",
    })
    expect(href).toContain("context=verify")
  })
})
