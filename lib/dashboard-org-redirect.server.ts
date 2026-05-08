import "server-only"

import { headers } from "next/headers"

import { AFENDA_PATHNAME_HEADER } from "#lib/auth/forwarded-path-headers.shared"
import { sanitizePathAfterOrgSlug } from "#lib/dashboard-org-path.shared"
import {
  stripLeadingLocalePrefix,
  toLocalePath,
  type AppLocale,
  type AppPath,
} from "#lib/i18n/locales.shared"
import { normalizeOrgSlugParam } from "#lib/org-slug.shared"

/**
 * When the URL org slug is wrong (stale tab / deep link), redirect to the
 * signed-in member's canonical slug while preserving the path after `/o/...`.
 */
export async function localePrefixedOrgDashboardRedirect(
  locale: AppLocale,
  canonicalSlug: string
): Promise<AppPath> {
  const safeSlug = normalizeOrgSlugParam(canonicalSlug)
  if (!safeSlug) {
    return toLocalePath(locale, "/o" as AppPath)
  }
  const pathname = (await headers()).get(AFENDA_PATHNAME_HEADER)?.trim()
  if (!pathname?.startsWith("/")) {
    return toLocalePath(locale, `/o/${safeSlug}/dashboard` as AppPath)
  }
  const stripped = stripLeadingLocalePrefix(pathname)
  if (!stripped) {
    return toLocalePath(locale, `/o/${safeSlug}/dashboard` as AppPath)
  }
  const tailFromO = stripped.pathnameWithoutLocale.replace(/^\/o\/[^/]+/, "")
  const tail = sanitizePathAfterOrgSlug(tailFromO)
  return toLocalePath(locale, `/o/${safeSlug}${tail}` as AppPath)
}
