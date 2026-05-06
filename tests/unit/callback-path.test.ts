import { describe, expect, it } from "vitest"

import { resolvePostAuthCallbackUrl } from "#lib/auth/callback-path"

describe("resolvePostAuthCallbackUrl", () => {
  it("returns fallback for open redirects", () => {
    expect(resolvePostAuthCallbackUrl("//evil.com")).toBe("/onboarding")
    expect(resolvePostAuthCallbackUrl("https://evil.com/x")).toBe("/onboarding")
    expect(resolvePostAuthCallbackUrl("/\n/x")).toBe("/onboarding")
  })

  it("allows same-origin relative paths", () => {
    expect(resolvePostAuthCallbackUrl("/dashboard")).toBe("/dashboard")
    expect(resolvePostAuthCallbackUrl("/account/security")).toBe(
      "/account/security"
    )
  })

  it("accepts custom fallback", () => {
    expect(resolvePostAuthCallbackUrl(null, "/demo")).toBe("/demo")
  })
})
