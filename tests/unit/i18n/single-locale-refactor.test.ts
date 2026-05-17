import { afterEach, describe, expect, it, vi } from "vitest"

describe("isAfendaSingleLocaleRefactorMode", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("is off when env vars are unset", async () => {
    vi.stubEnv("AFENDA_I18N_SINGLE_LOCALE", "")
    vi.stubEnv("NEXT_PUBLIC_AFENDA_I18N_SINGLE_LOCALE", "")
    const { isAfendaSingleLocaleRefactorMode, APP_LOCALES, FULL_APP_LOCALES } =
      await import("#lib/i18n/locales.shared")
    expect(isAfendaSingleLocaleRefactorMode()).toBe(false)
    expect(APP_LOCALES).toEqual(FULL_APP_LOCALES)
  })

  it("narrows APP_LOCALES to en when AFENDA_I18N_SINGLE_LOCALE=1", async () => {
    vi.stubEnv("AFENDA_I18N_SINGLE_LOCALE", "1")
    vi.stubEnv("NEXT_PUBLIC_AFENDA_I18N_SINGLE_LOCALE", "")
    const { isAfendaSingleLocaleRefactorMode, APP_LOCALES } =
      await import("#lib/i18n/locales.shared")
    expect(isAfendaSingleLocaleRefactorMode()).toBe(true)
    expect(APP_LOCALES).toEqual(["en"])
  })
})
