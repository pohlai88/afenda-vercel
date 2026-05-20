import "server-only"

import { headers } from "next/headers"

import { AFENDA_PATHNAME_HEADER } from "#lib/auth/forwarded-path-headers.shared"
import { organizationAppsPath } from "#lib/org-apps-module-paths"
import { sanitizePathAfterOrgSlug } from "#lib/i18n/org-apps-path.shared"
import {
  stripLeadingLocalePrefix,
  toLocalePath,
  type AppLocale,
  type AppPath,
} from "#lib/i18n/locales.shared"
import { normalizeOrgSlugParam } from "#lib/auth/org-slug.shared"

/** Canonical org slug redirect preserving sanitized tail after `/o/{slug}`. */
export async function localePrefixedOrgAppsRedirect(
  locale: AppLocale,
  canonicalSlug: string
): Promise<AppPath> {
  const safeSlug = normalizeOrgSlugParam(canonicalSlug)
  if (!safeSlug) {
    return toLocalePath(locale, "/o" as AppPath)
  }
  const pathname = (await headers()).get(AFENDA_PATHNAME_HEADER)?.trim()
  if (!pathname?.startsWith("/")) {
    return toLocalePath(
      locale,
      organizationAppsPath(safeSlug, "home") as AppPath
    )
  }
  const stripped = stripLeadingLocalePrefix(pathname)
  if (!stripped) {
    return toLocalePath(
      locale,
      organizationAppsPath(safeSlug, "home") as AppPath
    )
  }
  const tailFromO = stripped.pathnameWithoutLocale.replace(/^\/o\/[^/]+/, "")
  const tail = sanitizePathAfterOrgSlug(tailFromO)
  return toLocalePath(locale, `/o/${safeSlug}${tail}` as AppPath)
}
