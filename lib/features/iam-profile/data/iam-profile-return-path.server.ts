import "server-only"

import { getOrgTenantContext } from "#lib/auth"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { organizationIamProfilePath } from "#lib/org-apps-module-paths"

/** Locale-prefixed return path for iam-profile Server Actions / step-up gates. */
export async function iamProfileReturnPath(
  segment?: "identity" | "security"
): Promise<string> {
  const locale = await getRequestAppLocale()
  const { organizationId } = await getOrgTenantContext()
  const orgSlug = await getOrganizationSlugById(organizationId)
  if (!orgSlug) return toLocalePath(locale, "/console")
  return toLocalePath(locale, organizationIamProfilePath(orgSlug, segment))
}
