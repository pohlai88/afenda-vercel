import {
  DEFAULT_APP_LOCALE,
  isAppLocale,
  type AppLocale,
} from "#lib/i18n/locales.shared"

/**
 * Resolve ask-docs locale from a query string, path segment, or header value.
 * Single source of truth — do not duplicate locale parsing per route.
 */
export function resolveAskDocsLocale(
  input: string | null | undefined
): AppLocale {
  if (input && isAppLocale(input)) {
    return input
  }
  return DEFAULT_APP_LOCALE
}
