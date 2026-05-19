import "server-only"

import type { AppLocale, AppPath } from "#lib/i18n/locales.shared"
import {
  stripLeadingLocalePrefix,
  toLocalePath,
} from "#lib/i18n/locales.shared"
import { organizationIamProfilePath } from "#lib/org-apps-module-paths"

/**
 * Locale-prefixed href for the session reverify surface matching `returnTo`,
 * or null when the caller should fall back to the auth interruption surface.
 */
export function resolveSessionReverifyHref(
  locale: AppLocale,
  returnTo: string
): AppPath | null {
  const pathOnly = returnTo.split("?")[0] ?? returnTo
  const stripped =
    stripLeadingLocalePrefix(pathOnly) ??
    (pathOnly.startsWith("/")
      ? { locale, pathnameWithoutLocale: pathOnly }
      : null)
  if (!stripped) return null

  const orgMatch = stripped.pathnameWithoutLocale.match(
    /^\/o\/([^/]+)\/(?:iam-profile|admin|apps|nexus)/
  )
  if (orgMatch?.[1]) {
    return toLocalePath(
      locale,
      organizationIamProfilePath(orgMatch[1], "reverify")
    )
  }

  if (
    stripped.pathnameWithoutLocale === "/platform" ||
    stripped.pathnameWithoutLocale.startsWith("/platform/")
  ) {
    return toLocalePath(locale, "/platform/reverify")
  }

  return null
}
