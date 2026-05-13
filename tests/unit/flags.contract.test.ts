import { afterEach, describe, expect, it, vi } from "vitest"
import { getProviderData } from "flags/next"

vi.mock("server-only", () => ({}))

import { readBooleanFlagEnv, vercelFlags } from "#flags"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("Vercel flags contract", () => {
  it("exposes governed rollout flags to the discovery endpoint", () => {
    const providerData = getProviderData(vercelFlags)

    expect(Object.keys(providerData.definitions).sort()).toEqual(
      [
        "lynx-operator-enabled",
        "lynx-operator-orbit-tools-enabled",
        "lynx-structured-query-demo-enabled",
        "orbit-advanced-operator-controls-enabled",
      ].sort()
    )
  })

  it("parses boolean env overrides conservatively", () => {
    vi.stubEnv("FLAG_SAMPLE_ON", "true")
    vi.stubEnv("FLAG_SAMPLE_OFF", "0")
    vi.stubEnv("FLAG_SAMPLE_UNKNOWN", "maybe")

    expect(readBooleanFlagEnv("FLAG_SAMPLE_ON", false)).toBe(true)
    expect(readBooleanFlagEnv("FLAG_SAMPLE_OFF", true)).toBe(false)
    expect(readBooleanFlagEnv("FLAG_SAMPLE_UNKNOWN", true)).toBe(true)
    expect(readBooleanFlagEnv("FLAG_SAMPLE_MISSING", false)).toBe(false)
  })
})
