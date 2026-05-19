import { describe, expect, it } from "vitest"

import {
  defaultPostAuthPath,
  resolvePostAuthCallbackUrl,
} from "#lib/auth/callback-path"
import { DEFAULT_APP_LOCALE, toLocalePath } from "#lib/i18n/locales.shared"

const defaultFallback = defaultPostAuthPath(DEFAULT_APP_LOCALE)

describe("resolvePostAuthCallbackUrl", () => {
  it("returns fallback for open redirects", () => {
    expect(resolvePostAuthCallbackUrl("//evil.com")).toBe(defaultFallback)
    expect(resolvePostAuthCallbackUrl("https://evil.com/x")).toBe(
      defaultFallback
    )
    expect(resolvePostAuthCallbackUrl("/\n/x")).toBe(defaultFallback)
  })

  it("rejects paths without locale prefix", () => {
    expect(resolvePostAuthCallbackUrl("/dashboard")).toBe(defaultFallback)
    expect(resolvePostAuthCallbackUrl("/o/acme/iam-profile/security")).toBe(
      defaultFallback
    )
  })

  it("allows locale-prefixed same-origin paths", () => {
    expect(
      resolvePostAuthCallbackUrl(toLocalePath(DEFAULT_APP_LOCALE, "/o"))
    ).toBe(toLocalePath(DEFAULT_APP_LOCALE, "/o"))
    expect(
      resolvePostAuthCallbackUrl(
        toLocalePath(DEFAULT_APP_LOCALE, "/o/acme/iam-profile/security")
      )
    ).toBe(toLocalePath(DEFAULT_APP_LOCALE, "/o/acme/iam-profile/security"))
    expect(
      resolvePostAuthCallbackUrl(
        toLocalePath(DEFAULT_APP_LOCALE, "/o/acme/apps/orbit")
      )
    ).toBe(toLocalePath(DEFAULT_APP_LOCALE, "/o/acme/apps/orbit"))
    expect(
      resolvePostAuthCallbackUrl(
        toLocalePath(DEFAULT_APP_LOCALE, "/p/acme-employee/employee")
      )
    ).toBe(toLocalePath(DEFAULT_APP_LOCALE, "/p/acme-employee/employee"))
  })

  it("rejects double locale prefix", () => {
    expect(resolvePostAuthCallbackUrl("/en/en/dashboard")).toBe(defaultFallback)
  })

  it("accepts custom fallback", () => {
    const demo = toLocalePath(DEFAULT_APP_LOCALE, "/demo")
    expect(resolvePostAuthCallbackUrl(null, demo)).toBe(demo)
  })
})
