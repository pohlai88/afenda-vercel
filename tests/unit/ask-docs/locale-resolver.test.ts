import { describe, expect, it } from "vitest"

import { resolveAskDocsLocale } from "#lib/ask-docs/locale-resolver.shared"

describe("resolveAskDocsLocale", () => {
  it("returns the locale when allowlisted", () => {
    expect(resolveAskDocsLocale("zh-CN")).toBe("zh-CN")
    expect(resolveAskDocsLocale("vi")).toBe("vi")
  })

  it("falls back to en for unknown or empty input", () => {
    expect(resolveAskDocsLocale(null)).toBe("en")
    expect(resolveAskDocsLocale("fr")).toBe("en")
  })
})
