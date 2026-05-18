import "server-only"

import { setRequestLocale } from "next-intl/server"

import { ensureAppLocale, type AppLocale } from "./locales.shared"

/**
 * Validates `locale` and pins it for the current request (next-intl static rendering).
 * Call from App Router layouts/pages that receive `[locale]` in `params`.
 */
export function bindRequestLocale(localeRaw: string): AppLocale {
  const locale = ensureAppLocale(localeRaw)
  setRequestLocale(locale)
  return locale
}
