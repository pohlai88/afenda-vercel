import { afterEach, describe, expect, it, vi } from "vitest"

describe("lib/auth/neon.server Neon Auth env", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("initializes during NEXT_PHASE production build without NEON_AUTH_*", async () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-build")
    vi.stubEnv("NEON_AUTH_BASE_URL", "")
    vi.stubEnv("NEON_AUTH_COOKIE_SECRET", "")
    const { getNeonAuth } = await import("#lib/auth/neon.server")
    expect(() => getNeonAuth()).not.toThrow()
  })

  it("initializes when NEXT_PHASE is unset but argv indicates next build (worker fallback)", async () => {
    vi.stubEnv("NEXT_PHASE", "")
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("NEON_AUTH_BASE_URL", "")
    vi.stubEnv("NEON_AUTH_COOKIE_SECRET", "")
    const prevArgv = process.argv
    process.argv = ["node", "/fake/path/next", "build"]
    try {
      const { getNeonAuth } = await import("#lib/auth/neon.server")
      expect(() => getNeonAuth()).not.toThrow()
    } finally {
      process.argv = prevArgv
    }
  })

  it("throws when NEON_AUTH_* missing outside production build phase", async () => {
    vi.stubEnv("NEXT_PHASE", "")
    vi.stubEnv("NEON_AUTH_BASE_URL", "")
    vi.stubEnv("NEON_AUTH_COOKIE_SECRET", "")
    const { getNeonAuth } = await import("#lib/auth/neon.server")
    expect(() => getNeonAuth()).toThrow(/Neon Auth is not configured/)
  })

  it("isNeonAuthRuntimeFullyConfigured is false when secrets missing", async () => {
    vi.stubEnv("NEON_AUTH_BASE_URL", "")
    vi.stubEnv("NEON_AUTH_COOKIE_SECRET", "")
    const { isNeonAuthRuntimeFullyConfigured } =
      await import("#lib/auth/neon.server")
    expect(isNeonAuthRuntimeFullyConfigured()).toBe(false)
  })

  it("isNeonAuthRuntimeFullyConfigured is true when both set", async () => {
    vi.stubEnv(
      "NEON_AUTH_BASE_URL",
      "https://example.neonauth.invalid/neondb/auth"
    )
    vi.stubEnv("NEON_AUTH_COOKIE_SECRET", "x".repeat(40))
    const { isNeonAuthRuntimeFullyConfigured } =
      await import("#lib/auth/neon.server")
    expect(isNeonAuthRuntimeFullyConfigured()).toBe(true)
  })
})
