import { describe, expect, it } from "vitest"

import { authInterruptionHref } from "#lib/auth/auth-interruption-url.shared"
import { AUTH_STATUS } from "#lib/auth/auth-status.shared"
import { DEFAULT_APP_LOCALE, toLocalePath } from "#lib/i18n/locales.shared"

describe("authInterruptionHref locale propagation", () => {
  it("embeds requested locale in interruption and default callback paths", () => {
    const href = authInterruptionHref(AUTH_STATUS.SESSION_EXPIRED, {
      locale: DEFAULT_APP_LOCALE,
    })
    expect(href).toContain(
      `callbackUrl=${encodeURIComponent(toLocalePath(DEFAULT_APP_LOCALE, "/dashboard"))}`
    )
    expect(
      href.startsWith(toLocalePath(DEFAULT_APP_LOCALE, "/session-expired"))
    ).toBe(true)
  })

  it("uses non-default locale segment when provided", () => {
    // When a second locale exists, paths must follow that prefix; today only `en`
    // is in APP_LOCALES — this documents the contract for future locales.
    const href = authInterruptionHref(AUTH_STATUS.SESSION_EXPIRED, {
      locale: "en",
      callbackPath: "/en/onboarding",
    })
    expect(href).toContain("authStatus=session_expired")
    expect(href).toContain(
      `callbackUrl=${encodeURIComponent("/en/onboarding")}`
    )
  })
})
