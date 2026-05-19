import { describe, expect, it, vi } from "vitest"

const setRequestLocale = vi.fn()

vi.mock("next-intl/server", () => ({
  setRequestLocale,
}))

describe("bindRequestLocale", () => {
  it("validates locale and pins request locale", async () => {
    const { bindRequestLocale } =
      await import("#lib/i18n/bind-request-locale.server")

    const locale = bindRequestLocale("en")

    expect(locale).toBe("en")
    expect(setRequestLocale).toHaveBeenCalledWith("en")
  })
})
