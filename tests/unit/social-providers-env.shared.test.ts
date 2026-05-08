import { afterEach, describe, expect, it, vi } from "vitest"

import { getEnabledSocialProviderIds } from "#lib/auth/social-providers-env.shared"

describe("getEnabledSocialProviderIds", () => {
  const env = process.env

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env = { ...env }
  })

  it("returns empty when no OAuth env is set", () => {
    delete process.env.GITHUB_CLIENT_ID
    delete process.env.BETTER_AUTH_GITHUB_CLIENT_ID
    delete process.env.GITHUB_CLIENT_SECRET
    delete process.env.BETTER_AUTH_GITHUB_CLIENT_SECRET
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.BETTER_AUTH_GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    delete process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET
    expect(getEnabledSocialProviderIds()).toEqual([])
  })

  it("includes github when legacy or Better Auth GitHub vars are paired", () => {
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    process.env.GITHUB_CLIENT_ID = "gh-id"
    process.env.GITHUB_CLIENT_SECRET = "gh-secret"
    expect(getEnabledSocialProviderIds()).toEqual(["github"])
    delete process.env.GITHUB_CLIENT_ID
    delete process.env.GITHUB_CLIENT_SECRET
    process.env.BETTER_AUTH_GITHUB_CLIENT_ID = "x"
    process.env.BETTER_AUTH_GITHUB_CLIENT_SECRET = "y"
    expect(getEnabledSocialProviderIds()).toEqual(["github"])
  })

  it("includes google when legacy or Better Auth Google vars are paired", () => {
    delete process.env.GITHUB_CLIENT_ID
    delete process.env.GITHUB_CLIENT_SECRET
    process.env.GOOGLE_CLIENT_ID = "g-id"
    process.env.GOOGLE_CLIENT_SECRET = "g-secret"
    expect(getEnabledSocialProviderIds()).toEqual(["google"])
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    process.env.BETTER_AUTH_GOOGLE_CLIENT_ID = "a"
    process.env.BETTER_AUTH_GOOGLE_CLIENT_SECRET = "b"
    expect(getEnabledSocialProviderIds()).toEqual(["google"])
  })

  it("returns both providers when fully configured", () => {
    process.env.GITHUB_CLIENT_ID = "gh"
    process.env.GITHUB_CLIENT_SECRET = "ghs"
    process.env.GOOGLE_CLIENT_ID = "g"
    process.env.GOOGLE_CLIENT_SECRET = "gs"
    expect(getEnabledSocialProviderIds()).toEqual(["github", "google"])
  })

  it("does not include a provider when only id or secret is set", () => {
    process.env.GITHUB_CLIENT_ID = "only-id"
    delete process.env.GITHUB_CLIENT_SECRET
    delete process.env.BETTER_AUTH_GITHUB_CLIENT_SECRET
    expect(getEnabledSocialProviderIds()).toEqual([])
  })
})
