import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { resolveLynxTruthStreamModel } from "#features/lynx/data/truth-generation-model.server"

describe("resolveLynxTruthStreamModel", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns null when AI Gateway credentials are absent", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "")
    vi.stubEnv("VERCEL_OIDC_TOKEN", "")
    expect(resolveLynxTruthStreamModel()).toBeNull()
  })

  it("returns a model when AI_GATEWAY_API_KEY is set", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "gk-test")
    vi.stubEnv("VERCEL_OIDC_TOKEN", "")
    vi.stubEnv("LYNX_GENERATION_MODEL", "")
    expect(resolveLynxTruthStreamModel()).not.toBeNull()
  })

  it("returns a model when VERCEL_OIDC_TOKEN is set (Vercel deploy)", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "")
    vi.stubEnv("VERCEL_OIDC_TOKEN", "oidc-test-token")
    vi.stubEnv("LYNX_GENERATION_MODEL", "")
    expect(resolveLynxTruthStreamModel()).not.toBeNull()
  })
})
