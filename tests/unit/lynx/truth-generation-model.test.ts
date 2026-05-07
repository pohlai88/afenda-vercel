import { afterEach, describe, expect, it, vi } from "vitest"

import { resolveLynxTruthStreamModel } from "#features/lynx"

describe("resolveLynxTruthStreamModel", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns null when neither gateway nor OpenAI key is set", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "")
    vi.stubEnv("OPENAI_API_KEY", "")
    expect(resolveLynxTruthStreamModel()).toBeNull()
  })

  it("returns a model when OpenAI key is set", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "")
    vi.stubEnv("OPENAI_API_KEY", "sk-test")
    vi.stubEnv("LYNX_GENERATION_MODEL", "")
    expect(resolveLynxTruthStreamModel()).not.toBeNull()
  })

  it("prefers gateway when AI_GATEWAY_API_KEY is set", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "gk-test")
    vi.stubEnv("OPENAI_API_KEY", "")
    vi.stubEnv("LYNX_GENERATION_MODEL", "")
    expect(resolveLynxTruthStreamModel()).not.toBeNull()
  })
})
