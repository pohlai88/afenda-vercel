import { describe, expect, it } from "vitest"

import {
  DEFAULT_APP_LOCALE,
  ensureAppLocale,
  toLocaleOrgAppsRevalidatePattern,
  toLocaleOrgNexusRevalidatePattern,
  toLocaleOrgShellRevalidatePattern,
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
    expect(toLocalePath("en", "/apps/contacts")).toBe("/en/apps/contacts")
    expect(toLocalePath("en", "/")).toBe("/en")
  })

  it("is idempotent when already prefixed", () => {
    expect(toLocalePath("en", "/en/apps/contacts")).toBe("/en/apps/contacts")
    expect(toLocalePath("en", "/en")).toBe("/en")
  })
})

describe("toLocaleRoutePattern", () => {
  it("wraps with dynamic locale segment", () => {
    expect(toLocaleRoutePattern("/apps/contacts")).toBe(
      "/[locale]/apps/contacts"
    )
    expect(toLocaleRoutePattern("/")).toBe("/[locale]")
  })
})

describe("toLocaleOrgNexusRevalidatePattern", () => {
  it("targets the Nexus field segment", () => {
    expect(toLocaleOrgNexusRevalidatePattern()).toBe(
      "/[locale]/o/[orgSlug]/nexus"
    )
  })
})

describe("toLocaleOrgShellRevalidatePattern", () => {
  it("targets the org ERP shell layout", () => {
    expect(toLocaleOrgShellRevalidatePattern()).toBe("/[locale]/o/[orgSlug]")
  })
})

describe("toLocaleOrgAppsRevalidatePattern", () => {
  it("includes org slug segment for apps module paths", () => {
    expect(toLocaleOrgAppsRevalidatePattern("/contacts")).toBe(
      "/[locale]/o/[orgSlug]/apps/contacts"
    )
    expect(toLocaleOrgAppsRevalidatePattern("/knowledge")).toBe(
      "/[locale]/o/[orgSlug]/apps/knowledge"
    )
    expect(toLocaleOrgAppsRevalidatePattern("/lynx")).toBe(
      "/[locale]/o/[orgSlug]/apps/lynx"
    )
    expect(toLocaleOrgAppsRevalidatePattern("")).toBe(
      "/[locale]/o/[orgSlug]/apps"
    )
  })
})

describe("ensureAppLocale", () => {
  it("returns known locale or default", () => {
    expect(ensureAppLocale("en")).toBe("en")
    expect(ensureAppLocale("xx")).toBe(DEFAULT_APP_LOCALE)
  })
})
