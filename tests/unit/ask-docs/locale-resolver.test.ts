import { afterEach, describe, expect, it, vi } from "vitest"

describe("resolveAskDocsLocale", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("returns the locale when allowlisted", async () => {
    vi.stubEnv("AFENDA_I18N_SINGLE_LOCALE", "")
    vi.stubEnv("NEXT_PUBLIC_AFENDA_I18N_SINGLE_LOCALE", "")
    const { resolveAskDocsLocale } =
      await import("#lib/ask-docs/locale-resolver.shared")
    expect(resolveAskDocsLocale("zh-CN")).toBe("zh-CN")
    expect(resolveAskDocsLocale("vi")).toBe("vi")
  })

  it("falls back to en for unknown or empty input", async () => {
    const { resolveAskDocsLocale } =
      await import("#lib/ask-docs/locale-resolver.shared")
    expect(resolveAskDocsLocale(null)).toBe("en")
    expect(resolveAskDocsLocale("fr")).toBe("en")
  })
})
