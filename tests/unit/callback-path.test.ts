import { describe, expect, it } from "vitest"

import {
  DEFAULT_POST_AUTH_PATH,
  resolvePostAuthCallbackUrl,
} from "#lib/auth/callback-path"
import { DEFAULT_APP_LOCALE, toLocalePath } from "#lib/i18n/locales.shared"

describe("resolvePostAuthCallbackUrl", () => {
  it("returns fallback for open redirects", () => {
    expect(resolvePostAuthCallbackUrl("//evil.com")).toBe(
      DEFAULT_POST_AUTH_PATH
    )
    expect(resolvePostAuthCallbackUrl("https://evil.com/x")).toBe(
      DEFAULT_POST_AUTH_PATH
    )
    expect(resolvePostAuthCallbackUrl("/\n/x")).toBe(DEFAULT_POST_AUTH_PATH)
  })

  it("rejects paths without locale prefix", () => {
    expect(resolvePostAuthCallbackUrl("/dashboard")).toBe(
      DEFAULT_POST_AUTH_PATH
    )
    expect(resolvePostAuthCallbackUrl("/account/security")).toBe(
      DEFAULT_POST_AUTH_PATH
    )
  })

  it("allows locale-prefixed same-origin paths", () => {
    expect(
      resolvePostAuthCallbackUrl(toLocalePath(DEFAULT_APP_LOCALE, "/dashboard"))
    ).toBe(toLocalePath(DEFAULT_APP_LOCALE, "/dashboard"))
    expect(
      resolvePostAuthCallbackUrl(
        toLocalePath(DEFAULT_APP_LOCALE, "/account/security")
      )
    ).toBe(toLocalePath(DEFAULT_APP_LOCALE, "/account/security"))
  })

  it("rejects double locale prefix", () => {
    expect(resolvePostAuthCallbackUrl("/en/en/dashboard")).toBe(
      DEFAULT_POST_AUTH_PATH
    )
  })

  it("accepts custom fallback", () => {
    const demo = toLocalePath(DEFAULT_APP_LOCALE, "/demo")
    expect(resolvePostAuthCallbackUrl(null, demo)).toBe(demo)
  })
})
