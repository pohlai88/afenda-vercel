import { describe, expect, it } from "vitest"

import {
  DEFAULT_APP_LOCALE,
  ensureAppLocale,
  stripLeadingLocalePrefix,
  toLocaleOrgDashboardRevalidatePattern,
  toLocalePath,
  toLocaleRoutePattern,
} from "#lib/i18n/locales.shared"
import { DEFAULT_LOCALE_HOME_PATH } from "#lib/i18n/root-default-locale-href.shared"

describe("DEFAULT_LOCALE_HOME_PATH", () => {
  it("matches default locale home from toLocalePath", () => {
    expect(DEFAULT_LOCALE_HOME_PATH).toBe(toLocalePath(DEFAULT_APP_LOCALE, "/"))
  })
})

describe("toLocalePath", () => {
  it("prefixes locale-internal paths", () => {
    expect(toLocalePath("en", "/dashboard")).toBe("/en/dashboard")
    expect(toLocalePath("en", "/")).toBe("/en")
  })

  it("is idempotent when already prefixed", () => {
    expect(toLocalePath("en", "/en/dashboard")).toBe("/en/dashboard")
    expect(toLocalePath("en", "/en")).toBe("/en")
  })
})

describe("toLocaleRoutePattern", () => {
  it("wraps with dynamic locale segment", () => {
    expect(toLocaleRoutePattern("/dashboard/contacts")).toBe(
      "/[locale]/dashboard/contacts"
    )
    expect(toLocaleRoutePattern("/")).toBe("/[locale]")
  })
})

describe("toLocaleOrgDashboardRevalidatePattern", () => {
  it("includes org slug segment for dashboard module paths", () => {
    expect(toLocaleOrgDashboardRevalidatePattern("/contacts")).toBe(
      "/[locale]/o/[orgSlug]/dashboard/contacts"
    )
    expect(toLocaleOrgDashboardRevalidatePattern("")).toBe(
      "/[locale]/o/[orgSlug]/dashboard"
    )
  })
})

describe("ensureAppLocale", () => {
  it("returns known locale or default", () => {
    expect(ensureAppLocale("en")).toBe("en")
    expect(ensureAppLocale("xx")).toBe(DEFAULT_APP_LOCALE)
  })
})

describe("stripLeadingLocalePrefix", () => {
  it("rejects double locale prefix", () => {
    expect(stripLeadingLocalePrefix("/en/en/dashboard")).toBeNull()
  })
})
