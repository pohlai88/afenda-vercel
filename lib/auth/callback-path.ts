import {
  DEFAULT_APP_LOCALE,
  stripLeadingLocalePrefix,
  toLocalePath,
  type AppLocale,
} from "#lib/i18n/locales.shared"

/** Default post-login destination for a locale (`localePrefix: "always"`). */
export function defaultPostAuthPath(locale: AppLocale) {
  return toLocalePath(locale, "/onboarding")
}

/**
 * Resolve a post-auth redirect path from `callbackUrl` query (open-redirect safe).
 * Allows same-origin **locale-prefixed** paths only (`/en/foo`, not `/foo` or `//evil`).
 */
export function resolvePostAuthCallbackUrl(
  raw: string | null | undefined,
  fallback: string = defaultPostAuthPath(DEFAULT_APP_LOCALE) // explicit default locale when raw is absent
): string {
  if (raw == null || raw === "") return fallback
  const t = raw.trim()
  // Absolute / scheme URLs (not locale-relative paths) — check before `/` gate.
  if (/^[a-zA-Z][a-zA-Z+\-.]*:/.test(t)) return fallback
  if (!t.startsWith("/") || t.startsWith("//")) return fallback
  if (t.includes("\n") || t.includes("\r")) return fallback
  if (stripLeadingLocalePrefix(t) == null) return fallback
  return t
}

/** @deprecated Use `defaultPostAuthPath(locale)` — kept for tests importing the name. */
export const DEFAULT_POST_AUTH_PATH = defaultPostAuthPath(DEFAULT_APP_LOCALE)
